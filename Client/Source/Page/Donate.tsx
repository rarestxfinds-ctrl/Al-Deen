import { useMemo, useState } from "react";
import { Layout } from "@/Component/Layout/Index";
import { Container } from "@/Component/UI/Container";
import { Button } from "@/Component/UI/Button";
import { Input } from "@/Component/UI/Input";
import { SlidingPill } from "@/Component/UI/Sliding-Pill";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/Component/UI/Dropdown-Menu";
import { 
  Heart, 
  Repeat, 
  User, 
  ShieldCheck, 
  Trophy, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Wallet,
  Building2,
  Copy,
  ExternalLink,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/Hook/Use-Toast";

type Frequency = "one_time" | "daily" | "weekly" | "monthly" | "yearly";
type ProviderStep = "setup" | "choose_provider" | "stripe_redirect" | "paypal" | "manual";

const CURRENCIES = [
  { value: "USD", label: "USD $" }, { value: "EUR", label: "EUR €" },
  { value: "GBP", label: "GBP £" }, { value: "PKR", label: "PKR ₨" },
  { value: "INR", label: "INR ₹" }, { value: "SAR", label: "SAR ﷼" },
  { value: "AED", label: "AED د.إ" }, { value: "MYR", label: "MYR RM" },
  { value: "IDR", label: "IDR Rp" }, { value: "TRY", label: "TRY ₺" },
];

const CUSTOM_DETAILS = [
  { label: "Bank (IBAN)",    value: "GB00 EXAM PLE0 1234 5678 90" },
  { label: "SWIFT / BIC",    value: "EXAMPLEXXX" },
  { label: "Beneficiary",    value: "Al-Deen.org" },
  { label: "Bitcoin (BTC)",  value: "bc1qexampleexampleexampleexample" },
  { label: "Ethereum (ETH)", value: "0xExampleExampleExampleExampleExample" },
];

export default function Donate() {
  const [mode, setMode] = useState<"once" | "recurring">("once");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [currency, setCurrency] = useState<string>("USD");
  const [amount, setAmount] = useState<string>("25");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Checkout flow state machine within the main card container
  const [checkoutStep, setCheckoutStep] = useState<ProviderStep>("setup");
  const [loading, setLoading] = useState(false);

  const effectiveFreq: Frequency = mode === "once" ? "one_time" : frequency;
  const parsedAmount = parseFloat(amount) || 0;
  
  const currentCurrencyLabel = useMemo(
    () => CURRENCIES.find((c) => c.value === currency)?.label ?? "USD $",
    [currency]
  );

  const currencySymbol = useMemo(
    () => currentCurrencyLabel.split(" ")[1] ?? "",
    [currentCurrencyLabel]
  );

  const handleInitiateDonate = () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Enter an amount", description: "Please enter a valid donation amount.", variant: "destructive" });
      return;
    }
    setCheckoutStep("choose_provider");
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    setCheckoutStep("stripe_redirect");
    try {
      const res = await fetch("/api/create-stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, currency, frequency: effectiveFreq, type: "general" }),
      });
      if (!res.ok) throw new Error("Stripe unconfigured");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast({
        title: "Stripe not configured",
        description: "Stripe Payments needs to be enabled in Lovable Cloud. Try PayPal or Manual transfer alternative.",
        variant: "destructive",
      });
      setLoading(false);
      setCheckoutStep("choose_provider");
    }
  };

  const copyVal = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast({ title: "Copied" });
  };

  const paypalHref = `https://www.paypal.com/donate/?business=YOUR_PAYPAL_EMAIL&amount=${parsedAmount}&currency_code=${currency}`;
  const hasPaypalConfig = !!(import.meta.env as any).VITE_PAYPAL_CLIENT_ID;

  return (
    <Layout>
      <section className="pb-6 md:pb-8">
        <div className="container max-w-xl mx-auto space-y-4">
          
          {/* Interactive Allocation Hub */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-left block group focus:outline-none border border-border/40 bg-card rounded-2xl transition-all duration-200"
          >
            {!isExpanded ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs font-bold text-foreground">25% Support</p>
                  </div>
                  <div className="sm:hidden text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs font-bold text-foreground">50% Maintenance</p>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2.5 p-2 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-xs font-bold text-foreground">25% Charity</p>
                  </div>
                  <div className="hidden sm:block ml-auto text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    25% Personal Support
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    Gives me time to focus on development, continuous improvements, and managing the project.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    50% Maintenance
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    Dedicated to covering operational costs, infrastructure, software, and keeping the project running smoothly.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                    25% Charity
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    Allocated toward supporting impactful charitable causes and giving back to the community.
                  </p>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-[11px] text-muted-foreground leading-normal pt-2">
                  <strong className="text-foreground font-semibold">Reserve Stability Policy:</strong> All allocations are distributed by the end of each month, and project reserves carry over to future months to ensure stability where expenses exceed donations.
                </div>
              </div>
            )}
          </button>

          {/* Core App Execution / Checkout Container */}
          <Container className="!p-4 space-y-4 transition-all duration-200">
            {checkoutStep === "setup" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex justify-center">
                  <SlidingPill
                    size="md"
                    value={mode}
                    onChange={(v) => setMode(v as "once" | "recurring")}
                    options={[
                      { id: "once", label: "One Time" },
                      { id: "recurring", label: "Recurring" },
                    ]}
                  />
                </div>

                {mode === "recurring" && (
                  <div className="flex justify-center">
                    <SlidingPill
                      size="sm"
                      value={frequency}
                      onChange={(v) => setFrequency(v as Frequency)}
                      options={[
                        { id: "daily", label: "Daily" },
                        { id: "weekly", label: "Weekly" },
                        { id: "monthly", label: "Monthly" },
                        { id: "yearly", label: "Yearly" },
                      ]}
                    />
                  </div>
                )}

                <div className="flex items-stretch gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-auto min-w-[90px] justify-between px-3 font-medium text-sm h-10 border-border/40"
                      >
                        <span>{currentCurrencyLabel}</span>
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-50 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[240px] overflow-y-auto">
                      {CURRENCIES.map((c) => (
                        <DropdownMenuItem 
                          key={c.value} 
                          onClick={() => setCurrency(c.value)}
                          className="text-sm font-medium"
                        >
                          {c.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                      className="pl-9 text-base font-semibold h-10"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleInitiateDonate}
                  className="w-full font-bold uppercase tracking-widest text-[10px] h-12"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {effectiveFreq === "one_time" ? "Donate Now" : "Donate Recurring"}
                  {effectiveFreq !== "one_time" && <Repeat className="inline h-3 w-3 ml-2" />}
                </Button>
              </div>
            )}

            {/* Providers screen inside container */}
            {checkoutStep === "choose_provider" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckoutStep("setup")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Select Payment Option</h3>
                    <p className="text-[11px] text-muted-foreground">{currency} {parsedAmount.toFixed(2)} • {effectiveFreq.replace("_", " ")}</p>
                  </div>
                </div>

                <button
                  onClick={handleStripeCheckout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 hover:border-foreground/30 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><CreditCard className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground">Stripe Secure</div>
                    <div className="text-[11px] text-muted-foreground truncate">Credit or Debit Card Payments</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                </button>

                <button
                  onClick={() => setCheckoutStep("paypal")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 hover:border-foreground/30 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Wallet className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground">PayPal</div>
                    <div className="text-[11px] text-muted-foreground truncate">Pay via balance, direct bank link, or card</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                </button>

                <button
                  onClick={() => setCheckoutStep("manual")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 hover:border-foreground/30 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground">Other Transits</div>
                    <div className="text-[11px] text-muted-foreground truncate">Direct bank wire, IBAN infrastructure, or crypto assets</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                </button>
              </div>
            )}

            {checkoutStep === "stripe_redirect" && (
              <div className="flex flex-col items-center py-6 gap-3 animate-in fade-in duration-150">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Contacting gateway networks...</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCheckoutStep("choose_provider")}>Cancel</Button>
              </div>
            )}

            {checkoutStep === "paypal" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckoutStep("choose_provider")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold text-foreground">PayPal Checkout Gateway</span>
                </div>
                {!hasPaypalConfig ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                    PayPal client ID structures are unconfigured. Please declare <code className="font-mono bg-background/50 px-1 rounded text-foreground">VITE_PAYPAL_CLIENT_ID</code> variables inside runtime profiles to initialize live processing.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Click below to open safe external PayPal environments and finalize routing instructions.</p>
                    <Button asChild className="w-full h-10 font-semibold text-xs"><a href={paypalHref} target="_blank" rel="noreferrer">Continue to PayPal</a></Button>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full h-9 text-xs" onClick={() => setCheckoutStep("choose_provider")}>Back</Button>
              </div>
            )}

            {checkoutStep === "manual" && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCheckoutStep("choose_provider")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold text-foreground">Direct Manual Wire Details</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal mb-2">
                  Send exactly <strong className="text-foreground">{currency} {parsedAmount.toFixed(2)}</strong> using any architecture down below.
                </p>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {CUSTOM_DETAILS.map((d) => (
                    <div key={d.label} className="flex items-center gap-2 rounded-xl border border-border/40 px-3 py-1.5 bg-background/40">
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{d.label}</div>
                        <div className="text-xs font-mono truncate text-foreground">{d.value}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 hover:bg-muted" onClick={() => copyVal(d.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full h-9 text-xs mt-2" onClick={() => setCheckoutStep("choose_provider")}>Back</Button>
              </div>
            )}
          </Container>

          {/* Thin Thank You Container */}
          <Container className="!py-2.5 !px-4 text-center">
            <p className="text-xs text-muted-foreground">
              Every contribution directly supports our work. JazakAllahu Khairan.
            </p>
          </Container>
          
        </div>
      </section>
    </Layout>
  );
}