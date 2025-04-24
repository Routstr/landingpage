import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`text-xl font-bold text-white hover:text-gray-300 transition-colors ${className}`}>
      dub
    </Link>
  );
} 