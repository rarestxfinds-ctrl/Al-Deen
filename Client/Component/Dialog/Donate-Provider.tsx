import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "Client/Component/UI/Dialog";
import { Button } from "Client/Component/UI/Button";
import { Input } from "Client/Component/UI/Input";
import { CreditCard, Wallet, Building2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "Client/Hook/Use-Toast";

type Frequency = "one_time" | "daily" | "weekly" | "monthly" | "yearly";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  amount: number;
  currency: string;
  frequency: Frequency;
  type: string;
}

// Custom (manual) donation details — edit these to your real info.
const CUSTOM_DETAILS: { label: string; value: string }[] = [
  { label: "Bank (IBAN)",      value: "GB00 EXAM PLE0 1234 5678 90" },
  { label: "SWIFT / BIC",      value: "EXAMPLEXXX" },
  { label: "Beneficiary",      value: "Al-Deen.org" },
  { label: "Bitcoin (BTC)",    value: "bc1qexampleexampleexampleexample" },
  { label: "Ethereum (ETH)",   value: "0xExampleExampleExampleExampleExample" },
];

export function DonateProviderModal({ open, onOpenChange, amount, currency, frequency, type }: Props) {
  const [provider, setProvider] = useState<"choose" | "stripe" | "paypal" | "other">("choose");
  const [loading, setLoading] = useState(false);

  const reset = () => { setProvider("choose"); setLoading(false); };

  const handleStripe = async () => {
    setLoading(true);
    try {
      // Will call an edge function `create-stripe-checkout` once Lovable Cloud + Stripe payments are enabled.
      const res = await fetch("/api/create-stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, frequency, type }),
      });
      if (!res.ok) throw new Error("Stripe is not yet enabled. Ask the developer to enable Lovable Cloud + Stripe Payments.");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: "Stripe not configured",
        description: "Stripe Payments needs to be enabled in Lovable Cloud first. Choose PayPal or Other in the meantime.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const copyVal = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast({ title: "Copied" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/40">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {provider === "choose" && "Choose Payment Method"}
              {provider === "stripe" && "Redirecting to Stripe…"}
              {provider === "paypal" && "Pay with PayPal"}
              {provider === "other" && "Manual Transfer"}
            </DialogTitle>
            <DialogDescription>
              {currency} {amount.toFixed(2)} • {frequency.replace("_", " ")} • {type.replace("_", " ")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {provider === "choose" && (
            <div className="grid gap-2">
              <ProviderButton
                icon={<CreditCard className="h-5 w-5" />}
                label="Stripe"
                desc="Card payment — fast & secure"
                onClick={() => { setProvider("stripe"); handleStripe(); }}
              />
              <ProviderButton
                icon={<Wallet className="h-5 w-5" />}
                label="PayPal"
                desc="Pay with your PayPal balance or card"
                onClick={() => setProvider("paypal")}
              />
              <ProviderButton
                icon={<Building2 className="h-5 w-5" />}
                label="Other (Custom)"
                desc="Bank transfer, crypto, or manual"
                onClick={() => setProvider("other")}
              />
            </div>
          )}

          {provider === "stripe" && (
            <div className="flex flex-col items-center py-8 gap-3">
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm text-muted-foreground">Opening Stripe checkout…</p>
                </>
              ) : (
                <Button variant="outline" onClick={() => setProvider("choose")}>Back</Button>
              )}
            </div>
          )}

          {provider === "paypal" && (
            <PaypalPanel amount={amount} currency={currency} onBack={() => setProvider("choose")} />
          )}

          {provider === "other" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Send {currency} {amount.toFixed(2)} using any of the methods below. Mark the transfer as <strong>{type}</strong>.
              </p>
              {CUSTOM_DETAILS.map((d) => (
                <div key={d.label} className="flex items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.label}</div>
                    <div className="text-sm font-mono truncate">{d.value}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyVal(d.value)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-3" onClick={() => setProvider("choose")}>Back</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderButton({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 hover:border-foreground/40 hover:bg-muted/40 transition-all text-left"
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function PaypalPanel({ amount, currency, onBack }: { amount: number; currency: string; onBack: () => void }) {
  const clientId = (import.meta.env as any).VITE_PAYPAL_CLIENT_ID as string | undefined;

  if (!clientId) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          PayPal is not configured yet. Add <code className="font-mono">VITE_PAYPAL_CLIENT_ID</code> in project settings to enable PayPal donations.
        </div>
        <Button variant="outline" className="w-full" onClick={onBack}>Back</Button>
      </div>
    );
  }

  // PayPal SDK link (Smart Buttons via direct script). Loaded on demand.
  const href = `https://www.paypal.com/donate/?business=YOUR_PAYPAL_EMAIL&amount=${amount}&currency_code=${currency}`;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">You'll be redirected to PayPal to complete the donation.</p>
      <Button asChild className="w-full"><a href={href} target="_blank" rel="noreferrer">Continue to PayPal</a></Button>
      <Button variant="outline" className="w-full" onClick={onBack}>Back</Button>
    </div>
  );
}
