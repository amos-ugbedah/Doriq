import React, { useState, useEffect } from 'react';

import API_BASE from "../config/api";

export default function SendMoney({ userId, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [amount, setAmount] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [note, setNote] = useState('');
    const [step, setStep] = useState('method'); // method, details, confirm
    const [userCurrency, setUserCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [usdBalance, setUsdBalance] = useState(0);
    const [localBalance, setLocalBalance] = useState(0);
    const [exchangeRates, setExchangeRates] = useState({});
    const [recipientInfo, setRecipientInfo] = useState(null);
    const [checkingRecipient, setCheckingRecipient] = useState(false);

    // Fetch user data and balance on mount
    useEffect(() => {
        fetchUserData();
        fetchBalance();
        fetchExchangeRates();
    }, [userId]);

    const fetchUserData = async () => {
        try {
            const res = await fetch(`${API_BASE}/user/${userId}`);
            const data = await res.json();
            if (data.success) {
                setUserCurrency(data.currency || 'USD');
                setCurrencySymbol(data.symbol || '$');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBalance = async () => {
        try {
            const res = await fetch(`${API_BASE}/convert-balance/${userId}`);
            const data = await res.json();
            setUsdBalance(data.usdBalance || 0);
            setLocalBalance(data.localBalance || 0);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchExchangeRates = async () => {
        try {
            const res = await fetch(`${API_BASE}/exchange-rate`);
            const data = await res.json();
            if (data.success) {
                setExchangeRates(data.usdt || {});
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const res = await fetch(`${API_BASE}/payment/methods/${userId}`);
            const data = await res.json();
            if (data.success) {
                setPaymentMethods(data.methods || []);
                const defaultMethod = data.methods?.find(m => m.isDefault);
                if (defaultMethod) setSelectedMethod(defaultMethod);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const checkRecipient = async () => {
        if (!recipientEmail && !recipientPhone) {
            alert("Please enter recipient email or phone number");
            return false;
        }

        setCheckingRecipient(true);
        try {
            // Check if recipient exists in the system
            const res = await fetch(`${API_BASE}/user/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: recipientEmail,
                    phone: recipientPhone
                })
            });
            const data = await res.json();
            
            if (data.success && data.userExists) {
                setRecipientInfo({
                    userId: data.userId,
                    name: data.name,
                    currency: data.currency || 'USD',
                    symbol: data.symbol || '$'
                });
                return true;
            } else {
                alert("Recipient not found. Please check the email or phone number.");
                return false;
            }
        } catch (err) {
            alert("Error checking recipient: " + err.message);
            return false;
        } finally {
            setCheckingRecipient(false);
        }
    };

    const handleSend = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        
        // Check if amount exceeds balance
        if (parseFloat(amount) > localBalance) {
            alert(`Insufficient balance. Your balance is ${currencySymbol}${localBalance.toLocaleString()} ${userCurrency}`);
            return;
        }
        
        if (!recipientInfo) {
            const isValid = await checkRecipient();
            if (!isValid) return;
        }
        
        if (!selectedMethod) {
            alert("Please select a payment method");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/send-money`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    recipientId: recipientInfo.userId,
                    amount: parseFloat(amount),
                    currency: userCurrency,
                    note,
                    paymentMethodId: selectedMethod.id
                })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Payment of ${currencySymbol}${parseFloat(amount).toLocaleString()} ${userCurrency} sent successfully to ${recipientInfo.name || recipientEmail || recipientPhone}!`);
                onClose();
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(data.error || "Payment failed");
            }
        } catch (err) {
            alert("Network error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getCardIcon = (brand) => {
        if (brand === 'visa') return '💳 Visa';
        if (brand === 'mastercard') return '💳 Mastercard';
        return '💳 Card';
    };

    // Calculate fee (0% for internal transfers to encourage usage)
    const calculateFees = (inputAmount) => {
        const parsedAmount = parseFloat(inputAmount) || 0;
        const feePercentage = 0; // No fee for internal transfers
        const feeAmount = parsedAmount * (feePercentage / 100);
        const totalAmount = parsedAmount + feeAmount;
        const youSend = parsedAmount;
        const recipientGets = parsedAmount;
        
        return {
            amount: parsedAmount,
            feePercentage,
            feeAmount,
            totalAmount,
            youSend,
            recipientGets
        };
    };

    if (step === 'method') {
        return (
            <div className="max-w-md mx-auto w-full space-y-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl text-center">
                    <p className="text-zinc-400 text-xs">Your Balance</p>
                    <p className="text-2xl font-bold text-white">{currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
                    <p className="text-zinc-500 text-[10px] mt-1">≈ ${usdBalance.toLocaleString()} USD</p>
                </div>

                <h3 className="text-white text-xl font-bold">Select Payment Method</h3>
                
                {paymentMethods.length > 0 ? (
                    <div className="space-y-3">
                        {paymentMethods.map(method => (
                            <button
                                key={method.id}
                                onClick={() => {
                                    setSelectedMethod(method);
                                    setStep('details');
                                }}
                                className="w-full bg-zinc-900/40 p-4 rounded-2xl border border-white/10 hover:border-blue-500/50 text-left"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white">{getCardIcon(method.brand)}</p>
                                        <p className="text-zinc-400 text-sm">•••• {method.last4}</p>
                                    </div>
                                    {method.isDefault && (
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Default</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="bg-zinc-900/40 p-8 rounded-2xl text-center">
                        <p className="text-zinc-400">No payment methods linked</p>
                        <p className="text-zinc-600 text-sm mt-2">Please add a card first</p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full bg-white/10 border border-white/20 p-3 rounded-xl text-white"
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (step === 'details') {
        const fees = calculateFees(amount);
        const isAmountValid = amount && parseFloat(amount) > 0;
        const hasSufficientBalance = isAmountValid && parseFloat(amount) <= localBalance;

        return (
            <div className="max-w-md mx-auto w-full space-y-6">
                <button onClick={() => setStep('method')} className="text-blue-400 text-sm mb-4">← Back</button>
                
                <h3 className="text-white text-xl font-bold">Send Money</h3>
                
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/10">
                    <p className="text-zinc-400 text-sm">From</p>
                    <p className="text-white font-bold">{getCardIcon(selectedMethod.brand)} •••• {selectedMethod.last4}</p>
                    <p className="text-zinc-500 text-xs mt-1">Balance: {currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
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
                    {amount && parseFloat(amount) > 0 && userCurrency !== 'USD' && (
                        <p className="text-zinc-500 text-xs mt-1">
                            ≈ ${(parseFloat(amount) / (exchangeRates[userCurrency?.toLowerCase()] || 1500)).toLocaleString()} USD
                        </p>
                    )}
                    {amount && parseFloat(amount) > localBalance && (
                        <p className="text-red-400 text-xs mt-1">
                            Insufficient balance. Available: {currencySymbol}{localBalance.toLocaleString()}
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Recipient Email</label>
                    <input
                        type="email"
                        placeholder="recipient@example.com"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                        value={recipientEmail}
                        onChange={(e) => {
                            setRecipientEmail(e.target.value);
                            setRecipientInfo(null);
                        }}
                    />
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Recipient Phone (Optional)</label>
                    <input
                        type="tel"
                        placeholder="+2348012345678"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                        value={recipientPhone}
                        onChange={(e) => {
                            setRecipientPhone(e.target.value);
                            setRecipientInfo(null);
                        }}
                    />
                </div>

                {!recipientInfo && (recipientEmail || recipientPhone) && (
                    <button
                        onClick={checkRecipient}
                        disabled={checkingRecipient}
                        className="w-full bg-blue-600/20 border border-blue-500/50 p-3 rounded-xl text-blue-400 text-sm font-bold disabled:opacity-50"
                    >
                        {checkingRecipient ? "Checking..." : "Verify Recipient"}
                    </button>
                )}

                {recipientInfo && (
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <p className="text-green-400 text-xs font-bold">✅ Recipient Verified</p>
                        <p className="text-white text-sm mt-1">{recipientInfo.name || recipientEmail || recipientPhone}</p>
                        <p className="text-zinc-500 text-xs">Will receive in {recipientInfo.currency} {recipientInfo.symbol}</p>
                    </div>
                )}

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Note (Optional)</label>
                    <input
                        type="text"
                        placeholder="What's this for?"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                {isAmountValid && (
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">You send:</span>
                            <span className="text-white">{currencySymbol}{fees.youSend.toLocaleString()} {userCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-zinc-400">Transaction Fee:</span>
                            <span className="text-green-400">FREE</span>
                        </div>
                        <div className="border-t border-white/10 my-2"></div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Recipient gets:</span>
                            <span className="text-green-400 font-bold">{currencySymbol}{fees.recipientGets.toLocaleString()} {userCurrency}</span>
                        </div>
                        {recipientInfo && recipientInfo.currency !== userCurrency && (
                            <p className="text-zinc-500 text-[10px] mt-2 text-center">
                                Recipient will receive approximately {recipientInfo.symbol}{(fees.recipientGets / (exchangeRates[userCurrency?.toLowerCase()] || 1) * (exchangeRates[recipientInfo.currency?.toLowerCase()] || 1)).toLocaleString()} {recipientInfo.currency}
                            </p>
                        )}
                    </div>
                )}

                <button
                    onClick={handleSend}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || !recipientInfo || !hasSufficientBalance}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                >
                    {loading ? "Processing..." : `Send ${currencySymbol}${amount || '0'} ${userCurrency}`}
                </button>

                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                    <p className="text-yellow-400 text-[10px] font-bold">ℹ️ Information</p>
                    <p className="text-zinc-500 text-[10px] mt-1">
                        • No transaction fees for internal transfers<br/>
                        • Funds are transferred instantly<br/>
                        • Both sender and receiver will receive email confirmation<br/>
                        • Minimum transfer amount: {currencySymbol}1.00 {userCurrency}<br/>
                        • Your balance: {currencySymbol}{localBalance.toLocaleString()} {userCurrency}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}