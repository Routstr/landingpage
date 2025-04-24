'use client';

import { useState } from 'react';

interface UrlShortenerProps {
  className?: string;
}

export default function UrlShortener({ className = '' }: UrlShortenerProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) return;
    
    setIsLoading(true);
    
    // This would typically make an API call to your URL shortening backend
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Success handling would happen here
      alert('URL shortened successfully! This is a demo placeholder.');
      setUrl('');
    } catch (error) {
      console.error('Error shortening URL:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className="mx-auto rounded-lg bg-gray-800 p-2 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row">
          <input 
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your long URL" 
            className="flex-1 rounded-md border border-gray-700 bg-gray-900 p-3 text-sm text-white placeholder-gray-500 focus:border-gray-500 focus:outline-none"
            required
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-white px-4 py-3 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-70 transition-colors md:whitespace-nowrap"
          >
            {isLoading ? 'Shortening...' : 'Shorten'}
          </button>
        </div>
      </div>
    </form>
  );
} 