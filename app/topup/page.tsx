'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Copy, Loader2, Zap, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { CashuMint, CashuWallet, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { generateApiToken, getBalanceFromStoredProofs } from '@/utils/cashuUtils';

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
  
  // Lightning state
  const [lightningInvoice, setLightningInvoice] = useState<LightningInvoice | null>(null);
  const [mintUrl, setMintUrl] = useState('https://mint.minibits.cash/Bitcoin');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [mintedTokens, setMintedTokens] = useState<string | null>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const paymentCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Popular amounts for quick selection
  const popularAmounts = [100, 500, 1000, 5000];

  // Load balance on component mount
  useEffect(() => {
    const currentBalance = getBalanceFromStoredProofs();
    setBalance(currentBalance);
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

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
    setIsCheckingPayment(false);
    setError(null);
  };

  const generateLightningInvoice = async () => {
    if (!validateAmount(amount)) {
      setError('Please enter a valid amount');
      return;
    }

    // Clear any existing payment check
    if (paymentCheckRef.current) {
      clearTimeout(paymentCheckRef.current);
      paymentCheckRef.current = null;
    }

    setIsGeneratingInvoice(true);
    setError(null);
    setMintedTokens(null);
    setIsCheckingPayment(false);

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
      setError('Failed to generate Lightning invoice. Please try again.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const checkPaymentStatus = async (quoteId: string, amount: number) => {
    setIsCheckingPayment(true);
    setError(null);

    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);
    await wallet.loadMint();

    let attempts = 0;
    const maxAttempts = 40; // 40 * 5 seconds = ~3.3 minutes

    const checkPayment = async () => {
      if (attempts >= maxAttempts) {
        setIsCheckingPayment(false);
        setError('Payment not received within timeout. Please check your Lightning invoice and try again.');
        return;
      }

      try {
        const mintQuote = await wallet.checkMintQuote(quoteId);
        
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
          setSuccess(`Lightning payment received! ${amount} sats minted as Cashu tokens.`);
          setIsCheckingPayment(false);
          
          // Update balance
          setBalance(getBalanceFromStoredProofs());
          return;
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        paymentCheckRef.current = setTimeout(checkPayment, 5000);
      } else {
        setIsCheckingPayment(false);
        setError('Payment not received within timeout. Please check your Lightning invoice and try again.');
      }
    };

    checkPayment();
  };

  const generateCashuToken = async () => {
    if (!validateAmount(amount)) {
      setError('Please enter a valid amount');
      return;
    }

    const amountNum = parseInt(amount);
    if (amountNum > balance) {
      setError(`Insufficient balance. You have ${balance} sats available.`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = await generateApiToken(mintUrl, amountNum);
      if (token) {
        setCashuToken(token);
        setBalance(getBalanceFromStoredProofs()); // Update balance
        setSuccess(`Generated Cashu token for ${amountNum} sats`);
      } else {
        setError('Failed to generate Cashu token. Please check your balance.');
      }
    } catch (err) {
      console.error('Error generating Cashu token:', err);
      setError('Failed to generate Cashu token. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const performTopUp = async () => {
    if (!validateApiKey(apiKey)) {
      setError('Please enter a valid API key');
      return;
    }

    if (!validateAmount(amount)) {
      setError('Please enter a valid amount');
      return;
    }

    let tokenToUse = '';

    if (paymentMethod === 'cashu') {
      if (!cashuToken) {
        setError('Please generate a Cashu token first');
        return;
      }
      tokenToUse = cashuToken;
    } else {
      if (!mintedTokens) {
        if (!lightningInvoice) {
          setError('Please generate a Lightning invoice first');
          return;
        }
        setError('Please wait for Lightning payment to complete and tokens to be minted');
        return;
      }
      tokenToUse = mintedTokens;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`https://api.routstr.com/v1/wallet/topup?cashu_token=${encodeURIComponent(tokenToUse)}`, {
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
      setSuccess(`Successfully topped up ${amount} sats to your API key!`);
      
      // Reset form
      setCashuToken('');
      setLightningInvoice(null);
      setMintedTokens(null);
      setAmount('');
      
    } catch (err) {
      console.error('Error during top up:', err);
      setError(err instanceof Error ? err.message : 'Top up failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${label} copied to clipboard!`);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Top-Up Your API Key</h1>
          <p className="text-gray-300 text-lg">
            Add funds to your Routstr API key using Cashu tokens or Lightning payments
          </p>
        </div>

        {/* Balance Display */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/70">Available Balance</span>
            <span className="text-lg font-semibold text-white">{balance} sats</span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3 rounded-md text-sm mb-4 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-200 p-3 rounded-md text-sm mb-4 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* API Key Input */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">API Key</h3>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:border-white/30 focus:outline-none"
              placeholder="Enter your API key"
              required
            />
            <p className="text-xs text-white/50 mt-2">
              Enter the API key you want to top up
            </p>
          </div>

          {/* Payment Method Toggle */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
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

          {/* Amount Input */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
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

          {/* Payment Method Specific Content */}
          {paymentMethod === 'cashu' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Cashu Token</h3>
              
              {!cashuToken ? (
                <button
                  onClick={generateCashuToken}
                  disabled={isProcessing || !amount}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Token...
                    </>
                  ) : (
                    'Generate Cashu Token'
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/10 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">Generated Token</span>
                      <button
                        onClick={() => copyToClipboard(cashuToken, 'Token')}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-mono text-xs break-all text-white/70 max-h-20 overflow-y-auto">
                      {cashuToken}
                    </div>
                  </div>
                  <button
                    onClick={() => setCashuToken('')}
                    className="text-sm text-white/70 hover:text-white"
                  >
                    Generate New Token
                  </button>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'lightning' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Lightning Invoice</h3>
              
              {!lightningInvoice ? (
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
              )}
            </div>
          )}

          {/* Top-up Button */}
          <button
            onClick={performTopUp}
            disabled={
              isProcessing ||
              !apiKey ||
              !amount ||
              (paymentMethod === 'cashu' && !cashuToken) ||
              (paymentMethod === 'lightning' && !mintedTokens)
            }
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium text-lg transition-colors flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Top-up...
              </>
            ) : (
              `Top-up ${amount || '0'} sats`
            )}
          </button>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-300 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-blue-200/80">
                  <li>• <strong>Cashu:</strong> Generate a token from your local balance and use it to top-up</li>
                  <li>• <strong>Lightning:</strong> Pay the generated invoice to automatically mint tokens, then top-up</li>
                  <li>• All top-ups are sent to <code className="bg-blue-500/20 px-1 rounded">https://api.routstr.com</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopUpPage;