"use client";

import Link from 'next/link';
import Logo from './Logo';
import NostrLogin from './NostrLogin';

export default function Header() {
  return (
    <header className="border-b border-white/10 py-4 bg-black w-full">
      <div className="flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-white">Routstr</span>
          </Link>
          <nav className="hidden md:flex">
            <ul className="flex space-x-6">
              <li><Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/models" className="text-sm text-gray-400 hover:text-white transition-colors">Models</Link></li>
              <li><Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="https://github.com/routstr" className="text-sm text-gray-400 hover:text-white transition-colors">GitHub</Link></li>
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NostrLogin />
          <Link href="/dashboard" className="rounded-md border border-white/20 bg-black px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors">Dashboard</Link>
        </div>
      </div>
    </header>
  );
} 