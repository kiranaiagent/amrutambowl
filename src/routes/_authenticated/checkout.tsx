import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Minus, Plus as PlusIcon } from "lucide-react";
import { MealImage } from "@/components/MealImage";

type Search = { plan?: string };

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({ plan: typeof s.plan === "string" ? s.plan : undefined }),
  component: Checkout,
});

const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
const ALLERGENS = ["dairy", "gluten", "nuts", "soy", "egg", "seafood", "onion-garlic"];
type Cycle = "weekly" | "monthly" | "daily" | "custom_dates";
const OVERRIDE_KEY = "ruchi.plan.overrides.v1";
type Override = { day: number; slot: string; menu_item_id: string | null };

function todayStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function Checkout() {
  const { plan: planId } = Route.useSearch();
  const { user } = useAuth();
  const { lines, total: bowlTotal, clear } = useCart();
  const nav = useNavigate();

  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [pinStatus, setPinStatus] = useState<"idle" | "ok" | "bad">("idle");

  // Subscription customization
  const [cycle, setCycle] = useState<Cycle>("weekly");
  const [startDate, setStartDate] = useState(todayStr(1));
  const [endDate, setEndDate] = useState(todayStr(7));
  const [datesText, setDatesText] = useState(""); // comma-separated YYYY-MM-DD
  const [avoidAllergens, setAvoidAllergens] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [planOverrides, setPlanOverrides] = useState<Override[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(OVERRIDE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.planId === planId && Array.isArray(parsed.overrides)) {
        setPlanOverrides(parsed.overrides);
      }
    } catch {}
  }, [planId]);

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
    if (planQ.data?.billing_cycle === "monthly" || planQ.data?.billing_cycle === "weekly") {
      setCycle(planQ.data.billing_cycle as Cycle);
    }
  }, [planQ.data?.billing_cycle]);

  const addonsQ = useQuery({
    queryKey: ["addons-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("add_ons").select("*").eq("is_active", true).order("category");
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

  // Compute deliveries based on cycle
  const selectedDates = useMemo(() => {
    if (!isPlan) return [] as string[];
    if (cycle === "custom_dates") {
      return datesText.split(",").map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    }
    if (cycle === "daily") {
      const out: string[] = [];
      const s = new Date(startDate), e = new Date(endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10));
      return out;
    }
    // weekly / monthly: emit a date span based on plan days_per_week
    const span = cycle === "weekly" ? 7 : 28;
    const dpw = planQ.data?.days_per_week ?? 5;
    const out: string[] = [];
    const s = new Date(startDate);
    for (let i = 0; i < span && out.length < dpw * (cycle === "weekly" ? 1 : 4); i++) {
      const d = new Date(s); d.setDate(s.getDate() + i);
      // skip Sundays for weekly/monthly if days_per_week<7
      if (dpw < 7 && d.getDay() === 0) continue;
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [cycle, startDate, endDate, datesText, planQ.data?.days_per_week, isPlan]);

  const deliveries = selectedDates.length;

  const planPerDelivery = useMemo(() => {
    if (!planQ.data) return 0;
    const dpw = planQ.data.days_per_week ?? 5;
    return Number(planQ.data.price_inr) / Math.max(dpw, 1); // weekly price / deliveries-per-week
  }, [planQ.data]);

  const planSubtotal = isPlan ? planPerDelivery * deliveries : bowlTotal;

  const addonsSubtotal = useMemo(() => {
    if (!addonsQ.data) return 0;
    let sum = 0;
    for (const a of addonsQ.data) {
      const q = addonQty[a.id] ?? 0;
      if (q > 0) sum += Number(a.price_inr) * q * (isPlan ? Math.max(deliveries, 1) : 1);
    }
    return sum;
  }, [addonsQ.data, addonQty, isPlan, deliveries]);

  const subTotal = planSubtotal + addonsSubtotal;
  const gst = subTotal * 0.05;
  const grand = subTotal + gst;

  const toggleAllergen = (a: string) =>
    setAvoidAllergens((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const setQ = (id: string, delta: number) =>
    setAddonQty((cur) => ({ ...cur, [id]: Math.max(0, (cur[id] ?? 0) + delta) }));

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (pinStatus !== "ok") throw new Error("Please verify your pincode");
      if (!address.trim()) throw new Error("Address is required");

      if (isPlan && planQ.data) {
        if (deliveries === 0) throw new Error("Please pick at least one delivery date");

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
            start_date: selectedDates[0],
            end_date: selectedDates[selectedDates.length - 1],
            selected_dates: cycle === "custom_dates" || cycle === "daily" ? selectedDates : null,
            avoid_allergens: avoidAllergens,
            special_instructions: notes || null,
          })
          .select().single();
        if (subErr) throw subErr;

        // Persist add-ons
        const addonRows = Object.entries(addonQty)
          .filter(([, q]) => q > 0)
          .map(([addon_id, qty]) => ({ subscription_id: sub.id, addon_id, qty }));
        if (addonRows.length) {
          const { error } = await supabase.from("subscription_addons").insert(addonRows);
          if (error) throw error;
        }

        // Pull plan menu and build orders per delivery date
        const { data: planItems } = await supabase
          .from("plan_items").select("day_of_week, slot, menu_items(*)").eq("plan_id", planQ.data.id);

        // Build override lookup + fetch any swapped-in menu items
        const overrideMap = new Map<string, string | null>();
        planOverrides.forEach((o) => overrideMap.set(`${o.day}-${o.slot}`, o.menu_item_id));
        const swapInIds = planOverrides.map((o) => o.menu_item_id).filter((x): x is string => !!x);
        let swapItemsById = new Map<string, any>();
        if (swapInIds.length) {
          const { data: swapItems } = await supabase.from("menu_items").select("*").in("id", swapInIds);
          (swapItems ?? []).forEach((it: any) => swapItemsById.set(it.id, it));
        }

        for (const dateStr of selectedDates) {
          const d = new Date(dateStr);
          const dow = d.getDay() === 0 ? 7 : d.getDay();
          const slotItems = (planItems ?? []).filter((pi: any) => pi.day_of_week === dow && pi.slot === slot);
          let items = slotItems.map((pi: any) => pi.menu_items).filter(Boolean);

          // Apply customer overrides for this day/slot
          const key = `${dow}-${slot}`;
          if (overrideMap.has(key)) {
            const overrideId = overrideMap.get(key);
            if (overrideId === null) items = []; // skipped
            else {
              const swap = overrideId ? swapItemsById.get(overrideId) : null;
              items = swap ? [swap] : items;
            }
          }

          // filter out items that conflict with allergens
          const filtered = items.filter((it: any) =>
            !(it.allergens ?? []).some((al: string) => avoidAllergens.includes(al))
          );

          const total_inr = filtered.reduce((s: number, it: any) => s + Number(it.price_inr), 0);
          const { data: ord, error: oErr } = await supabase.from("orders").insert({
            subscription_id: sub.id, user_id: user.id, delivery_date: dateStr, slot,
            status: "preparing", kind: "subscription",
            delivery_address: address, delivery_pincode: pincode, total_inr,
            notes: notes || null,
          }).select().single();
          if (oErr) throw oErr;

          if (filtered.length) {
            const rows = filtered.map((it: any) => ({
              order_id: ord.id, menu_item_id: it.id, name: it.name, price_inr: it.price_inr, qty: 1,
            }));
            const { error } = await supabase.from("order_items").insert(rows);
            if (error) throw error;
          }
          // Add-on rows per order
          const aRows = (addonsQ.data ?? [])
            .map((a: any) => ({ a, q: addonQty[a.id] ?? 0 }))
            .filter(({ q }) => q > 0)
            .map(({ a, q }) => ({ order_id: ord.id, menu_item_id: null, name: `${a.name} (add-on)`, price_inr: a.price_inr, qty: q }));
          if (aRows.length) await supabase.from("order_items").insert(aRows);
        }
        return { kind: "subscription", id: sub.id };
      } else {
        if (lines.length === 0) throw new Error("Your bowl is empty");
        const { data: ord, error: oErr } = await supabase.from("orders").insert({
          user_id: user.id, subscription_id: null,
          delivery_date: todayStr(1), slot, status: "preparing", kind: "bowl",
          delivery_address: address, delivery_pincode: pincode, total_inr: bowlTotal,
        }).select().single();
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
      try { sessionStorage.removeItem(OVERRIDE_KEY); } catch {}
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

        {isPlan && planOverrides.length > 0 && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">Custom menu applied</span>
            <span className="text-muted-foreground"> · {planOverrides.length} meal change{planOverrides.length === 1 ? "" : "s"} will be used for every matching day.</span>
          </div>
        )}

        <Card className="mt-6 p-5 space-y-5">
          {/* Delivery */}
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

          {isPlan && (
            <>
              {/* Subscription cycle */}
              <div className="border-t pt-4">
                <Label>Subscription</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {(["weekly", "monthly", "daily", "custom_dates"] as Cycle[]).map((c) => (
                    <button key={c} type="button" onClick={() => setCycle(c)}
                      className={`px-3 py-2 text-sm rounded-md border capitalize ${cycle === c ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                      {c.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {cycle !== "custom_dates" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={startDate} min={todayStr(1)} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  {cycle === "daily" && (
                    <div>
                      <Label>End date</Label>
                      <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  )}
                </div>
              )}
              {cycle === "custom_dates" && (
                <div>
                  <Label>Pick dates (comma-separated YYYY-MM-DD)</Label>
                  <Textarea value={datesText} onChange={(e) => setDatesText(e.target.value)} placeholder="2026-06-21, 2026-06-23, 2026-06-25" />
                  <p className="text-xs text-muted-foreground mt-1">{deliveries} delivery{deliveries === 1 ? "" : "s"} picked.</p>
                </div>
              )}
              {cycle !== "custom_dates" && (
                <p className="text-xs text-muted-foreground">{deliveries} delivery{deliveries === 1 ? "" : "s"} scheduled.</p>
              )}

              {/* Allergens */}
              <div className="border-t pt-4">
                <Label>Avoid allergens / ingredients</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALLERGENS.map((a) => {
                    const on = avoidAllergens.includes(a);
                    return (
                      <button key={a} type="button" onClick={() => toggleAllergen(a)}
                        className={`px-3 py-1 text-xs rounded-full border capitalize ${on ? "bg-destructive text-destructive-foreground border-destructive" : ""}`}>
                        {a}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Meals containing these will be skipped automatically.</p>
              </div>

              {/* Add-ons */}
              <div className="border-t pt-4">
                <Label>Add-ons (extras, per delivery)</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {(addonsQ.data ?? []).map((a: any) => {
                    const q = addonQty[a.id] ?? 0;
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-md border p-2">
                        <MealImage path={a.image_url} alt={a.name} className="h-12 w-12 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">₹{Number(a.price_inr).toFixed(0)} · {a.category}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQ(a.id, -1)} disabled={q === 0}><Minus className="h-3 w-3" /></Button>
                          <span className="w-5 text-center text-sm">{q}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQ(a.id, +1)}><PlusIcon className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Special instructions</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy, no curry leaves, ring twice, etc." />
              </div>
            </>
          )}

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan{isPlan ? ` (${deliveries} deliveries)` : ""}</span><span>₹{planSubtotal.toFixed(0)}</span></div>
            {addonsSubtotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Add-ons</span><span>₹{addonsSubtotal.toFixed(0)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><span>₹{gst.toFixed(0)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{grand.toFixed(0)}</span></div>
          </div>

          <Button className="w-full" size="lg" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}>
            {placeOrder.isPending ? "Placing…" : `Place order · ₹${grand.toFixed(0)}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Payment integration coming next — this places the order with payment pending.</p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
