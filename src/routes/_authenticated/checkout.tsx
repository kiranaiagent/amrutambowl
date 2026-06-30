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
import { CheckCircle2, Minus, Plus as PlusIcon, MapPin, Tag, X } from "lucide-react";
import { MealImage } from "@/components/MealImage";

type Search = { plan?: string; bowl?: string };

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    plan: typeof s.plan === "string" ? s.plan : undefined,
    bowl: typeof s.bowl === "string" ? s.bowl : undefined,
  }),
  component: Checkout,
});

const SLOTS: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
const ALLERGENS = ["dairy", "gluten", "nuts", "soy", "egg", "seafood", "onion-garlic"];
type Cycle = "weekly" | "monthly" | "daily" | "custom_dates";
const OVERRIDE_KEY = "ruchi.plan.overrides.v1";
const BOWL_KEY = "amrutam.bowl.config.v1";
type Override = { day: number; slot: string; menu_item_id: string | null };

type BowlConfig = {
  kind: "bowl";
  cycle: "daily" | "weekly" | "biweekly" | "monthly";
  mealsPerDay: number;
  duration: number;
  deliveryDays: number[];
  startDate: string;
  preferredTime: string;
  primarySlot: "breakfast" | "lunch" | "dinner";
  picks: { date: string; slot: "breakfast" | "lunch" | "dinner"; menu_item_ids: string[] }[];
  subtotal: number;
};

function todayStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function Checkout() {
  const { plan: planId, bowl } = Route.useSearch();
  const { user } = useAuth();
  const { lines, total: bowlTotal, clear } = useCart();
  const nav = useNavigate();

  // Bowl-builder config (sessionStorage)
  const [bowlConfig, setBowlConfig] = useState<BowlConfig | null>(null);
  useEffect(() => {
    if (bowl !== "1") return;
    try {
      const raw = sessionStorage.getItem(BOWL_KEY);
      if (raw) setBowlConfig(JSON.parse(raw));
    } catch {}
  }, [bowl]);

  const [pincode, setPincode] = useState("");
  const [customPincodeMode, setCustomPincodeMode] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [slot, setSlot] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [preferredTime, setPreferredTime] = useState("12:30");

  // Subscription customization (plan path)
  const [cycle, setCycle] = useState<Cycle>("weekly");
  const [startDate, setStartDate] = useState(todayStr(1));
  const [endDate, setEndDate] = useState(todayStr(7));
  const [datesText, setDatesText] = useState("");
  const [avoidAllergens, setAvoidAllergens] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [planOverrides, setPlanOverrides] = useState<Override[]>([]);

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

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

  // Pick up start date hint from plan detail page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("amrutam.plan.start");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.planId === planId && parsed.startDate) setStartDate(parsed.startDate);
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

  // Bowl-mode menu lookup (for line items)
  const bowlMenuIds = useMemo(() => bowlConfig?.picks.flatMap((p) => p.menu_item_ids ?? []) ?? [], [bowlConfig]);
  const bowlMenuQ = useQuery({
    queryKey: ["bowl-menu-items", bowlMenuIds.join(",")],
    enabled: bowlMenuIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").in("id", bowlMenuIds);
      if (error) throw error;
      return data as any[];
    },
  });

  const addonsQ = useQuery({
    queryKey: ["addons-public-menu"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items")
        .select("id,name,description,image_url,price_inr,food_type,is_available,kind")
        .eq("status", "active").eq("is_available", true).eq("is_addon", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Pincode dropdown source
  const pincodesQ = useQuery({
    queryKey: ["serviceable-pincodes-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("serviceable_pincodes")
        .select("pincode,area,city").eq("is_active", true).order("pincode");
      if (error) throw error;
      return data as { pincode: string; area: string | null; city: string | null }[];
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("pincode,phone,name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.pincode) setPincode(data.pincode);
      if (data?.phone) setPhone(data.phone);
      if (data?.name) setName(data.name);
    });
  }, [user]);

  const isPlan = !!planId;
  const isBowl = !!bowl && !!bowlConfig;

  // Compute plan deliveries
  const planSelectedDates = useMemo(() => {
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
    const span = cycle === "weekly" ? 7 : 28;
    const dpw = planQ.data?.days_per_week ?? 5;
    const out: string[] = [];
    const s = new Date(startDate);
    for (let i = 0; i < span && out.length < dpw * (cycle === "weekly" ? 1 : 4); i++) {
      const d = new Date(s); d.setDate(s.getDate() + i);
      if (dpw < 7 && d.getDay() === 0) continue;
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [cycle, startDate, endDate, datesText, planQ.data?.days_per_week, isPlan]);

  const planPerDelivery = useMemo(() => {
    if (!planQ.data) return 0;
    const dpw = planQ.data.days_per_week ?? 5;
    return Number(planQ.data.price_inr) / Math.max(dpw, 1);
  }, [planQ.data]);

  const deliveriesCount = isBowl ? new Set(bowlConfig!.picks.map((p) => p.date)).size : planSelectedDates.length;

  const baseSubtotal = isBowl
    ? (bowlConfig?.subtotal ?? 0)
    : isPlan ? planPerDelivery * planSelectedDates.length : bowlTotal;

  const addonsSubtotal = useMemo(() => {
    if (!addonsQ.data) return 0;
    let sum = 0;
    for (const a of addonsQ.data) {
      const q = addonQty[a.id] ?? 0;
      if (q > 0) sum += Number(a.price_inr) * q * (isPlan || isBowl ? Math.max(deliveriesCount, 1) : 1);
    }
    return sum;
  }, [addonsQ.data, addonQty, isPlan, isBowl, deliveriesCount]);

  const subTotal = baseSubtotal + addonsSubtotal;
  const discount = promo ? Math.min(promo.discount, subTotal) : 0;
  const taxable = Math.max(0, subTotal - discount);
  const gst = taxable * 0.05;
  const grand = taxable + gst;

  // Re-validate promo whenever subtotal or source changes
  useEffect(() => {
    if (!promo) return;
    if (subTotal <= 0) { setPromo(null); return; }
    applyPromo(promo.code, true).catch(() => setPromo(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTotal, isPlan, isBowl]);

  async function applyPromo(code: string, silent = false) {
    if (!user) { toast.info("Sign in to use a promo code"); return; }
    const c = code.trim().toUpperCase();
    if (!c) return;
    setPromoBusy(true);
    try {
      const source = isBowl ? "bowl" : isPlan ? "plan" : "bowl";
      const { data, error } = await supabase.rpc("validate_promo" as any, {
        _code: c, _user_id: user.id, _subtotal: subTotal, _source: source,
      } as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.promo_id || row?.reason) throw new Error(row?.reason || "Invalid code");
      setPromo({ id: row.promo_id, code: c, discount: Number(row.discount_inr) });
      if (!silent) toast.success(`${c} applied — ₹${Number(row.discount_inr).toFixed(0)} off`);
    } catch (e: any) {
      if (!silent) toast.error(e.message);
      setPromo(null);
    } finally { setPromoBusy(false); }
  }

  const toggleAllergen = (a: string) =>
    setAvoidAllergens((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const setQ = (id: string, delta: number) =>
    setAddonQty((cur) => ({ ...cur, [id]: Math.max(0, (cur[id] ?? 0) + delta) }));

  const pinIsServiceable = !!pincodesQ.data?.some((p) => p.pincode === pincode);

  const submitPincodeRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pincode_requests" as any).insert({
        pincode, user_id: user?.id ?? null, name: name || null, phone: phone || null,
        notes: address ? `Address: ${address}` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRequestSubmitted(true);
      toast.success("Thanks! Our team will check serviceability and notify you.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!pinIsServiceable) throw new Error("Please pick a serviceable pincode (or request expansion).");
      if (!address.trim()) throw new Error("Address is required");

      if (isBowl && bowlConfig) {
        // Subscription with source='bowl'
        const dates = [...new Set(bowlConfig.picks.map((p) => p.date))].sort();
        const { data: sub, error: subErr } = await supabase
          .from("subscriptions").insert({
            user_id: user.id,
            plan_id: null as any, // not tied to a plan
            status: "active",
            delivery_address: address,
            delivery_pincode: pincode,
            delivery_slot: bowlConfig.primarySlot,
            meals_per_day: bowlConfig.mealsPerDay,
            days_per_week: bowlConfig.deliveryDays.length || 7,
            start_date: dates[0],
            end_date: dates[dates.length - 1],
            selected_dates: dates,
            avoid_allergens: avoidAllergens,
            special_instructions: notes || null,
            preferred_time: bowlConfig.preferredTime,
            source: "bowl",
          } as any).select().single();
        // plan_id is NOT NULL in schema — fall back to creating a hidden bowl-plan if needed.
        if (subErr && subErr.message?.includes("plan_id")) {
          throw new Error("Build-a-Bowl subscriptions need a placeholder plan; ask admin to create one named 'Custom Bowl'.");
        }
        if (subErr) throw subErr;

        // Group picks by date
        const byDate = new Map<string, { slot: string; menu_item_id: string }[]>();
        bowlConfig.picks.forEach((p) => {
          (p.menu_item_ids ?? []).forEach((mid) => {
            const arr = byDate.get(p.date) ?? [];
            arr.push({ slot: p.slot, menu_item_id: mid });
            byDate.set(p.date, arr);
          });
        });

        const menuById = new Map((bowlMenuQ.data ?? []).map((m: any) => [m.id, m]));

        let firstOrderId: string | null = null;
        for (const date of dates) {
          const rows = byDate.get(date) ?? [];
          if (rows.length === 0) continue;
          // group by slot — one order per delivery (slot is primary)
          const slotsHere = [...new Set(rows.map((r) => r.slot))];
          for (const s of slotsHere) {
            const slotRows = rows.filter((r) => r.slot === s);
            const total_inr = slotRows.reduce((sum, r) => sum + Number((menuById.get(r.menu_item_id) as any)?.price_inr ?? 0), 0);
            const { data: ord, error: oErr } = await supabase.from("orders").insert({
              subscription_id: sub.id, user_id: user.id, delivery_date: date,
              slot: s as any, status: "preparing", kind: "subscription",
              delivery_address: address, delivery_pincode: pincode, total_inr,
              notes: notes || null, preferred_time: bowlConfig.preferredTime,
            } as any).select().single();
            if (oErr) throw oErr;
            if (!firstOrderId) firstOrderId = ord.id;
            const items = slotRows.map((r) => {
              const mi: any = menuById.get(r.menu_item_id);
              return { order_id: ord.id, menu_item_id: r.menu_item_id, name: mi?.name ?? "Item", price_inr: mi?.price_inr ?? 0, qty: 1 };
            });
            if (items.length) await supabase.from("order_items").insert(items);
          }
        }
        return { kind: "subscription" as const, id: sub.id, firstOrderId };
      }

      if (isPlan && planQ.data) {
        if (planSelectedDates.length === 0) throw new Error("Please pick at least one delivery date");
        const { data: sub, error: subErr } = await supabase
          .from("subscriptions").insert({
            user_id: user.id, plan_id: planQ.data.id, status: "active",
            delivery_address: address, delivery_pincode: pincode, delivery_slot: slot,
            meals_per_day: planQ.data.meals_per_day, days_per_week: planQ.data.days_per_week,
            start_date: planSelectedDates[0], end_date: planSelectedDates[planSelectedDates.length - 1],
            selected_dates: cycle === "custom_dates" || cycle === "daily" ? planSelectedDates : null,
            avoid_allergens: avoidAllergens, special_instructions: notes || null,
            preferred_time: preferredTime, source: "plan",
          } as any).select().single();
        if (subErr) throw subErr;

        const addonRows = Object.entries(addonQty).filter(([, q]) => q > 0)
          .map(([menu_item_id, qty]) => ({ subscription_id: sub.id, menu_item_id, qty }));
        if (addonRows.length) await supabase.from("subscription_addons").insert(addonRows);

        const { data: planItems } = await supabase
          .from("plan_items").select("day_of_week, slot, menu_items(*)").eq("plan_id", planQ.data.id);
        const overrideMap = new Map<string, string | null>();
        planOverrides.forEach((o) => overrideMap.set(`${o.day}-${o.slot}`, o.menu_item_id));
        const swapInIds = planOverrides.map((o) => o.menu_item_id).filter((x): x is string => !!x);
        const swapItemsById = new Map<string, any>();
        if (swapInIds.length) {
          const { data: swapItems } = await supabase.from("menu_items").select("*").in("id", swapInIds);
          (swapItems ?? []).forEach((it: any) => swapItemsById.set(it.id, it));
        }

        let firstOrderId: string | null = null;
        for (const dateStr of planSelectedDates) {
          const d = new Date(dateStr);
          const dow = d.getDay() === 0 ? 7 : d.getDay();
          const slotItems = (planItems ?? []).filter((pi: any) => pi.day_of_week === dow && pi.slot === slot);
          let items = slotItems.map((pi: any) => pi.menu_items).filter((mi: any) => mi && mi.status === "active");
          const key = `${dow}-${slot}`;
          if (overrideMap.has(key)) {
            const overrideId = overrideMap.get(key);
            if (overrideId === null) items = [];
            else {
              const swap = overrideId ? swapItemsById.get(overrideId) : null;
              items = swap ? [swap] : items;
            }
          }
          const filtered = items.filter((it: any) => !(it.allergens ?? []).some((al: string) => avoidAllergens.includes(al)));
          const total_inr = filtered.reduce((s: number, it: any) => s + Number(it.price_inr), 0);
          const { data: ord, error: oErr } = await supabase.from("orders").insert({
            subscription_id: sub.id, user_id: user.id, delivery_date: dateStr, slot,
            status: "preparing", kind: "subscription",
            delivery_address: address, delivery_pincode: pincode, total_inr,
            notes: notes || null, preferred_time: preferredTime,
          } as any).select().single();
          if (oErr) throw oErr;
          if (!firstOrderId) firstOrderId = ord.id;
          if (filtered.length) {
            const rows = filtered.map((it: any) => ({
              order_id: ord.id, menu_item_id: it.id, name: it.name, price_inr: it.price_inr, qty: 1,
            }));
            await supabase.from("order_items").insert(rows);
          }
          const aRows = (addonsQ.data ?? [])
            .map((a: any) => ({ a, q: addonQty[a.id] ?? 0 })).filter(({ q }) => q > 0)
            .map(({ a, q }) => ({ order_id: ord.id, menu_item_id: null, name: `${a.name} (add-on)`, price_inr: a.price_inr, qty: q }));
          if (aRows.length) await supabase.from("order_items").insert(aRows);
        }
        return { kind: "subscription" as const, id: sub.id, firstOrderId };
      }

      // One-off cart bowl
      if (lines.length === 0) throw new Error("Your bowl is empty");
      const { data: ord, error: oErr } = await supabase.from("orders").insert({
        user_id: user.id, subscription_id: null,
        delivery_date: todayStr(1), slot, status: "preparing", kind: "bowl",
        delivery_address: address, delivery_pincode: pincode, total_inr: bowlTotal,
        preferred_time: preferredTime,
      } as any).select().single();
      if (oErr) throw oErr;
      const rows = lines.map((l) => ({ order_id: ord.id, menu_item_id: l.id, name: l.name, price_inr: l.price_inr, qty: l.qty }));
      await supabase.from("order_items").insert(rows);
      return { kind: "bowl" as const, id: ord.id, firstOrderId: ord.id };
    },
    onSuccess: async (r) => {
      toast.success("Order placed! 🎉");
      // Record promo redemption (trigger enforces caps & bumps counter)
      if (promo && user) {
        await supabase.from("promo_redemptions").insert({
          promo_code_id: promo.id, user_id: user.id,
          subscription_id: r.kind === "subscription" ? r.id : null,
          order_id: r.firstOrderId ?? r.id,
          discount_inr: discount,
        }).then(({ error }) => { if (error) console.warn("Promo redemption:", error.message); });
      }
      if (r.kind === "bowl") clear();
      try { sessionStorage.removeItem(OVERRIDE_KEY); sessionStorage.removeItem(BOWL_KEY); } catch {}
      if (user) supabase.from("profiles").update({ pincode, phone: phone || undefined, name: name || undefined }).eq("id", user.id);
      nav({ to: "/order-confirmation/$id", params: { id: r.firstOrderId ?? r.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">
          {isBowl ? "Custom Build My Own Bowl subscription" : isPlan ? planQ.data?.name : "Build My Own Bowl order"}
        </p>

        {isBowl && bowlConfig && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">Custom bowl</span>
            <span className="text-muted-foreground"> · {bowlConfig.picks.filter((p) => (p.menu_item_ids ?? []).length).length} meal(s) · {bowlConfig.cycle} · {bowlConfig.duration} day(s) · preferred {bowlConfig.preferredTime}</span>
          </div>
        )}
        {isPlan && planOverrides.length > 0 && (
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">Custom menu applied</span>
            <span className="text-muted-foreground"> · {planOverrides.length} meal change(s).</span>
          </div>
        )}

        <Card className="mt-6 p-5 space-y-5">
          {/* Delivery details */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Pincode (we deliver to these areas)</Label>
            {!customPincodeMode ? (
              <div className="flex gap-2 mt-1">
                <Select value={pincode} onValueChange={(v) => setPincode(v)}>
                  <SelectTrigger><SelectValue placeholder={pincodesQ.isLoading ? "Loading…" : "Choose your pincode"} /></SelectTrigger>
                  <SelectContent>
                    {pincodesQ.data?.map((p) => (
                      <SelectItem key={p.pincode} value={p.pincode}>
                        {p.pincode}{p.area ? ` · ${p.area}` : ""}{p.city ? `, ${p.city}` : ""}
                      </SelectItem>
                    ))}
                    {(pincodesQ.data?.length ?? 0) === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No serviceable areas yet.</div>}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => { setCustomPincodeMode(true); setPincode(""); }}>
                  Not listed?
                </Button>
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input value={pincode} maxLength={6} placeholder="Enter your 6-digit pincode"
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
                  <Button variant="ghost" type="button" onClick={() => { setCustomPincodeMode(false); setRequestSubmitted(false); }}>Back to list</Button>
                </div>
                {pincode.length === 6 && !pinIsServiceable && !requestSubmitted && (
                  <div className="rounded-md border border-dashed p-3 text-sm bg-secondary/30">
                    <div className="font-medium">We're not serving {pincode} yet.</div>
                    <p className="text-xs text-muted-foreground mt-1">Tell us you're interested — we use this to plan delivery expansion.</p>
                    <Button size="sm" className="mt-2" disabled={submitPincodeRequest.isPending}
                      onClick={() => submitPincodeRequest.mutate()}>
                      Notify me when {pincode} is live
                    </Button>
                  </div>
                )}
                {requestSubmitted && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary inline-flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Request received. We'll be in touch.
                  </div>
                )}
              </div>
            )}
            {pinIsServiceable && (
              <div className="mt-1 text-xs text-primary inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Great, we deliver to {pincode}!
              </div>
            )}
          </div>

          <div>
            <Label>Delivery address</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat / Building / Street / Landmark" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Preferred slot</Label>
              <Select value={slot} onValueChange={(v: any) => setSlot(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SLOTS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred time</Label>
              <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
            </div>
          </div>

          {isPlan && (
            <>
              <div className="border-t pt-4">
                <Label>Subscription cycle</Label>
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
                </div>
              )}
              <p className="text-xs text-muted-foreground">{planSelectedDates.length} delivery(s) scheduled.</p>
            </>
          )}

          {(isPlan || isBowl) && (
            <>
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
              </div>

              {(addonsQ.data?.length ?? 0) > 0 && (
              <div className="border-t pt-4">
                <Label>Add beverages &amp; snacks (per delivery)</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {(addonsQ.data ?? []).map((a: any) => {
                    const q = addonQty[a.id] ?? 0;
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-md border p-2">
                        <MealImage path={a.image_url} alt={a.name} className="h-12 w-12 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">₹{Number(a.price_inr).toFixed(0)}</div>
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
              )}

              <div>
                <Label>Special instructions</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy, no curry leaves, ring twice, etc." />
              </div>
            </>
          )}

          {/* Promo code */}
          <div className="border-t pt-3">
            <Label className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Promo code</Label>
            {promo ? (
              <div className="mt-1 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="text-sm">
                  <span className="font-mono font-bold text-primary">{promo.code}</span>
                  <span className="text-muted-foreground"> applied · −₹{discount.toFixed(0)}</span>
                </div>
                <button type="button" onClick={() => { setPromo(null); setPromoInput(""); }}
                  className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="mt-1 flex gap-2">
                <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10" />
                <Button type="button" variant="outline" disabled={promoBusy || !promoInput.trim()}
                  onClick={() => applyPromo(promoInput)}>
                  {promoBusy ? "…" : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isBowl ? "Custom bowl" : isPlan ? `Plan (${planSelectedDates.length} deliveries)` : "Bowl"}</span>
              <span>₹{baseSubtotal.toFixed(0)}</span>
            </div>
            {addonsSubtotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extras</span><span>₹{addonsSubtotal.toFixed(0)}</span></div>}
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Discount ({promo?.code})</span><span>−₹{discount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><span>₹{gst.toFixed(0)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total</span><span>₹{grand.toFixed(0)}</span></div>
          </div>

          <Button className="w-full" size="lg" onClick={() => placeOrder.mutate()}
            disabled={placeOrder.isPending || !pinIsServiceable}>
            {placeOrder.isPending ? "Placing…" : `Place order · ₹${grand.toFixed(0)}`}
          </Button>
          {!pinIsServiceable && <p className="text-xs text-center text-muted-foreground">Pick a serviceable pincode to continue.</p>}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
