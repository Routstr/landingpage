import TestimonialCard from './TestimonialCard';
import Image from 'next/image';

interface Testimonial {
  name: string;
  handle: string;
  quote: string;
  avatarUrl?: string;
  featured?: boolean;
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
  // Separate featured testimonials from the rest
  const featuredTestimonials = testimonials.filter(t => t.featured);
  const regularTestimonials = testimonials.filter(t => !t.featured);

  return (
    <section className={`bg-black py-10 ${className}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-white/50"></div>
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
          <div className="w-2 h-2 rounded-full bg-white/10"></div>
        </div>
        
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          {title}
        </h2>
        
        {/* Featured testimonials (if any) */}
        {featuredTestimonials.length > 0 && (
          <div className="max-w-xl mx-auto mb-8">
            {featuredTestimonials.map((testimonial, index) => (
              <div key={index} className="rounded-lg bg-black border border-white/10 p-6 relative">
                <div className="absolute top-0 right-0 w-1/4 h-0.5 bg-gradient-to-l from-transparent to-white/20"></div>
                
                <div className="mb-4 flex items-center gap-4">
                  {testimonial.avatarUrl ? (
                    <Image 
                      src={testimonial.avatarUrl}
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono">
                      {testimonial.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-white">{testimonial.name}</h4>
                    <p className="text-sm text-gray-400 font-mono">@{testimonial.handle}</p>
                  </div>
                </div>
                
                <div className="pl-2 border-l border-white/10">
                  <p className="text-gray-400 text-lg">&quot;{testimonial.quote}&quot;</p>
                </div>
                
                <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/20"></div>
              </div>
            ))}
          </div>
        )}
        
        {/* Regular testimonials */}
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          {regularTestimonials.map((testimonial, index) => (
            <div key={index} className="rounded-lg bg-black border border-white/10 p-4 relative">
              <div className="absolute top-0 right-0 w-1/4 h-0.5 bg-gradient-to-l from-transparent to-white/20"></div>
              
              <div className="mb-3 flex items-center gap-3">
                {testimonial.avatarUrl ? (
                  <Image 
                    src={testimonial.avatarUrl}
                    alt={testimonial.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono text-xs">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm text-white">{testimonial.name}</h4>
                  <p className="text-xs text-gray-400 font-mono">@{testimonial.handle}</p>
                </div>
              </div>
              
              <div className="pl-2 border-l border-white/10">
                <p className="text-gray-400 text-sm">&quot;{testimonial.quote}&quot;</p>
              </div>
              
              <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/20"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 