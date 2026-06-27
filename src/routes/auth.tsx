import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Amrutam Bowl" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  component: AuthPage,
});

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  return "+" + digits;
}

function AuthPage() {
  const [tab, setTab] = useState<"customer" | "admin">("customer");

  // Customer (phone OTP) state
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pincode, setPincode] = useState("");
  const [otp, setOtp] = useState("");

  // Admin (email/password) state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        options: { channel: preferredChannel, data: name ? { name } : undefined },
      });
      if (error) throw error;
      setPhone(normalized);
      setChannel(preferredChannel);
      setStep("otp");
      setOtp("");
      toast.success(preferredChannel === "whatsapp" ? "Code sent on WhatsApp" : "Code sent via SMS");
    } catch (err: any) { toast.error(err.message || "Could not send OTP"); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      const uid = data.user?.id;
      if (uid && (name || pincode)) {
        await supabase.from("profiles").update({
          ...(name ? { name } : {}),
          ...(pincode ? { pincode } : {}),
        }).eq("id", uid);
      }
      toast.success("Signed in!");
    } catch (err: any) { toast.error(err.message || "Invalid OTP"); }
    finally { setLoading(false); }
  };

  const adminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
    } catch (err: any) { toast.error(err.message || "Sign in failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center bg-secondary/30 px-4 py-10">
        <Card className="w-full max-w-md p-6 md:p-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-center">Sign in to Amrutam Bowl</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Customers use phone + WhatsApp OTP. Admins sign in with email & password.
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="customer"><Phone className="h-3.5 w-3.5 mr-1.5" /> Customer</TabsTrigger>
              <TabsTrigger value="admin"><Mail className="h-3.5 w-3.5 mr-1.5" /> Admin</TabsTrigger>
            </TabsList>

            {/* Customer: phone OTP */}
            <TabsContent value="customer" className="mt-5">
              {step === "phone" ? (
                <form onSubmit={(e) => sendOtp(e, "whatsapp")} className="space-y-4">
                  <div>
                    <Label>Your name <span className="text-muted-foreground text-xs">(new users)</span></Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone number</Label>
                    <Input
                      type="tel" inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">10-digit Indian numbers auto-prefix +91.</p>
                  </div>
                  <div>
                    <Label>Delivery pincode <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      inputMode="numeric" maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending…" : "Send OTP on WhatsApp"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Code sent {channel === "whatsapp" ? "on WhatsApp" : "via SMS"} to <span className="font-medium text-foreground">{phone}</span>
                  </p>
                  <div>
                    <Label>6-digit code</Label>
                    <Input
                      inputMode="numeric" maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
                    {loading ? "Verifying…" : "Verify & sign in"}
                  </Button>
                  <div className="flex flex-col items-center gap-2 pt-1">
                    {channel === "whatsapp" && (
                      <button type="button" onClick={(e) => sendOtp(e, "sms")} disabled={loading}
                        className="text-sm text-primary font-medium hover:underline disabled:opacity-50">
                        Didn't get it? Send via SMS
                      </button>
                    )}
                    <button type="button" onClick={() => { setStep("phone"); setOtp(""); }}
                      className="text-sm text-muted-foreground hover:text-foreground">
                      ← Change phone number
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* Admin: email + password */}
            <TabsContent value="admin" className="mt-5">
              <form onSubmit={adminSignIn} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Admin accounts are provisioned by an existing administrator.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
