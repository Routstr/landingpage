"use client"
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getExampleModel } from '../app/data/models';

// Get a real model from our data
const exampleModel = getExampleModel();

const codeExamples = {
  curl: `curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuBpGFteCJodHRwczovL21p..." \\
  -d '{
    "model": "${exampleModel}",
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
  apiKey: 'cashuBpGFteCJodHRwczovL21p...' 
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${exampleModel}',
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
    api_key="cashuBpGFteCJodHRwczovL21p..." 
)

completion = client.chat.completions.create(
    model="${exampleModel}",
    messages=[
        {"role": "user", "content": "Hello Nostr"}
    ]
)
print(completion.choices[0].message.content)`
};

type CodeLanguage = 'curl' | 'javascript' | 'python';

// Mapping for syntax highlighter language
const syntaxMap: Record<CodeLanguage, string> = {
  curl: 'bash',
  javascript: 'javascript',
  python: 'python'
};

// Custom theme based on atomDark but more minimal
const customTheme = {
  ...atomDark,
  'pre[class*="language-"]': {
    ...atomDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: 0,
    overflow: 'visible',
  },
  'code[class*="language-"]': {
    ...atomDark['code[class*="language-"]'],
    background: 'transparent',
    textShadow: 'none',
    fontSize: '0.75rem',
    '@media (minWidth: 640px)': {
      fontSize: '0.875rem',
    },
  },
  // Remove underscores from identifiers
  '.token.class-name': {
    textDecoration: 'none'
  },
  '.token.namespace': {
    textDecoration: 'none',
    opacity: 1
  },
  '.token.entity': {
    textDecoration: 'none'
  },
  '.token.console': {
    textDecoration: 'none'
  }
};

export default function ApiExample() {
  const [activeTab, setActiveTab] = useState<CodeLanguage>('curl');

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

      {/* Code example with syntax highlighting */}
      <div className="bg-black/70 rounded-lg p-3 sm:p-4 border border-white/10 overflow-x-auto">
        <SyntaxHighlighter
          language={syntaxMap[activeTab]}
          style={customTheme}
          customStyle={{
            background: 'transparent',
            lineHeight: '1.5',
            margin: 0
          }}
          showLineNumbers={false}
          wrapLines={true}
          wrapLongLines={true}
        >
          {codeExamples[activeTab]}
        </SyntaxHighlighter>
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