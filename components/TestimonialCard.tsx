import Image from 'next/image';

interface TestimonialCardProps {
  name: string;
  handle: string;
  quote: string;
  avatarUrl?: string;
}

export default function TestimonialCard({
  name,
  handle,
  quote,
  avatarUrl
}: TestimonialCardProps) {
  return (
    <div className="rounded-lg bg-black border border-white/10 p-6 relative">
      {/* Top tech accent */}
      <div className="absolute top-0 right-0 w-1/4 h-0.5 bg-gradient-to-l from-transparent to-white/20"></div>
      
      <div className="mb-4 flex items-center gap-4">
        {avatarUrl ? (
          <Image 
            src={avatarUrl}
            alt={name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono">
            {name.charAt(0)}
          </div>
        )}
        <div>
          <h4 className="font-medium text-white">{name}</h4>
          <p className="text-sm text-gray-400 font-mono">@{handle}</p>
        </div>
      </div>
      
      <div className="pl-2 border-l border-white/10">
        <p className="text-gray-400">&quot;{quote}&quot;</p>
      </div>
      
      {/* Bottom tech accent */}
      <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-white/20"></div>
    </div>
  );
} 