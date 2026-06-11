import React, { useState, useEffect } from 'react';
import API_BASE from "../config/api";

export default function TPIPayment({ userId, isPremium, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [paymentToken, setPaymentToken] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [sendAmount, setSendAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('app_wallet');
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [userCurrency, setUserCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [usdBalance, setUsdBalance] = useState(0);
    const [localBalance, setLocalBalance] = useState(0);
    const [step, setStep] = useState('enter_token');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userRes = await fetch(`${API_BASE}/user/${userId}`);
                const userData = await userRes.json();
                if (userData.success) {
                    setUserCurrency(userData.currency || 'USD');
                    setCurrencySymbol(userData.symbol || '$');
                }
                
                const balanceRes = await fetch(`${API_BASE}/convert-balance/${userId}`);
                const balanceData = await balanceRes.json();
                setUsdBalance(balanceData.usdBalance || 0);
                setLocalBalance(balanceData.localBalance || 0);
                
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

    const handleCheckToken = async () => {
        if (!paymentToken) {
            alert("Please enter a token");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/tpi/${paymentToken}`);
            const result = await res.json();
            if (result.success) {
                setPaymentDetails(result);
                setStep('confirm');
            } else {
                alert(result.error || "Invalid token");
            }
        } catch (err) {
            alert("Error checking token");
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async () => {
        if (!sendAmount || parseFloat(sendAmount) <= 0) {
            alert(`Please enter an amount in ${userCurrency}`);
            return;
        }
        
        if (parseFloat(sendAmount) > localBalance) {
            alert(`Insufficient balance. Available: ${currencySymbol}${localBalance.toLocaleString()} ${userCurrency}`);
            return;
        }
        
        if (paymentMethod === 'card' && !selectedPaymentMethod) {
            alert("Please select a card");
            return;
        }
        
        const feePercentage = paymentDetails.feePercentage;
        const feeAmount = (parseFloat(sendAmount) * feePercentage) / 100;
        const netAmount = parseFloat(sendAmount) - feeAmount;
        
        const confirmMessage = `TPI Payment Summary:\nAmount: ${currencySymbol}${parseFloat(sendAmount).toLocaleString()} ${userCurrency}\nFee (${feePercentage}%): ${currencySymbol}${feeAmount.toLocaleString()} ${userCurrency}\nReceiver gets: ${currencySymbol}${netAmount.toLocaleString()} ${userCurrency}\n\nConfirm payment?`;
        
        if (!window.confirm(confirmMessage)) return;
        
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
                alert(`✅ Payment Successful!\n\nSent: ${currencySymbol}${parseFloat(sendAmount).toLocaleString()} ${userCurrency}\nFee (${feePercentage}%): ${currencySymbol}${feeAmount.toLocaleString()} ${userCurrency}\nReceiver gets: ${currencySymbol}${netAmount.toLocaleString()} ${userCurrency}`);
                onClose();
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(result.error || "Payment failed");
            }
        } catch (err) {
            alert("Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getCardIcon = (brand) => {
        if (brand === 'visa') return '💳 Visa';
        if (brand === 'mastercard') return '💳 Mastercard';
        return '💳 Card';
    };

    if (step === 'enter_token') {
        return (
            <div className="max-w-md mx-auto w-full space-y-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl text-center">
                    <p className="text-zinc-400 text-sm">Enter TPI Token</p>
                    <p className="text-zinc-500 text-xs mt-1">Enter the token shared by the person you want to pay</p>
                    <p className="text-blue-400 text-xs mt-2">Your balance: {currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">TPI Token</label>
                    <input
                        type="text"
                        placeholder="DRQ-XXX-XXXXXX"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white uppercase text-center text-xl tracking-wider"
                        value={paymentToken}
                        onChange={(e) => setPaymentToken(e.target.value.toUpperCase())}
                    />
                </div>

                <button
                    onClick={handleCheckToken}
                    disabled={loading || !paymentToken}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                >
                    {loading ? "Verifying..." : "Verify Token"}
                </button>
            </div>
        );
    }

    if (step === 'confirm' && paymentDetails) {
        const feePercentage = paymentDetails.feePercentage;
        const feeAmount = (parseFloat(sendAmount) || 0) * feePercentage / 100;
        const netAmount = (parseFloat(sendAmount) || 0) - feeAmount;
        const isAmountValid = sendAmount && parseFloat(sendAmount) > 0;
        const hasSufficientBalance = isAmountValid && parseFloat(sendAmount) <= localBalance;

        return (
            <div className="max-w-md mx-auto w-full space-y-6">
                <button onClick={() => setStep('enter_token')} className="text-blue-400 text-sm mb-4">← Back</button>

                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/10 text-center">
                    <p className="text-zinc-400 text-sm">Paying to</p>
                    <p className="text-white font-bold">User {paymentDetails.receiverId?.slice(-6)}</p>
                    <p className="text-zinc-500 text-xs mt-1">Fee: {paymentDetails.feePercentage}% will be deducted</p>
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Amount to Send ({userCurrency})</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{currencySymbol}</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white text-2xl"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                        />
                    </div>
                    {sendAmount && parseFloat(sendAmount) > localBalance && (
                        <p className="text-red-400 text-xs mt-1">Insufficient balance. Available: {currencySymbol}{localBalance.toLocaleString()}</p>
                    )}
                </div>

                <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                    <label className="text-zinc-400 text-sm mb-2 block">Payment Method</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                            <input type="radio" name="paymentMethod" value="app_wallet" checked={paymentMethod === 'app_wallet'} onChange={() => setPaymentMethod('app_wallet')} />
                            <div>
                                <p className="text-white font-medium">App Wallet</p>
                                <p className="text-zinc-500 text-xs">Balance: {currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
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
                            <p className="text-zinc-500 text-sm">No cards linked. Please add a card first.</p>
                        ) : (
                            <select value={selectedPaymentMethod?.id || ''} onChange={(e) => setSelectedPaymentMethod(paymentMethods.find(m => m.id === e.target.value))} className="w-full p-3 rounded-xl bg-zinc-800 text-white">
                                <option value="">Select a card</option>
                                {paymentMethods.map(m => (<option key={m.id} value={m.id}>{getCardIcon(m.brand)} •••• {m.last4} {m.isDefault ? '(Default)' : ''}</option>))}
                            </select>
                        )}
                    </div>
                )}

                {isAmountValid && (
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <div className="flex justify-between text-sm"><span className="text-zinc-400">Amount:</span><span className="text-white">{currencySymbol}{parseFloat(sendAmount).toLocaleString()} {userCurrency}</span></div>
                        <div className="flex justify-between text-sm mt-1"><span className="text-zinc-400">Fee ({feePercentage}%):</span><span className="text-red-400">-{currencySymbol}{feeAmount.toLocaleString()} {userCurrency}</span></div>
                        <div className="border-t border-white/10 my-2"></div>
                        <div className="flex justify-between"><span className="text-zinc-400">Receiver gets:</span><span className="text-green-400 font-bold">{currencySymbol}{netAmount.toLocaleString()} {userCurrency}</span></div>
                    </div>
                )}

                <button onClick={handlePay} disabled={loading || !sendAmount || !hasSufficientBalance} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50">
                    {loading ? "Processing..." : `Send ${currencySymbol}${sendAmount || '0'} ${userCurrency}`}
                </button>
            </div>
        );
    }

    return null;
}