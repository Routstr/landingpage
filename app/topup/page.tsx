"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Loader2, ArrowLeft, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
import QRCode from "react-qr-code";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/BackButton";
import {
  Mint,
  Wallet,
  getDecodedToken,
  getEncodedTokenV4,
} from "@cashu/cashu-ts";

interface LightningInvoice {
  paymentRequest: string;
  quoteId: string;
  amount: number;
}

const TopUpPage = () => {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cashu" | "lightning">("cashu");
  const [amount, setAmount] = useState("");
  const [cashuToken, setCashuToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [lightningInvoice, setLightningInvoice] = useState<LightningInvoice | null>(null);
  const mintUrl = "https://mint.minibits.cash/Bitcoin";
  const [mintedTokens, setMintedTokens] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundedToken, setRefundedToken] = useState<string | null>(null);
  const paymentCheckRef = useRef<NodeJS.Timeout | null>(null);
  const [apiKeyBalance, setApiKeyBalance] = useState<number | null>(null);
  const [isCheckingApiKeyBalance, setIsCheckingApiKeyBalance] = useState(false);
  const [showFullApiKey, setShowFullApiKey] = useState(false);

  const fetchApiKeyBalance = useCallback(
    async (key: string, providedBaseUrl?: string) => {
      const BASE_URLS = [
        "https://api.nonkycai.com",
        "https://api.routstr.com",
        "https://ai.redsh1ft.com",
        "https://routstr.otrta.me",
        "https://privateprovider.xyz",
        "https://routstr.rewolf.dev",
      ];
      if (!key) {
        setApiKeyBalance(null);
        setBaseUrl("");
        return;
      }

      setIsCheckingApiKeyBalance(true);
      setApiKeyBalance(null);
      if (!providedBaseUrl) setBaseUrl("");

      let foundValidBaseUrl = false;
      const urlsToCheck = providedBaseUrl ? [providedBaseUrl] : BASE_URLS;

      for (const url of urlsToCheck) {
        try {
          const response = await fetch(`${url}/v1/wallet/info`, {
            headers: { Authorization: `Bearer ${key}` },
          });

          if (response.ok) {
            const data = await response.json();
            setApiKeyBalance(data.balance / 1000);
            setBaseUrl(url);
            foundValidBaseUrl = true;
            break;
          }
        } catch {}
      }

      if (!foundValidBaseUrl) {
        setApiKeyBalance(null);
      }
      setIsCheckingApiKeyBalance(false);
    },
    [],
  );

  const getMaskedApiKey = (key: string) => {
    if (key.length <= 4) return key;
    return "••••••••••••••••" + key.slice(-4);
  };

  const popularAmounts = [100, 500, 1000, 5000];

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlApiKey = urlParams.get("apikey");
      const urlProviderUrl = urlParams.get("provider_url");

      if (urlApiKey) {
        setApiKey(urlApiKey);
        if (urlProviderUrl) {
          setBaseUrl(urlProviderUrl);
          fetchApiKeyBalance(urlApiKey, urlProviderUrl);
        }
      } else {
        setApiKey(localStorage.getItem("routstr_api_key") || "");
      }
    }
  }, [fetchApiKeyBalance]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("routstr_api_key", apiKey);
      fetchApiKeyBalance(apiKey, baseUrl);
    }
  }, [apiKey, baseUrl, fetchApiKeyBalance]);

  const generateLightningInvoice = async () => {
    if (!amount || parseInt(amount) <= 0) return;
    setIsGeneratingInvoice(true);
    try {
      const mint = new Mint(mintUrl);
      const wallet = new Wallet(mint);
      await wallet.loadMint();
      const mintQuote = await wallet.createMintQuote(parseInt(amount));
      setLightningInvoice({
        paymentRequest: mintQuote.request,
        quoteId: mintQuote.quote,
        amount: parseInt(amount),
      });
      checkPaymentStatus(mintQuote.quote, parseInt(amount));
    } catch {
      toast.error("Failed to generate lightning invoice.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const checkPaymentStatus = async (quoteId: string, amount: number) => {
    const mint = new Mint(mintUrl);
    const wallet = new Wallet(mint);
    await wallet.loadMint();
    let attempts = 0;
    const checkPayment = async () => {
      if (attempts >= 40) return;
      try {
        const mintQuote = await wallet.checkMintQuote(quoteId);
        if (mintQuote.state === "PAID") {
          const proofs = await wallet.mintProofs(amount, quoteId);
          const token = getEncodedTokenV4({
            mint: mintUrl,
            proofs: proofs.map((p) => ({ id: p.id, amount: p.amount, secret: p.secret, C: p.C })),
          });
          setMintedTokens(token as string);
          toast.success("Payment received!");
          setLightningInvoice(null);
          await performTopUp(token as string);
          return;
        }
      } catch {}
      attempts++;
      paymentCheckRef.current = setTimeout(checkPayment, 5000);
    };
    checkPayment();
  };

  const performTopUp = async (token?: string) => {
    const tokenToUse = token || (paymentMethod === "cashu" ? cashuToken : mintedTokens) || "";
    if (!tokenToUse || !apiKey || !baseUrl) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${baseUrl}/v1/wallet/topup?cashu_token=${encodeURIComponent(tokenToUse)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      if (response.ok) {
        toast.success("Top-up successful!");
        setCashuToken("");
        setMintedTokens(null);
        setAmount("");
        fetchApiKeyBalance(apiKey, baseUrl);
      } else {
        toast.error("Top-up failed.");
      }
    } catch {
      toast.error("An error occurred during top-up.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!apiKey || !baseUrl) return;
    setIsRefunding(true);
    try {
      const response = await fetch(`${baseUrl}/v1/wallet/refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      const tokenMintUrl = getDecodedToken(data.token).mint;
      const mint = new Mint(tokenMintUrl);
      const wallet = new Wallet(mint);
      await wallet.loadMint();
      const receivedProofs = await wallet.receive(data.token);
      if (receivedProofs.length > 0) {
        const token = getEncodedTokenV4({
          mint: tokenMintUrl,
          proofs: receivedProofs.map((p) => ({ id: p.id, amount: p.amount, secret: p.secret, C: p.C })),
        });
        setRefundedToken(token as string);
        toast.success("Refund successful!");
        fetchApiKeyBalance(apiKey, baseUrl);
      }
    } catch {
      toast.error("Refund failed.");
    } finally {
      setIsRefunding(false);
    }
  };

  if (!mounted) return null;

  return (
    <SiteShell className="font-mono">
      <section className="py-12 md:py-20 relative">
        <PageContainer className="w-full text-left">
          <BackButton fallbackHref="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12">
            <ArrowLeft className="w-3 h-3" /> Back
          </BackButton>
          <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">Top-up</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl font-light leading-relaxed">
            Add funds to your Routstr API key using Cashu tokens or Bitcoin Lightning.
          </p>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      <section className="relative py-16 md:py-20">
        <PageContainer className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="space-y-10 lg:col-span-7 lg:space-y-12">
            {/* API Key Section */}
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-muted-foreground tracking-widest">Target API Key</h2>
                {apiKey && !showFullApiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowFullApiKey(true)}
                    className="text-[10px] text-foreground hover:underline"
                  >
                    Edit
                  </Button>
                )}
              </div>
              {apiKey && !showFullApiKey ? (
                <div className="flex items-center justify-between rounded border border-border bg-card p-4">
                  <span className="text-sm font-mono text-foreground">{getMaskedApiKey(apiKey)}</span>
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="h-12 border-border bg-card text-white placeholder:text-muted-foreground"
                    placeholder="sk-..."
                  />
                  <p className="text-[10px] text-muted-foreground">Enter the API key you wish to fund.</p>
                </div>
              )}

              {apiKey && (
                <div className="mt-6 rounded border border-border bg-black/20 p-4">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="text-foreground">{baseUrl.replace("https://", "") || "Discovering..."}</span>
                    </div>
                    <div className="text-right flex flex-col gap-1">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="text-foreground font-bold">
                        {isCheckingApiKeyBalance ? "..." : apiKeyBalance !== null ? `${apiKeyBalance.toFixed(2)} sats` : "—"}
                      </span>
                    </div>
                  </div>
                  {apiKeyBalance !== null && apiKeyBalance >= 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleRefund}
                      disabled={isRefunding}
                      className="mt-4 h-auto px-0 py-0 text-[10px] text-red-500/70 hover:text-red-500 transition-colors font-bold"
                    >
                      {isRefunding ? "Processing refund..." : "Withdraw balance"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-sm font-bold text-muted-foreground tracking-widest mb-6">Payment Method</h2>
              <Tabs
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "cashu" | "lightning")}
              >
                <TabsList variant="line" className="h-10 w-full">
                  <TabsTrigger
                    value="cashu"
                    className="h-8 text-xs font-medium"
                  >
                    Cashu Token
                  </TabsTrigger>
                  <TabsTrigger
                    value="lightning"
                    className="h-8 text-xs font-medium"
                  >
                    Lightning
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {paymentMethod === "cashu" ? (
              <div className="space-y-6">
                <Textarea
                  value={cashuToken}
                  onChange={(e) => setCashuToken(e.target.value)}
                  className="min-h-40 border-border bg-card px-4 py-3 text-xs font-mono text-muted-foreground placeholder:text-muted-foreground"
                  placeholder="cashuA..."
                  rows={6}
                />
                <Button onClick={() => performTopUp()} disabled={isProcessing || !cashuToken || !apiKey} className="w-full py-6">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Top-up"}
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {popularAmounts.map(amt => (
                    <Button
                      key={amt}
                      variant={amount === amt.toString() ? "secondary" : "outline"}
                      onClick={() => setAmount(amt.toString())}
                      className="h-10 border-border bg-card px-0 font-mono text-xs text-muted-foreground hover:bg-muted"
                    >
                      {amt}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 border-border bg-card text-white placeholder:text-muted-foreground"
                  placeholder="Custom amount (sats)"
                />
                
                {lightningInvoice ? (
                  <div className="flex flex-col items-center gap-6 rounded border border-border bg-card py-6 sm:gap-8 sm:py-8">
                    <div className="bg-white p-2 rounded">
                      <QRCode value={lightningInvoice.paymentRequest} size={160} />
                    </div>
                    <div className="w-full space-y-4 px-4 sm:px-8">
                      <div className="flex justify-between items-center text-[10px] font-mono border-b border-border pb-2">
                        <span className="text-muted-foreground">Invoice</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => { navigator.clipboard.writeText(lightningInvoice.paymentRequest); toast.success("Copied!"); }}
                          className="h-auto px-0 py-0 text-foreground hover:underline"
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground break-all font-mono opacity-50">{lightningInvoice.paymentRequest}</p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={generateLightningInvoice} disabled={isGeneratingInvoice || !amount} variant="outline" className="w-full py-6 border-border text-white">
                    {isGeneratingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Invoice"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-8 lg:col-span-5">
            <div className="border border-border bg-card/30 p-5 sm:p-8">
              <h3 className="text-sm font-bold text-white mb-6">How It Works</h3>
              <div className="space-y-6 text-xs leading-relaxed text-muted-foreground">
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">01</span>
                  <p>Your api key is associated with a specific hardware provider. Routstr automatically detects which one.</p>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">02</span>
                  <p>Payment is handled via <strong className="text-foreground">Cashu ecash</strong>. If using lightning, we mint tokens for you automatically.</p>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <span className="text-muted-foreground">03</span>
                  <p>Once the token is redeemed by the provider, your balance is updated instantly. No confirmation wait times.</p>
                </div>
              </div>
            </div>

            {refundedToken && (
              <div className="border border-green-500/20 bg-green-500/5 p-6 rounded">
                <h3 className="text-xs font-bold text-green-500 tracking-widest mb-4">Refund issued</h3>
                <div className="bg-black/40 p-3 border border-green-500/20 mb-4 overflow-hidden">
                  <p className="text-[9px] font-mono text-green-500/70 break-all line-clamp-4">{refundedToken}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => { navigator.clipboard.writeText(refundedToken); toast.success("Copied!"); }}
                  className="text-[10px] font-bold text-foreground flex items-center gap-2 px-0"
                >
                  Copy token <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </PageContainer>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
      <Toaster richColors position="bottom-right" theme="dark" />
    </SiteShell>
  );
};

export default TopUpPage;
