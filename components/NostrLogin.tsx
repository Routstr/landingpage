"use client";

import { useState } from 'react';
import { formatPublicKey } from '@/lib/nostr';
import { useNostr } from '@/context/NostrContext';
import LoginModal from './LoginModal';
import Link from 'next/link';

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
      <div className="flex items-center gap-2">
        <div className="text-xs text-white/70 mr-2">
          {formatPublicKey(publicKey).slice(0, 8)}...{formatPublicKey(publicKey).slice(-6)}
        </div>
        <Link
          href="/settings"
          className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          Settings
        </Link>
        <button
          onClick={logout}
          className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={openLoginModal}
        className="px-4 py-1.5 text-xs rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
      >
        Sign in
      </button>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={closeLoginModal} 
      />
    </>
  );
}