"use client";

import { useState } from 'react';
import { formatPublicKey } from '@/lib/nostr';
import { useNostr } from '@/context/NostrContext';
import LoginModal from './LoginModal';

export default function NostrLogin() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { publicKey, logout } = useNostr();

  const openLoginModal = () => {
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  if (publicKey) {
    return (
      <div className="flex items-center">
        <div className="text-xs text-white/70 mr-2 hidden md:block">
          {formatPublicKey(publicKey).slice(0, 8)}...{formatPublicKey(publicKey).slice(-6)}
        </div>
        <button
          onClick={logout}
          className="px-4 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={openLoginModal}
        className="px-4 py-1.5 text-xs rounded-full bg-white text-black hover:bg-gray-200 flex items-center gap-2 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L3 10L12 16L21 10L12 4Z" fill="currentColor" />
          <path d="M3 14L12 20L21 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>  
        Connect
      </button>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={closeLoginModal} 
      />
    </>
  );
} 