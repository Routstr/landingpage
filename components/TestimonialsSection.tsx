import TestimonialCard from './TestimonialCard';

interface Testimonial {
  name: string;
  handle: string;
  quote: string;
  avatarUrl?: string;
}

interface TestimonialsSectionProps {
  title: string;
  testimonials: Testimonial[];
  className?: string;
}

export default function TestimonialsSection({
  title,
  testimonials,
  className = ''
}: TestimonialsSectionProps) {
  return (
    <section className={`bg-black py-20 ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-white/50"></div>
          <div className="w-3 h-3 rounded-full bg-white/30"></div>
          <div className="w-3 h-3 rounded-full bg-white/10"></div>
        </div>
        
        <h2 className="mb-6 text-center text-3xl font-bold text-white">
          {title}
        </h2>
        
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
          Join the community building censorship-resistant AI access
        </p>
        
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index}
              name={testimonial.name}
              handle={testimonial.handle}
              quote={testimonial.quote}
              avatarUrl={testimonial.avatarUrl}
            />
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="https://github.com/routstr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="font-mono text-sm">Contribute on GitHub</span>
          </a>
        </div>
      </div>
    </section>
  );
} 