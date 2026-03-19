"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { toast, Toaster } from "sonner";
import { Mint, Wallet, getDecodedToken, getEncodedTokenV4 } from "@cashu/cashu-ts";
import BackButton from "@/components/BackButton";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface LightningInvoice {
  paymentRequest: string;
  quoteId: string;
  amount: number;
}

const BASE_URLS = [
  "https://api.nonkycai.com",
  "https://api.routstr.com",
  "https://ai.redsh1ft.com",
  "https://routstr.otrta.me",
  "https://privateprovider.xyz",
  "https://routstr.rewolf.dev",
];

const MINT_URL = "https://mint.minibits.cash/Bitcoin";
const POPULAR_AMOUNTS = [100, 500, 1000, 5000];
const API_KEY_STORAGE_KEY = "routstr_api_key";

export default function TopUpPage() {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cashu" | "lightning">("cashu");
  const [amount, setAmount] = useState("");
  const [cashuToken, setCashuToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [lightningInvoice, setLightningInvoice] = useState<LightningInvoice | null>(null);
  const [mintedTokens, setMintedTokens] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundedToken, setRefundedToken] = useState<string | null>(null);
  const [apiKeyBalance, setApiKeyBalance] = useState<number | null>(null);
  const [isCheckingApiKeyBalance, setIsCheckingApiKeyBalance] = useState(false);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const paymentCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPaymentCheck = useCallback(() => {
    if (paymentCheckRef.current) {
      clearTimeout(paymentCheckRef.current);
      paymentCheckRef.current = null;
    }
  }, []);

  const fetchApiKeyBalance = useCallback(async (key: string, providedBaseUrl?: string) => {
    if (!key) {
      setApiKeyBalance(null);
      setBaseUrl("");
      return;
    }

    setIsCheckingApiKeyBalance(true);
    setApiKeyBalance(null);

    if (!providedBaseUrl) {
      setBaseUrl("");
    }

    const urlsToCheck = providedBaseUrl ? [providedBaseUrl] : BASE_URLS;
    let foundValidBaseUrl = false;

    for (const url of urlsToCheck) {
      try {
        const response = await fetch(`${url}/v1/wallet/info`, {
          headers: { Authorization: `Bearer ${key}` },
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        setApiKeyBalance(data.balance / 1000);
        setBaseUrl(url);
        foundValidBaseUrl = true;
        break;
      } catch {
        // Keep probing other providers until one accepts the key.
      }
    }

    if (!foundValidBaseUrl) {
      setApiKeyBalance(null);
      if (!providedBaseUrl) {
        setBaseUrl("");
      }
    }

    setIsCheckingApiKeyBalance(false);
  }, []);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlApiKey = urlParams.get("apikey");
    const urlProviderUrl = urlParams.get("provider_url");

    if (urlApiKey) {
      setApiKey(urlApiKey);

      if (urlProviderUrl) {
        setBaseUrl(urlProviderUrl);
        void fetchApiKeyBalance(urlApiKey, urlProviderUrl);
      }

      return;
    }

    setApiKey(window.localStorage.getItem(API_KEY_STORAGE_KEY) || "");
  }, [fetchApiKeyBalance]);

  useEffect(() => {
    if (!apiKey) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }

      setApiKeyBalance(null);
      setBaseUrl("");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }

    void fetchApiKeyBalance(apiKey, baseUrl || undefined);
  }, [apiKey, baseUrl, fetchApiKeyBalance]);

  useEffect(() => clearPaymentCheck, [clearPaymentCheck]);

  const getMaskedApiKey = (key: string) => {
    if (key.length <= 4) {
      return key;
    }

    return `****************${key.slice(-4)}`;
  };

  const performTopUp = useCallback(
    async (token?: string) => {
      const tokenToUse = token || (paymentMethod === "cashu" ? cashuToken : mintedTokens) || "";

      if (!apiKey) {
        toast.error("Enter an API key first.");
        return;
      }

      if (!baseUrl) {
        toast.error("Unable to detect the provider for this API key.");
        return;
      }

      if (!tokenToUse) {
        toast.error("Provide a Cashu token or mint one over Lightning first.");
        return;
      }

      setIsProcessing(true);

      try {
        const response = await fetch(
          `${baseUrl}/v1/wallet/topup?cashu_token=${encodeURIComponent(tokenToUse)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          toast.error("Top-up failed.");
          return;
        }

        toast.success("Top-up successful.");
        setCashuToken("");
        setMintedTokens(null);
        setAmount("");
        setLightningInvoice(null);
        await fetchApiKeyBalance(apiKey, baseUrl);
      } catch {
        toast.error("An error occurred during top-up.");
      } finally {
        setIsProcessing(false);
      }
    },
    [apiKey, baseUrl, cashuToken, fetchApiKeyBalance, mintedTokens, paymentMethod]
  );

  const checkPaymentStatus = useCallback(
    async (quoteId: string, quoteAmount: number) => {
      const mint = new Mint(MINT_URL);
      const wallet = new Wallet(mint);
      await wallet.loadMint();

      let attempts = 0;

      const checkPayment = async () => {
        if (attempts >= 40) {
          clearPaymentCheck();
          return;
        }

        try {
          const mintQuote = await wallet.checkMintQuote(quoteId);

          if (mintQuote.state === "PAID") {
            const proofs = await wallet.mintProofs(quoteAmount, quoteId);
            const token = getEncodedTokenV4({
              mint: MINT_URL,
              proofs: proofs.map((proof) => ({
                id: proof.id,
                amount: proof.amount,
                secret: proof.secret,
                C: proof.C,
              })),
            });

            setMintedTokens(token);
            setLightningInvoice(null);
            clearPaymentCheck();
            toast.success("Payment received.");
            await performTopUp(token);
            return;
          }
        } catch {
          // Keep polling for quote settlement.
        }

        attempts += 1;
        paymentCheckRef.current = setTimeout(checkPayment, 5000);
      };

      await checkPayment();
    },
    [clearPaymentCheck, performTopUp]
  );

  const generateLightningInvoice = async () => {
    const parsedAmount = Number.parseInt(amount, 10);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount in sats.");
      return;
    }

    clearPaymentCheck();
    setIsGeneratingInvoice(true);

    try {
      const mint = new Mint(MINT_URL);
      const wallet = new Wallet(mint);
      await wallet.loadMint();
      const mintQuote = await wallet.createMintQuote(parsedAmount);

      setLightningInvoice({
        paymentRequest: mintQuote.request,
        quoteId: mintQuote.quote,
        amount: parsedAmount,
      });

      void checkPaymentStatus(mintQuote.quote, parsedAmount);
    } catch {
      toast.error("Failed to generate Lightning invoice.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleRefund = async () => {
    if (!apiKey || !baseUrl) {
      toast.error("Enter a valid API key first.");
      return;
    }

    setIsRefunding(true);

    try {
      const response = await fetch(`${baseUrl}/v1/wallet/refund`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        toast.error("Refund failed.");
        return;
      }

      const data = await response.json();
      const decodedToken = getDecodedToken(data.token);
      const mint = new Mint(decodedToken.mint);
      const wallet = new Wallet(mint);
      await wallet.loadMint();

      const receivedProofs = await wallet.receive(data.token);

      if (receivedProofs.length === 0) {
        toast.error("Refund failed.");
        return;
      }

      const token = getEncodedTokenV4({
        mint: decodedToken.mint,
        proofs: receivedProofs.map((proof) => ({
          id: proof.id,
          amount: proof.amount,
          secret: proof.secret,
          C: proof.C,
        })),
      });

      setRefundedToken(token);
      toast.success("Refund successful.");
      await fetchApiKeyBalance(apiKey, baseUrl);
    } catch {
      toast.error("Refund failed.");
    } finally {
      setIsRefunding(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <SiteShell className="font-mono">
      <section className="relative py-12 md:py-20">
        <PageContainer className="w-full text-left">
          <BackButton
            fallbackHref="/"
            className="mb-12 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </BackButton>
          <h1 className="mb-4 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            Top-up
          </h1>
          <p className="max-w-xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
            Add funds to your Routstr API key using Cashu tokens or Bitcoin Lightning.
          </p>
        </PageContainer>
        <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative py-16 md:py-20">
        <PageContainer className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="space-y-10 lg:col-span-7 lg:space-y-12">
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold tracking-widest text-muted-foreground">
                  Target API Key
                </h2>
                {apiKey && !showFullApiKey ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowFullApiKey(true)}
                    className="text-[10px] text-foreground hover:underline"
                  >
                    Edit
                  </Button>
                ) : null}
              </div>

              {apiKey && !showFullApiKey ? (
                <div className="flex items-center justify-between rounded border border-border bg-card p-4">
                  <span className="font-mono text-sm text-foreground">{getMaskedApiKey(apiKey)}</span>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    className="h-12 border-border bg-card text-white placeholder:text-muted-foreground"
                    placeholder="sk-..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Enter the API key you wish to fund.
                  </p>
                </div>
              )}

              {apiKey ? (
                <div className="mt-6 rounded border border-border bg-black/20 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="text-foreground">
                        {baseUrl.replace("https://", "") || "Discovering..."}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-bold text-foreground">
                        {isCheckingApiKeyBalance
                          ? "..."
                          : apiKeyBalance !== null
                            ? `${apiKeyBalance.toFixed(2)} sats`
                            : "-"}
                      </span>
                    </div>
                  </div>

                  {apiKeyBalance !== null && apiKeyBalance >= 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleRefund}
                      disabled={isRefunding}
                      className="mt-4 h-auto px-0 py-0 text-[10px] font-bold text-red-500/70 transition-colors hover:text-red-500"
                    >
                      {isRefunding ? "Processing refund..." : "Withdraw balance"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="mb-6 text-sm font-bold tracking-widest text-muted-foreground">
                Payment Method
              </h2>
              <Tabs
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "cashu" | "lightning")}
              >
                <TabsList variant="line" className="h-10 w-full">
                  <TabsTrigger value="cashu" className="h-8 text-xs font-medium">
                    Cashu Token
                  </TabsTrigger>
                  <TabsTrigger value="lightning" className="h-8 text-xs font-medium">
                    Lightning
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {paymentMethod === "cashu" ? (
              <div className="space-y-6">
                <Textarea
                  value={cashuToken}
                  onChange={(event) => setCashuToken(event.target.value)}
                  className="min-h-40 border-border bg-card px-4 py-3 font-mono text-xs text-muted-foreground placeholder:text-muted-foreground"
                  placeholder="cashuA..."
                  rows={6}
                />
                <Button
                  onClick={() => void performTopUp()}
                  disabled={isProcessing || !cashuToken || !apiKey}
                  className="w-full py-6"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Top-up"}
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {POPULAR_AMOUNTS.map((presetAmount) => (
                    <Button
                      key={presetAmount}
                      variant={amount === presetAmount.toString() ? "secondary" : "outline"}
                      onClick={() => setAmount(presetAmount.toString())}
                      className="h-10 border-border bg-card px-0 font-mono text-xs text-muted-foreground hover:bg-muted"
                    >
                      {presetAmount}
                    </Button>
                  ))}
                </div>

                <Input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 border-border bg-card text-white placeholder:text-muted-foreground"
                  placeholder="Custom amount (sats)"
                />

                {lightningInvoice ? (
                  <div className="flex flex-col items-center gap-6 rounded border border-border bg-card py-6 sm:gap-8 sm:py-8">
                    <div className="rounded bg-white p-2">
                      <QRCode value={lightningInvoice.paymentRequest} size={160} />
                    </div>
                    <div className="w-full space-y-4 px-4 sm:px-8">
                      <div className="flex items-center justify-between border-b border-border pb-2 font-mono text-[10px]">
                        <span className="text-muted-foreground">Invoice</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            void navigator.clipboard.writeText(lightningInvoice.paymentRequest);
                            toast.success("Copied.");
                          }}
                          className="h-auto px-0 py-0 text-foreground hover:underline"
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="break-all font-mono text-[10px] text-muted-foreground opacity-50">
                        {lightningInvoice.paymentRequest}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => void generateLightningInvoice()}
                    disabled={isGeneratingInvoice || !amount}
                    variant="outline"
                    className="w-full border-border py-6 text-white"
                  >
                    {isGeneratingInvoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Generate Invoice"
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-8 lg:col-span-5">
            <div className="border border-border bg-card/30 p-5 sm:p-8">
              <h3 className="mb-6 text-sm font-bold text-white">How It Works</h3>
              <div className="space-y-6 text-xs leading-relaxed text-muted-foreground">
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">01</span>
                  <p>
                    Your API key is associated with a specific provider. Routstr
                    automatically detects which one.
                  </p>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">02</span>
                  <p>
                    Payment is handled via <strong className="text-foreground">Cashu ecash</strong>.
                    If you use Lightning, the page mints tokens for you automatically.
                  </p>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">03</span>
                  <p>
                    Once the token is redeemed by the provider, your balance updates immediately.
                    No confirmation wait times.
                  </p>
                </div>
              </div>
            </div>

            {refundedToken ? (
              <div className="rounded border border-green-500/20 bg-green-500/5 p-6">
                <h3 className="mb-4 text-xs font-bold tracking-widest text-green-500">
                  Refund issued
                </h3>
                <div className="mb-4 overflow-hidden border border-green-500/20 bg-black/40 p-3">
                  <p className="line-clamp-4 break-all font-mono text-[9px] text-green-500/70">
                    {refundedToken}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(refundedToken);
                    toast.success("Copied.");
                  }}
                  className="flex items-center gap-2 px-0 text-[10px] font-bold text-foreground"
                >
                  Copy token <Copy className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>
        </PageContainer>
        <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <Toaster richColors position="bottom-right" theme="dark" />
    </SiteShell>
  );
}
