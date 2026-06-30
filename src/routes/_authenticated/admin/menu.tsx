import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { uploadMealImage } from "@/lib/storage";
import { MealImage } from "@/components/MealImage";
import { Pencil, Plus, Trash2, Copy, X } from "lucide-react";
import { StatusControl, StatusFilterTabs, type ContentStatus } from "@/components/admin/StatusControl";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Kind = "ingredient" | "bowl" | "beverage" | "snack";
type ComponentRole = "base" | "protein" | "vegetable" | "sauce" | "topping" | "other";

type Item = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_inr: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_index: number | null;
  sodium_mg: number | null;
  food_type: "veg" | "non-veg" | "egg" | "jain";
  allergens: string[] | null;
  tags: string[] | null;
  meal_type: MealType;
  serving_size: string | null;
  is_available: boolean;
  status: ContentStatus;
  kind: Kind;
  is_addon: boolean;
  component_role: ComponentRole | null;
};

type BowlComponent = {
  id: string;
  bowl_id: string;
  ingredient_id: string;
  quantity: number;
  is_default: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: MenuPage,
});

const FOOD_TYPES = ["veg", "non-veg", "egg", "jain"] as const;
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const KIND_OPTIONS: Kind[] = ["ingredient", "bowl", "beverage", "snack"];
const ROLE_OPTIONS: ComponentRole[] = ["base", "protein", "vegetable", "sauce", "topping", "other"];
const TAG_OPTIONS = ["keto", "high-protein", "low-carb", "gluten-free"];

const KIND_FILTERS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bowl", label: "Bowls" },
  { value: "ingredient", label: "Ingredients" },
  { value: "beverage", label: "Beverages" },
  { value: "snack", label: "Snacks" },
];

function emptyItem(): Partial<Item> {
  return {
    name: "", description: "", price_inr: 0, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    glycemic_index: null, sodium_mg: null,
    food_type: "veg", allergens: [], tags: [], meal_type: "lunch", serving_size: "",
    is_available: true, status: "active", image_url: "",
    kind: "ingredient", is_addon: false, component_role: null,
  };
}

function MenuPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<ContentStatus | "all">("active");
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");

  const items = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Item[];
    },
  });

  const save = useMutation({
    mutationFn: async (it: Partial<Item>) => {
      const payload: any = {
        ...it,
        allergens: it.allergens || [],
        tags: it.tags || [],
        component_role: it.kind === "ingredient" ? (it.component_role ?? null) : null,
      };
      if (it.id) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", it.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); setOpen(false); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      const { error } = await supabase.from("menu_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAvailable = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu_items"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("duplicate_menu_item", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); toast.success("Duplicated — find the copy in Inactive"); },
    onError: (e: any) => toast.error(e.message),
  });

  const onFile = async (f: File) => {
    setUploading(true);
    try {
      const path = await uploadMealImage(f);
      setEditing((e) => ({ ...e, image_url: path }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const toggleTag = (tag: string) => {
    setEditing((e) => {
      const cur = new Set(e?.tags ?? []);
      cur.has(tag) ? cur.delete(tag) : cur.add(tag);
      return { ...e, tags: [...cur] };
    });
  };

  const filtered = items.data?.filter((it) =>
    (filter === "all" || it.status === filter) &&
    (kindFilter === "all" || it.kind === kindFilter)
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Menu Items</h1>
          <p className="text-muted-foreground text-sm">Master catalog: bowls, ingredients, beverages, snacks. Mark anything as an add-on.</p>
        </div>
        <StatusFilterTabs value={filter} onChange={setFilter} counts={{
          all: items.data?.length,
          active: items.data?.filter((p) => p.status === "active").length,
          inactive: items.data?.filter((p) => p.status === "inactive").length,
          archived: items.data?.filter((p) => p.status === "archived").length,
        }} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyItem())}><Plus className="h-4 w-4 mr-2" /> New item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} menu item</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Image</Label>
                <div className="flex items-center gap-3 mt-1">
                  <MealImage path={editing?.image_url} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} disabled={uploading} />
                </div>
              </div>
              <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Kind</Label>
                <Select value={editing?.kind ?? "ingredient"} onValueChange={(v) => setEditing({ ...editing, kind: v as Kind, component_role: v === "ingredient" ? editing?.component_role ?? null : null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KIND_OPTIONS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editing?.kind === "ingredient" && (
                <div>
                  <Label>Component role</Label>
                  <Select value={editing?.component_role ?? "none"} onValueChange={(v) => setEditing({ ...editing, component_role: v === "none" ? null : (v as ComponentRole) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— none —</SelectItem>
                      {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Meal type</Label>
                <Select value={editing?.meal_type ?? "lunch"} onValueChange={(v) => setEditing({ ...editing, meal_type: v as MealType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_TYPES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Serving size / quantity</Label><Input value={editing?.serving_size ?? ""} onChange={(e) => setEditing({ ...editing, serving_size: e.target.value })} placeholder="e.g. 300g, 1 bowl, 250ml" /></div>
              <div>
                <Label>Food type</Label>
                <Select value={editing?.food_type} onValueChange={(v) => setEditing({ ...editing, food_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOOD_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Price (₹, incl. GST)</Label><Input type="number" step="0.01" value={editing?.price_inr ?? 0} onChange={(e) => setEditing({ ...editing, price_inr: +e.target.value })} /></div>
              <div><Label>Calories</Label><Input type="number" value={editing?.calories ?? 0} onChange={(e) => setEditing({ ...editing, calories: +e.target.value })} /></div>
              <div><Label>Protein (g)</Label><Input type="number" step="0.1" value={editing?.protein_g ?? 0} onChange={(e) => setEditing({ ...editing, protein_g: +e.target.value })} /></div>
              <div><Label>Carbs (g)</Label><Input type="number" step="0.1" value={editing?.carbs_g ?? 0} onChange={(e) => setEditing({ ...editing, carbs_g: +e.target.value })} /></div>
              <div><Label>Fat (g)</Label><Input type="number" step="0.1" value={editing?.fat_g ?? 0} onChange={(e) => setEditing({ ...editing, fat_g: +e.target.value })} /></div>
              <div><Label>Fiber (g)</Label><Input type="number" step="0.1" value={editing?.fiber_g ?? 0} onChange={(e) => setEditing({ ...editing, fiber_g: +e.target.value })} /></div>
              <div><Label>Glycemic Index</Label><Input type="number" min={0} max={150} value={editing?.glycemic_index ?? ""} placeholder="e.g. 55" onChange={(e) => setEditing({ ...editing, glycemic_index: e.target.value === "" ? null : +e.target.value })} /></div>
              <div><Label>Sodium (mg)</Label><Input type="number" step="1" value={editing?.sodium_mg ?? ""} placeholder="e.g. 320" onChange={(e) => setEditing({ ...editing, sodium_mg: e.target.value === "" ? null : +e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Allergens (comma separated)</Label>
                <Input
                  value={(editing?.allergens ?? []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, allergens: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="dairy, nuts, gluten"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TAG_OPTIONS.map((t) => {
                    const on = editing?.tags?.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleTag(t)}
                        className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 rounded-md border p-3">
                <label className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">Available</div>
                    <div className="text-xs text-muted-foreground">Sold-out items stay active but aren't orderable.</div>
                  </div>
                  <Switch checked={editing?.is_available ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">Available as add-on</div>
                    <div className="text-xs text-muted-foreground">Show this item as an extra customers can add to any bowl/plan.</div>
                  </div>
                  <Switch checked={editing?.is_addon ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_addon: v })} />
                </label>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <Label>Status</Label>
                <Select value={editing?.status ?? "active"} onValueChange={(v) => setEditing({ ...editing, status: v as ContentStatus })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing?.kind === "bowl" && editing?.id && (
                <div className="md:col-span-2">
                  <BowlRecipeEditor bowlId={editing.id} allItems={items.data ?? []} />
                </div>
              )}
              {editing?.kind === "bowl" && !editing?.id && (
                <div className="md:col-span-2 text-xs text-muted-foreground rounded-md border border-dashed p-3">
                  Save this bowl first, then reopen it to build its recipe.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kind filter */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {KIND_FILTERS.map((k) => {
          const count = k.value === "all"
            ? items.data?.length
            : items.data?.filter((it) => it.kind === k.value).length;
          const active = kindFilter === k.value;
          return (
            <button
              key={k.value}
              onClick={() => setKindFilter(k.value)}
              className={`text-xs rounded-full px-3 py-1 border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-secondary/70"}`}
            >
              {k.label}{count != null && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {filtered?.length === 0 && <p className="text-muted-foreground">No menu items match these filters.</p>}
        {filtered?.map((it) => (
          <Card key={it.id} className={`overflow-hidden flex flex-col ${it.status === "archived" ? "opacity-60" : ""}`}>
            <div className="relative">
              <MealImage path={it.image_url} alt={it.name} className="h-32 w-full object-cover" />
              <div className="absolute top-1 left-1 flex gap-1">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">{it.kind}</Badge>
                {it.is_addon && <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white">Add-on</Badge>}
                {!it.is_available && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Sold out</Badge>}
              </div>
            </div>
            <div className="p-2.5 flex-1 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className={`mt-1 shrink-0 ${it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"}`} aria-hidden />
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{it.name}</h3>
                </div>
                <div className="text-sm font-bold whitespace-nowrap">₹{Number(it.price_inr).toFixed(0)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {it.meal_type}{it.serving_size ? ` · ${it.serving_size}` : ""}{it.component_role ? ` · ${it.component_role}` : ""}
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] leading-tight">
                <div><div className="font-semibold text-xs">{it.calories}</div><div className="text-muted-foreground">kcal</div></div>
                <div><div className="font-semibold text-xs" style={{ color: "var(--color-protein)" }}>{it.protein_g}</div><div className="text-muted-foreground">P</div></div>
                <div><div className="font-semibold text-xs" style={{ color: "var(--color-carbs)" }}>{it.carbs_g}</div><div className="text-muted-foreground">C</div></div>
                <div><div className="font-semibold text-xs" style={{ color: "var(--color-fat)" }}>{it.fat_g}</div><div className="text-muted-foreground">F</div></div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1.5 border-t">
                <Switch className="scale-75 -ml-1" checked={it.is_available} onCheckedChange={(v) => toggleAvailable.mutate({ id: it.id, is_available: v })} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(it); setOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicate.mutate(it.id)} disabled={duplicate.isPending} title="Copy"><Copy className="h-3.5 w-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{it.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently removes the item from your catalog. Existing orders keep their snapshot.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del.mutate(it.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="ml-auto">
                  <StatusControl status={it.status} label="item" onChange={(s) => setStatus.mutate({ id: it.id, status: s })} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
}

function BowlRecipeEditor({ bowlId, allItems }: { bowlId: string; allItems: Item[] }) {
  const qc = useQueryClient();
  const [pickIngredient, setPickIngredient] = useState<string>("");
  const [pickQty, setPickQty] = useState<number>(1);
  const [pickDefault, setPickDefault] = useState<boolean>(true);

  const ingredients = allItems.filter((i) => i.kind === "ingredient");

  const comps = useQuery({
    queryKey: ["bowl_components", bowlId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("bowl_components").select("*").eq("bowl_id", bowlId);
      if (error) throw error;
      return data as BowlComponent[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!pickIngredient) throw new Error("Pick an ingredient");
      const { error } = await (supabase as any).from("bowl_components").insert({
        bowl_id: bowlId, ingredient_id: pickIngredient, quantity: pickQty, is_default: pickDefault,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bowl_components", bowlId] });
      setPickIngredient(""); setPickQty(1); setPickDefault(true);
      toast.success("Component added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (c: Partial<BowlComponent> & { id: string }) => {
      const { error } = await (supabase as any).from("bowl_components").update(c).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bowl_components", bowlId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bowl_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bowl_components", bowlId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Recipe / Components</Label>
        <span className="text-[10px] text-muted-foreground">{comps.data?.length ?? 0} ingredient(s)</span>
      </div>

      <div className="space-y-1.5">
        {comps.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {comps.data?.length === 0 && <div className="text-xs text-muted-foreground">No components yet.</div>}
        {comps.data?.map((c) => {
          const ing = ingredientMap.get(c.ingredient_id);
          return (
            <div key={c.id} className="flex items-center gap-2 text-sm rounded border bg-secondary/30 px-2 py-1.5">
              <div className="flex-1 min-w-0 truncate">
                {ing?.name ?? "(unknown ingredient)"}
                {ing?.component_role && <span className="ml-1 text-[10px] text-muted-foreground capitalize">· {ing.component_role}</span>}
              </div>
              <Input
                type="number"
                step="0.1"
                className="h-7 w-20"
                value={c.quantity}
                onChange={(e) => update.mutate({ id: c.id, quantity: +e.target.value })}
              />
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Switch className="scale-75" checked={c.is_default} onCheckedChange={(v) => update.mutate({ id: c.id, is_default: v })} />
                Default
              </label>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove.mutate(c.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_80px_auto_auto] items-end gap-2 pt-2 border-t">
        <div>
          <Label className="text-[10px]">Add ingredient</Label>
          <Select value={pickIngredient} onValueChange={setPickIngredient}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Pick…" /></SelectTrigger>
            <SelectContent>
              {ingredients.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}{i.component_role ? ` (${i.component_role})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Qty</Label>
          <Input type="number" step="0.1" className="h-8" value={pickQty} onChange={(e) => setPickQty(+e.target.value)} />
        </div>
        <label className="flex flex-col items-center text-[10px] text-muted-foreground">
          Default
          <Switch className="mt-1" checked={pickDefault} onCheckedChange={setPickDefault} />
        </label>
        <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || !pickIngredient}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
