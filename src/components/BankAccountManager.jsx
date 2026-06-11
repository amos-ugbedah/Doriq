import React, { useState, useEffect } from 'react';

import API_BASE from "../config/api";

export default function BankAccountManager({ userId, onClose, onAccountLinked }) {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ cardName: '' });

    useEffect(() => {
        if (!userId) return;
        fetchPaymentMethods();
    }, [userId]);

    const fetchPaymentMethods = async () => {
        try {
            const res = await fetch(`${API_BASE}/payment/methods/${userId}`);
            const data = await res.json();
            if (data.success) {
                setPaymentMethods(data.methods || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const initiateCardLinking = async () => {
        if (!formData.cardName) {
            alert("Enter cardholder name");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/payment/initiate-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, cardName: formData.cardName })
            });

            const data = await res.json();

            if (!data?.link) {
                throw new Error(data?.error || "No payment link returned");
            }

            // Redirect to Flutterwave secure payment page
            window.location.href = data.link;
        } catch (err) {
            console.error(err);
            alert(err.message || "Failed to start payment");
        } finally {
            setLoading(false);
        }
    };

    const removeMethod = async (methodId) => {
        try {
            const res = await fetch(`${API_BASE}/payment/remove`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, methodId })
            });
            const data = await res.json();
            if (data.success) {
                setPaymentMethods(data.methods);
                if (onAccountLinked) onAccountLinked();
            }
        } catch (err) {
            alert("Failed to remove method");
        }
    };

    const setDefaultMethod = async (methodId) => {
        try {
            const res = await fetch(`${API_BASE}/payment/set-default`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, methodId })
            });
            const data = await res.json();
            if (data.success) {
                setPaymentMethods(data.methods);
            }
        } catch (err) {
            alert("Failed to update default");
        }
    };

    const getCardBrandIcon = (brand) => {
        if (brand === 'visa') return '💳 Visa';
        if (brand === 'mastercard') return '💳 Mastercard';
        return '💳 Card';
    };

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-white text-2xl font-bold">Payment Methods</h2>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            {/* Payment Methods List */}
            <div className="space-y-3 max-w-md mx-auto w-full">
                {paymentMethods.length > 0 ? (
                    paymentMethods.map(m => (
                        <div key={m.id} className="bg-zinc-900/40 p-4 rounded-2xl border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-white">{getCardBrandIcon(m.brand)}</p>
                                        {m.isDefault && (
                                            <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Default</span>
                                        )}
                                    </div>
                                    <p className="text-zinc-400 text-sm mt-1">{m.cardName}</p>
                                    <p className="text-zinc-500 text-xs">•••• {m.last4}</p>
                                    <p className="text-zinc-600 text-[10px] mt-1">Expires: {m.expiryMonth}/{m.expiryYear}</p>
                                </div>
                                <div className="flex gap-2">
                                    {!m.isDefault && (
                                        <button 
                                            onClick={() => setDefaultMethod(m.id)}
                                            className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => removeMethod(m.id)}
                                        className="text-[10px] bg-red-600/20 text-red-400 px-3 py-1 rounded-full"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-zinc-900/40 p-8 rounded-2xl border border-white/10 text-center">
                        <div className="text-5xl mb-3">💳</div>
                        <p className="text-zinc-400">No payment methods linked</p>
                        <p className="text-zinc-600 text-xs mt-1">Add a card to make payments</p>
                    </div>
                )}
            </div>

            {/* Add Card Button */}
            {!showAddForm ? (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-6 max-w-md mx-auto w-full bg-white/10 border border-white/20 p-4 rounded-xl font-bold text-white hover:bg-white/20 transition-all"
                >
                    + Add New Card
                </button>
            ) : (
                <div className="mt-6 max-w-md mx-auto w-full bg-zinc-900/40 p-5 rounded-2xl border border-white/10 space-y-4">
                    <h3 className="text-white font-bold">Add Payment Card</h3>
                    
                    <div>
                        <label className="text-zinc-400 text-sm mb-1 block">Cardholder Name</label>
                        <input
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white"
                            placeholder="Name on card"
                            value={formData.cardName}
                            onChange={(e) => setFormData({ ...formData, cardName: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                        <p className="text-blue-400 text-[10px]">🔒 You'll be redirected to Flutterwave to securely enter your card details</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={initiateCardLinking}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl font-bold text-white disabled:opacity-50"
                        >
                            {loading ? "Redirecting..." : "Continue to Flutterwave"}
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 bg-white/10 border border-white/20 p-3 rounded-xl font-bold text-white"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="mt-6 max-w-md mx-auto w-full bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider">ℹ️ How It Works</p>
                <p className="text-zinc-500 text-[10px] mt-1">
                    1. Click "Continue to Flutterwave"<br/>
                    2. Enter your card details on the secure Flutterwave page<br/>
                    3. Complete 3DS verification with your bank if required<br/>
                    4. Your card will be securely saved for future payments
                </p>
            </div>
        </div>
    );
}