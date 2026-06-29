import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSiteSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["site_settings"],
    queryFn: fetchSiteSettings,
  });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    whatsapp_number: "",
    phone_number: "",
    whatsapp_prefill: "",
    medical_disclaimer: "",
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const current = settings ?? DEFAULT_SETTINGS;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const rows = [
      { key: "whatsapp_number", value: form.whatsapp_number.replace(/\s/g, "") },
      { key: "phone_number", value: form.phone_number.replace(/\s/g, "") },
      { key: "whatsapp_prefill", value: form.whatsapp_prefill },
      { key: "medical_disclaimer", value: form.medical_disclaimer },
    ];
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Settings saved");
      await refetch();
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Site Settings</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Update the WhatsApp and call numbers shown on the floating buttons across the site.
      </p>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Contact Numbers</CardTitle>
            <CardDescription>
              These numbers power the floating WhatsApp and call buttons on every page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
              <Input
                id="whatsapp_number"
                value={form.whatsapp_number || current.whatsapp_number}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
                placeholder="919999999999"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full number without the + or spaces (e.g. 919999999999).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone_number">Support Call Number</Label>
              <Input
                id="phone_number"
                value={form.phone_number || current.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                placeholder="+919999999999"
              />
              <p className="text-xs text-muted-foreground">
                Enter the number with the + prefix (e.g. +919999999999).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp_prefill">WhatsApp Prefill Message</Label>
              <Textarea
                id="whatsapp_prefill"
                value={form.whatsapp_prefill || current.whatsapp_prefill}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_prefill: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Message that appears automatically when a customer taps the WhatsApp button.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="medical_disclaimer">Medical Disclaimer</Label>
              <Textarea
                id="medical_disclaimer"
                value={form.medical_disclaimer || current.medical_disclaimer}
                onChange={(e) => setForm((f) => ({ ...f, medical_disclaimer: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown on plans tagged with health conditions (low-gi, diabetic-friendly, pcos-friendly, heart-healthy).
              </p>
            </div>


            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
