import Link from "next/link";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

// This would normally come from a database or API
const providersData = {
  openai: {
    name: "OpenAI",
    description: "OpenAI is an AI research and deployment company dedicated to ensuring that artificial general intelligence benefits all of humanity.",
    models: [
      { name: "GPT-4 Turbo", price: "$0.06 / 1K tokens", latency: "~150ms", context: "128K tokens" },
      { name: "GPT-4", price: "$0.03 / 1K tokens", latency: "~200ms", context: "8K tokens" },
      { name: "GPT-3.5 Turbo", price: "$0.0005 / 1K tokens", latency: "~100ms", context: "16K tokens" },
    ],
    features: ["High accuracy", "Strong reasoning", "Multilingual support", "Code generation"],
    website: "https://openai.com"
  },
  anthropic: {
    name: "Anthropic",
    description: "Anthropic is an AI safety company that aims to build reliable, interpretable, and steerable AI systems.",
    models: [
      { name: "Claude 3 Opus", price: "$0.03 / 1K tokens", latency: "~220ms", context: "200K tokens" },
      { name: "Claude 3 Sonnet", price: "$0.015 / 1K tokens", latency: "~180ms", context: "200K tokens" },
      { name: "Claude 3 Haiku", price: "$0.003 / 1K tokens", latency: "~150ms", context: "200K tokens" },
    ],
    features: ["Constitutional AI", "Long context", "Precise instructions", "Low hallucination rate"],
    website: "https://anthropic.com"
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral AI is a research lab and company focused on developing generative AI models with high performance and open weights.",
    models: [
      { name: "Mistral Large", price: "$0.02 / 1K tokens", latency: "~160ms", context: "32K tokens" },
      { name: "Mistral Medium", price: "$0.007 / 1K tokens", latency: "~120ms", context: "32K tokens" },
      { name: "Mistral Small", price: "$0.002 / 1K tokens", latency: "~90ms", context: "32K tokens" },
    ],
    features: ["Open weights", "Efficient architecture", "Multilingual", "Function calling"],
    website: "https://mistral.ai"
  },
  meta: {
    name: "Meta AI",
    description: "Meta AI is developing open-source language models that can be freely used by researchers and developers worldwide.",
    models: [
      { name: "Llama 3 70B", price: "$0.015 / 1K tokens", latency: "~190ms", context: "8K tokens" },
      { name: "Llama 3 8B", price: "$0.001 / 1K tokens", latency: "~120ms", context: "8K tokens" },
    ],
    features: ["Open source", "Competitive performance", "Research-focused", "Community-driven improvements"],
    website: "https://ai.meta.com"
  },
  groq: {
    name: "Groq",
    description: "Groq provides ultra-low latency inference for language models using purpose-built hardware acceleration.",
    models: [
      { name: "LPU Mixtral", price: "$0.005 / 1K tokens", latency: "~30ms", context: "32K tokens" },
      { name: "LPU Llama 3", price: "$0.0007 / 1K tokens", latency: "~25ms", context: "8K tokens" },
    ],
    features: ["Fastest inference", "LPU hardware", "Standard API", "Cost-efficient"],
    website: "https://groq.com"
  },
  cohere: {
    name: "Cohere",
    description: "Cohere builds natural language processing models that help businesses improve customer experiences and operations.",
    models: [
      { name: "Command R+", price: "$0.02 / 1K tokens", latency: "~180ms", context: "128K tokens" },
      { name: "Command R", price: "$0.005 / 1K tokens", latency: "~160ms", context: "128K tokens" },
    ],
    features: ["Enterprise focus", "Retrieval capabilities", "Multilingual", "RAG optimized"],
    website: "https://cohere.com"
  }
};

export default function ProviderPage({ params }: { params: { id: string } }) {
  const provider = providersData[params.id as keyof typeof providersData] || {
    name: "Provider not found",
    description: "This provider does not exist in our system.",
    models: [],
    features: [],
    website: "/"
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      
      <main className="flex-grow">
        {/* Provider Header */}
        <div className="py-12 border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <Link 
                  href="/providers" 
                  className="text-gray-400 hover:text-white mr-4 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to providers
                </Link>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{provider.name}</h1>
              <p className="text-xl text-gray-300 mb-8">{provider.description}</p>
              
              <div className="flex flex-wrap gap-4 mb-6">
                {provider.features.map((feature, index) => (
                  <span key={index} className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-sm">
                    {feature}
                  </span>
                ))}
              </div>
              
              <a 
                href={provider.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-white hover:text-gray-300"
              >
                <span>Visit provider website</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* Available Models */}
        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Available Models</h2>
              
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Model</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Latency</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {provider.models.map((model, index) => (
                      <tr key={index} className="bg-black hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{model.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{model.price}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{model.latency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{model.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* Integration */}
        <div className="py-12 bg-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Start Using {provider.name} via Routstr</h2>
              
              <div className="bg-black border border-white/10 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Installation</h3>
                <div className="bg-zinc-900 p-3 rounded mb-6 font-mono text-sm overflow-x-auto">
                  <code>npm install @routstr/sdk</code>
                </div>
                
                <h3 className="text-lg font-medium mb-4">Usage Example</h3>
                <div className="bg-zinc-900 p-3 rounded font-mono text-sm overflow-x-auto">
                  <pre>{`import { Routstr } from '@routstr/sdk';

// Initialize Routstr client
const routstr = new Routstr({
  provider: '${params.id}',  // Specify ${provider.name} as provider
  models: ['${provider.models[0]?.name || "Model"}'],
  paymentToken: 'YOUR_CASHU_TOKEN'
});

// Make a request
const response = await routstr.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello, AI assistant!' }],
  model: '${provider.models[0]?.name || "Model"}'
});

console.log(response.choices[0].message.content);`}</pre>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md bg-white text-black px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
                >
                  Start using {provider.name} now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 