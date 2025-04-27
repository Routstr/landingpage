'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { models, getProviderFromModelName, fetchModels, nodeInfo } from '@/app/data/models';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Define types for code examples
type CodeLanguage = 'curl' | 'javascript' | 'python';

export default function ModelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const modelId = params.modelId as string;
  const modelName = modelId.replace(/-/g, '/');
  const [activeTab, setActiveTab] = useState<CodeLanguage>('curl');
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadModelData() {
      setIsLoading(true);

      try {
        // Try to find the model in the current data
        let foundModel = findModel(modelId, modelName);

        if (!foundModel) {
          // If model is not found, try to fetch fresh data from API
          await fetchModels();
          foundModel = findModel(modelId, modelName);
        }

        if (foundModel) {
          setModel(foundModel);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading model data:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadModelData();
  }, [modelId, modelName]);

  // Function to find a model using multiple strategies
  function findModel(id: string, name: string) {
    // Strategy 1: Direct match by name
    let foundModel = models.find(m => m.name === name);

    // Strategy 2: Case-insensitive match by name
    if (!foundModel) {
      foundModel = models.find(m => m.name.toLowerCase() === name.toLowerCase());
    }

    // Strategy 3: Match by ID format
    if (!foundModel) {
      foundModel = models.find(m => m.name.replace(/\//g, '-').toLowerCase() === id.toLowerCase());
    }

    return foundModel;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white"></div>
        </div>
        <Footer />
      </main>
    );
  }

  if (notFound || !model) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Model Not Found</h1>
            <p className="text-xl text-gray-400 mb-6">The model you&apos;re looking for doesn&apos;t exist or is not available.</p>
            <Link href="/models" className="text-white underline">View all available models</Link>

            <div className="mt-8 p-4 bg-gray-900 border border-white/10 rounded-md text-left text-xs overflow-auto max-w-xl mx-auto">
              <p>Looking for model with ID: {modelId}</p>
              <p>Converted to name: {modelName}</p>
              <p>Total models available: {models.length}</p>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const provider = getProviderFromModelName(model.name);
  const displayName = model.name.includes('/') ? model.name.split('/')[1] : model.name;

  // API code examples for this specific model
  const codeExamples = {
    curl: `curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuBpGFteCJodHRwczovL21p..." \\
  -d '{
    "model": "${model.name}",
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
    model: '${model.name}',
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
    model="${model.name}",
    messages=[
        {"role": "user", "content": "Hello Nostr"}
    ]
)
print(completion.choices[0].message.content)`
  };

  // Mapping for syntax highlighter language
  const syntaxMap: Record<CodeLanguage, string> = {
    curl: 'bash',
    javascript: 'javascript',
    python: 'python'
  };

  // Custom theme for code highlighting
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

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/models" className="text-gray-400 hover:text-white flex items-center gap-2 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to all models
            </Link>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
                <p className="text-xl text-gray-400 mb-4">by {provider}</p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                    ${(model.cost_per_1m_prompt_tokens / 1000).toFixed(5)}/token input
                  </span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                    ${(model.cost_per_1m_completion_tokens / 1000).toFixed(5)}/token output
                  </span>
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">
                    {model.currency.toUpperCase()}
                  </span>
                </div>
              </div>

              <button className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors">
                Start Using
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-black/50 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-all">
                <h3 className="text-sm text-gray-400 mb-1">Input Cost</h3>
                <p className="text-2xl font-bold">${(model.cost_per_1m_prompt_tokens / 1000).toFixed(5)}</p>
                <p className="text-xs text-gray-500">per token</p>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-all">
                <h3 className="text-sm text-gray-400 mb-1">Output Cost</h3>
                <p className="text-2xl font-bold">${(model.cost_per_1m_completion_tokens / 1000).toFixed(5)}</p>
                <p className="text-xs text-gray-500">per token</p>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg p-5 hover:border-white/20 transition-all">
                <h3 className="text-sm text-gray-400 mb-1">Provider</h3>
                <p className="text-2xl font-bold">{provider}</p>
                <p className="text-xs text-gray-500">model family</p>
              </div>
            </div>

            {/* API Example section styled like ApiExample.tsx */}
            <div className="rounded-lg border border-white/10 bg-black/50 p-4 sm:p-6 mb-6 sm:mb-10">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Direct API Access</h3>
              <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
                Access <span className="font-semibold text-white">{displayName}</span> with a simple API call using your Cashu token for authentication.
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
                  <span className="block font-medium text-white mb-1">Pay-per-token</span>
                  <span className="text-gray-400">${(model.cost_per_1m_prompt_tokens / 1000).toFixed(5)} input, ${(model.cost_per_1m_completion_tokens / 1000).toFixed(5)} output</span>
                </div>
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">Privacy First</span>
                  <span className="text-gray-400">No accounts, no tracking, just API tokens</span>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Model Information</h2>

              <Card className="p-6 bg-black/50 border border-white/10 rounded-lg hover:border-white/20 transition-all">
                <div className="prose prose-invert max-w-none">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-gray-400">Model name</td>
                        <td className="py-3 font-medium text-white">{model.name}</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-gray-400">Provider</td>
                        <td className="py-3 font-medium text-white">{provider}</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-gray-400">Input cost</td>
                        <td className="py-3 font-medium text-white">${(model.cost_per_1m_prompt_tokens / 1000).toFixed(5)} per token</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-gray-400">Output cost</td>
                        <td className="py-3 font-medium text-white">${(model.cost_per_1m_completion_tokens / 1000).toFixed(5)} per token</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* <div className="border-t border-white/10 pt-12 mb-12">
              <h2 className="text-2xl font-bold mb-6">Similar Models</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {models
                  .filter(m => m !== model && getProviderFromModelName(m.name) === provider)
                  .slice(0, 4)
                  .map(similarModel => {
                    const similarModelName = similarModel.name.includes('/') 
                      ? similarModel.name.split('/')[1] 
                      : similarModel.name;
                    const similarModelId = similarModel.name.replace(/\//g, '-');
                    
                    return (
                      <Link
                        key={similarModel.name}
                        href={`/models/${similarModelId}`}
                        className="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all"
                      >
                        <h3 className="font-bold text-white mb-1">{similarModelName}</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          ${(similarModel.cost_per_1m_prompt_tokens / 1000).toFixed(5)} input / ${(similarModel.cost_per_1m_completion_tokens / 1000).toFixed(5)} output
                        </p>
                      </Link>
                    );
                  })}
              </div>
            </div> */}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
} 