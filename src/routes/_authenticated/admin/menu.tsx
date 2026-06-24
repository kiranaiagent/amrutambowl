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
import { Pencil, Plus, Trash2, Copy } from "lucide-react";
import { StatusBadge, StatusControl, StatusFilterTabs, type ContentStatus } from "@/components/admin/StatusControl";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

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
  food_type: "veg" | "non-veg" | "egg" | "jain";
  allergens: string[] | null;
  tags: string[] | null;
  meal_type: MealType;
  serving_size: string | null;
  is_available: boolean;
  status: ContentStatus;
};

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: MenuPage,
});

const FOOD_TYPES = ["veg", "non-veg", "egg", "jain"] as const;
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const TAG_OPTIONS = ["keto", "high-protein", "low-carb", "gluten-free"];

function emptyItem(): Partial<Item> {
  return {
    name: "", description: "", price_inr: 0, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
    food_type: "veg", allergens: [], tags: [], meal_type: "lunch", serving_size: "",
    is_available: true, status: "active", image_url: "",
  };
}

function MenuPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<ContentStatus | "all">("active");

  const items = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  const save = useMutation({
    mutationFn: async (it: Partial<Item>) => {
      const payload: any = { ...it, allergens: it.allergens || [], tags: it.tags || [] };
      if (it.id) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", it.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); qc.invalidateQueries({ queryKey: ["addons-admin"] }); setOpen(false); toast.success("Saved"); },
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

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Menu Items</h1>
          <p className="text-muted-foreground text-sm">One master catalog. Flag an item as an add-on to expose it as an extra.</p>
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {items.data?.length === 0 && <p className="text-muted-foreground">No menu items yet. Create your first one above.</p>}
        {items.data?.filter((it) => filter === "all" || it.status === filter).map((it) => (
          <Card key={it.id} className={`overflow-hidden flex flex-col ${it.status === "archived" ? "opacity-60" : ""}`}>
            <MealImage path={it.image_url} alt={it.name} className="h-44 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                    <h3 className="font-semibold">{it.name}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {it.meal_type}{it.serving_size ? ` · ${it.serving_size}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={it.status} />
                    {!it.is_available && <Badge variant="destructive" className="text-[10px]">Sold out</Badge>}
                    {!it.is_available && <Badge variant="destructive" className="text-[10px]">Sold out</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">₹{Number(it.price_inr).toFixed(0)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div><div className="font-semibold">{it.calories}</div><div className="text-muted-foreground">kcal</div></div>
                <div><div className="font-semibold" style={{ color: "var(--color-protein)" }}>{it.protein_g}g</div><div className="text-muted-foreground">protein</div></div>
                <div><div className="font-semibold" style={{ color: "var(--color-carbs)" }}>{it.carbs_g}g</div><div className="text-muted-foreground">carbs</div></div>
                <div><div className="font-semibold" style={{ color: "var(--color-fat)" }}>{it.fat_g}g</div><div className="text-muted-foreground">fat</div></div>
              </div>
              {it.tags && it.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {it.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t items-center">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={it.is_available} onCheckedChange={(v) => toggleAvailable.mutate({ id: it.id, is_available: v })} />
                  Available
                </label>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
