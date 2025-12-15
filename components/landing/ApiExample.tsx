"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getExampleModelId } from "@/app/data/models";
import { getLocalCashuToken, setLocalCashuToken } from "@/utils/storageUtils";
import { cn } from "@/lib/utils";

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

  const features = [
    {
      title: "OpenAI Compatible",
      description: "Drop-in replacement for OpenAI clients",
    },
    {
      title: "Popular Models",
      description: "DeepSeek, Llama, Mistral, Claude and more",
    },
    {
      title: "Privacy First",
      description: "No accounts, no tracking, just API tokens",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-20 md:py-32 px-4 md:px-8 bg-black">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
          Simple Integration
        </h2>
        <p className="text-base md:text-lg lg:text-xl text-neutral-400 max-w-2xl mx-auto">
          Integrate with Routstr using our OpenAI-compatible API endpoints with
          just a few lines of code
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Main code card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden"
        >
          {/* Card header with title and tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 md:p-6 border-b border-white/10">
            <h3 className="text-lg md:text-xl font-bold text-white">
              Direct API Access
            </h3>
            <div className="flex gap-1 bg-neutral-800/50 rounded-lg p-1">
              {(Object.keys(codeExamples) as CodeLanguage[]).map((lang) => (
                <button
                  key={lang}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    activeTab === lang
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => setActiveTab(lang)}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div className="relative">
            {/* Copy button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                doCopy();
              }}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-neutral-800/80 border border-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-neutral-700 transition-colors"
              aria-label="Copy code"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              {copied ? "Copied!" : "Copy"}
            </button>

            {/* Code content */}
            <div className="p-4 md:p-6 pr-20 overflow-x-auto bg-neutral-950/50">
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

          {/* Features row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="p-4 md:p-5 bg-neutral-900"
              >
                <h4 className="text-sm md:text-base font-medium text-white mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs md:text-sm text-neutral-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
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
      <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre font-mono text-white">
        <code>
          <span className="text-blue-400">curl</span>
          {" -X POST "}
          <span className="text-blue-400">
            https://api.routstr.com/v1/chat/completions
          </span>
          {" \\\n"}
          {"  -H "}
          <span className="text-green-400">
            {'"Content-Type: application/json"'}
          </span>
          {" \\\n"}
          {"  -H "}
          <span className="text-green-400">{'"Authorization: Bearer '}</span>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <span className="text-green-400">{'"'}</span>
          {" \\\n"}
          {"  -d '{\n"}
          {'    "model": "'}
          <span className="text-green-400">{exampleModelId}</span>
          {'",\n'}
          {'    "messages": [\n'}
          {'      {"role": "user", "content": "Hello Nostr"}\n'}
          {"    ]\n"}
          {"  }'\n"}
        </code>
      </pre>
    );
  }

  if (activeTab === "javascript") {
    return (
      <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre font-mono text-white">
        <code>
          <span className="text-purple-400">import</span> OpenAI{" "}
          <span className="text-purple-400">from</span>{" "}
          <span className="text-green-400">{`'openai'`}</span>;{"\n\n"}
          <span className="text-purple-400">const</span> openai ={" "}
          <span className="text-purple-400">new</span> OpenAI({`{`}
          {"\n"}
          {"  "}baseURL:{" "}
          <span className="text-green-400">
            {`'https://api.routstr.com/v1'`}
          </span>
          ,{"\n"}
          {"  "}apiKey: <span className="text-green-400">{`'`}</span>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <span className="text-green-400">{`'`}</span>
          {"\n"}
          {`});`}
          {"\n\n"}
          <span className="text-purple-400">async function</span> main() {`{`}
          {"\n"}
          {"  "}
          <span className="text-purple-400">const</span> completion ={" "}
          <span className="text-purple-400">await</span>{" "}
          openai.chat.completions.create({`{`}
          {"\n"}
          {"    "}model:{" "}
          <span className="text-green-400">{`'${exampleModelId}'`}</span>,{"\n"}
          {"    "}messages: [{"\n"}
          {"      "}
          {`{ role: 'user', content: 'Hello Nostr' }`}
          {"\n"}
          {"    "}]{"\n"}
          {"  "}
          {`});`}
          {"\n"}
          {"  "}console.log(completion.choices[0].message);{"\n"}
          {`}`}
          {"\n\n"}
          main();
        </code>
      </pre>
    );
  }

  if (activeTab === "python") {
    return (
      <pre className="text-xs sm:text-sm leading-relaxed whitespace-pre font-mono text-white">
        <code>
          <span className="text-purple-400">from</span> openai{" "}
          <span className="text-purple-400">import</span> OpenAI{"\n\n"}
          client = OpenAI({"\n"}
          {"    "}base_url=
          <span className="text-green-400">{`"https://api.routstr.com/v1"`}</span>
          ,{"\n"}
          {"    "}api_key=<span className="text-green-400">{`"`}</span>
          <TokenInput
            value={tokenInput}
            onChange={setTokenInput}
            onBlur={onTokenBlur}
          />
          <span className="text-green-400">{`"`}</span>
          {"\n"}){"\n\n"}
          completion = client.chat.completions.create({"\n"}
          {"    "}model=
          <span className="text-green-400">{`"${exampleModelId}"`}</span>,{"\n"}
          {"    "}messages=[{"\n"}
          {"        "}
          {`{"role": "user", "content": "Hello Nostr"}`}
          {"\n"}
          {"    "}]{"\n"}){"\n"}
          <span className="text-purple-400">print</span>
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
    className="inline-block align-middle min-w-0 w-[12ch] sm:w-[18ch] max-w-[50vw] bg-neutral-800/50 border border-white/10 rounded px-2 py-0.5 text-xs text-green-400 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
  />
);

export default LandingApiExample;
