import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

type Search = { plan?: string };

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  component: Checkout,
});

const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];

function Checkout() {
  const { plan: planId } = Route.useSearch();
  const { user } = useAuth();
  const { lines, total: bowlTotal, clear } = useCart();
  const nav = useNavigate();

  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [pinStatus, setPinStatus] = useState<"idle" | "ok" | "bad">("idle");

  const planQ = useQuery({
    queryKey: ["plan", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("id", planId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("pincode,phone,name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.pincode) setPincode(data.pincode);
    });
  }, [user]);

  const checkPin = async () => {
    if (!pincode || pincode.length !== 6) { setPinStatus("bad"); return; }
    const { data } = await supabase.from("serviceable_pincodes").select("id").eq("pincode", pincode).eq("is_active", true).maybeSingle();
    setPinStatus(data ? "ok" : "bad");
  };

  const isPlan = !!planId;
  const gst = isPlan ? Number(planQ.data?.price_inr ?? 0) * 0.05 : bowlTotal * 0.05;
  const subTotal = isPlan ? Number(planQ.data?.price_inr ?? 0) : bowlTotal;
  const grand = subTotal + gst;

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (pinStatus !== "ok") throw new Error("Please verify your pincode");
      if (!address.trim()) throw new Error("Address is required");

      if (isPlan && planQ.data) {
        // Create subscription + first 7 days of orders from plan_items
        const { data: sub, error: subErr } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_id: planQ.data.id,
            status: "active",
            delivery_address: address,
            delivery_pincode: pincode,
            delivery_slot: slot,
            meals_per_day: planQ.data.meals_per_day,
            days_per_week: planQ.data.days_per_week,
            start_date: new Date().toISOString().slice(0, 10),
          })
          .select()
          .single();
        if (subErr) throw subErr;

        const { data: planItems } = await supabase
          .from("plan_items")
          .select("day_of_week, slot, menu_items(*)")
          .eq("plan_id", planQ.data.id);

        const today = new Date();
        const dow = today.getDay() === 0 ? 7 : today.getDay(); // 1..7 mon..sun
        const ordersByDayKey: Record<string, { delivery_date: string; slot: string; items: any[] }> = {};

        for (const pi of (planItems ?? []) as any[]) {
          const offset = (pi.day_of_week - dow + 7) % 7;
          const d = new Date(today); d.setDate(today.getDate() + offset);
          const dateStr = d.toISOString().slice(0, 10);
          const key = `${dateStr}-${pi.slot}`;
          if (!ordersByDayKey[key]) ordersByDayKey[key] = { delivery_date: dateStr, slot: pi.slot, items: [] };
          if (pi.menu_items) ordersByDayKey[key].items.push(pi.menu_items);
        }

        for (const { delivery_date, slot: s, items } of Object.values(ordersByDayKey)) {
          const total_inr = items.reduce((sum, it) => sum + Number(it.price_inr), 0);
          const { data: ord, error: oErr } = await supabase
            .from("orders")
            .insert({
              subscription_id: sub.id, user_id: user.id, delivery_date, slot: s,
              status: "preparing", kind: "subscription",
              delivery_address: address, delivery_pincode: pincode, total_inr,
            })
            .select().single();
          if (oErr) throw oErr;
          if (items.length) {
            const rows = items.map((it: any) => ({
              order_id: ord.id, menu_item_id: it.id, name: it.name, price_inr: it.price_inr, qty: 1,
            }));
            const { error } = await supabase.from("order_items").insert(rows);
            if (error) throw error;
          }
        }
        return { kind: "subscription", id: sub.id };
      } else {
        if (lines.length === 0) throw new Error("Your bowl is empty");
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const { data: ord, error: oErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id, subscription_id: null,
            delivery_date: tomorrow.toISOString().slice(0, 10), slot,
            status: "preparing", kind: "bowl",
            delivery_address: address, delivery_pincode: pincode, total_inr: bowlTotal,
          })
          .select().single();
        if (oErr) throw oErr;
        const rows = lines.map((l) => ({ order_id: ord.id, menu_item_id: l.id, name: l.name, price_inr: l.price_inr, qty: l.qty }));
        const { error } = await supabase.from("order_items").insert(rows);
        if (error) throw error;
        return { kind: "bowl", id: ord.id };
      }
    },
    onSuccess: (r) => {
      toast.success("Order placed! 🎉");
      if (r.kind === "bowl") clear();
      // Save pincode on profile
      if (user) supabase.from("profiles").update({ pincode }).eq("id", user.id);
      nav({ to: "/my-subscription" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">{isPlan ? planQ.data?.name : "Build Your Bowl order"}</p>

        <Card className="mt-6 p-5 space-y-4">
          <div>
            <Label>Pincode</Label>
            <div className="flex gap-2 mt-1">
              <Input value={pincode} maxLength={6} onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "")); setPinStatus("idle"); }} placeholder="500001" />
              <Button variant="outline" onClick={checkPin}>Check</Button>
            </div>
            {pinStatus === "ok" && <div className="mt-1 text-xs text-primary inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> We deliver here!</div>}
            {pinStatus === "bad" && <div className="mt-1 text-xs text-destructive inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> Sorry, not serviceable yet.</div>}
          </div>
          <div>
            <Label>Delivery address</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat / Building / Street / Landmark" />
          </div>
          <div>
            <Label>Preferred slot</Label>
            <Select value={slot} onValueChange={(v: any) => setSlot(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subTotal.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><span>₹{gst.toFixed(0)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{grand.toFixed(0)}</span></div>
          </div>

          <Button className="w-full" size="lg" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}>
            {placeOrder.isPending ? "Placing…" : `Place order · ₹${grand.toFixed(0)}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Razorpay integration coming next — this places the order with payment pending.</p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
