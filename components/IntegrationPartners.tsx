import Image from 'next/image';

interface IntegrationPartnersProps {
  className?: string;
}

export default function IntegrationPartners({ className = '' }: IntegrationPartnersProps) {
  const partners = [
    { name: 'Vercel', logo: '/vercel.svg' },
    { name: 'AWS', logo: '/aws.svg' },
    { name: 'Google Cloud', logo: '/google-cloud.svg' },
    { name: 'Microsoft Azure', logo: '/azure.svg' },
    { name: 'Cloudflare', logo: '/cloudflare.svg' },
    { name: 'Digital Ocean', logo: '/digital-ocean.svg' },
  ];

  return (
    <section className={`py-16 bg-black ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          <span className="relative inline-block">
            Integration Partners
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gray-700"></span>
          </span>
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-gray-300">
          Integrate with your favorite platforms and services to streamline your workflow.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {partners.map((partner) => (
            <div key={partner.name} className="flex justify-center">
              <div className="relative h-12 w-24 filter grayscale hover:grayscale-0 transition-all">
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 