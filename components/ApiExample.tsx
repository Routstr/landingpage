"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { getExampleModelId } from '../app/data/models';
import { getLocalCashuToken, setLocalCashuToken } from '@/utils/storageUtils';

// Get a model ID from our data
const exampleModelId = getExampleModelId();

const buildCodeExamples = (token: string) => {
  const tokenForCode = token && token.startsWith('cashu') ? token : 'cashuBpGFteCJodHRwczovL21p...';
  return {
    curl: `curl -X POST https://api.routstr.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${tokenForCode}" \
  -d '{
    "model": "${exampleModelId}",
    "messages": [
      {
        "role": "user", 
        "content": "Hello Nostr"
      }
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
print(completion.choices[0].message.content)`
  } as const;
};

type CodeLanguage = 'curl' | 'javascript' | 'python';

export default function ApiExample() {
  const [activeTab, setActiveTab] = useState<CodeLanguage>('curl');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Storage base URL for saving the user's token
  const STORAGE_BASE_URL = 'https://api.routstr.com';

  useEffect(() => {
    try {
      const existing = getLocalCashuToken(STORAGE_BASE_URL) || '';
      setTokenInput(existing);
    } catch {}
  }, []);

  const codeExamples = useMemo(() => buildCodeExamples(tokenInput), [tokenInput]);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeExamples[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/50 p-4 sm:p-6 mb-6 sm:mb-10">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Direct API Access</h3>
      <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
        Access any of <span className="font-semibold text-white">50+ models</span> with a simple API call using your Cashu token for authentication.
      </p>

      {/* Language tabs */}
      <div className="flex space-x-1 mb-4 border-b border-white/10 overflow-x-auto">
        {(Object.keys(codeExamples) as CodeLanguage[]).map((lang) => (
          <button
            key={lang}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap ${activeTab === lang
                ? 'text-white bg-white/10 border-b-2 border-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            onClick={() => setActiveTab(lang)}
          >
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </button>
        ))}
      </div>

      {/* Code example with inline token input after Bearer for curl */}
      <div className="relative group bg-black/70 rounded-lg border border-white/10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); doCopy(); }}
          className="absolute top-1.5 sm:top-2 right-2 inline-flex items-center gap-1 rounded bg-black/80 border border-white/20 px-2 py-1 text-[10px] sm:text-xs text-white shadow-md hover:bg-black/90 sm:bg-white/10 sm:border-white/10 sm:hover:bg-white/20"
          aria-label="Copy code"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <div className="p-3 sm:p-4 pr-10 overflow-x-auto">
        {activeTab === 'curl' ? (
          <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
            <code>
              <span className="text-[#61afef]">curl</span>{' -X POST '}
              <span className="text-[#61afef]">https://api.routstr.com/v1/chat/completions</span>{' \\\n'}
              <span className="text-[#abb2bf]">{'  -H '}</span>
              <span className="text-[#98c379]">{'"Content-Type: application/json"'}</span>{' \\\n'}
              <span className="text-[#abb2bf]">{'  -H '}</span>
              <span className="text-[#98c379]">{'"Authorization: Bearer '}</span>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onBlur={() => setLocalCashuToken(STORAGE_BASE_URL, tokenInput || '')}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                placeholder="cashu..."
                className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <span className="text-[#98c379]">{'"'}</span>{' \\\n'}
              {'  -d '}<span className="text-[#98c379]">{'\''}</span>{'{' }<span className="text-[#98c379]">{''}</span>{'}'}{'\n'}
              {'    "model": "'}<span className="text-[#98c379]">{exampleModelId}</span>{'",'}{'\n'}
              {'    "messages": ['}{'\n'}
              {'      { "role": "user", "content": "'}<span className="text-[#98c379]">{'Hello Nostr'}</span>{'" }'}{'\n'}
              {'    ]'}{'\n'}
              {'  }'}<span className="text-[#98c379]">{'\''}</span>{'\n'}
            </code>
          </pre>
        ) : activeTab === 'javascript' ? (
          <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
            <code>
              <span className="text-[#61afef]">import</span>{' '}<span className="text-white">OpenAI</span>{' '}<span className="text-[#61afef]">from</span>{' '}<span className="text-[#98c379]">{'\'openai\''}</span><span className="text-[#abb2bf]">;</span>{'\n\n'}

              <span className="text-[#61afef]">const</span>{' '}<span className="text-white">openai</span>{' '}<span className="text-[#abb2bf]">=</span>{' '}<span className="text-[#61afef]">new</span>{' '}<span className="text-white">OpenAI</span><span className="text-[#abb2bf]">({'\n'}</span>
              {'  '}<span className="text-[#e5c07b]">baseURL</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{'\'https://api.routstr.com/v1\''}</span><span className="text-[#abb2bf]">,{'\n'}</span>
              {'  '}<span className="text-[#e5c07b]">apiKey</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{'\''}</span>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onBlur={() => setLocalCashuToken(STORAGE_BASE_URL, tokenInput || '')}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                placeholder="cashu..."
                className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <span className="text-[#98c379]">{'\''}</span>{'\n'}
              <span className="text-[#abb2bf]">{'});\n\n'}</span>

              <span className="text-[#61afef]">async</span>{' '}<span className="text-[#61afef]">function</span>{' '}<span className="text-white">main</span><span className="text-[#abb2bf]">(){'\n'}</span>
              {'  '}<span className="text-[#61afef]">const</span>{' '}<span className="text-white">completion</span>{' '}<span className="text-[#abb2bf]">=</span>{' '}<span className="text-[#61afef]">await</span>{' '}<span className="text-white">openai</span><span className="text-[#abb2bf]">.chat.completions.create(</span><span className="text-[#abb2bf]">{'{'}</span>{'\n'}
              {'    '}<span className="text-[#e5c07b]">model</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{'\''}</span><span className="text-[#98c379]">{exampleModelId}</span><span className="text-[#98c379]">{'\''}</span><span className="text-[#abb2bf]">,{'\n'}</span>
              {'    '}<span className="text-[#e5c07b]">messages</span><span className="text-[#abb2bf]">: [</span>{'\n'}
              {'      '}<span className="text-[#abb2bf]">{'{ '}</span><span className="text-[#e5c07b]">role</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{'\'user\''}</span><span className="text-[#abb2bf]">, </span><span className="text-[#e5c07b]">content</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{'\'Hello Nostr\''}</span><span className="text-[#abb2bf]">{' }\n'}</span>
              {'    '}<span className="text-[#abb2bf]">]</span>{'\n'}
              <span className="text-[#abb2bf]">  {'});\n'}</span>
              {'  '}<span className="text-white">console</span><span className="text-[#abb2bf]">.log(</span><span className="text-white">completion</span><span className="text-[#abb2bf]">.choices[</span><span className="text-[#c678dd]">0</span><span className="text-[#abb2bf]">].message);</span>{'\n'}
              <span className="text-[#abb2bf]">{'}\n\n'}</span>
              <span className="text-white">main</span><span className="text-[#abb2bf]">();</span>
            </code>
          </pre>
        ) : activeTab === 'python' ? (
          <pre className="text-xs sm:text-sm leading-6 whitespace-pre font-mono text-white">
            <code>
              <span className="text-[#61afef]">from</span>{' '}<span className="text-white">openai</span>{' '}<span className="text-[#61afef]">import</span>{' '}<span className="text-white">OpenAI</span>{'\n\n'}

              <span className="text-white">client</span>{' '}<span className="text-[#abb2bf]">=</span>{' '}<span className="text-white">OpenAI</span><span className="text-[#abb2bf]">(</span>{'\n'}
              {'    '}<span className="text-[#e5c07b]">base_url</span><span className="text-[#abb2bf]">=</span><span className="text-[#98c379]">{'"https://api.routstr.com/v1"'}</span><span className="text-[#abb2bf]">,{'\n'}</span>
              {'    '}<span className="text-[#e5c07b]">api_key</span><span className="text-[#abb2bf]">=</span><span className="text-[#98c379]">{'"'}</span>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onBlur={() => setLocalCashuToken(STORAGE_BASE_URL, tokenInput || '')}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                placeholder="cashu..."
                className="inline-block align-middle min-w-0 w-[9ch] sm:w-[16ch] max-w-[50vw] bg-transparent border border-white/10 rounded px-2 py-0.5 text-[10px] sm:text-xs text-[#98c379] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <span className="text-[#98c379]">{'"'}</span>{'\n'}
              <span className="text-[#abb2bf]">){'\n\n'}</span>

              <span className="text-white">completion</span>{' '}<span className="text-[#abb2bf]">=</span>{' '}<span className="text-white">client</span><span className="text-[#abb2bf]">.chat.completions.create(</span>{'\n'}
              {'    '}<span className="text-[#e5c07b]">model</span><span className="text-[#abb2bf]">=</span><span className="text-[#98c379]">{'"'}</span><span className="text-[#98c379]">{exampleModelId}</span><span className="text-[#98c379]">{'"'}</span><span className="text-[#abb2bf]">,{'\n'}</span>
              {'    '}<span className="text-[#e5c07b]">messages</span><span className="text-[#abb2bf]">=[</span>{'\n'}
              {'        '}<span className="text-[#abb2bf]">{'{ '}</span><span className="text-[#98c379]">{"role"}</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{"user"}</span><span className="text-[#abb2bf]">, </span><span className="text-[#98c379]">{"content"}</span><span className="text-[#abb2bf]">: </span><span className="text-[#98c379]">{"Hello Nostr"}</span><span className="text-[#abb2bf]">{' }\n'}</span>
              {'    '}<span className="text-[#abb2bf]">]</span>{'\n'}
              <span className="text-[#abb2bf]">){'\n'}</span>
              <span className="text-[#61afef]">print</span><span className="text-[#abb2bf]">(</span><span className="text-white">completion</span><span className="text-[#abb2bf]">.choices[</span><span className="text-[#c678dd]">0</span><span className="text-[#abb2bf]">].message.content)</span>
            </code>
          </pre>
        ) : null}
        </div>
      </div>

      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
        <div className="rounded bg-black/30 p-3 border border-white/5">
          <span className="block font-medium text-white mb-1">OpenAI Compatible</span>
          <span className="text-gray-400">Drop-in replacement for OpenAI clients</span>
        </div>
        <div className="rounded bg-black/30 p-3 border border-white/5">
          <span className="block font-medium text-white mb-1">Popular Models</span>
          <span className="text-gray-400">DeepSeek, Llama, Mistral, Claude and more</span>
        </div>
        <div className="rounded bg-black/30 p-3 border border-white/5">
          <span className="block font-medium text-white mb-1">Privacy First</span>
          <span className="text-gray-400">No accounts, no tracking, just API tokens</span>
        </div>
      </div>
    </div>
  );
} 