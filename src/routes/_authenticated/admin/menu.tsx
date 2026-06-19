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
import { useState } from "react";
import { toast } from "sonner";
import { uploadMealImage } from "@/lib/storage";
import { MealImage } from "@/components/MealImage";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  category: string | null;
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: MenuPage,
});

const FOOD_TYPES = ["veg", "non-veg", "egg", "jain"] as const;
const TAG_OPTIONS = ["keto", "high-protein", "low-carb", "gluten-free"];

function emptyItem(): Partial<Item> {
  return { name: "", description: "", price_inr: 0, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, food_type: "veg", allergens: [], tags: [], category: "", is_active: true, image_url: "" };
}

function MenuPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [uploading, setUploading] = useState(false);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["menu_items"] }); setOpen(false); toast.success("Saved"); },
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
          <h1 className="font-display text-3xl font-bold">Menu Items</h1>
          <p className="text-muted-foreground">Hero photo, macros, food type and tags.</p>
        </div>
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
              <div><Label>Category</Label><Input value={editing?.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Lunch Bowl" /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label>Food type</Label>
                <Select value={editing?.food_type} onValueChange={(v) => setEditing({ ...editing, food_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOOD_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
              <div className="md:col-span-2 flex items-center gap-2">
                <Switch checked={!!editing?.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active (visible to customers)</Label>
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
        {items.data?.map((it) => (
          <Card key={it.id} className="overflow-hidden flex flex-col">
            <MealImage path={it.image_url} alt={it.name} className="h-44 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={it.food_type === "veg" || it.food_type === "jain" ? "veg-dot" : "nonveg-dot"} aria-hidden />
                    <h3 className="font-semibold">{it.name}</h3>
                  </div>
                  {it.category && <div className="text-xs text-muted-foreground">{it.category}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold">₹{Number(it.price_inr).toFixed(0)}</div>
                  {!it.is_active && <Badge variant="secondary" className="mt-1">Inactive</Badge>}
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
              <div className="mt-4 flex gap-2 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this item?")) del.mutate(it.id); }}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
