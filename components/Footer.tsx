import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 bg-black w-full">
      <div className="px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <span className="text-xl font-bold text-white">Routstr</span>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">Decentralized LLM routing marketplace powered by Nostr and Bitcoin.</p>
          </div>
          
          <div>
            <h5 className="mb-4 font-semibold text-white">Protocol</h5>
            <ul className="space-y-2">
              <li><Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/models" className="text-sm text-gray-400 hover:text-white transition-colors">Models</Link></li>
              <li><Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
            </ul>
          </div>
          
          <div>
            <h5 className="mb-4 font-semibold text-white">Resources</h5>
            <ul className="space-y-2">
              <li><Link href="https://github.com/routstr" className="text-sm text-gray-400 hover:text-white transition-colors">GitHub</Link></li>
              <li><Link href="/docs/api" className="text-sm text-gray-400 hover:text-white transition-colors">API Reference</Link></li>
              <li><Link href="/examples" className="text-sm text-gray-400 hover:text-white transition-colors">Examples</Link></li>
            </ul>
          </div>
          
          <div>
            <h5 className="mb-4 font-semibold text-white">Legal</h5>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/license" className="text-sm text-gray-400 hover:text-white transition-colors">License</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 sm:mt-12 border-t border-white/10 pt-6 sm:pt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-400">© {new Date().getFullYear()} Routstr.<br/>Licensed under GNU General Public License v3.0</p>
        </div>
      </div>
    </footer>
  );
} 