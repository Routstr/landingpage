"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import {
  Model,
  Provider,
  getProviderFromModelName,
  getModelNameWithoutProvider,
  fetchModels as fetchModelsDirect,
} from "@/app/data/models";
import { useModels } from "@/app/contexts/ModelsContext";
import { usePricingView } from "@/app/contexts/PricingContext";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Check
} from "lucide-react";

import { PriceCompChart } from "@/components/client/PriceCompChart";
import ReactMarkdown from "react-markdown";
import { ModelReviews } from "@/components/ModelReviews";
import { getLocalCashuToken, setLocalCashuToken } from "@/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CodeLanguage = "curl" | "javascript" | "python";

const codeTokenClasses = {
  command: "text-[#4FC1FF]",
  keyword: "text-[#C586C0]",
  string: "text-[#CE9178]",
  property: "text-[#9CDCFE]",
  symbol: "text-[#D4D4D4]",
  value: "text-[#DCDCAA]",
  plain: "text-[#D4D4D4]",
} as const;

type CodeTokenKind = keyof typeof codeTokenClasses;

function CodeTok({
  kind,
  children,
}: {
  kind: CodeTokenKind;
  children: ReactNode;
}) {
  return <span className={codeTokenClasses[kind]}>{children}</span>;
}

function decodeSegments(segments: string[]): string[] {
  return segments.map((s) => decodeURIComponent(s));
}

