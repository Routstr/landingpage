import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // Set initial state
      setMatches(media.matches);
      
      // Define listener function
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };
      
      // Add listener
      media.addEventListener('change', listener);
      
      // Clean up
      return () => {
        media.removeEventListener('change', listener);
      };
    }
    
    // Default to false on the server
    return undefined;
  }, [query]);
  
  return matches;
} 