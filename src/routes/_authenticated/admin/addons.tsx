import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { uploadMealImage } from "@/lib/storage";
import { MealImage } from "@/components/MealImage";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Addon = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_inr: number;
  category: string;
  food_type: "veg" | "non-veg" | "egg" | "jain";
  allergens: string[] | null;
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/addons")({
  component: AddonsPage,
});

const CATS = ["side", "drink", "dessert", "fruit", "extra"] as const;
const FOODS = ["veg", "non-veg", "egg", "jain"] as const;
const ALLERGENS = ["dairy", "gluten", "nuts", "soy", "egg", "seafood"];

function empty(): Partial<Addon> {
  return { name: "", description: "", price_inr: 0, category: "extra", food_type: "veg", allergens: [], is_active: true, image_url: "" };
}

function AddonsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Addon> | null>(null);
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["addons-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("add_ons").select("*").order("category").order("name");
      if (error) throw error;
      return data as Addon[];
    },
  });

  const save = useMutation({
    mutationFn: async (a: Partial<Addon>) => {
      const payload: any = { ...a };
      if (a.id) { const { error } = await supabase.from("add_ons").update(payload).eq("id", a.id); if (error) throw error; }
      else { delete payload.id; const { error } = await supabase.from("add_ons").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons-admin"] }); setOpen(false); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("add_ons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons-admin"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const onFile = async (f: File) => {
    setUploading(true);
    try { const p = await uploadMealImage(f); setEditing((e) => ({ ...e, image_url: p })); toast.success("Image uploaded"); }
    catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const toggleAllergen = (a: string) => {
    const cur = editing?.allergens ?? [];
    setEditing({ ...editing, allergens: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Add-ons</h1>
          <p className="text-muted-foreground">Extras customers can attach to a subscription (chapatis, drinks, fruits, eggs, paneer, etc.).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty())}><Plus className="h-4 w-4 mr-2" />New add-on</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} add-on</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Image</Label>
                <div className="flex items-center gap-3 mt-1">
                  <MealImage path={editing?.image_url} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} disabled={uploading} />
                </div>
              </div>
              <div className="md:col-span-2"><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={editing?.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Food type</Label>
                <Select value={editing?.food_type} onValueChange={(v) => setEditing({ ...editing, food_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOODS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Price (₹)</Label><Input type="number" step="1" value={editing?.price_inr ?? 0} onChange={(e) => setEditing({ ...editing, price_inr: +e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Allergens</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALLERGENS.map((a) => {
                    const on = (editing?.allergens ?? []).includes(a);
                    return (
                      <button key={a} type="button" onClick={() => toggleAllergen(a)}
                        className={`px-3 py-1 text-xs rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Switch checked={!!editing?.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
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
        {list.data?.length === 0 && <p className="text-muted-foreground">No add-ons yet.</p>}
        {list.data?.map((a) => (
          <Card key={a.id} className="overflow-hidden flex flex-col">
            <MealImage path={a.image_url} alt={a.name} className="h-32 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{a.name}</h3>
                  <div className="text-xs text-muted-foreground capitalize">{a.category} · {a.food_type}</div>
                </div>
                <div className="font-bold">₹{Number(a.price_inr).toFixed(0)}</div>
              </div>
              {a.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
              {!a.is_active && <div className="mt-1 text-xs text-amber-600">Inactive</div>}
              <div className="mt-3 flex gap-2 pt-3 border-t">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete add-on?")) del.mutate(a.id); }}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