export default function ModelDetailPage() {
  const params = useParams();
  const { currency } = usePricingView();
  const { loading, error, findModel } = useModels();
  const [providersWithPricing, setProvidersWithPricing] = useState<{ provider: Provider; model: Model }[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [pricingLoading, setPricingLoading] = useState(true);
  const [apiSelectorOpen, setApiSelectorOpen] = useState(false);

  const modelIdParts = params.modelId as string[];
  const decodedModelIdParts = decodeSegments(modelIdParts);
  const decodedModelId = decodedModelIdParts.join("/");

  const [activeTab, setActiveTab] = useState<CodeLanguage>("curl");
  const [model, setModel] = useState<Model | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  const [idCopied, setIdCopied] = useState(false);

  const storageBaseUrl = (() => {
    const selected = providersWithPricing.find((p) => p.provider.id === selectedProviderId)?.provider || providersWithPricing[0]?.provider;
    const base = selected?.endpoint_url || "";
    if (!base) return "https://api.routstr.com";
    return base.replace(/\/v1$/, "");
  })();

  useEffect(() => {
    try {
      const existing = getLocalCashuToken(storageBaseUrl) || "";
      setTokenInput(existing);
    } catch {}
  }, [storageBaseUrl]);

  useEffect(() => {
    let active = true;
    async function loadModelData() {
      setPricingLoading(true);
      try {
        const foundModel = findModel(decodedModelId);
        if (foundModel) {
          setModel(foundModel);
          setNotFound(false);
        }

        await fetchModelsDirect((provider, newlyFetchedModels) => {
          if (!active) return;
          const modelInProvider = newlyFetchedModels.find((m) => m.id === decodedModelId);

          if (modelInProvider) {
            setModel((prev) => prev || modelInProvider);
            setNotFound(false);
            setProvidersWithPricing((prev) => {
              if (prev.some((p) => p.provider.id === provider.id)) return prev;
              const newEntry = { provider, model: modelInProvider };
              const next = [...prev, newEntry];
              return next.sort((a, b) => (a.model.sats_pricing?.completion ?? 0) - (b.model.sats_pricing?.completion ?? 0));
            });
            setSelectedProviderId((prev) => prev || provider.id);
          }
        });

        setModel((prev) => {
          if (!prev && active) setNotFound(true);
          return prev;
        });
      } catch (error) {
        console.error("Error loading model data:", error);
        setModel((prev) => {
          if (!prev && active) setNotFound(true);
          return prev;
        });
      } finally {
        if (active) setPricingLoading(false);
      }
    }
    loadModelData();
    return () => { active = false; };
  }, [decodedModelId, findModel]);

  if (loading && !model) {
    return (
      <main className="flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground font-mono">
        <Header />
        <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto w-full">
           <div className="h-4 bg-border rounded w-24 mb-12 animate-pulse" />
           <div className="h-10 bg-border rounded w-1/2 mb-4 animate-pulse" />
           <div className="h-4 bg-border rounded w-1/4 mb-12 animate-pulse" />
           <div className="space-y-4">
             <div className="h-4 bg-border rounded w-full animate-pulse" />
             <div className="h-4 bg-border rounded w-5/6 animate-pulse" />
           </div>
        </div>
        <div className="max-w-5xl mx-auto w-full mt-auto">
          <Footer />
        </div>
      </main>
    );
  }

  if (error || notFound) {
    return (
      <main className="flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground font-mono">
        <Header />
        <div className="flex-1 flex flex-col items-start justify-center px-6 md:px-12 max-w-5xl mx-auto w-full">
          <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">{error ? "Error" : "Model not found"}</h1>
          <p className="text-muted-foreground mb-8">{error || "The model you're looking for doesn't exist."}</p>
          <Button asChild variant="outline">
            <Link href="/models">Back to models</Link>
          </Button>
        </div>
        <div className="max-w-5xl mx-auto w-full mt-auto">
          <Footer />
        </div>
      </main>
    );
  }

  if (!model) return null;

  const provider = getProviderFromModelName(model.name);
  const displayName = getModelNameWithoutProvider(model.name);
  const selectedProvider = providersWithPricing.find((p) => p.provider.id === selectedProviderId)?.provider || providersWithPricing[0]?.provider;
  const providerBaseUrl = selectedProvider?.endpoint_url ? (selectedProvider.endpoint_url.endsWith("/v1") ? selectedProvider.endpoint_url : `${selectedProvider.endpoint_url.replace(/\/$/, "")}/v1`) : "";

  const copyModelId = () => {
    navigator.clipboard.writeText(model.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const doCopy = async () => {
    try {
      const tokenForCode = (tokenInput ?? "").trim();
      let code = "";
      if (activeTab === "curl") {
        code = `curl -X POST ${providerBaseUrl || "https://api.routstr.com/v1"}/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${tokenForCode}" \\\n  -d '{\n    "model": "${model?.id}",\n    "messages": [\n      { "role": "user", "content": "Hello Nostr" }\n    ]\n  }'\n`;
      } else if (activeTab === "javascript") {
        code = `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  baseURL: '${providerBaseUrl || "https://api.routstr.com/v1"}',\n  apiKey: '${tokenForCode}'\n});\n\nasync function main() {\n  const completion = await openai.chat.completions.create({\n    model: '${model?.id}',\n    messages: [\n      { role: 'user', content: 'Hello Nostr' }\n    ]\n  });\n  console.log(completion.choices[0].message);\n}\n\nmain();\n`;
      } else {
        code = `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${providerBaseUrl || "https://api.routstr.com/v1"}",\n    api_key="${tokenForCode}"\n)\n\ncompletion = client.chat.completions.create(\n    model="${model?.id}",\n    messages=[\n        {"role": "user", "content": "Hello Nostr"}\n    ]\n)\nprint(completion.choices[0].message.content)\n`;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground font-mono">
      <Header />

      <section className="py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <BackButton fallbackHref="/models" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12">
            <ArrowLeft className="w-3 h-3" /> Back to models
          </BackButton>

          <div className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-2 tracking-tight">{displayName}</h1>
              <p className="text-base md:text-lg text-muted-foreground mb-6 font-light italic leading-relaxed">by {provider}</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex max-w-full items-center gap-2 break-all rounded border border-border bg-muted px-3 py-1 text-[10px] font-mono text-muted-foreground">
                  <span className="text-muted-foreground">ID:</span> {model.id}
                </div>
                <button 
                  onClick={copyModelId}
                  className="p-1.5 rounded border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy model ID"
                >
                  {idCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href={`https://chat.routstr.com/?model=${encodeURIComponent(model.id)}`} target="_blank" rel="noopener noreferrer">
                Try model
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="w-full space-y-24">
            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">Description</h2>
              <div 
                className={`prose prose-sm md:prose-base prose-invert max-w-none text-muted-foreground leading-relaxed transition-all relative ${!descExpanded ? 'max-h-48 overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]' : ''}`}
              >
                <ReactMarkdown>{model.description || "No description available for this model."}</ReactMarkdown>
              </div>
              {model.description && model.description.length > 300 && (
                <button onClick={() => setDescExpanded(!descExpanded)} className="text-xs text-foreground hover:underline mt-4">
                  {descExpanded ? "Show less" : "Read full description"}
                </button>
              )}
            </div>

            {/* Pricing Comparison */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-8">Price Comparison</h2>
              {pricingLoading && providersWithPricing.length === 0 ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded border border-border" />)}
                </div>
              ) : (
                <PriceCompChart
                  data={providersWithPricing.map((entry) => ({
                    providerName: entry.provider.name,
                    promptPrice:
                      currency === "sats"
                        ? (entry.model.sats_pricing?.prompt || 0) * 1_000_000
                        : (entry.model.pricing?.prompt || 0) * 1_000_000,
                    completionPrice:
                      currency === "sats"
                        ? (entry.model.sats_pricing?.completion || 0) * 1_000_000
                        : (entry.model.pricing?.completion || 0) * 1_000_000,
                  }))}
                  currencyLabel={currency === "sats" ? "sats / 1M tokens" : "usd / 1M tokens"}
                  unitSuffix={currency === "sats" ? "sats/m" : "usd/m"}
                />
              )}
            </div>

            {/* Integration */}
            <div>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-foreground">Integration</h2>
                {providersWithPricing.length > 1 && (
                  <Popover open={apiSelectorOpen} onOpenChange={setApiSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 border-border bg-transparent text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {selectedProvider?.name || "Select provider"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-background border-border p-1 w-48">
                      {providersWithPricing.map(p => (
                        <button 
                          key={p.provider.id} 
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                          onClick={() => { setSelectedProviderId(p.provider.id); setApiSelectorOpen(false); }}
                        >
                          {p.provider.name}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="flex flex-col overflow-hidden rounded border border-border bg-card">
                <div className="flex flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as CodeLanguage)}
                    className="w-full sm:w-auto"
                  >
                    <TabsList variant="line" className="h-8 w-full justify-start overflow-x-auto whitespace-nowrap sm:w-auto">
                      {(["curl", "javascript", "python"] as CodeLanguage[]).map((lang) => (
                        <TabsTrigger
                          key={lang}
                          value={lang}
                          className="h-7 text-xs capitalize"
                        >
                          {lang}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={doCopy}
                    className="h-7 self-end text-[10px] text-muted-foreground hover:bg-transparent hover:text-foreground sm:self-auto"
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="p-4 overflow-x-auto min-h-[200px] bg-black/20">
                  <pre className="text-xs leading-relaxed text-[#D4D4D4] font-mono">
                    {activeTab === 'curl' && (
                      <code>
                        <CodeTok kind="command">curl</CodeTok>{" "}
                        <CodeTok kind="plain">-X POST</CodeTok>{" "}
                        <CodeTok kind="string">{providerBaseUrl || "https://api.routstr.com/v1"}/chat/completions</CodeTok>{" "}
                        <CodeTok kind="symbol">\</CodeTok><br/>
                        {"  "}<CodeTok kind="plain">-H</CodeTok>{" "}
                        <CodeTok kind="string">{"\"Content-Type: application/json\""}</CodeTok>{" "}
                        <CodeTok kind="symbol">\</CodeTok><br/>
                        {"  "}<CodeTok kind="plain">-H</CodeTok>{" "}
                        <CodeTok kind="string">{'"Authorization: Bearer "'}</CodeTok>
                        <Input
                          value={tokenInput} 
                          onChange={e => setTokenInput(e.target.value)} 
                          onBlur={() => setLocalCashuToken(storageBaseUrl, tokenInput || "")}
                          className="mx-0.5 inline-flex h-6 w-24 rounded-none border-x-0 border-t-0 border-b-border bg-transparent px-1 py-0 text-xs text-[#DCDCAA] shadow-none focus-visible:border-b-foreground focus-visible:ring-0"
                          placeholder="token"
                        />
                        <CodeTok kind="string">{'"'}</CodeTok>{" "}
                        <CodeTok kind="symbol">\</CodeTok><br/>
                        {"  "}<CodeTok kind="plain">-d</CodeTok>{" "}
                        <CodeTok kind="string">{"'{"}</CodeTok><br/>
                        {"    "}<CodeTok kind="property">{"\"model\": "}</CodeTok>
                        <CodeTok kind="string">{`"${model.id}"`}</CodeTok>,<br/>
                        {"    "}<CodeTok kind="property">{"\"messages\": ["}</CodeTok><br/>
                        {"      "}<CodeTok kind="symbol">{`{`}</CodeTok>{" "}
                        <CodeTok kind="property">{"\"role\": "}</CodeTok>
                        <CodeTok kind="string">{"\"user\""}</CodeTok>,{" "}
                        <CodeTok kind="property">{"\"content\": "}</CodeTok>
                        <CodeTok kind="string">{"\"Hello\""}</CodeTok>{" "}
                        <CodeTok kind="symbol">{`}`}</CodeTok><br/>
                        {"    "}<CodeTok kind="property">]</CodeTok><br/>
                        {"  "}<CodeTok kind="string">{"}'"}</CodeTok>
                      </code>
                    )}
                    {activeTab === 'javascript' && (
                      <code>
                        <CodeTok kind="keyword">import</CodeTok>{" "}
                        <CodeTok kind="value">OpenAI</CodeTok>{" "}
                        <CodeTok kind="keyword">from</CodeTok>{" "}
                        <CodeTok kind="string">{"'openai'"}</CodeTok>;<br/><br/>
                        <CodeTok kind="keyword">const</CodeTok>{" "}
                        <CodeTok kind="plain">openai</CodeTok> ={" "}
                        <CodeTok kind="keyword">new</CodeTok>{" "}
                        <CodeTok kind="value">OpenAI</CodeTok>(<CodeTok kind="symbol">{`{`}</CodeTok><br/>
                        {"  "}<CodeTok kind="property">baseURL</CodeTok>:{" "}
                        <CodeTok kind="string">{`'${providerBaseUrl || "https://api.routstr.com/v1"}'`}</CodeTok>,<br/>
                        {"  "}<CodeTok kind="property">apiKey</CodeTok>:{" "}
                        <CodeTok kind="string">{"'"}</CodeTok>
                        <Input
                          value={tokenInput} 
                          onChange={e => setTokenInput(e.target.value)} 
                          onBlur={() => setLocalCashuToken(storageBaseUrl, tokenInput || "")}
                          className="mx-0.5 inline-flex h-6 w-24 rounded-none border-x-0 border-t-0 border-b-border bg-transparent px-1 py-0 text-xs text-[#DCDCAA] shadow-none focus-visible:border-b-foreground focus-visible:ring-0"
                          placeholder="token"
                        />
                        <CodeTok kind="string">{"'"}</CodeTok><br/>
                        <CodeTok kind="symbol">{`}`}</CodeTok>);<br/><br/>
                        <CodeTok kind="keyword">async function</CodeTok>{" "}
                        <CodeTok kind="value">main</CodeTok>(){" "}
                        <CodeTok kind="symbol">{`{`}</CodeTok><br/>
                        {"  "}<CodeTok kind="keyword">const</CodeTok>{" "}
                        <CodeTok kind="plain">res</CodeTok> ={" "}
                        <CodeTok kind="keyword">await</CodeTok>{" "}
                        <CodeTok kind="plain">openai.chat.completions.create</CodeTok>(<CodeTok kind="symbol">{`{`}</CodeTok><br/>
                        {"    "}<CodeTok kind="property">model</CodeTok>:{" "}
                        <CodeTok kind="string">{`'${model.id}'`}</CodeTok>,<br/>
                        {"    "}<CodeTok kind="property">messages</CodeTok>: [<CodeTok kind="symbol">{`{`}</CodeTok>{" "}
                        <CodeTok kind="property">role</CodeTok>: <CodeTok kind="string">{"'user'"}</CodeTok>,{" "}
                        <CodeTok kind="property">content</CodeTok>: <CodeTok kind="string">{"'Hello'"}</CodeTok>{" "}
                        <CodeTok kind="symbol">{`}`}</CodeTok>]<br/>
                        {"  "}<CodeTok kind="symbol">{`}`}</CodeTok>);<br/>
                        <CodeTok kind="symbol">{`}`}</CodeTok>
                      </code>
                    )}
                    {activeTab === 'python' && (
                      <code>
                        <CodeTok kind="keyword">from</CodeTok>{" "}
                        <CodeTok kind="plain">openai</CodeTok>{" "}
                        <CodeTok kind="keyword">import</CodeTok>{" "}
                        <CodeTok kind="value">OpenAI</CodeTok><br/><br/>
                        <CodeTok kind="plain">client</CodeTok> = <CodeTok kind="value">OpenAI</CodeTok>(<br/>
                        {"    "}<CodeTok kind="property">base_url</CodeTok>=<CodeTok kind="string">{`"${providerBaseUrl || "https://api.routstr.com/v1"}"`}</CodeTok>,<br/>
                        {"    "}<CodeTok kind="property">api_key</CodeTok>=<CodeTok kind="string">{`"`}</CodeTok>
                        <Input
                          value={tokenInput} 
                          onChange={e => setTokenInput(e.target.value)} 
                          onBlur={() => setLocalCashuToken(storageBaseUrl, tokenInput || "")}
                          className="mx-0.5 inline-flex h-6 w-24 rounded-none border-x-0 border-t-0 border-b-border bg-transparent px-1 py-0 text-xs text-[#DCDCAA] shadow-none focus-visible:border-b-foreground focus-visible:ring-0"
                          placeholder="token"
                        />
                        <CodeTok kind="string">{`"`}</CodeTok><br/>
                        )<br/><br/>
                        <CodeTok kind="plain">res</CodeTok> = <CodeTok kind="plain">client.chat.completions.create</CodeTok>(<br/>
                        {"    "}<CodeTok kind="property">model</CodeTok>=<CodeTok kind="string">{`"${model.id}"`}</CodeTok>,<br/>
                        {"    "}<CodeTok kind="property">messages</CodeTok>=[<CodeTok kind="symbol">{`{`}</CodeTok><CodeTok kind="property">{"\"role\""}</CodeTok>: <CodeTok kind="string">{"\"user\""}</CodeTok>, <CodeTok kind="property">{"\"content\""}</CodeTok>: <CodeTok kind="string">{"\"Hello\""}</CodeTok><CodeTok kind="symbol">{`}`}</CodeTok>]<br/>
                        )
                      </code>
                    )}
                  </pre>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-8">Technical Specifications</h2>
              <div className="space-y-0 border-t border-border">
                {[
                  { label: "Created", value: new Date(model.created * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: "Context Length", value: `${model.context_length.toLocaleString()} tokens` },
                  { label: "Modality", value: model.architecture.modality },
                  { label: "Tokenizer", value: model.architecture.tokenizer },
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between py-4 border-b border-border/50 text-sm">
                    <span className="text-muted-foreground">{spec.label}</span>
                    <span className="text-foreground font-mono">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Reviews */}
            <div>
              <ModelReviews
                modelId={model.id}
                providersForModel={providersWithPricing.map((p) => p.provider)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto w-full">
        <Footer />
      </div>
    </main>
  );
}
