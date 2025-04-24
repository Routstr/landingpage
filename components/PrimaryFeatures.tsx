import { BarChart, Lock, Shield, Sparkles } from 'lucide-react';

interface Feature {
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface PrimaryFeaturesProps {
  className?: string;
}

export default function PrimaryFeatures({ className = '' }: PrimaryFeaturesProps) {
  const features: Feature[] = [
    {
      name: 'Advanced Analytics',
      description:
        'Gain actionable insights with our powerful analytics engine. Track user behavior, monitor performance, and make data-driven decisions.',
      icon: <BarChart className="h-6 w-6" />,
    },
    {
      name: 'Enterprise Security',
      description:
        'Keep your data safe with enterprise-grade security features. End-to-end encryption, multi-factor authentication, and more.',
      icon: <Shield className="h-6 w-6" />,
    },
    {
      name: 'Seamless Integration',
      description:
        'Connect with your favorite tools effortlessly. Our platform integrates with hundreds of services to streamline your workflow.',
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      name: 'Robust Privacy',
      description:
        'Maintain control over your data with our comprehensive privacy controls. Comply with regulations and protect user information.',
      icon: <Lock className="h-6 w-6" />,
    },
  ];

  return (
    <section className={`py-16 bg-black text-white ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            Powerful features for your business
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">
            Our platform is packed with tools to help you grow, manage, and analyze your business more effectively.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.name} className="rounded-xl border border-gray-800 p-8">
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-white p-3 text-black">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold">{feature.name}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 