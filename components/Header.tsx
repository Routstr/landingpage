"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mobileMenuOpen]);

  const panelVariants = {
    hidden: { opacity: 0, y: -12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 500, damping: 40 }
    },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
  };

  const listVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.06, delayChildren: 0.04 }
    },
    exit: {}
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 600, damping: 40 }
    },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12 } }
  };

  return (
    <header className="py-4 bg-black w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <span className="text-xl sm:text-2xl font-bold text-white">Routstr</span>
          </Link>
          <nav className="hidden md:flex">
            <ul className="flex space-x-6">
              <li><Link href="/models" className="text-sm md:text-base text-gray-400 hover:text-white transition-colors">Models</Link></li>
              <li><Link href="/providers" className="text-sm md:text-base text-gray-400 hover:text-white transition-colors">Providers</Link></li>
              <li><Link href="/blog" className="text-sm md:text-base text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              <li>
                <a
                  href="https://chat.routstr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm md:text-base text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Chat
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://docs.routstr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm md:text-base text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
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
                  className="text-sm md:text-base text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
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
          <motion.button
            className="md:hidden text-white p-2"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial="hidden"
            animate="show"
            exit="exit"
            variants={panelVariants}
            className="fixed inset-0 z-50 md:hidden bg-black px-6 py-6 h-[100dvh] w-screen overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <motion.button
              onClick={closeMobileMenu}
              aria-label="Close menu"
              className="absolute right-4 top-4 text-white p-2"
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
            <motion.ul variants={listVariants} className="space-y-6 pt-14">
              <motion.li variants={itemVariants}><Link href="/#features" onClick={closeMobileMenu} className="text-base text-gray-300 hover:text-white transition-colors block py-1">Features</Link></motion.li>
              <motion.li variants={itemVariants}><Link href="/models" onClick={closeMobileMenu} className="text-base text-gray-300 hover:text-white transition-colors block py-1">Models</Link></motion.li>
              <motion.li variants={itemVariants}><Link href="/providers" onClick={closeMobileMenu} className="text-base text-gray-300 hover:text-white transition-colors block py-1">Providers</Link></motion.li>
              <motion.li variants={itemVariants}><Link href="/blog" onClick={closeMobileMenu} className="text-base text-gray-300 hover:text-white transition-colors block py-1">Blog</Link></motion.li>
              <motion.li variants={itemVariants}>
                <a
                  href="https://chat.routstr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className="text-base text-gray-300 hover:text-white transition-colors flex items-center gap-1 py-1"
                >
                  Chat
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </motion.li>
              <motion.li variants={itemVariants}>
                <a
                  href="https://docs.routstr.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className="text-base text-gray-300 hover:text-white transition-colors flex items-center gap-1 py-1"
                >
                  Docs
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </motion.li>
              <motion.li variants={itemVariants}>
                <a
                  href="/topup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className="text-base text-gray-300 hover:text-white transition-colors flex items-center gap-1 py-1"
                >
                  Top-Up
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7L7 17M17 7h-6m6 0v6" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </motion.li>
              <motion.li variants={itemVariants}><Link href="https://github.com/routstr" onClick={closeMobileMenu} className="text-base text-gray-300 hover:text-white transition-colors block py-1">GitHub</Link></motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
} 