import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import bowlAsset from "@/assets/brand/amrutam-bowl.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Amrutam" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  component: AuthPage,
});

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  // default to India country code
  if (digits.length === 10) return "+91" + digits;
  return "+" + digits;
}

function AuthPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pincode, setPincode] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      const to = redirect || (isAdmin ? "/admin" : "/");
      navigate({ to, replace: true });
    }
  }, [authLoading, user, isAdmin, navigate, redirect]);

  const sendOtp = async (e: React.FormEvent, preferredChannel: "whatsapp" | "sms" = channel) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          channel: preferredChannel,
          data: name ? { name } : undefined,
        },
      });
      if (error) throw error;
      setPhone(normalized);
      setChannel(preferredChannel);
      setStep("otp");
      setOtp("");
      toast.success(preferredChannel === "whatsapp" ? "OTP sent on WhatsApp! Check your messages." : "OTP sent via SMS.");
    } catch (err: any) {
      toast.error(err.message || "Could not send OTP");
    } finally { setLoading(false); }
  };

  const switchToSms = async (e: React.FormEvent) => {
    await sendOtp(e, "sms");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      // Persist name + pincode onto the profile (handle_new_user trigger creates the row).
      const uid = data.user?.id;
      if (uid && (name || pincode)) {
        await supabase.from("profiles").update({
          ...(name ? { name } : {}),
          ...(pincode ? { pincode } : {}),
        }).eq("id", uid);
      }
      toast.success("Signed in!");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={bowlAsset.url} alt="" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-2xl font-bold text-primary">Amrutam</span>
        </Link>
        <h1 className="mt-5 font-display text-2xl font-bold">
          {step === "phone" ? "Sign in with phone" : "Enter the OTP"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "phone"
            ? "We'll send a 6-digit code to your WhatsApp. No password needed."
            : `Code sent ${channel === "whatsapp" ? "on WhatsApp" : "via SMS"} to ${phone}`}
        </p>

        {step === "phone" ? (
          <form onSubmit={(e) => sendOtp(e, "whatsapp")} className="mt-6 space-y-4">
            <div>
              <Label>Name <span className="text-muted-foreground">(new users)</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Phone number</Label>
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">10-digit Indian numbers auto-prefix +91.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send OTP on WhatsApp"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div>
              <Label>6-digit code</Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </Button>
            <div className="flex flex-col items-center gap-2">
              {channel === "whatsapp" && (
                <button
                  type="button"
                  onClick={switchToSms}
                  disabled={loading}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Didn't get it on WhatsApp? Send via SMS
                </button>
              )}
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Change phone number
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
