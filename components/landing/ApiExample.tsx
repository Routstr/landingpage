"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getExampleModelId } from "@/app/data/models";
import { useModels } from "@/app/contexts/ModelsContext";
import { getLocalCashuToken, setLocalCashuToken } from "@/utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const exampleModelId = getExampleModelId();

const buildCodeExamples = (token: string) => {
  const tokenForCode = (token ?? "").trim();
  return {
    curl: `curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${tokenForCode}" \\
  -d '{
    "model": "${exampleModelId}",
    "messages": [
      {"role": "user", "content": "Hello Nostr"}
    ]
  }'`,

    javascript: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.routstr.com/v1',
  apiKey: '${tokenForCode}'
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${exampleModelId}',
    messages: [
      { role: 'user', content: 'Hello Nostr' }
    ]
  });
  console.log(completion.choices[0].message);
}

main();`,

    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.routstr.com/v1",
    api_key="${tokenForCode}"
)

completion = client.chat.completions.create(
    model="${exampleModelId}",
    messages=[
        {"role": "user", "content": "Hello Nostr"}
    ]
)
print(completion.choices[0].message.content)`,
  } as const;
};

type CodeLanguage = "curl" | "javascript" | "python";

function getMinimumSatsRequired(model: {
  sats_pricing?: { request?: number; max_cost?: number };
} | null): number | null {
  if (!model?.sats_pricing) return null;
  const requestCost = Number(model.sats_pricing.request ?? 0);
  const maxCost = Number(model.sats_pricing.max_cost ?? 0);
  const candidates = [requestCost, maxCost].filter(
    (value) => Number.isFinite(value) && value > 0
  );
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

const syntaxTokenClasses = {
  command: "text-[#4FC1FF]",
  keyword: "text-[#C586C0]",
  string: "text-[#CE9178]",
  symbol: "text-[#DCDCAA]",
  value: "text-[#9CDCFE]",
  plain: "text-[#D4D4D4]",
} as const;

type SyntaxTokenKind = keyof typeof syntaxTokenClasses;

function Tok({
  kind,
  children,
}: {
  kind: SyntaxTokenKind;
  children: React.ReactNode;
}) {
  return <span className={syntaxTokenClasses[kind]}>{children}</span>;
}

export function LandingApiExample() {
  const { findModel } = useModels();
  const [activeTab, setActiveTab] = useState<CodeLanguage>("curl");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const STORAGE_BASE_URL = "https://api.routstr.com";

  useEffect(() => {
    try {
      const existing = getLocalCashuToken(STORAGE_BASE_URL) || "";
      setTokenInput(existing);
    } catch {}
  }, []);

  const codeExamples = useMemo(
    () => buildCodeExamples(tokenInput),
    [tokenInput]
  );
  const exampleModel = useMemo(() => findModel(exampleModelId), [findModel]);
  const minimumSatsRequired = useMemo(
    () => getMinimumSatsRequired(exampleModel ?? null),
    [exampleModel]
  );

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeExamples[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const runExample = async () => {
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setRunOutput(null);
      setRunError("Add your Cashu token first.");
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setRunOutput(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("https://api.routstr.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${trimmedToken}`,
        },
        body: JSON.stringify({
          model: exampleModelId,
          messages: [{ role: "user", content: "Hello Nostr" }],
        }),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      if (!response.ok) {
        const parsedRecord =
          typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        const message =
          (parsedRecord?.error as Record<string, unknown> | undefined)?.message ??
          parsedRecord?.message;
        const errorMessage =
          typeof message === "string" && message.trim().length > 0
            ? message
            : response.statusText || "Request failed";
        setRunError(`${response.status} ${errorMessage}`);
        return;
      }

      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const parsedRecord = parsed as Record<string, unknown>;
        const choices = Array.isArray(parsedRecord.choices) ? parsedRecord.choices : [];
        const firstChoice =
          choices.length > 0 &&
          typeof choices[0] === "object" &&
          choices[0] !== null &&
          !Array.isArray(choices[0])
            ? (choices[0] as Record<string, unknown>)
            : null;
        const messageRecord =
          firstChoice &&
          typeof firstChoice.message === "object" &&
          firstChoice.message !== null &&
          !Array.isArray(firstChoice.message)
            ? (firstChoice.message as Record<string, unknown>)
            : null;
        const content = messageRecord?.content;
        if (typeof content === "string" && content.trim().length > 0) {
          setRunOutput(content);
          return;
        }
        setRunOutput(JSON.stringify(parsedRecord, null, 2));
        return;
      }

      setRunOutput(typeof parsed === "string" ? parsed : "Request completed.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setRunError("Request timed out.");
      } else if (error instanceof Error) {
        setRunError(error.message || "Request failed.");
      } else {
        setRunError("Request failed.");
      }
    } finally {
      clearTimeout(timeout);
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full relative">
      <div className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-shrink-0 lg:w-1/3">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Simple Integration
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              A drop-in replacement for any existing openai client. Swap out the base url and api key, and you&apos;re connected to the decentralized network.
            </p>

            <div className="flex flex-col gap-6">
              <div className="border-l border-border pl-4">
                <h4 className="font-bold text-sm text-foreground mb-1">Zero learning curve</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use your favorite standard SDKs. No custom libraries to learn or vendor lock-in to worry about.
                </p>
              </div>
              <div className="border-l border-border pl-4">
                <h4 className="font-bold text-sm text-foreground mb-1">Privacy by default</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Authenticating through eCash bearer tokens means you don&apos;t need to register an email or provide a credit card.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-grow flex-col border border-border bg-card">
            <div className="relative flex flex-col gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as CodeLanguage)}
                className="w-full sm:w-auto"
              >
                <TabsList variant="line" className="h-8 w-full justify-start overflow-x-auto whitespace-nowrap sm:w-auto">
                  {(Object.keys(codeExamples) as CodeLanguage[]).map((lang) => (
                    <TabsTrigger key={lang} value={lang} className="h-7 text-xs capitalize">
                      {lang}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  onClick={runExample}
                  variant="outline"
                  size="xs"
                  className="h-7 text-[10px]"
                  disabled={isRunning}
                >
                  {isRunning ? "Running..." : "Run"}
                </Button>
                <Button onClick={doCopy} variant="ghost" size="xs" className="h-7 text-[10px]">
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto min-h-[250px]">
              <CodeBlock
                activeTab={activeTab}
                tokenInput={tokenInput}
                setTokenInput={setTokenInput}
                onTokenBlur={() =>
                  setLocalCashuToken(STORAGE_BASE_URL, tokenInput || "")
                }
              />
              <p className="mt-4 text-[10px] text-muted-foreground">
                Minimum sats required:{" "}
                <span className="text-foreground">
                  {minimumSatsRequired === null
                    ? "—"
                    : minimumSatsRequired.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                  sats
                </span>
              </p>
              {runError ? (
                <p className="mt-4 text-xs text-destructive">{runError}</p>
              ) : null}
              {runOutput ? (
                <pre className="mt-4 max-h-44 overflow-auto border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                  <code>{runOutput}</code>
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

const CodeBlock = ({
  activeTab,
  tokenInput,
  setTokenInput,
  onTokenBlur,
}: {
  activeTab: CodeLanguage;
  tokenInput: string;
  setTokenInput: (value: string) => void;
  onTokenBlur: () => void;
}) => {
  if (activeTab === "curl") {
    return (
      <pre className="text-xs leading-relaxed whitespace-pre text-[#D4D4D4]">
        <code>
          <Tok kind="command">curl</Tok>
          {" -X POST "}
          <Tok kind="string">
            https://api.routstr.com/v1/chat/completions
          </Tok>
          {" \\\n"}
          {"  -H "}
          <Tok kind="keyword">
            {'"Content-Type: application/json"'}
          </Tok>
          {" \\\n"}
          {"  -H "}
          <Tok kind="keyword">{'"Authorization: Bearer '}</Tok>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <Tok kind="keyword">{'"'}</Tok>
          {" \\\n"}
          {"  -d '{\n"}
          {'    '}
          <Tok kind="keyword">{`"model"`}</Tok>
          {': "'}
          <Tok kind="value">{exampleModelId}</Tok>
          {'",\n'}
          {'    '}
          <Tok kind="keyword">{`"messages"`}</Tok>
          {": [\n"}
          {'      {'}
          <Tok kind="keyword">{`"role"`}</Tok>
          {': '}
          <Tok kind="string">{`"user"`}</Tok>
          {", "}
          <Tok kind="keyword">{`"content"`}</Tok>
          {": "}
          <Tok kind="string">{`"Hello Nostr"`}</Tok>
          {"}\n"}
          {"    ]\n"}
          {"  }'\n"}
        </code>
      </pre>
    );
  }

  if (activeTab === "javascript") {
    return (
      <pre className="text-xs leading-relaxed whitespace-pre text-[#D4D4D4]">
        <code>
          <Tok kind="keyword">import</Tok> <Tok kind="symbol">OpenAI</Tok>{" "}
          <Tok kind="keyword">from</Tok> <Tok kind="string">{`'openai'`}</Tok>;{"\n\n"}
          <Tok kind="keyword">const</Tok> openai = <Tok kind="keyword">new</Tok>{" "}
          <Tok kind="symbol">OpenAI</Tok>({`{`}
          {"\n"}
          {"  "}
          <Tok kind="plain">baseURL</Tok>
          :{" "}
          <Tok kind="string">
            {`'https://api.routstr.com/v1'`}
          </Tok>
          ,{"\n"}
          {"  "}
          <Tok kind="plain">apiKey</Tok>: <Tok kind="string">{`'`}</Tok>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <Tok kind="string">{`'`}</Tok>
          {"\n"}
          {`});`}
          {"\n\n"}
          <Tok kind="keyword">async function</Tok> <Tok kind="symbol">main</Tok>() {`{`}
          {"\n"}
          {"  "}
          <Tok kind="keyword">const</Tok> completion = <Tok kind="keyword">await</Tok>{" "}
          openai.chat.completions.create({`{`}
          {"\n"}
          {"    "}
          <Tok kind="plain">model</Tok>: <Tok kind="value">{`'${exampleModelId}'`}</Tok>,{"\n"}
          {"    "}
          <Tok kind="plain">messages</Tok>: [{"\n"}
          {"      "}
          {`{ `}
          <Tok kind="plain">role</Tok>
          {`: `}
          <Tok kind="string">{`'user'`}</Tok>
          {`, `}
          <Tok kind="plain">content</Tok>
          {`: `}
          <Tok kind="string">{`'Hello Nostr'`}</Tok>
          {` }`}
          {"\n"}
          {"    "}]{"\n"}
          {"  "}
          {`});`}
          {"\n"}
          {"  "}
          <Tok kind="symbol">console.log</Tok>
          (completion.choices[0].message);{"\n"}
          {`}`}
          {"\n\n"}
          main();
        </code>
      </pre>
    );
  }

  if (activeTab === "python") {
    return (
      <pre className="text-xs leading-relaxed whitespace-pre text-[#D4D4D4]">
        <code>
          <Tok kind="keyword">from</Tok> openai <Tok kind="keyword">import</Tok>{" "}
          <Tok kind="symbol">OpenAI</Tok>
          {"\n\n"}
          <Tok kind="plain">client</Tok> = <Tok kind="symbol">OpenAI</Tok>({"\n"}
          {"    "}base_url=
          <Tok kind="string">{`"https://api.routstr.com/v1"`}</Tok>
          ,{"\n"}
          {"    "}api_key=<Tok kind="string">{`"`}</Tok>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <Tok kind="string">{`"`}</Tok>
          {"\n"}){"\n\n"}
          <Tok kind="plain">completion</Tok> = client.chat.completions.create({"\n"}
          {"    "}model=
          <Tok kind="value">{`"${exampleModelId}"`}</Tok>,{"\n"}
          {"    "}messages=[{"\n"}
          {"        "}
          {"{"}
          <Tok kind="keyword">{`"role"`}</Tok>
          {": "}
          <Tok kind="string">{`"user"`}</Tok>
          {", "}
          <Tok kind="keyword">{`"content"`}</Tok>
          {": "}
          <Tok kind="string">{`"Hello Nostr"`}</Tok>
          {"}"}
          {"\n"}
          {"    "}]{"\n"}){"\n"}
          <Tok kind="symbol">print</Tok>
          (completion.choices[0].message.content)
        </code>
      </pre>
    );
  }

  return null;
};

const TokenInput = ({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    onTouchStart={(e) => e.stopPropagation()}
    placeholder="cashuA..."
    className="inline-block align-middle min-w-0 w-[12ch] sm:w-[18ch] max-w-[50vw] bg-transparent border-b border-border px-1 py-0 text-xs text-[#CE9178] placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
  />
);

export default LandingApiExample;
