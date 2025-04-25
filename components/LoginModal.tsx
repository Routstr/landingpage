'use client';

import { useState } from 'react';
import { validateNsec } from '@/lib/nostr';
import { useNostr } from '@/context/NostrContext';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'extension' | 'nsec' | 'signup'>('extension');
  const [nsecKey, setNsecKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  
  // For signup
  const [generatedNsec, setGeneratedNsec] = useState<string | null>(null);
  const [generatedNpub, setGeneratedNpub] = useState<string | null>(null);
  const [npubCopied, setNpubCopied] = useState(false);  
  const [nsecCopied, setNsecCopied] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showNsec, setShowNsec] = useState(false);
  
  const { loginWithNsec, login, isNostrAvailable } = useNostr();
  const router = useRouter();

  const handleExtensionLogin = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      await login();
      onClose();
      router.push('/settings');
    } catch (error) {
      setError('Failed to connect with extension. Please make sure it\'s installed and try again.');
      console.error('Error logging in with Nostr:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNsecLogin = () => {
    // Reset errors
    setError(null);
    
    // Validate input is not empty
    if (!nsecKey.trim()) {
      setError('Please enter your nsec key');
      return;
    }
    
    // Ensure it's a valid nsec key
    if (!nsecKey.startsWith('nsec1')) {
      setError('Invalid nsec key format. Keys should start with "nsec1"');
      return;
    }
    
    // Validate the nsec key
    if (!validateNsec(nsecKey)) {
      setError('Invalid nsec key');
      return;
    }
    
    // Attempt to login
    const success = loginWithNsec(nsecKey);
    
    if (success) {
      // Clear form
      setNsecKey('');
      setError(null);
      onClose();
      router.push('/settings');
    } else {
      setError('Failed to login with the provided nsec key');
    }
  };

  const getExtension = () => {
    window.open(
      'https://getalby.com/',
      '_blank',
      'noopener,noreferrer'
    );
  };
  
  const generateNewKeypair = () => {
    try {
      // Generate a new keypair
      const secretKey = generateSecretKey();
      const publicKey = getPublicKey(secretKey);
      
      // Encode to bech32 format
      const nsecEncoded = nip19.nsecEncode(secretKey);
      const npubEncoded = nip19.npubEncode(publicKey);
      
      // Set the generated keys
      setGeneratedNsec(nsecEncoded);
      setGeneratedNpub(npubEncoded);
      
      // Reset states
      setNpubCopied(false);
      setNsecCopied(false);
      setShowSaveConfirmation(false);
      setShowNsec(false);
    } catch (error) {
      console.error('Error generating keypair:', error);
      setError('Failed to generate new keys. Please try again.');
    }
  };
  
  const copyToClipboard = (text: string, type: 'npub' | 'nsec') => {
    navigator.clipboard.writeText(text).then(
      () => {
        if (type === 'npub') {
          setNpubCopied(true);
          setTimeout(() => setNpubCopied(false), 3000);
        } else {
          setNsecCopied(true);
          setTimeout(() => setNsecCopied(false), 3000);
        }
      },
      (err) => {
        console.error('Failed to copy:', err);
      }
    );
  };
  
  const confirmKeysSaved = () => {
    setShowSaveConfirmation(true);
  };
  
  const completeSignup = () => {
    // Login with the generated nsec key
    if (generatedNsec) {
      const success = loginWithNsec(generatedNsec);
      if (success) {
        onClose();
        router.push('/settings');
      } else {
        setError('Failed to login with the generated key');
      }
    }
  };
  
  const toggleShowNsec = () => {
    setShowNsec(!showNsec);
  };
  
  // Function to mask the nsec key for display
  const maskNsecKey = (nsec: string) => {
    if (!nsec) return '';
    // Keep the first 6 and last 4 characters, mask the rest
    const prefix = nsec.substring(0, 6);
    const suffix = nsec.substring(nsec.length - 4);
    return `${prefix}${'•'.repeat(Math.min(20, nsec.length - 10))}${suffix}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/10 rounded-xl max-w-sm w-full p-5 relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-white/50 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-lg font-bold text-white mb-4">Connect to Routstr</h2>
        
        {/* Tabs */}
        <div className="flex mb-4 bg-white/5 p-0.5 rounded-lg gap-1">
          <button
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'extension'
              ? 'bg-white text-black' 
              : 'text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('extension')}
          >
            Extension
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'nsec'
              ? 'bg-white text-black' 
              : 'text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('nsec')}
          >
            Private Key
          </button>
          <button
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'signup'
              ? 'bg-white text-black' 
              : 'text-white hover:bg-white/10'
            }`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>
        
        {/* Extension Tab */}
        {activeTab === 'extension' && (
          <div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
              <h3 className="text-sm font-medium text-white mb-2">Connect with Extension</h3>
              <p className="text-xs text-gray-400 mb-3">
                Use a NIP-07 compatible browser extension like Alby or nos2x to securely connect without sharing your keys.
              </p>
              
              {isNostrAvailable ? (
                <button
                  onClick={handleExtensionLogin}
                  disabled={isLoading}
                  className="w-full py-2 bg-white text-black rounded-md text-xs font-medium flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  {isLoading ? (
                    <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L3 10L12 16L21 10L12 4Z" fill="currentColor" />
                        <path d="M3 14L12 20L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Connect with Extension
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={getExtension}
                  className="w-full py-2 bg-white text-black rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  Get Nostr Extension
                </button>
              )}
              
              {error && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Nsec Key Tab */}
        {activeTab === 'nsec' && (
          <div>
            {showWarning && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <h3 className="text-red-400 font-semibold mb-1 flex items-center text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Security Warning
                </h3>
                <p className="text-xs text-gray-300">
                  Entering your nsec private key is like sharing your password. Only use this on trusted devices.
                </p>
                <button 
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                  onClick={() => setShowWarning(false)}
                >
                  I understand
                </button>
              </div>
            )}
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
              <div className="mb-3">
                <label htmlFor="nsec" className="block text-xs font-medium text-gray-400 mb-1">
                  Private Key (nsec)
                </label>
                <input
                  id="nsec"
                  type="password"
                  value={nsecKey}
                  onChange={(e) => setNsecKey(e.target.value)}
                  placeholder="nsec1..."
                  className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                {error && (
                  <p className="mt-1 text-xs text-red-400">{error}</p>
                )}
              </div>
              
              <div className="flex items-center mb-3">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="h-3 w-3 bg-black border border-white/30 rounded"
                />
                <label htmlFor="remember" className="ml-2 text-xs text-gray-300">
                  Remember this key
                </label>
              </div>
              
              <button
                type="button"
                onClick={handleNsecLogin}
                className="w-full py-2 bg-white text-black rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                Sign In with Private Key
              </button>
            </div>
          </div>
        )}
        
        {/* Sign Up Tab */}
        {activeTab === 'signup' && (
          <div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
              <h3 className="text-sm font-medium text-white mb-2">Create New Account</h3>
              <p className="text-xs text-gray-400 mb-3">
                Generate a new Nostr identity to get started. Make sure to save your private key securely.
              </p>
              
              {!generatedNsec ? (
                <button
                  onClick={generateNewKeypair}
                  className="w-full py-2 bg-white text-black rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  Generate New Keys
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-gray-400">
                        Your Public Key (npub)
                      </label>
                      {generatedNpub && (
                        <button 
                          onClick={() => copyToClipboard(generatedNpub, 'npub')}
                          className="text-xs text-white/70 hover:text-white"
                        >
                          {npubCopied ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <div className="px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-md text-xs text-gray-300 break-all">
                      {generatedNpub || 'Error generating key'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-red-400">
                        Your Private Key (nsec) - SAVE THIS!
                      </label>
                      <div className="flex items-center gap-2">
                        {generatedNsec && (
                          <button 
                            onClick={() => copyToClipboard(generatedNsec, 'nsec')}
                            className="text-xs text-white/70 hover:text-white"
                          >
                            {nsecCopied ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                        <button 
                          onClick={toggleShowNsec}
                          className="text-xs text-white/70 hover:text-white"
                        >
                          {showNsec ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div className="px-2.5 py-1.5 bg-red-950/20 border border-red-500/20 rounded-md text-xs text-gray-300 break-all">
                      {generatedNsec 
                        ? (showNsec ? generatedNsec : maskNsecKey(generatedNsec))
                        : 'Error generating key'
                      }
                    </div>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                    <p className="text-xs text-yellow-200/70">
                      <span className="font-bold">Important:</span> Your private key is your identity. Save it securely and never share it.
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="saved-key"
                      type="checkbox"
                      checked={showSaveConfirmation}
                      onChange={confirmKeysSaved}
                      className="h-3 w-3 bg-black border border-white/30 rounded"
                    />
                    <label htmlFor="saved-key" className="ml-2 text-xs text-gray-300">
                      I&apos;ve saved my private key securely
                    </label>
                  </div>
                  
                  <button
                    type="button"
                    onClick={completeSignup}
                    disabled={!showSaveConfirmation}
                    className={`w-full py-2 rounded-md text-xs font-medium ${
                      showSaveConfirmation 
                        ? 'bg-white text-black hover:bg-gray-200' 
                        : 'bg-white/20 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    Complete Sign Up
                  </button>
                </div>
              )}
              
              {error && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 