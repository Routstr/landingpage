import Link from 'next/link';

interface CtaSectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  className?: string;
}

export default function CtaSection({
  title,
  description,
  buttonText,
  buttonLink,
  className = ''
}: CtaSectionProps) {
  return (
    <section className={`bg-black py-20 ${className} relative overflow-hidden`}>
      {/* Tech grid background effect */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="grid grid-cols-12 h-full w-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border border-white/10"></div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center mb-6 gap-2">
            <div className="h-px w-8 bg-white/20"></div>
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            <div className="h-px w-8 bg-white/20"></div>
          </div>
          <p className="mb-10 text-xl text-gray-300">{description}</p>
          <Link
            href={buttonLink}
            className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/50 relative overflow-hidden group"
          >
            <span className="relative z-10">{buttonText}</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-white"></div>
          </Link>
        </div>
      </div>
    </section>
  );
} 