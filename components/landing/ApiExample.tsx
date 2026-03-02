"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getExampleModelId } from "@/app/data/models";
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
  const [activeTab, setActiveTab] = useState<CodeLanguage>("curl");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

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

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeExamples[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
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
