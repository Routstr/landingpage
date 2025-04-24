import { Check } from 'lucide-react';
import Link from 'next/link';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

interface PricingTiersProps {
  className?: string;
}

export default function PricingTiers({ className = '' }: PricingTiersProps) {
  const tiers: PricingTier[] = [
    {
      name: 'Starter',
      price: '$9',
      description: 'Perfect for individuals and small teams just getting started.',
      features: [
        'Up to 5 projects',
        '10 GB storage',
        'Basic analytics',
        'Email support',
      ],
      cta: 'Get Started',
      href: '/signup?plan=starter',
    },
    {
      name: 'Pro',
      price: '$29',
      description: 'Everything in Starter, plus advanced features for growing teams.',
      features: [
        'Unlimited projects',
        '100 GB storage',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
        'Team collaboration',
      ],
      cta: 'Get Started',
      href: '/signup?plan=pro',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Tailored solutions for large organizations with unique needs.',
      features: [
        'Unlimited projects',
        'Unlimited storage',
        'Custom analytics',
        'Dedicated support',
        'Advanced security',
        'API access',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      href: '/contact',
    },
  ];

  return (
    <section className={`py-16 bg-white ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Choose the plan that works best for you and your team.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 shadow-lg ${
                tier.highlighted
                  ? 'bg-black text-white ring-2 ring-black'
                  : 'bg-white text-gray-900 ring-1 ring-gray-200'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-sm font-medium">/month</span>}
                </div>
                <p className={`mt-4 text-sm ${tier.highlighted ? 'text-gray-300' : 'text-gray-600'}`}>
                  {tier.description}
                </p>
              </div>
              <ul className="mb-6 space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <div
                      className={`mr-2 rounded-full p-1 ${
                        tier.highlighted ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span className={`text-sm ${tier.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`inline-block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                  tier.highlighted
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 