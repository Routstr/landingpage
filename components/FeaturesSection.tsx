import { ReactNode } from 'react';
import FeatureCard from './FeatureCard';
import GlobeDemo from './GlobeDemo';

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
}

interface FeaturesSectionProps {
  title: string;
  features: Feature[];
  className?: string;
}

export default function FeaturesSection({
  title,
  features,
  className = ''
}: FeaturesSectionProps) {
  return (
    <section className={`py-20 bg-gradient-to-b from-black to-zinc-950 ${className}`} id="features">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-white">
          {title}
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
          The future of AI access is permissionless, private, and decentralized
        </p>
        
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Globe on the left */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-full max-w-xl">
              <GlobeDemo />
            </div>
          </div>
          
          {/* Features on the right */}
          <div className="w-full lg:w-1/2">
            <div className="grid grid-cols-1 gap-6">
              {features.map((feature, index) => (
                <FeatureCard 
                  key={index}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  iconBgColor="bg-white/5"
                  iconColor="text-white"
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <div className="inline-block px-4 py-2 bg-black border border-white/10 rounded-full">
            <span className="text-sm text-gray-500 font-mono">npm i <span className="text-white">@routstr/sdk</span></span>
          </div>
        </div>
      </div>
    </section>
  );
} 