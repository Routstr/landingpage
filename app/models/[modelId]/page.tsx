'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { models, getProviderFromModelName, formatPrice } from '@/app/data/models';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export default function ModelDetailPage() {
  const params = useParams();
  const modelId = params.modelId as string;
  const modelName = modelId.replace(/-/g, '/');
  
  // Find the model in our data
  const model = models.find(m => m.name === modelName);
  
  if (!model) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Model Not Found</h1>
            <p className="text-xl text-gray-400 mb-6">The model you're looking for doesn't exist or is not available.</p>
            <Link href="/models" className="text-white underline">View all available models</Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }
  
  const provider = getProviderFromModelName(model.name);
  const displayName = model.name.includes('/') ? model.name.split('/')[1] : model.name;
  
  // Get model capabilities based on name
  const getModelCapabilities = (modelName: string) => {
    const capabilities = [];
    
    // Add capabilities based on model family
    if (modelName.toLowerCase().includes('llama')) {
      capabilities.push('General Purpose');
    }
    if (modelName.toLowerCase().includes('mistral')) {
      capabilities.push('Reasoning');
    }
    if (modelName.toLowerCase().includes('coder') || modelName.toLowerCase().includes('code')) {
      capabilities.push('Code Generation');
    }
    if (modelName.toLowerCase().includes('vl') || modelName.toLowerCase().includes('vision')) {
      capabilities.push('Vision');
    }
    
    // Add size-based capability
    if (modelName.includes('70b') || modelName.includes('70B') || 
        modelName.includes('72b') || modelName.includes('72B') ||
        modelName.includes('90b') || modelName.includes('90B')) {
      capabilities.push('High Capacity');
    }
    
    return capabilities.length > 0 ? capabilities : ['General Purpose'];
  };
  
  const modelCapabilities = getModelCapabilities(model.name);
  
  // Example API call for this specific model
  const apiExample = `curl -X POST https://api.routstr.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer cashuYourValidToken" \\
  -d '{
    "model": "${model.name}",
    "messages": [
      {
        "role": "user", 
        "content": "Hello Nostr"
      }
    ]
  }'`;

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
    },
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
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {modelCapabilities.map((capability, index) => (
                    <Badge key={index} variant="outline" className="bg-white/5 hover:bg-white/10">
                      {capability}
                    </Badge>
                  ))}
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
                <h3 className="text-sm text-gray-400 mb-1">Typical Latency</h3>
                <p className="text-2xl font-bold">{provider === 'groq' ? '~30ms' : provider === 'meta-llama' ? '~70ms' : '~150ms'}</p>
                <p className="text-xs text-gray-500">first token response time</p>
              </div>
            </div>
            
            <Tabs defaultValue="api" className="mb-12">
              <TabsList className="bg-black/50 border border-white/10">
                <TabsTrigger value="api">API Usage</TabsTrigger>
                <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              
              <TabsContent value="api" className="mt-4">
                <div className="bg-black/70 rounded-lg p-4 border border-white/10 overflow-hidden">
                  <SyntaxHighlighter 
                    language="bash" 
                    style={customTheme}
                    customStyle={{ 
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      margin: 0
                    }}
                    showLineNumbers={false}
                  >
                    {apiExample}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
              
              <TabsContent value="nodejs" className="mt-4">
                <div className="bg-black/70 rounded-lg p-4 border border-white/10 overflow-hidden">
                  <SyntaxHighlighter 
                    language="javascript" 
                    style={customTheme}
                    customStyle={{ 
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      margin: 0
                    }}
                    showLineNumbers={false}
                  >
{`// Using fetch
const response = await fetch('https://api.routstr.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer cashuYourValidToken'
  },
  body: JSON.stringify({
    model: "${model.name}",
    messages: [
      {
        role: "user",
        content: "Hello Nostr"
      }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
              
              <TabsContent value="python" className="mt-4">
                <div className="bg-black/70 rounded-lg p-4 border border-white/10 overflow-hidden">
                  <SyntaxHighlighter 
                    language="python" 
                    style={customTheme}
                    customStyle={{ 
                      background: 'transparent',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      margin: 0
                    }}
                    showLineNumbers={false}
                  >
{`import requests

response = requests.post(
    "https://api.routstr.com/v1/chat/completions",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer cashuYourValidToken"
    },
    json={
        "model": "${model.name}",
        "messages": [
            {
                "role": "user",
                "content": "Hello Nostr"
            }
        ]
    }
)

print(response.json()["choices"][0]["message"]["content"])`}
                  </SyntaxHighlighter>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Model Information</h2>
              
              <Card className="p-6 bg-black/50 border border-white/10 rounded-lg hover:border-white/20 transition-all">
                <div className="prose prose-invert max-w-none">
                  <p>
                    {displayName} is a large language model developed by {provider}. It is available through the Routstr protocol,
                    which provides a standardized API for accessing a wide range of AI models with transparent pricing.
                  </p>
                  
                  <h3>Capabilities</h3>
                  <p>
                    This model excels at {modelCapabilities.join(', ').toLowerCase()} tasks. It can be used for:
                  </p>
                  <ul>
                    {modelCapabilities.includes('General Purpose') && (
                      <li>Conversation and text generation</li>
                    )}
                    {modelCapabilities.includes('Reasoning') && (
                      <li>Complex reasoning and problem-solving</li>
                    )}
                    {modelCapabilities.includes('Code Generation') && (
                      <li>Writing and reviewing code</li>
                    )}
                    {modelCapabilities.includes('Vision') && (
                      <li>Understanding and describing images</li>
                    )}
                    {modelCapabilities.includes('High Capacity') && (
                      <li>Handling complex, multi-step instructions</li>
                    )}
                  </ul>
                  
                  <h3>Pricing</h3>
                  <p>
                    This model costs ${(model.cost_per_1m_prompt_tokens / 1000).toFixed(5)} per input token and 
                    ${(model.cost_per_1m_completion_tokens / 1000).toFixed(5)} per output token. Tokens are charged in {model.currency.toUpperCase()} and
                    can be paid using Bitcoin via Lightning Network or on-chain transactions.
                  </p>
                  
                  <h3>Performance</h3>
                  <p>
                    The model typically responds with a first token latency of {provider === 'groq' ? '~30ms' : provider === 'meta-llama' ? '~70ms' : '~150ms'}, 
                    with subsequent tokens streaming at high throughput. Exact performance may vary based on model complexity, 
                    prompt length, and system load.
                  </p>
                  
                  <h3>Privacy</h3>
                  <p>
                    When using Routstr to access this model, your privacy is protected through several mechanisms:
                  </p>
                  <ul>
                    <li>No accounts or personal information required</li>
                    <li>Payments via anonymous Cashu tokens or Bitcoin</li>
                    <li>Optional Tor routing for enhanced privacy</li>
                    <li>No data collection or storage of your prompts</li>
                  </ul>
                </div>
              </Card>
            </div>
            
            <div className="border-t border-white/10 pt-12 mb-12">
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
                          {formatPrice(similarModel)}
                        </p>
                        <div className="flex gap-2">
                          {getModelCapabilities(similarModel.name).slice(0, 2).map((capability, index) => (
                            <Badge key={index} variant="outline" className="bg-white/5 text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  );
} 