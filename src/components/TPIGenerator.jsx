import React, { useState, useEffect } from 'react';
import BankAccountManager from './BankAccountManager';

import API_BASE from "../config/api";

export default function TPIGenerator({ userId, isPremium, onClose, onBalanceUpdate }) {
    const [step, setStep] = useState('generate');
    const [token, setToken] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [paymentToken, setPaymentToken] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sendAmount, setSendAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('app_wallet');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [appBalance, setAppBalance] = useState(0);
    const [showBankManager, setShowBankManager] = useState(false);

    useEffect(() => {
        if (!token || !token.expiresAt) return;
        const interval = setInterval(() => {
            const remaining = new Date(token.expiresAt) - new Date();
            const secs = Math.max(0, Math.floor(remaining / 1000));
            setTimeLeft(secs);
            if (secs <= 0) {
                clearInterval(interval);
                setToken(null);
                setStep('generate');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [token]);

    // Fetch app balance and payment methods
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const balanceRes = await fetch(`${API_BASE}/convert-balance/${userId}`);
                const balanceData = await balanceRes.json();
                setAppBalance(balanceData.localBalance || 0);
                
                const methodsRes = await fetch(`${API_BASE}/payment/methods/${userId}`);
                const methodsData = await methodsRes.json();
                if (methodsData.success) {
                    setPaymentMethods(methodsData.methods || []);
                    const defaultMethod = methodsData.methods?.find(m => m.isDefault);
                    if (defaultMethod) setSelectedPaymentMethod(defaultMethod);
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        };
        if (userId) fetchUserData();
    }, [userId]);

    // Refresh payment methods after linking
    const refreshPaymentMethods = async () => {
        const methodsRes = await fetch(`${API_BASE}/payment/methods/${userId}`);
        const methodsData = await methodsRes.json();
        if (methodsData.success) {
            setPaymentMethods(methodsData.methods || []);
            const defaultMethod = methodsData.methods?.find(m => m.isDefault);
            if (defaultMethod) setSelectedPaymentMethod(defaultMethod);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/tpi/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isPremium })
            });
            const result = await res.json();
            if (result.success) {
                setToken(result);
                setStep('share');
            } else {
                alert(result.error);
            }
        } catch (err) {
            alert("Connection error: Make sure backend is running on port 5000");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckToken = async () => {
        if (!paymentToken) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/tpi/${paymentToken}`);
            const result = await res.json();
            if (result.success) {
                setPaymentDetails(result);
                setStep('pay');
            } else {
                alert(result.error || "Token invalid");
            }
        } catch (err) {
            alert("Error checking token");
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async () => {
        if (!sendAmount || parseFloat(sendAmount) <= 0) {
            alert("Please enter an amount");
            return;
        }
        
        if (paymentMethod === 'card' && !selectedPaymentMethod) {
            alert("Please select a card or add one");
            return;
        }
        
        if (paymentMethod === 'app_wallet' && parseFloat(sendAmount) > appBalance) {
            alert(`Insufficient app wallet balance. Your balance: ₦${appBalance.toLocaleString()}`);
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/tpi/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: paymentToken,
                    senderId: userId,
                    amount: parseFloat(sendAmount),
                    paymentMethod: paymentMethod === 'card' ? 'card' : 'app_wallet',
                    paymentMethodId: selectedPaymentMethod?.id
                })
            });
            const result = await res.json();
            if (result.success) {
                const feePercentage = paymentDetails.feePercentage;
                const feeAmount = (parseFloat(sendAmount) * feePercentage) / 100;
                const netAmount = parseFloat(sendAmount) - feeAmount;
                alert(`✅ Payment Successful!\n\nSent: ₦${parseFloat(sendAmount).toLocaleString()}\nFee (${feePercentage}%): ₦${feeAmount.toLocaleString()}\nReceiver gets: ₦${netAmount.toLocaleString()}`);
                onClose();
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(result.error || "Payment failed");
            }
        } catch (err) {
            alert("Payment failed");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

    // Show Card Manager
    if (showBankManager) {
        return (
            <BankAccountManager 
                userId={userId}
                onClose={() => setShowBankManager(false)}
                onAccountLinked={refreshPaymentMethods}
            />
        );
    }

    if (step === 'generate') return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 items-center justify-center">
            <button onClick={onClose} className="absolute top-6 right-6 text-white text-2xl">✕</button>
            <h2 className="text-white text-3xl font-bold mb-8 italic">Receive Money</h2>
            <button onClick={handleGenerate} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold">
                {loading ? "Generating..." : "Generate Payment Token"}
            </button>
            <button onClick={() => setStep('pay')} className="mt-4 text-zinc-500 underline">I want to send money</button>
        </div>
    );

    if (step === 'share') return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 items-center justify-center">
            <h2 className="text-white text-2xl mb-4">Token Created</h2>
            <div className="bg-zinc-900 p-6 rounded-xl border border-blue-500 text-center">
                <p className="text-blue-400 text-3xl font-mono font-bold mb-2">{token.token}</p>
                <p className="text-zinc-500 text-sm">Expires in: {formatTime(timeLeft)}</p>
                <p className="text-zinc-600 text-xs mt-2">Fee: {token.feePercentage}% deducted from sender</p>
            </div>
            <button onClick={() => {navigator.clipboard.writeText(token.token); alert("Copied!")}} className="mt-6 bg-white text-black px-6 py-2 rounded-lg font-bold">Copy Token</button>
            <button onClick={() => setStep('generate')} className="mt-8 text-zinc-500">Back</button>
        </div>
    );

    if (step === 'pay') return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            <div className="max-w-md mx-auto w-full">
                <button onClick={() => setStep('generate')} className="text-white text-2xl mb-4">← Back</button>
                <h2 className="text-white text-2xl mb-6">Send Money</h2>
                
                {!paymentDetails ? (
                    <div className="space-y-4">
                        <input value={paymentToken} onChange={e => setPaymentToken(e.target.value.toUpperCase())} placeholder="Enter TPI Token (DRQ-XXX-XXXXXX)" className="w-full p-4 rounded-xl bg-zinc-900 text-white border border-white/10" />
                        <button onClick={handleCheckToken} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Verify Token</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/10 text-center">
                            <p className="text-zinc-400 text-sm">Paying to</p>
                            <p className="text-white font-bold">User {paymentDetails.receiverId?.slice(-6)}</p>
                            <p className="text-zinc-500 text-xs mt-1">Fee: {paymentDetails.feePercentage}% will be deducted</p>
                        </div>
                        
                        <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                            <label className="text-zinc-400 text-sm mb-2 block">Amount (₦)</label>
                            <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-3xl font-black text-white outline-none" />
                        </div>
                        
                        <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                            <label className="text-zinc-400 text-sm mb-2 block">Payment Method</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                                    <input type="radio" name="paymentMethod" value="app_wallet" checked={paymentMethod === 'app_wallet'} onChange={() => setPaymentMethod('app_wallet')} />
                                    <div>
                                        <p className="text-white font-medium">App Wallet</p>
                                        <p className="text-zinc-500 text-xs">Balance: ₦{appBalance.toLocaleString()}</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                                    <input type="radio" name="paymentMethod" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                                    <div>
                                        <p className="text-white font-medium">Saved Card</p>
                                        <p className="text-zinc-500 text-xs">Pay with linked card</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        {paymentMethod === 'card' && (
                            <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                                <label className="text-zinc-400 text-sm mb-2 block">Select Card</label>
                                {paymentMethods.length === 0 ? (
                                    <div className="text-center p-4">
                                        <p className="text-zinc-500 text-sm mb-3">No cards linked</p>
                                        <button 
                                            onClick={() => setShowBankManager(true)}
                                            className="text-blue-400 text-sm underline"
                                        >
                                            + Add a card
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <select 
                                            value={selectedPaymentMethod?.id || ''} 
                                            onChange={(e) => setSelectedPaymentMethod(paymentMethods.find(m => m.id === e.target.value))}
                                            className="w-full p-3 rounded-xl bg-zinc-800 text-white mb-3"
                                        >
                                            <option value="">Select a card</option>
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.brand?.toUpperCase()} •••• {m.last4} {m.isDefault ? '(Default)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => setShowBankManager(true)}
                                            className="text-blue-400 text-xs underline"
                                        >
                                            Manage Cards
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {paymentMethod === 'app_wallet' && parseFloat(sendAmount) > appBalance && (
                            <div className="bg-red-500/10 p-3 rounded-xl text-center">
                                <p className="text-red-400 text-sm">Insufficient balance. Available: ₦{appBalance.toLocaleString()}</p>
                            </div>
                        )}
                        
                        <button onClick={handlePay} disabled={loading || (paymentMethod === 'app_wallet' && parseFloat(sendAmount) > appBalance)} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold disabled:opacity-50">
                            {loading ? "Processing..." : `Send ₦${sendAmount || '0'}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return null;
}