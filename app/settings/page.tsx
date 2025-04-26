'use client';

import { useEffect, useState, useRef } from 'react';
import { useNostr } from '@/context/NostrContext';
import { useRouter } from 'next/navigation';
import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
import Header from '@/components/Header';
import QRCode from 'react-qr-code';

// Define types for the data structures
interface CashuProof {
  amount: number;
  secret: string;
  C: string;
  id: string;
  [key: string]: unknown;
}

interface MintQuoteResponse {
  quote: string;
  request?: string;
  state: MintQuoteState;
  expiry?: number;
}

interface SendResult {
  send: CashuProof[];
  keep: CashuProof[];
}

export default function SettingsPage() {
  const { isAuthenticated, publicKey } = useNostr();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [mintUrl, setMintUrl] = useState('https://mint.minibits.cash/Bitcoin');
  const [mintAmount, setMintAmount] = useState('64');
  const [mintInvoice, setMintInvoice] = useState('');
  const [mintQuote, setMintQuote] = useState<MintQuoteResponse | null>(null);
  const [cashuWallet, setCashuWallet] = useState<CashuWallet | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [tokenToImport, setTokenToImport] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isInvoiceCopied, setIsInvoiceCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet');
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define checkMintQuote before using it in useEffect
  const checkMintQuote = async () => {
    if (!cashuWallet || !mintQuote) return;

    // Don't set loading state during auto-checking
    if (!isAutoChecking) {
      setLoading(true);
    }
    setError(''); // Only clear error when manually checking

    try {
      const checkedQuote = await cashuWallet.checkMintQuote(mintQuote.quote);

      if (checkedQuote.state === MintQuoteState.PAID) {
        // Clear interval if payment is successful
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
          setIsAutoChecking(false);
        }

        // Mint the proofs
        const amount = parseInt(mintAmount, 10);
        const proofs = await cashuWallet.mintProofs(amount, mintQuote.quote);

        // Store proofs in localStorage
        const storedProofs = localStorage.getItem('cashu_proofs');
        const existingProofs = storedProofs ? JSON.parse(storedProofs) as CashuProof[] : [];
        localStorage.setItem('cashu_proofs', JSON.stringify([...existingProofs, ...proofs]));

        // Update balance
        setBalance(prevBalance => prevBalance + amount);
        setSuccessMessage('Payment received! Tokens minted successfully.');
        // Reset mint form
        setMintQuote(null);
        setMintInvoice('');
      }
    } catch (err: unknown) {
      console.error('Failed to check mint quote:', err);
      // Only show error message when not auto-checking
      if (!isAutoChecking) {
        setError(err instanceof Error ? err.message : 'Failed to check payment status');
      }
    } finally {
      // Only set loading state when not auto-checking
      if (!isAutoChecking) {
        setLoading(false);
      }
    }
  };

  // Check authentication and init wallet
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    const initWallet = async () => {
      try {
        const mint = new CashuMint(mintUrl);
        const wallet = new CashuWallet(mint);
        await wallet.loadMint();
        setCashuWallet(wallet);

        // Get any stored proofs from localStorage
        const storedProofs = localStorage.getItem('cashu_proofs');
        if (storedProofs) {
          const proofs = JSON.parse(storedProofs) as CashuProof[];
          // Calculate balance from proofs
          const totalAmount = proofs.reduce((total: number, proof: CashuProof) => total + proof.amount, 0);
          setBalance(totalAmount);
        }
      } catch (err) {
        console.error('Failed to initialize Cashu wallet:', err);
        setError('Failed to initialize wallet. Please try again.');
      }
    };

    initWallet();

    // Clean up any intervals on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, router, mintUrl]);

  // Set up auto-refresh interval when invoice is generated
  useEffect(() => {
    // Clear any existing intervals
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
      setIsAutoChecking(false);
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // If we have an invoice and mint quote, start auto-checking
    if (mintInvoice && mintQuote) {
      setIsAutoChecking(true);
      setCountdown(5); // Reset countdown to 5 seconds

      // Set up the countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 5; // Reset to 5 when it reaches 0
          }
          return prev - 1;
        });
      }, 1000);

      // Set up the payment check interval
      checkIntervalRef.current = setInterval(() => {
        checkMintQuote();
      }, 5000); // Check every 5 seconds
    }

    // Clean up
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        setIsAutoChecking(false);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [mintInvoice, mintQuote]);

  const createMintQuote = async () => {
    if (!cashuWallet) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const amount = parseInt(mintAmount, 10);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const quote = await cashuWallet.createMintQuote(amount);
      setMintQuote(quote);
      setMintInvoice(quote.request || '');
      setSuccessMessage('Invoice generated! Pay it to mint tokens.');
    } catch (err: unknown) {
      console.error('Failed to create mint quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to create mint quote');
    } finally {
      setLoading(false);
    }
  };

  const importToken = async () => {
    if (!cashuWallet || !tokenToImport.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Parse and validate the token
      const result = await cashuWallet.receive(tokenToImport) as CashuProof[];

      // The result is an array of proofs
      const proofs = Array.isArray(result) ? result : [];

      if (!proofs || proofs.length === 0) {
        throw new Error('Invalid token or no proofs found');
      }

      // Store proofs in localStorage
      const storedProofs = localStorage.getItem('cashu_proofs');
      const existingProofs = storedProofs ? JSON.parse(storedProofs) as CashuProof[] : [];
      localStorage.setItem('cashu_proofs', JSON.stringify([...existingProofs, ...proofs]));

      // Calculate the imported amount
      const importedAmount = proofs.reduce((total: number, proof: CashuProof) => total + proof.amount, 0);

      // Update balance
      setBalance(prevBalance => prevBalance + importedAmount);

      setSuccessMessage(`Successfully imported ${importedAmount} sats!`);
      setTokenToImport('');
      setShowImportForm(false);
    } catch (err: unknown) {
      console.error('Failed to import token:', err);
      setError(err instanceof Error ? err.message : 'Failed to import token');
    } finally {
      setLoading(false);
    }
  };

  const generateSendToken = async () => {
    if (!cashuWallet) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const amount = parseInt(sendAmount, 10);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount > balance) {
        throw new Error('Amount exceeds available balance');
      }

      // Get stored proofs
      const storedProofs = localStorage.getItem('cashu_proofs');
      const existingProofs = storedProofs ? JSON.parse(storedProofs) as CashuProof[] : [];

      if (!existingProofs || existingProofs.length === 0) {
        throw new Error('No tokens available to send');
      }

      // In recent versions of cashu-ts, send returns { send, keep }
      const sendResult = await cashuWallet.send(amount, existingProofs);
      const { send, keep } = sendResult as unknown as SendResult;

      if (!send || send.length === 0) {
        throw new Error('Failed to generate token');
      }

      // Store the remaining proofs back in localStorage
      localStorage.setItem('cashu_proofs', JSON.stringify(keep));

      // Update balance
      setBalance(prevBalance => prevBalance - amount);

      // Create a token string - simple format for now that other wallets can understand
      const tokenObj = {
        token: [{ mint: mintUrl, proofs: send }]
      };
      const token = `cashuA${btoa(JSON.stringify(tokenObj))}`;

      // Set the generated token for display
      setGeneratedToken(token);
      setSuccessMessage(`Generated token for ${amount} sats. Share it with the recipient.`);

    } catch (err: unknown) {
      console.error('Failed to generate send token:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyInvoiceToClipboard = () => {
    navigator.clipboard.writeText(mintInvoice);
    setIsInvoiceCopied(true);
    setTimeout(() => setIsInvoiceCopied(false), 2000);
  };

  const resetSendForm = () => {
    setShowSendForm(false);
    setGeneratedToken('');
    setSendAmount('');
    setError('');
    setSuccessMessage('');
  };

  // Render loading state if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <p>Please log in to access your dashboard.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <div className="container mx-auto px-4 py-6 flex flex-1">
        {/* Sidebar with balance and tabs */}
        <div className="w-64 mr-6">
          {/* Balance Card */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-5 mb-6">
            <p className="text-xs text-gray-400 mb-1">Available Balance</p>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-2">{balance}</span>
              <span className="text-sm text-gray-300">sats</span>
            </div>
          </div>

          {/* Vertical Tab Navigation */}
          <nav className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`w-full text-left px-5 py-3 text-sm transition-colors ${activeTab === 'wallet' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}
            >
              Mint Tokens
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`w-full text-left px-5 py-3 text-sm transition-colors ${activeTab === 'tokens' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}
            >
              Create & Redeem
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-5 py-3 text-sm transition-colors ${activeTab === 'account' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}
            >
              Account
            </button>
          </nav>
        </div>
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Notification Area */}
          {error && (
            <div className="mb-5 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
              <p className="text-sm text-green-400">{successMessage}</p>
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-6">
            {activeTab === 'wallet' && (
              <div>
                <h2 className="text-lg font-medium mb-5">Mint Tokens</h2>

                {!mintInvoice ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="amount" className="block text-xs text-gray-300 mb-2">Amount (sats)</label>
                      <input
                        id="amount"
                        type="number"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        min="1"
                        className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-white/30 focus:outline-none transition-colors"
                      />
                    </div>

                    <button
                      onClick={createMintQuote}
                      disabled={loading}
                      className="w-full bg-white/10 text-white py-2.5 rounded-md text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-50 border border-white/10"
                    >
                      {loading ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-300 mb-2">Lightning Invoice</label>

                    {/* QR Code */}
                    <div className="flex flex-col items-center mb-5">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <QRCode
                          value={mintInvoice}
                          size={180}
                          level="M"
                          fgColor="#FFFFFF"
                          bgColor="transparent"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">Scan with your Lightning wallet</p>
                    </div>

                    <div className="mb-4 p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-yellow-200/80">
                          After payment, your Cashu tokens will be automatically minted and added to your wallet balance.
                        </p>
                        {isAutoChecking && (
                          <div className="flex items-center ml-2 bg-black/30 px-2 py-1 rounded text-xs text-yellow-200/80">
                            <span>Checking in {countdown}s</span>
                            <svg
                              className="ml-2 w-3 h-3 text-yellow-200/80 animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-xs text-gray-300 break-all mb-4 font-mono">
                      {mintInvoice}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={copyInvoiceToClipboard}
                        className="flex-1 bg-black/30 border border-white/10 py-2.5 rounded-md text-xs font-medium hover:bg-black/50 transition-colors"
                      >
                        {isInvoiceCopied ? 'Copied!' : 'Copy Invoice'}
                      </button>

                      <button
                        onClick={() => {
                          // Reset invoice generation
                          setMintInvoice('');
                          setMintQuote(null);
                          setError('');
                          setSuccessMessage('');
                          // Clear any existing intervals
                          if (checkIntervalRef.current) {
                            clearInterval(checkIntervalRef.current);
                            checkIntervalRef.current = null;
                            setIsAutoChecking(false);
                          }
                          if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                          }
                        }}
                        className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 py-2.5 rounded-md text-xs font-medium hover:bg-red-500/20 transition-colors"
                      >
                        Cancel Invoice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tokens' && (
              <div>
                <h2 className="text-lg font-medium mb-5">Create & Redeem Tokens</h2>

                {/* Create/Redeem Options */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => {
                      setShowSendForm(true);
                      setShowImportForm(false);
                    }}
                    className={`bg-black/30 border ${showSendForm ? 'border-white/30' : 'border-white/10'} rounded-lg p-5 text-center hover:bg-black/50 transition-colors`}
                  >
                    <svg className="h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                    <p className="text-sm font-medium">Create Token</p>
                  </button>

                  <button
                    onClick={() => {
                      setShowImportForm(true);
                      setShowSendForm(false);
                    }}
                    className={`bg-black/30 border ${showImportForm ? 'border-white/30' : 'border-white/10'} rounded-lg p-5 text-center hover:bg-black/50 transition-colors`}
                  >
                    <svg className="h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                    <p className="text-sm font-medium">Redeem Token</p>
                  </button>
                </div>

                {/* Forms */}
                <div className="bg-black/30 border border-white/10 rounded-lg p-6">
                  {showSendForm ? (
                    <div>
                      {!generatedToken ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs text-gray-300 mb-2">Amount (sats)</label>
                            <input
                              type="number"
                              value={sendAmount}
                              onChange={(e) => setSendAmount(e.target.value)}
                              min="1"
                              max={balance.toString()}
                              className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-white/30 focus:outline-none transition-colors"
                              placeholder="Amount in sats"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                setShowSendForm(false);
                                setError('');
                                setSuccessMessage('');
                              }}
                              className="flex-1 bg-black/30 border border-white/10 py-2.5 rounded-md text-xs font-medium hover:bg-black/50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={generateSendToken}
                              disabled={loading || !sendAmount || parseInt(sendAmount) <= 0 || parseInt(sendAmount) > balance}
                              className="flex-1 bg-white/10 border border-white/10 text-white py-2.5 rounded-md text-xs font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Creating...' : 'Create Token'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mb-4 p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                            <p className="text-xs text-yellow-200/80">
                              Share this token with the recipient. Once they redeem it, the funds will be transferred.
                            </p>
                          </div>
                          <div className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-xs text-gray-300 break-all mb-4 font-mono">
                            {generatedToken}
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={copyTokenToClipboard}
                              className="flex-1 bg-black/30 border border-white/10 py-2.5 rounded-md text-xs font-medium hover:bg-black/50 transition-colors"
                            >
                              {isCopied ? 'Copied!' : 'Copy Token'}
                            </button>
                            <button
                              onClick={resetSendForm}
                              className="flex-1 bg-black/30 border border-white/10 py-2.5 rounded-md text-xs font-medium hover:bg-black/50 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : showImportForm ? (
                    <div>
                      <div className="space-y-4">
                        <label className="block text-xs text-gray-300 mb-2">Paste Cashu Token</label>
                        <textarea
                          value={tokenToImport}
                          onChange={(e) => setTokenToImport(e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-sm h-24 focus:border-white/30 focus:outline-none transition-colors"
                          placeholder="cashuA..."
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setShowImportForm(false);
                              setError('');
                              setSuccessMessage('');
                            }}
                            className="flex-1 bg-black/30 border border-white/10 py-2.5 rounded-md text-xs font-medium hover:bg-black/50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={importToken}
                            disabled={loading || !tokenToImport.trim()}
                            className="flex-1 bg-white/10 border border-white/10 text-white py-2.5 rounded-md text-xs font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
                          >
                            {loading ? 'Redeeming...' : 'Redeem Token'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-400 text-sm">Select an action above to create or redeem tokens</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div>
                <h2 className="text-lg font-medium mb-5">Account Information</h2>

                <div className="space-y-6">
                  {/* Nostr Identity */}
                  <div>
                    <p className="text-xs text-gray-300 mb-2">Nostr Public Key</p>
                    <div className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-xs break-all">
                      {publicKey}
                    </div>
                  </div>

                  {/* Wallet Settings */}
                  <div>
                    <p className="text-xs text-gray-300 mb-2">Connected Mint</p>
                    <input
                      type="text"
                      value={mintUrl}
                      onChange={(e) => setMintUrl(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-2 text-sm focus:border-white/30 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 