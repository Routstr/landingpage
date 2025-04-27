import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// This would normally come from a database or API
const providers = [
  {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI is an AI research and deployment company dedicated to ensuring that artificial general intelligence benefits all of humanity.",
    models: ["GPT-4 Turbo", "GPT-4", "GPT-3.5 Turbo"],
    features: ["High accuracy", "Strong reasoning"]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Anthropic is an AI safety company that aims to build reliable, interpretable, and steerable AI systems.",
    models: ["Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku"],
    features: ["Constitutional AI", "Long context"]
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "Mistral AI is a research lab and company focused on developing generative AI models with high performance and open weights.",
    models: ["Mistral Large", "Mistral Medium", "Mistral Small"],
    features: ["Open weights", "Efficient architecture"]
  },
  {
    id: "meta",
    name: "Meta AI",
    description: "Meta AI is developing open-source language models that can be freely used by researchers and developers worldwide.",
    models: ["Llama 3 70B", "Llama 3 8B"],
    features: ["Open source", "Research-focused"]
  },
  {
    id: "groq",
    name: "Groq",
    description: "Groq provides ultra-low latency inference for language models using purpose-built hardware acceleration.",
    models: ["LPU Mixtral", "LPU Llama 3"],
    features: ["Fastest inference", "LPU hardware"]
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "Cohere builds natural language processing models that help businesses improve customer experiences and operations.",
    models: ["Command R+", "Command R"],
    features: ["Enterprise focus", "Retrieval capabilities"]
  },
  {
    id: "together",
    name: "Together AI",
    description: "Together AI offers a broad range of open-source and proprietary models with competitive pricing and performance.",
    models: ["Yi 34B", "Qwen 72B", "Falcon 40B"],
    features: ["Model diversity", "Research focus"]
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Perplexity specializes in search and information retrieval models with built-in citation capabilities.",
    models: ["Perplexity Online", "Perplexity Offline"],
    features: ["Search optimized", "Citations"]
  }
];

export default function ProvidersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      
      <main className="flex-grow">
        {/* Header */}
        <div className="py-12 border-b border-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-6">
                <Link 
                  href="/" 
                  className="text-gray-400 hover:text-white mr-4 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to home
                </Link>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">AI Providers</h1>
              <p className="text-xl text-gray-300 mb-8">
                Browse the complete list of AI providers available through Routstr&apos;s decentralized marketplace.
              </p>
            </div>
          </div>
        </div>
        
        {/* Providers List */}
        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {providers.map((provider) => (
                <Link 
                  key={provider.id}
                  href={`/providers/${provider.id}`}
                  className="flex flex-col h-full bg-black border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">{provider.name}</h3>
                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 mb-6 flex-grow">{provider.description}</p>
                  
                  <div className="mt-auto">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {provider.features.map((feature, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      <span className="text-gray-400 font-medium">Available models:</span> {provider.models.slice(0, 3).join(", ")}
                      {provider.models.length > 3 && "..."}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        {/* Integration Banner */}
        <div className="py-12 bg-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-6">Integrate with Any Provider</h2>
              <p className="text-gray-300 mb-8">
                Routstr gives you a single API to access all providers, with automatic routing to the best available option based on your criteria.
              </p>
              
              <div className="mb-8">
                <div className="bg-black border border-white/10 rounded-lg p-4 inline-block">
                  <code className="font-mono text-sm">npm install @routstr/sdk</code>
                </div>
              </div>
              
              <Link
                href="/models"
                className="inline-flex items-center justify-center rounded-md bg-white text-black px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                Explore Models
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 