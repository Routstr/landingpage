"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="border-b border-white/10 py-4 bg-black w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-white">Routstr</span>
          </Link>
          <nav className="hidden md:flex">
            <ul className="flex space-x-6">
              <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/models" className="text-sm text-gray-400 hover:text-white transition-colors">Models</Link></li>
              <li>
                <a
                  href="https://docs.routstr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Docs
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href="/topup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Top-Up
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/providers"
            className="hidden md:inline-flex items-center gap-2 px-3 py-0.5 rounded-md border border-white/10 bg-white/5 text-sm text-white hover:bg-white/10 transition-all"
          >
            Providers
          </Link>
          <a
            href="https://github.com/routstr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-3 py-0.5 rounded-md border border-white/10 bg-white/5 text-sm text-white hover:bg-white/10 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="text-amber-400">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
            </svg>
            Star on GitHub
          </a>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-black/95 border-t border-white/10 absolute z-50 w-full">
          <ul className="space-y-4 mb-4">
            <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors block py-1">Features</Link></li>
            <li><Link href="/models" className="text-sm text-gray-400 hover:text-white transition-colors block py-1">Models</Link></li>
            <li><Link href="/providers" className="text-sm text-gray-400 hover:text-white transition-colors block py-1">Providers</Link></li>
            <li>
              <a
                href="https://docs.routstr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 py-1"
              >
                Docs
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                </svg>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href="/topup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 py-1"
              >
                Top-Up
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                </svg>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li><Link href="https://github.com/routstr" className="text-sm text-gray-400 hover:text-white transition-colors block py-1">GitHub</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
} 