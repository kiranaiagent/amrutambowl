import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MealImage } from "@/components/MealImage";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

type Item = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_inr: number;
  food_type: "veg" | "non-veg" | "egg" | "jain";
  is_available: boolean;
  is_addon: boolean;
  status: string;
};

export const Route = createFileRoute("/_authenticated/admin/addons")({
  component: AddonsPage,
});

function AddonsPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["addons-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,description,image_url,price_inr,food_type,is_available,is_addon,status")
        .eq("is_addon", true)
        .order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const toggleAddon = useMutation({
    mutationFn: async ({ id, is_addon }: { id: string; is_addon: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_addon }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addons-admin"] }); qc.invalidateQueries({ queryKey: ["menu_items"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Add-ons</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Add-ons are menu items with the <em>"Also available as an add-on"</em> flag turned on.
            Manage them from the <Link to="/admin/menu" className="text-primary underline">Menu Items</Link> page.
          </p>
        </div>
        <Link to="/admin/menu"><Button variant="outline">Go to Menu Items <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {list.data?.length === 0 && (
          <p className="text-muted-foreground">No add-ons yet. Open a menu item and turn on "Also available as an add-on".</p>
        )}
        {list.data?.map((a) => (
          <Card key={a.id} className="overflow-hidden flex flex-col">
            <MealImage path={a.image_url} alt={a.name} className="h-32 w-full object-cover" />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{a.name}</h3>
                  <div className="text-xs text-muted-foreground capitalize">{a.food_type}</div>
                  <div className="mt-1 flex gap-1.5">
                    {!a.is_available && <Badge variant="destructive" className="text-[10px]">Sold out</Badge>}
                    {a.status !== "active" && <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>}
                  </div>
                </div>
                <div className="font-bold">₹{Number(a.price_inr).toFixed(0)}</div>
              </div>
              {a.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
              <div className="mt-3 flex items-center justify-between pt-3 border-t">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={a.is_addon} onCheckedChange={(v) => toggleAddon.mutate({ id: a.id, is_addon: v })} />
                  Show as add-on
                </label>
                <Link to="/admin/menu" className="text-xs text-primary hover:underline">Edit in Menu</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
