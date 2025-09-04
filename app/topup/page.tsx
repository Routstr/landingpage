'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Loader2, Zap, AlertCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import QRCode from 'react-qr-code';
import { CashuMint, CashuWallet, getDecodedToken, getEncodedTokenV4 } from '@cashu/cashu-ts';

interface LightningInvoice {
  paymentRequest: string;
  quoteId: string;
  amount: number;
}

const TopUpPage = () => {
  // Form state
  const [apiKey, setApiKey] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cashu' | 'lightning'>('cashu');
  const [amount, setAmount] = useState('');
  const [cashuToken, setCashuToken] = useState('');
  const [baseUrl, setBaseUrl] = useState(''); // New state for base URL
  
  // Lightning state
  const [lightningInvoice, setLightningInvoice] = useState<LightningInvoice | null>(null);
  const mintUrl = 'https://mint.minibits.cash/Bitcoin';
  const [mintedTokens, setMintedTokens] = useState<string | null>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false); // New state for refund loading
  const [refundedToken, setRefundedToken] = useState<string | null>(null); // New state for refunded token
  const paymentCheckRef = useRef<NodeJS.Timeout | null>(null);
  const [apiKeyBalance, setApiKeyBalance] = useState<number | null>(null);
  const [isCheckingApiKeyBalance, setIsCheckingApiKeyBalance] = useState(false);
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);

  const fetchApiKeyBalance = useCallback(async (key: string, providedBaseUrl?: string) => {
    // Define the base URLs to check
    const BASE_URLS = [
      'https://api.routstr.com',
      'https://ai.redsh1ft.com',
      'https://routstr.otrta.me',
      'https://privateprovider.xyz',
      'https://api.routstr.com',
      'https://routstr.rewolf.dev'
    ];
    if (!key) {
      setApiKeyBalance(null);
      setIsApiKeyInvalid(false);
      setBaseUrl(''); // Clear base URL if API key is empty
      return;
    }

    setIsCheckingApiKeyBalance(true);
    setApiKeyBalance(null);
    setIsApiKeyInvalid(false);
    // Do not reset baseUrl here if providedBaseUrl is present, as we want to use it
    if (!providedBaseUrl) {
      setBaseUrl('');
    }

    let foundValidBaseUrl = false;
    const urlsToCheck = providedBaseUrl ? [providedBaseUrl] : BASE_URLS;

    for (const url of urlsToCheck) {
      try {
        const response = await fetch(`${url}/v1/wallet/info`, {
          headers: {
            'Authorization': `Bearer ${key}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setApiKeyBalance(data.balance / 1000);
          setBaseUrl(url); // Set the base URL if successful
          foundValidBaseUrl = true;
          // Only show success toast if we're auto-discovering the URL (not provided via query param)
          if (!providedBaseUrl) {
            toast.success(`API Key valid for ${url}`);
          }
          break; // Exit loop on first successful URL
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.detail?.error?.code === "invalid_api_key") {
            // This URL is not the one, continue to next
            console.warn(`API Key invalid for ${url}: ${errorData.detail?.error?.message || 'Invalid API Key'}`);
          } else {
            console.error(`Error fetching balance from ${url}: ${errorData.detail || `Status ${response.status}`}`);
          }
        }
      } catch (error) {
        console.error(`Network error or failed to fetch from ${url}:`, error);
      }
    }

    if (!foundValidBaseUrl) {
      setApiKeyBalance(null);
      setIsApiKeyInvalid(true);
      if (providedBaseUrl) {
        toast.error(`Invalid API Key for provider: ${providedBaseUrl}`);
      } else {
        toast.error('Invalid API Key or no matching base URL found.');
      }
    }
    setIsCheckingApiKeyBalance(false);
  }, []);
  // API Key display state
  const [showFullApiKey, setShowFullApiKey] = useState(false);

  // Helper function to mask API key
  const getMaskedApiKey = (key: string) => {
    if (key.length <= 4) {
      return key;
    }
    return '••••••••••••••••' + key.slice(-4); // Mask most of it, show last 4
  };

  // Popular amounts for quick selection
  const popularAmounts = [100, 500, 1000, 5000];

  // Fetch API key balance when API key changes or baseUrl is set
  useEffect(() => {
    fetchApiKeyBalance(apiKey, baseUrl);
  }, [apiKey, baseUrl, fetchApiKeyBalance]);

  // Load API key from localStorage and query parameters on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlApiKey = urlParams.get('apikey');
      const urlProviderUrl = urlParams.get('provider_url');
      
      if (urlApiKey) {
        setApiKey(urlApiKey);
        if (urlProviderUrl) {
          setBaseUrl(urlProviderUrl);
          // Fetch balance with the provided URL
          fetchApiKeyBalance(urlApiKey, urlProviderUrl);
        }
      } else {
        // Fallback to localStorage if no URL parameters
        setApiKey(localStorage.getItem('routstr_api_key') || '');
      }
    }
  }, [fetchApiKeyBalance]);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && apiKey) {
      localStorage.setItem('routstr_api_key', apiKey);
    }
  }, [apiKey]);

  // Cleanup payment checking on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckRef.current) {
        clearTimeout(paymentCheckRef.current);
      }
    };
  }, []);

  const validateApiKey = (key: string): boolean => {
    // Basic API key validation - should be a non-empty string
    return key.trim().length > 0;
  };

  const validateAmount = (amt: string): boolean => {
    const num = parseInt(amt);
    return !isNaN(num) && num > 0;
  };

  const handleQuickAmount = (amt: number) => {
    setAmount(amt.toString());
  };

  const handlePaymentMethodChange = (method: 'cashu' | 'lightning') => {
    // Clear any existing payment check when switching methods
    if (paymentCheckRef.current) {
      clearTimeout(paymentCheckRef.current);
      paymentCheckRef.current = null;
    }
    setPaymentMethod(method);
    setLightningInvoice(null);
    setMintedTokens(null);
  };

  const generateLightningInvoice = async () => {
    if (!validateAmount(amount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Clear any existing payment check
    if (paymentCheckRef.current) {
      clearTimeout(paymentCheckRef.current);
      paymentCheckRef.current = null;
    }

    setIsGeneratingInvoice(true);
    setMintedTokens(null);

    try {
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);
      await wallet.loadMint();

      const mintQuote = await wallet.createMintQuote(parseInt(amount));
      
      setLightningInvoice({
        paymentRequest: mintQuote.request,
        quoteId: mintQuote.quote,
        amount: parseInt(amount)
      });

      // Start checking for payment
      checkPaymentStatus(mintQuote.quote, parseInt(amount));
    } catch (err) {
      console.error('Error generating Lightning invoice:', err);
      toast.error('Failed to generate Lightning invoice. Please try again.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const checkPaymentStatus = async (quoteId: string, amount: number) => {
    toast.info('Checking Lightning payment status...');

    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    let attempts = 0;
    const maxAttempts = 40; // 40 * 5 seconds = ~3.3 minutes

    const checkPayment = async () => {
      if (attempts >= maxAttempts) {
        toast.error('Payment not received within timeout. Please check your Lightning invoice and try again.');
        return;
      }
      console.log("checkingstatus ", attempts);

      try {
        const mintQuote = await wallet.checkMintQuote(quoteId);
        
        console.log(mintQuote.state);
        if (mintQuote.state === 'PAID') {
          // Invoice is paid, mint the tokens
          const proofs = await wallet.mintProofs(amount, quoteId);
          
          // Create Cashu token from the minted proofs
          const token = getEncodedTokenV4({
            mint: mintUrl,
            proofs: proofs.map(p => ({
              id: p.id,
              amount: p.amount,
              secret: p.secret,
              C: p.C
            }))
          });
 
           setMintedTokens(token as string);
           toast.success(`Lightning payment received! ${amount} sats minted as Cashu tokens. Topping up your API key...`);
           setLightningInvoice(null);
           
           // Automatically perform top-up
           await performTopUp(token as string);
           return;
         }
       } catch (err) {
         console.error('Error checking payment status:', err);
         toast.error('Error checking payment status. Please try again.');
       }
 
       attempts++;
       if (attempts < maxAttempts) {
         paymentCheckRef.current = setTimeout(checkPayment, 5000);
       } else {
         toast.error('Payment not received within timeout. Please check your Lightning invoice and try again.');
       }
    };

    checkPayment();
  };

  const performTopUp = async (token?: string) => {
    if (!validateApiKey(apiKey)) {
      toast.error('Please enter a valid API key');
      return;
    }

    let tokenToUse = token || '';

    if (!tokenToUse) { // Only check state if no token was passed as argument
      if (paymentMethod === 'cashu') {
        if (!cashuToken) {
          toast.error('Please provide a Cashu token');
          return;
        }
        tokenToUse = cashuToken;
      } else {
        if (!mintedTokens) {
          if (!lightningInvoice) {
            toast.error('Please generate a Lightning invoice first');
            return;
          }
          toast.info('Please wait for Lightning payment to complete and tokens to be minted');
          return;
        }
        tokenToUse = mintedTokens;
      }
    }

    if (!tokenToUse) {
      toast.error('No token available for top-up.');
      return;
    }

    setIsProcessing(true);

    try {
      if (!baseUrl) {
        toast.error('Base URL not determined. Please ensure your API key is valid.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`${baseUrl}/v1/wallet/topup?cashu_token=${encodeURIComponent(tokenToUse)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Top up failed with status ${response.status}`);
      }
      const data = await response.json();
      console.log('rdlogs: ', data.msats)
      if (response.ok) {
        if (data.msats > 0) {
          toast.success(`Successfully topped up your API key!`);
          // Reset form
          setCashuToken('');
          setMintedTokens(null);
          setAmount('');
        }
        else {
          toast.error(`Topup failed! Likely token is already spent`);
        }
      }

      // Refresh API key balance
      await fetchApiKeyBalance(apiKey, baseUrl);

      
    } catch (err) {
      console.error('Error during top up:', err);
      toast.error(err instanceof Error ? err.message : 'Top up failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleRefund = async () => {
    if (!apiKey || !baseUrl) {
      toast.error('API Key and Base URL are required for refund.');
      return;
    }

    setIsRefunding(true);
    try {
      const response = await fetch(`${baseUrl}/v1/wallet/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Refund failed with status ${response.status}`);
      }

      const data = await response.json();
      const tokenMintUrl = getDecodedToken(data.token).mint;

      const mint = new CashuMint(tokenMintUrl);
      const wallet = new CashuWallet(mint);
      await wallet.loadMint();

      const receivedProofs = await wallet.receive(data.token);

      if (receivedProofs.length > 0) {
        const token = getEncodedTokenV4({
          mint: tokenMintUrl,
          proofs: receivedProofs.map((p: { id: string; amount: number; secret: string; C: string }) => ({
            id: p.id,
            amount: p.amount,
            secret: p.secret,
            C: p.C
          }))
        });
        setRefundedToken(token as string);
        toast.success('Refund completed successfully! Here is your Cashu token.');
      } else {
        toast.info('No tokens were refunded or received.');
      }
      await fetchApiKeyBalance(apiKey, baseUrl); // Refresh balances after successful refund
    } catch (error) {
      console.error('Error during refund:', error);
      toast.error(`Error during refund: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRefunding(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto px-4 py-8 max-w-[42rem]">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Top-Up Your API Key</h1>
            <p className="text-gray-300 text-lg">
              Add funds to your Routstr API key using Cashu tokens or Lightning payments
            </p>
          </div>

          <div className="space-y-6">
            {/* Combined Container */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              {/* API Key Input */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">API Key</h3>
                {apiKey && !showFullApiKey ? (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white">
                    <span className="font-mono text-sm">{getMaskedApiKey(apiKey)}</span>
                    <button
                      onClick={() => setShowFullApiKey(true)}
                      className="text-blue-400 hover:text-blue-300 text-sm ml-2"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:border-white/30 focus:outline-none"
                    placeholder="Enter your API key"
                    required
                  />
                )}
                <p className="text-xs text-white/50 mt-2">
                  {apiKey && !showFullApiKey ? (
                    <>
                      Last 4 digits of your stored API key. <button onClick={() => { setApiKey(''); setShowFullApiKey(true); }} className="text-blue-400 hover:text-blue-300">Clear</button> to enter a new one.
                    </>
                  ) : (
                    'Enter the API key you want to top up'
                  )}
                </p>
                
                {/* API Key Balance */}
                {apiKey && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col items-start">
                        {baseUrl && (
                          <>
                            <span className="text-sm text-white/70">Provider</span>
                            <span className="text-lg font-semibold text-white">{baseUrl.replace('https://', '')}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        {isCheckingApiKeyBalance ? (
                          <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                        ) : isApiKeyInvalid ? (
                          <div className="flex flex-col items-end">
                            <span className="text-red-400 text-lg font-semibold">Invalid API Key</span>
                            <button
                              onClick={() => { setApiKey(''); setIsApiKeyInvalid(false); setShowFullApiKey(true); }}
                              className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">

                            <div className="flex flex-row items-center">
                              {apiKeyBalance !== null && apiKeyBalance >= 1 && (
                                <button
                                  onClick={handleRefund}
                                  disabled={isRefunding || apiKeyBalance === null || apiKeyBalance <= 0}
                                  className="bg-black-700 hover:bg-gray-600 border text-white px-2 py-0 rounded-md text-sm font-medium transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isRefunding ? 'Refunding...' : 'Refund'}
                                </button>
                              )}
                              <span className="text-sm text-white/70">Balance</span>
                            </div>
                            <span className="text-lg font-semibold text-white ml-2">
                              {apiKeyBalance !== null ? `${apiKeyBalance.toFixed(3)} sats` : 'N/A'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Refunded Tokens Section */}
              {refundedToken && (
                <div className="mb-6 border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Refunded Cashu Token</h3>
                  <div className="bg-white/5 border border-white/10 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">Token</span>
                      <button
                        onClick={() => copyToClipboard(refundedToken, 'Refunded Token')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-mono text-xs break-all text-white/70 max-h-20 overflow-y-auto">
                      {refundedToken}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    This is your refunded Cashu token.
                  </p>
                </div>
              )}


              {/* Payment Method Toggle */}
              <div className="mb-6 border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                <div className="flex bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => handlePaymentMethodChange('cashu')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'cashu'
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Cashu Token
                  </button>
                  <button
                    onClick={() => handlePaymentMethodChange('lightning')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      paymentMethod === 'lightning'
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Lightning
                  </button>
                </div>
              </div>

              {/* Lightning Amount Section */}
              {paymentMethod === 'lightning' && (
                <div className="mb-6 border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Amount</h3>
                  
                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {popularAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleQuickAmount(amt)}
                        className="bg-white/5 border border-white/20 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 hover:border-white/30 transition-colors"
                      >
                        {amt} sats
                      </button>
                    ))}
                  </div>
      
                  {/* Manual Amount Input */}
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:border-white/30 focus:outline-none"
                    placeholder="Enter amount in sats"
                    min="1"
                  />
                </div>
              )}

              {/* Cashu Token Section */}
              {paymentMethod === 'cashu' && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Cashu Token</h3>
                  
                  <div className="space-y-3">
                    <textarea
                      value={cashuToken}
                      onChange={(e) => setCashuToken(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:border-white/30 focus:outline-none font-mono text-sm"
                      placeholder="Paste your Cashu token here..."
                      rows={4}
                    />
                    <p className="text-xs text-white/50">
                      Enter a valid Cashu token to top up your API key. The token will be used directly for the top-up.
                    </p>
                    

                    {cashuToken && (
                      <button
                        onClick={() => setCashuToken('')}
                        className="text-sm text-white/70 hover:text-white"
                      >
                        Clear Token
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Lightning Invoice Section */}
              {paymentMethod === 'lightning' && (
                <div className="mb-6">
                  {!isProcessing ? (
                    !lightningInvoice ? (
                      <button
                        onClick={generateLightningInvoice}
                        disabled={isGeneratingInvoice || !amount}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center"
                      >
                        {isGeneratingInvoice ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Invoice...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Generate Lightning Invoice
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-4">
                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-md flex items-center justify-center">
                          <QRCode value={lightningInvoice.paymentRequest} size={200} />
                        </div>

                        {/* Invoice Details */}
                        <div className="bg-white/5 border border-white/10 rounded-md p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-white/70">Lightning Invoice</span>
                            <button
                              onClick={() => copyToClipboard(lightningInvoice.paymentRequest, 'Invoice')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="font-mono text-xs break-all text-white/70 max-h-20 overflow-y-auto">
                            {lightningInvoice.paymentRequest}
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-sm text-white/70 mb-2">
                            Amount: {lightningInvoice.amount} sats
                          </p>
                          <p className="text-xs text-white/50">
                            Pay this invoice to mint tokens, then proceed with top-up
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setLightningInvoice(null);
                            setMintedTokens(null);
                          }}
                          className="text-sm text-white/70 hover:text-white w-full text-center"
                        >
                          Generate New Invoice
                        </button>
                      </div>
                    )
                  ) : (<></>)}
                </div>
              )}

              {/* Minted Tokens Section */}
              {mintedTokens && (
                <div className="mb-6 border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Minted Cashu Token</h3>
                  <div className="bg-white/5 border border-white/10 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">Token</span>
                      <button
                        onClick={() => copyToClipboard(mintedTokens, 'Minted Token')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-mono text-xs break-all text-white/70 max-h-20 overflow-y-auto">
                      {mintedTokens}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Copy this token if the top-up fails for a refund.
                  </p>
                </div>
              )}

              {/* Top-up Button */}
              <div className="border-t border-white/10 pt-6">
                <button
                  onClick={() => performTopUp()}
                  disabled={
                    isProcessing ||
                    !apiKey ||
                    (paymentMethod === 'cashu' && !cashuToken) ||
                    (paymentMethod === 'lightning' && (!amount || !mintedTokens))
                  }
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium text-lg transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing Top-up...
                    </>
                  ) : (
                    `Top-up`
                  )}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-300 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="space-y-1 text-blue-200/80">
                    <li>• <strong>Cashu:</strong> Paste your Cashu token directly, or generate one from your local balance</li>
                    <li>• <strong>Lightning:</strong> Pay the generated invoice to automatically mint tokens, then top-up</li>
                    <li>• <strong>URL Parameters:</strong> Use <code className="bg-white/10 px-1 rounded">?apikey=YOUR_KEY&provider_url=https://api.provider.com</code> to auto-fill fields</li>
                    <li>• All top-ups are sent to the API endpoint determined by your API key or provided URL.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster richColors position="bottom-right" />
    </>
  );
};

export default TopUpPage;