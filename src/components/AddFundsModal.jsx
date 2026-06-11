import React, { useState, useEffect } from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';

import API_BASE from "../config/api";

export default function AddFundsModal({ userId, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('card');
    const [amount, setAmount] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);
    const [userCountry, setUserCountry] = useState('US');
    const [userCurrency, setUserCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [usdBalance, setUsdBalance] = useState(0);
    const [localBalance, setLocalBalance] = useState(0);
    const [paymentLink, setPaymentLink] = useState(null);
    const [manualReference, setManualReference] = useState('');
    const [cryptoWalletAddress, setCryptoWalletAddress] = useState(null);
    const [cryptoWalletLoading, setCryptoWalletLoading] = useState(false);
    
    // Platform fee configuration
    const PLATFORM_FEE_PERCENTAGE = 15; // 15% fee on all deposits

    // Fetch user's country, currency, and balance on mount
    useEffect(() => {
        fetchUserData();
        fetchExchangeRate();
        fetchUserBalance();
    }, [userId]);

    const fetchUserData = async () => {
        try {
            const res = await fetch(`${API_BASE}/user/${userId}`);
            const data = await res.json();
            if (data.success) {
                setUserCountry(data.country || 'US');
                setUserCurrency(data.currency || 'USD');
                setCurrencySymbol(data.symbol || '$');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const fetchUserBalance = async () => {
        try {
            const res = await fetch(`${API_BASE}/convert-balance/${userId}`);
            const data = await res.json();
            setUsdBalance(data.usdBalance || 0);
            setLocalBalance(data.localBalance || 0);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    };

    const fetchExchangeRate = async () => {
        try {
            const res = await fetch(`${API_BASE}/exchange-rate`);
            const data = await res.json();
            if (data.success) {
                const rate = data.usdt?.[userCurrency.toLowerCase()] || 1500;
                setExchangeRate(rate);
            }
        } catch (error) {
            setExchangeRate(1500);
        }
    };

    // Convert amount between currencies using backend
    const convertAmount = async (amount, fromCurrency, toCurrency) => {
        try {
            const res = await fetch(`${API_BASE}/convert-amount`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, fromCurrency, toCurrency })
            });
            const data = await res.json();
            return data.converted || amount;
        } catch (error) {
            // Fallback conversion
            const rates = { USD: 1, NGN: 1500, GBP: 0.78, EUR: 0.92, CAD: 1.35 };
            return (amount / rates[fromCurrency]) * rates[toCurrency];
        }
    };

    // Calculate fee breakdown for any amount (in user's local currency)
    const calculateFeeBreakdown = (inputAmount) => {
        const parsedAmount = parseFloat(inputAmount) || 0;
        const platformFee = parsedAmount * (PLATFORM_FEE_PERCENTAGE / 100);
        const youReceive = parsedAmount - platformFee;
        
        return {
            originalAmount: parsedAmount,
            platformFee: platformFee,
            platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
            youReceive: youReceive,
            youReceiveFormatted: youReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            feeFormatted: platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        };
    };

    // Flutterwave Card Payment Configuration (in USD for international cards)
    const flutterwaveConfig = {
        public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
        tx_ref: `DEP_${userId}_${Date.now()}`,
        amount: parseFloat(amount) || 0,
        currency: 'USD', // Always charge in USD for Flutterwave
        payment_options: 'card',
        customer: {
            email: `user_${userId}@doriq.com`,
            name: 'DORIQ User',
            phone_number: '08012345678'
        },
        customizations: {
            title: 'DORIQ Wallet Funding',
            description: `Add $${amount || '0'} to your wallet`,
            logo: 'https://your-logo-url.com/logo.png'
        }
    };

    const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

    const processCardPayment = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert(`Please enter a valid amount in USD`);
            return;
        }
        
        // Convert to USD if needed
        let usdAmount = parseFloat(amount);
        if (userCurrency !== 'USD') {
            usdAmount = await convertAmount(parseFloat(amount), userCurrency, 'USD');
        }
        
        const feeBreakdown = calculateFeeBreakdown(parseFloat(amount));
        
        // Show fee confirmation before proceeding
        const confirmMessage = `Payment Summary:
        Amount: ${currencySymbol}${feeBreakdown.originalAmount.toLocaleString()} ${userCurrency}
        Platform Fee (${PLATFORM_FEE_PERCENTAGE}%): -${currencySymbol}${feeBreakdown.feeFormatted} ${userCurrency}
        You will receive: ${currencySymbol}${feeBreakdown.youReceiveFormatted} ${userCurrency}
        USD Amount: $${usdAmount.toLocaleString()}
        
        Proceed with payment?`;
        
        if (!window.confirm(confirmMessage)) return;
        
        // Update the config with the current amount before payment
        const updatedConfig = {
            ...flutterwaveConfig,
            amount: usdAmount,
            tx_ref: `DEP_${userId}_${Date.now()}`,
            customizations: {
                title: 'DORIQ Wallet Funding',
                description: `Add $${usdAmount.toLocaleString()} to your wallet`
            }
        };
        
        // Re-initialize with updated amount
        const payment = useFlutterwave(updatedConfig);
        
        payment({
            callback: (response) => {
                console.log('Payment response:', response);
                if (response.status === 'successful') {
                    // Verify the transaction on your backend
                    verifyAndCreditFunds(response.transaction_id, usdAmount, feeBreakdown.platformFee);
                } else {
                    alert("Payment failed or was cancelled.");
                }
                closePaymentModal();
            },
            onClose: () => {
                console.log('Payment modal closed');
            }
        });
    };

    const verifyAndCreditFunds = async (transactionId, amountPaidUSD, platformFeeLocal) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    transactionId,
                    amount: amountPaidUSD,
                    fee: platformFeeLocal,
                    currency: userCurrency,
                    paymentMethod: 'card'
                })
            });
            const data = await res.json();
            
            if (data.success) {
                const youGetLocal = parseFloat(amount) - platformFeeLocal;
                alert(`✅ Payment successful!\n\nAmount: ${currencySymbol}${parseFloat(amount).toLocaleString()} ${userCurrency}\nFee (15%): -${currencySymbol}${platformFeeLocal.toLocaleString()} ${userCurrency}\nYou received: ${currencySymbol}${youGetLocal.toLocaleString()} ${userCurrency}`);
                onBalanceUpdate();
                onClose();
            } else {
                alert("Payment verified but failed to credit. Please contact support.");
            }
        } catch (error) {
            alert("Payment verification failed. Please contact support.");
        } finally {
            setLoading(false);
        }
    };

    // Generate Bank Transfer Instructions (in local currency)
    const generateBankTransfer = () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert(`Please enter a valid amount in ${userCurrency}`);
            return;
        }
        
        const feeBreakdown = calculateFeeBreakdown(amount);
        
        const reference = `DORIQ${userId.slice(-6)}${Date.now()}`;
        setPaymentLink({
            reference,
            amount: parseFloat(amount),
            fee: feeBreakdown.platformFee,
            youReceive: feeBreakdown.youReceive,
            currency: userCurrency,
            currencySymbol: currencySymbol,
            bankName: "DORIQ Official Account",
            accountNumber: `10${userId.replace(/\D/g, '').slice(0, 8).padStart(8, '0')}`,
            accountName: "DORIQ Technologies"
        });
    };

    // Generate crypto wallet address using existing backend endpoint
    const generateCryptoWallet = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter amount in USD");
            return;
        }
        
        if (parseFloat(amount) < 10) {
            alert("Minimum deposit is 10 USD");
            return;
        }
        
        setCryptoWalletLoading(true);
        try {
            // Use the existing crypto/create-payment endpoint
            const res = await fetch(`${API_BASE}/crypto/create-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: parseFloat(amount),
                    currency: 'USDT',
                    userCurrency: userCurrency
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setCryptoWalletAddress({
                    address: data.address,
                    network: 'Arbitrum One',
                    amount: parseFloat(amount),
                    expiresAt: data.expiresAt,
                    paymentId: data.paymentId,
                    isDemo: data.isDemo || false
                });
            } else {
                alert("Failed to generate wallet. Please try again.");
            }
        } catch (error) {
            console.error('Crypto wallet error:', error);
            alert("Network error. Please try again.");
        } finally {
            setCryptoWalletLoading(false);
        }
    };

    // Submit Crypto Deposit using existing webhook
    const submitCryptoDeposit = async () => {
        if (!manualReference) {
            alert("Please enter the transaction hash");
            return;
        }
        
        const feeBreakdown = calculateFeeBreakdown(amount);
        
        setLoading(true);
        try {
            // The crypto webhook will automatically credit the user
            // This just records the deposit request
            const res = await fetch(`${API_BASE}/manual-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: parseFloat(amount),
                    fee: feeBreakdown.platformFee,
                    reference: manualReference,
                    paymentMethod: 'crypto',
                    currency: userCurrency
                })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Crypto deposit submitted!\n\nAmount: $${parseFloat(amount).toLocaleString()} USD\nFee (15%): -$${feeBreakdown.platformFee.toFixed(2)} USD\nYou will receive: $${feeBreakdown.youReceive.toFixed(2)} USD\n\nTransaction Hash: ${manualReference}\nFunds will be credited after confirmation.`);
                setManualReference('');
                setCryptoWalletAddress(null);
                setAmount('');
                onBalanceUpdate();
                onClose();
            } else {
                alert(data.error || "Failed to submit deposit");
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Submit Manual Deposit (Bank Transfer)
    const submitManualDeposit = async () => {
        if (!manualReference) {
            alert("Please enter transaction reference");
            return;
        }
        
        const feeBreakdown = calculateFeeBreakdown(paymentLink.amount);
        
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/manual-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: paymentLink.amount,
                    fee: feeBreakdown.platformFee,
                    reference: manualReference,
                    paymentMethod: 'bank_transfer',
                    currency: userCurrency
                })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Deposit request submitted!\n\nAmount: ${currencySymbol}${paymentLink.amount.toLocaleString()} ${userCurrency}\nFee (15%): -${currencySymbol}${feeBreakdown.feeFormatted} ${userCurrency}\nYou will receive: ${currencySymbol}${feeBreakdown.youReceiveFormatted} ${userCurrency}\n\nReference: ${manualReference}\nFunds will be credited after verification.`);
                setManualReference('');
                setPaymentLink(null);
                setAmount('');
                onBalanceUpdate();
                onClose();
            } else {
                alert(data.error || "Failed to submit deposit request");
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    // Fee display component
    const FeeDisplay = ({ amount: displayAmount }) => {
        const feeBreakdown = calculateFeeBreakdown(displayAmount);
        
        if (!displayAmount || parseFloat(displayAmount) <= 0) return null;
        
        return (
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                <p className="text-yellow-400 text-sm font-bold mb-2">💰 Fee Breakdown</p>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Amount you send:</span>
                        <span className="text-white">{currencySymbol}{feeBreakdown.originalAmount.toLocaleString()} {userCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Platform fee ({PLATFORM_FEE_PERCENTAGE}%):</span>
                        <span className="text-red-400">-{currencySymbol}{feeBreakdown.feeFormatted} {userCurrency}</span>
                    </div>
                    <div className="border-t border-white/10 my-2"></div>
                    <div className="flex justify-between font-bold">
                        <span className="text-green-400">You will receive:</span>
                        <span className="text-green-400">{currencySymbol}{feeBreakdown.youReceiveFormatted} {userCurrency}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black italic text-white tracking-tighter">Add Funds</h2>
                    <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase mt-1">
                        {userCountry} • {userCurrency} • {PLATFORM_FEE_PERCENTAGE}% fee
                    </span>
                </div>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            {/* Current Balance Display */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl mb-6 max-w-md mx-auto w-full text-center">
                <p className="text-zinc-400 text-xs">Your Current Balance</p>
                <p className="text-2xl font-bold text-white">{currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
                <p className="text-zinc-500 text-[10px] mt-1">≈ ${usdBalance.toLocaleString()} USD</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-zinc-900/40 p-1 rounded-xl mb-6 max-w-md mx-auto w-full">
                <button
                    onClick={() => {
                        setActiveTab('card');
                        setPaymentLink(null);
                        setCryptoWalletAddress(null);
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                        activeTab === 'card' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Card Payment
                </button>
                <button
                    onClick={() => {
                        setActiveTab('bank');
                        setPaymentLink(null);
                        setCryptoWalletAddress(null);
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                        activeTab === 'bank' 
                            ? 'bg-green-600 text-white' 
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Bank Transfer
                </button>
                <button
                    onClick={() => {
                        setActiveTab('crypto');
                        setPaymentLink(null);
                        setCryptoWalletAddress(null);
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                        activeTab === 'crypto' 
                            ? 'bg-purple-600 text-white' 
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    Crypto (USDT)
                </button>
            </div>

            <div className="max-w-md mx-auto w-full space-y-6">
                {/* Card Payment Tab */}
                {activeTab === 'card' && (
                    <>
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl text-center">
                            <p className="text-zinc-400 text-sm">Instant Card Payment</p>
                            <p className="text-zinc-500 text-xs mt-1">Powered by Flutterwave • Works globally • 15% platform fee applies</p>
                            <p className="text-blue-400 text-xs mt-2">💳 Charged in USD, converted to {userCurrency}</p>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Amount ({userCurrency})</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{currencySymbol}</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white text-2xl"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            {amount && userCurrency !== 'USD' && (
                                <p className="text-zinc-500 text-xs mt-1">
                                    ≈ ${(parseFloat(amount) / 1500).toLocaleString()} USD
                                </p>
                            )}
                        </div>

                        <FeeDisplay amount={amount} />

                        <button
                            onClick={processCardPayment}
                            disabled={!amount || parseFloat(amount) <= 0 || loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                        >
                            {loading ? "Processing..." : `Pay ${currencySymbol}${amount || '0'} with Card`}
                        </button>

                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                            <p className="text-blue-400 text-[10px] font-bold">ℹ️ Instructions</p>
                            <p className="text-zinc-500 text-[10px] mt-1">
                                1. Enter amount in {userCurrency}<br/>
                                2. 15% platform fee will be deducted automatically<br/>
                                3. Click "Pay with Card"<br/>
                                4. Enter your card details on Flutterwave secure page<br/>
                                5. Funds are credited instantly after successful payment<br/>
                                6. All payments processed in USD, converted to {userCurrency}
                            </p>
                        </div>
                    </>
                )}

                {/* Bank Transfer Tab */}
                {activeTab === 'bank' && (
                    <>
                        {!paymentLink ? (
                            <>
                                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 rounded-2xl text-center">
                                    <p className="text-zinc-400 text-sm">Bank Transfer</p>
                                    <p className="text-zinc-500 text-xs mt-1">Transfer from any bank • 15% platform fee applies</p>
                                    <p className="text-green-400 text-xs mt-2">🏦 Transfer in {userCurrency}</p>
                                </div>

                                <div>
                                    <label className="text-zinc-400 text-sm mb-1 block">Amount ({userCurrency})</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white text-2xl"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <FeeDisplay amount={amount} />

                                <button
                                    onClick={generateBankTransfer}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                                >
                                    Generate Transfer Details
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                    <p className="text-green-400 text-[10px] font-bold">✅ Transfer Details Generated</p>
                                    <p className="text-zinc-500 text-[10px] mt-1">
                                        Send: {paymentLink.currencySymbol}{paymentLink.amount.toLocaleString()} {paymentLink.currency}<br/>
                                        You'll receive: {paymentLink.currencySymbol}{paymentLink.youReceive.toLocaleString()} (after 15% fee)
                                    </p>
                                </div>

                                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/10 space-y-4">
                                    <div>
                                        <label className="text-zinc-400 text-sm mb-1 block">Bank Name</label>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                            <span className="text-white font-medium">{paymentLink.bankName}</span>
                                            <button onClick={() => copyToClipboard(paymentLink.bankName)} className="text-blue-400 text-xs">Copy</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-zinc-400 text-sm mb-1 block">Account Number</label>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                            <span className="text-white text-xl font-bold tracking-wider">{paymentLink.accountNumber}</span>
                                            <button onClick={() => copyToClipboard(paymentLink.accountNumber)} className="text-blue-400 text-xs">Copy</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-zinc-400 text-sm mb-1 block">Account Name</label>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                            <span className="text-white">{paymentLink.accountName}</span>
                                            <button onClick={() => copyToClipboard(paymentLink.accountName)} className="text-blue-400 text-xs">Copy</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-zinc-400 text-sm mb-1 block">Reference Number</label>
                                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                            <span className="text-white text-sm font-mono">{paymentLink.reference}</span>
                                            <button onClick={() => copyToClipboard(paymentLink.reference)} className="text-blue-400 text-xs">Copy</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                                    <p className="text-yellow-400 text-[10px] font-bold">📋 After Transfer</p>
                                    <p className="text-zinc-500 text-[10px] mt-1">
                                        1. Transfer EXACTLY {paymentLink.currencySymbol}{paymentLink.amount.toLocaleString()} to the account above<br/>
                                        2. Use the Reference Number in your transfer narration<br/>
                                        3. Enter the transaction reference below after transfer<br/>
                                        4. 15% fee will be deducted, you'll receive {paymentLink.currencySymbol}{paymentLink.youReceive.toLocaleString()}<br/>
                                        5. Funds will be credited after verification (24-48 hours)
                                    </p>
                                </div>

                                <div>
                                    <label className="text-zinc-400 text-sm mb-1 block">Transaction Reference (from your bank)</label>
                                    <input
                                        type="text"
                                        placeholder="Enter the reference number from your bank"
                                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                                        value={manualReference}
                                        onChange={(e) => setManualReference(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={submitManualDeposit}
                                    disabled={loading || !manualReference}
                                    className="w-full bg-green-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                                >
                                    {loading ? "Submitting..." : "Confirm Payment"}
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* Crypto Tab - USD First */}
                {activeTab === 'crypto' && (
                    <>
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 rounded-2xl text-center">
                            <p className="text-zinc-400 text-sm">Send USDT (Arbitrum One / TRC20)</p>
                            <p className="text-zinc-500 text-xs mt-1">Global deposits • 15% platform fee applies</p>
                            <p className="text-purple-400 text-xs mt-2">💰 All amounts in USD (International)</p>
                        </div>

                        <div className="bg-purple-500/10 p-3 rounded-xl">
                            <p className="text-purple-400 text-[10px] text-center">
                                💡 1 USDT = $1 USD
                                {userCurrency !== 'USD' && ` ≈ ${currencySymbol}${exchangeRate?.toLocaleString()} ${userCurrency}`}
                            </p>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Amount in USD</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white text-2xl"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            {amount && userCurrency !== 'USD' && exchangeRate && (
                                <p className="text-zinc-500 text-xs mt-1">
                                    ≈ {currencySymbol}{(parseFloat(amount) * exchangeRate).toLocaleString()} {userCurrency}
                                </p>
                            )}
                        </div>

                        <FeeDisplay amount={amount} />

                        {!cryptoWalletAddress ? (
                            <button
                                onClick={generateCryptoWallet}
                                disabled={!amount || parseFloat(amount) < 10 || cryptoWalletLoading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                            >
                                {cryptoWalletLoading ? "Generating Wallet..." : "Generate Deposit Address"}
                            </button>
                        ) : (
                            <>
                                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/10">
                                    <label className="text-zinc-400 text-sm mb-2 block">USDT Wallet Address ({cryptoWalletAddress.network || 'Arbitrum One'})</label>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                        <span className="text-white text-sm font-mono break-all">
                                            {cryptoWalletAddress.address}
                                        </span>
                                        <button 
                                            onClick={() => copyToClipboard(cryptoWalletAddress.address)}
                                            className="text-blue-400 text-xs ml-2"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p className="text-yellow-500 text-[10px] mt-2">
                                        ⚠️ Send ONLY USDT on {cryptoWalletAddress.network || 'Arbitrum One'} network to this address
                                    </p>
                                    {cryptoWalletAddress.isDemo && (
                                        <p className="text-orange-500 text-[10px] mt-1">
                                            🧪 Demo Mode: This is a test address. In production, real addresses will be generated.
                                        </p>
                                    )}
                                    {cryptoWalletAddress.expiresAt && (
                                        <p className="text-red-400 text-[10px] mt-1">
                                            ⏰ This address expires in 24 hours
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-zinc-400 text-sm mb-1 block">Transaction Hash</label>
                                    <input
                                        type="text"
                                        placeholder="0x... Enter the transaction hash from your wallet"
                                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono text-sm"
                                        value={manualReference}
                                        onChange={(e) => setManualReference(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={submitCryptoDeposit}
                                    disabled={loading || !manualReference}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                                >
                                    {loading ? "Submitting..." : "Confirm Crypto Deposit"}
                                </button>
                            </>
                        )}

                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                            <p className="text-yellow-400 text-[10px] font-bold">ℹ️ Instructions (USDT)</p>
                            <p className="text-zinc-500 text-[10px] mt-1">
                                1. Enter amount in USD (minimum $10 USD)<br/>
                                2. Click "Generate Deposit Address"<br/>
                                3. Send EXACT amount in USDT to the generated address<br/>
                                4. Wait for network confirmations (~15 seconds)<br/>
                                5. Enter transaction hash after sending<br/>
                                6. 15% fee will be deducted automatically<br/>
                                7. Funds credited after 2 confirmations
                            </p>
                        </div>
                    </>
                )}

                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                    <p className="text-green-400 text-[10px] font-bold">✅ Fee Summary</p>
                    <p className="text-zinc-500 text-[10px] mt-1">
                        • Platform fee: {PLATFORM_FEE_PERCENTAGE}% on ALL deposits<br/>
                        • Card payments: Instant credit (processed in USD)<br/>
                        • Bank transfers: 24-48 hours verification (in {userCurrency})<br/>
                        • Crypto (USDT): ~15 minutes for 2 confirmations (in USD)<br/>
                        • Your country: {userCountry} • Currency: {userCurrency} {currencySymbol}<br/>
                        • All balances stored in USD internally
                    </p>
                </div>
            </div>
        </div>
    );
}