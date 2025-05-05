'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Model, models, getProviderFromModelName, fetchModels, getModelNameWithoutProvider } from '@/app/data/models';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

// Define types for code examples
type CodeLanguage = 'curl' | 'javascript' | 'python';

// Helper to decode all path segments for display
function decodeSegments(segments: string[]): string[] {
  return segments.map((s) => decodeURIComponent(s));
}

// Model type imported from models.ts

export default function ModelDetailPage() {
  const params = useParams();
  // Handle the catch-all route by joining the path segments
  const modelIdParts = params.modelId as string[];

  // Decoded for display and for model lookup
  const decodedModelIdParts = decodeSegments(modelIdParts);
  const decodedModelId = decodedModelIdParts.join('/');

  const [activeTab, setActiveTab] = useState<CodeLanguage>('curl');
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState<Model | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadModelData() {
      setIsLoading(true);

      try {
        // Try to find the model using the decoded model ID
        let foundModel = findModel(decodedModelId);

        if (!foundModel) {
          // If model is not found, try to fetch fresh data from API
          await fetchModels();
          foundModel = findModel(decodedModelId);
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
  }, [decodedModelId]);

  // Function to find a model using multiple strategies
  function findModel(id: string): Model | undefined {
    // Direct match by ID
    let foundModel = models.find(m => m.id === id);

    // Case-insensitive match by ID
    if (!foundModel) {
      foundModel = models.find(m => m.id.toLowerCase() === id.toLowerCase());
    }

    return foundModel;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Back link skeleton */}
            <div className="h-6 w-32 bg-zinc-800 rounded-md mb-6 animate-pulse"></div>
            
            {/* Hero section skeleton */}
            <div className="mb-6 md:mb-10 bg-gradient-to-r from-black to-zinc-900 rounded-xl p-4 md:p-8 border border-zinc-800">
              <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-6 mb-3 md:mb-6">
                <div className="w-full md:w-2/3">
                  <div className="h-10 w-64 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                  <div className="h-6 w-40 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-zinc-800 rounded-md animate-pulse self-start"></div>
              </div>
              
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-full"></div>
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-5/6"></div>
                <div className="h-4 bg-zinc-800 rounded-md animate-pulse w-4/6"></div>
              </div>
            </div>
            
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                  <div className="h-3 w-20 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                  <div className="h-6 w-16 bg-zinc-800 rounded-md mb-1 animate-pulse"></div>
                  <div className="h-3 w-24 bg-zinc-800 rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
            
            {/* Technical specs skeleton */}
            <div className="p-6 bg-black/50 border border-zinc-800 rounded-lg mb-10">
              <div className="h-6 w-48 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="border-b border-zinc-700 py-3 flex justify-between">
                    <div className="h-4 w-32 bg-zinc-800 rounded-md animate-pulse"></div>
                    <div className="h-4 w-48 bg-zinc-800 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pricing skeleton */}
            <div className="bg-black/50 border border-zinc-800 p-6 mb-10">
              <div className="h-6 w-40 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="bg-black/30 border border-zinc-700 rounded-lg p-5 mb-6">
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border-b border-zinc-700 py-2 flex justify-between">
                      <div className="h-4 w-24 bg-zinc-800 rounded-md animate-pulse"></div>
                      <div className="h-4 w-32 bg-zinc-800 rounded-md animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="h-5 w-56 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 bg-zinc-800 rounded-md animate-pulse w-full"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* API integration skeleton */}
            <div className="bg-black/50 border border-zinc-800 p-6 mb-12">
              <div className="h-6 w-36 bg-zinc-800 rounded-md mb-4 animate-pulse"></div>
              <div className="h-4 w-full bg-zinc-800 rounded-md mb-6 animate-pulse"></div>
              
              <div className="flex space-x-1 mb-4 border-b border-zinc-700">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 w-24 bg-zinc-800 rounded-t-lg animate-pulse"></div>
                ))}
              </div>
              
              <div className="bg-black/70 rounded-lg p-4 border border-zinc-700 h-48 animate-pulse"></div>
              
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded bg-black/30 p-3 border border-zinc-800">
                    <div className="h-4 w-32 bg-zinc-800 rounded-md mb-2 animate-pulse"></div>
                    <div className="h-3 w-full bg-zinc-800 rounded-md animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            <p className="text-xl text-gray-300 mb-6">The model you&apos;re looking for doesn&apos;t exist or is not available.</p>
            <Link href="/models" className="text-white underline">View all available models</Link>

            <div className="mt-8 p-4 bg-gray-900 border border-white/10 rounded-md text-left text-xs overflow-auto max-w-xl mx-auto">
              <p>Looking for model with ID: {decodedModelId}</p>
              <p>Path segments: {decodedModelIdParts.join(' → ')}</p>
              <p>Total models available: {models.length}</p>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const provider = getProviderFromModelName(model.name);
  const displayName = getModelNameWithoutProvider(model.name);

  // API code examples for this specific model
  const codeExamples = {
    curl: `curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuBpGFteCJodHRwczovL21p..." \\
  -d '{
    "model": "${model.id}",
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
    model: '${model.id}',
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
    model="${model.id}",
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

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="py-12 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/models" className="text-gray-300 hover:text-white flex items-center gap-2 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to all models
            </Link>

            {/* Hero section */}
            <div className="mb-6 md:mb-10 bg-gradient-to-r from-black to-zinc-900 rounded-xl p-4 md:p-8 border border-zinc-800">
              <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-6 mb-3 md:mb-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-1 md:mb-2 text-white">{displayName}</h1>
                  <p className="text-lg md:text-xl text-gray-300 mb-2 md:mb-4">by {provider}</p>
                </div>
                <button className="px-6 py-2 md:py-3 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors self-start">
                  Try It Now
                </button>
              </div>

              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    a: (props) => (
                      <a
                        {...props}
                        className="underline hover:text-gray-300 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    )
                  }}
                >
                  {model.description}
                </ReactMarkdown>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                <h3 className="text-xs text-gray-300 mb-1">Input Cost</h3>
                <p className="text-xl font-bold text-white">{model.sats_pricing.prompt.toFixed(8)}</p>
                <p className="text-xs text-gray-400">sats per token</p>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                <h3 className="text-xs text-gray-300 mb-1">Output Cost</h3>
                <p className="text-xl font-bold text-white">{model.sats_pricing.completion.toFixed(8)}</p>
                <p className="text-xs text-gray-400">sats per token</p>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                <h3 className="text-xs text-gray-300 mb-1">Context Length</h3>
                <p className="text-xl font-bold text-white">{model.context_length.toLocaleString()}</p>
                <p className="text-xs text-gray-400">tokens</p>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                <h3 className="text-xs text-gray-300 mb-1">Created</h3>
                <p className="text-xl font-bold text-white">{formatDate(model.created)}</p>
                <p className="text-xs text-gray-400">release date</p>
              </div>
            </div>

            {/* Model Details */}
            <Card className="p-6 bg-black/50 border border-white/10 rounded-lg mb-10">
              <h2 className="text-xl font-bold mb-4 text-white">Technical Specifications</h2>
              <table className="w-full">
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Model ID</td>
                    <td className="py-3 font-medium text-white">{model.id}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Provider</td>
                    <td className="py-3 font-medium text-white">{provider}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Created</td>
                    <td className="py-3 font-medium text-white">{formatDate(model.created)}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Context length</td>
                    <td className="py-3 font-medium text-white">{model.context_length.toLocaleString()} tokens</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Modality</td>
                    <td className="py-3 font-medium text-white">{model.architecture.modality}</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Input Modalities</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.input_modalities.join(', ')}
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 text-gray-300">Output Modalities</td>
                    <td className="py-3 font-medium text-white">
                      {model.architecture.output_modalities.join(', ')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-gray-300">Tokenizer</td>
                    <td className="py-3 font-medium text-white">{model.architecture.tokenizer}</td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Pricing Section */}
            <Card className="bg-black/50 border border-white/10 p-6 mb-10">
              <h2 className="text-xl font-bold mb-4 text-white">Pricing Information</h2>

              <div className="bg-black/30 border border-white/10 rounded-lg p-5 mb-6">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-2 text-gray-300">Input cost</td>
                      <td className="py-2 font-medium text-white text-right">{model.sats_pricing.prompt.toFixed(8)} sats/token</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2 text-gray-300">Output cost</td>
                      <td className="py-2 font-medium text-white text-right">{model.sats_pricing.completion.toFixed(8)} sats/token</td>
                    </tr>
                    {model.sats_pricing.request > 0 && (
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-gray-300">Request fee</td>
                        <td className="py-2 font-medium text-white text-right">{model.sats_pricing.request.toFixed(8)} sats/request</td>
                      </tr>
                    )}
                    {model.sats_pricing.image > 0 && (
                      <tr className="border-b border-white/10">
                        <td className="py-2 text-gray-300">Image fee</td>
                        <td className="py-2 font-medium text-white text-right">{model.sats_pricing.image.toFixed(8)} sats/image</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="font-medium text-yellow-300 mb-2">Cost Calculation Example</h4>
                <p className="text-sm text-gray-200">
                  For a conversation with 100 tokens of input and 500 tokens of output:
                  <br />
                  Input cost: 100 × {model.sats_pricing.prompt.toFixed(8)} = {(100 * model.sats_pricing.prompt).toFixed(8)} sats
                  <br />
                  Output cost: 500 × {model.sats_pricing.completion.toFixed(8)} = {(500 * model.sats_pricing.completion).toFixed(8)} sats
                  <br />
                  Total: {(100 * model.sats_pricing.prompt + 500 * model.sats_pricing.completion).toFixed(8)} sats
                </p>
              </div>
            </Card>

            {/* API Section */}
            <Card className="bg-black/50 border border-white/10 p-6 mb-12">
              <h2 className="text-xl font-bold mb-4 text-white">API Integration</h2>
              <p className="text-sm text-gray-200 mb-6">
                Access <span className="font-semibold text-white">{displayName}</span> with a simple API call using your Cashu token for authentication.
              </p>

              {/* Language tabs */}
              <div className="flex space-x-1 mb-4 border-b border-white/10 overflow-x-auto">
                {(Object.keys(codeExamples) as CodeLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap ${activeTab === lang
                      ? 'text-white bg-white/10 border-b-2 border-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
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

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">OpenAI Compatible</span>
                  <span className="text-gray-300">Drop-in replacement for OpenAI clients</span>
                </div>
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">Cashu Tokens</span>
                  <span className="text-gray-300">Pay with Lightning via Cashu ecash</span>
                </div>
                <div className="rounded bg-black/30 p-3 border border-white/5">
                  <span className="block font-medium text-white mb-1">Privacy First</span>
                  <span className="text-gray-300">No accounts, no tracking, just API tokens</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
} 