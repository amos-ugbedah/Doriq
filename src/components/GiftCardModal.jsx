import React, { useState } from 'react';

import API_BASE from "../config/api";

export default function GiftCardModal({ onClose, userId, localDisplay, onBalanceUpdate }) {
    const [step, setStep] = useState(1);
    const [selectedCard, setSelectedCard] = useState(null);
    const [cardDetails, setCardDetails] = useState({ amount: '', number: '', pin: '' });
    const [loading, setLoading] = useState(false);
    const [userCurrency, setUserCurrency] = useState(localDisplay?.currency || 'USD');
    const [currencySymbol, setCurrencySymbol] = useState(localDisplay?.symbol || '$');

    // Base rates in USD
    const cards = [
        { id: 'AMAZON', name: 'Amazon', baseRate: 1.10, icon: '📦', minAmount: 10, maxAmount: 500 },
        { id: 'APPLE', name: 'Apple/iTunes', baseRate: 1.15, icon: '🍎', minAmount: 10, maxAmount: 500 },
        { id: 'STEAM', name: 'Steam', baseRate: 1.20, icon: '🎮', minAmount: 10, maxAmount: 300 },
        { id: 'GOOGLE', name: 'Google Play', baseRate: 1.12, icon: '▶️', minAmount: 10, maxAmount: 300 },
        { id: 'NETFLIX', name: 'Netflix', baseRate: 1.08, icon: '📺', minAmount: 15, maxAmount: 200 },
        { id: 'SPOTIFY', name: 'Spotify', baseRate: 1.05, icon: '🎵', minAmount: 10, maxAmount: 150 }
    ];

    // Get local rate based on user's currency
    const getLocalRate = (baseRateUSD) => {
        const conversionRate = localDisplay?.conversionRate || 1500;
        const localRate = baseRateUSD * conversionRate;
        return { rate: localRate, rateUSD: baseRateUSD };
    };

    const handleSubmit = async () => {
        if (!cardDetails.amount || parseFloat(cardDetails.amount) <= 0) {
            alert(`Please enter a valid amount in ${userCurrency}`);
            return;
        }
        
        if (!cardDetails.number) {
            alert("Please enter the gift card code");
            return;
        }

        const localRate = getLocalRate(selectedCard.baseRate);
        const estimatedPayout = parseFloat(cardDetails.amount) * localRate.rateUSD;

        const confirmMessage = `Gift Card Trade Summary:
        Card: ${selectedCard.name}
        Face Value: ${currencySymbol}${parseFloat(cardDetails.amount).toLocaleString()} ${userCurrency}
        Rate: ${currencySymbol}${localRate.rate.toLocaleString()}/$
        You will receive: ${currencySymbol}${estimatedPayout.toLocaleString()} ${userCurrency}
        
        Confirm trade?`;

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/giftcard/trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    cardType: selectedCard.id,
                    cardValue: parseFloat(cardDetails.amount),
                    cardCode: cardDetails.number,
                    cardPin: cardDetails.pin,
                    currency: userCurrency,
                    rate: localRate.rateUSD
                })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Gift card trade successful!\n\nYou received: ${currencySymbol}${estimatedPayout.toLocaleString()} ${userCurrency}\n\nFunds have been added to your wallet.`);
                if (onBalanceUpdate) onBalanceUpdate();
                onClose();
            } else {
                alert(data.error || "Trade failed. Please check your card details.");
            }
        } catch (err) {
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-black italic text-white tracking-tighter">Gift Card Exchange</h2>
                        <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase mt-1">
                            {userCurrency} • {currencySymbol}{localDisplay?.localBalance?.toLocaleString()} available
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
                </div>

                <div className="max-w-md mx-auto w-full space-y-6">
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl text-center">
                        <p className="text-zinc-400 text-sm">Sell Gift Cards Instantly</p>
                        <p className="text-zinc-500 text-xs mt-1">Get paid directly to your DORIQ wallet</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {cards.map(card => {
                            const localRate = getLocalRate(card.baseRate);
                            return (
                                <button 
                                    key={card.id} 
                                    onClick={() => { setSelectedCard(card); setStep(2); }}
                                    className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-3xl bg-black/40 h-14 w-14 flex items-center justify-center rounded-2xl">{card.icon}</span>
                                        <div className="text-left">
                                            <span className="block font-bold text-white text-lg">{card.name}</span>
                                            <span className="text-[10px] text-green-400 uppercase font-bold">Instant Payout</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-mono font-bold text-blue-400 text-lg">{currencySymbol}{localRate.rate.toLocaleString()}/$</span>
                                        <span className="text-[10px] text-zinc-500">Min ${card.minAmount}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2 && selectedCard) {
        const localRate = getLocalRate(selectedCard.baseRate);
        const estimatedPayout = (parseFloat(cardDetails.amount) || 0) * localRate.rateUSD;

        return (
            <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setStep(1)} className="text-blue-400 text-2xl">←</button>
                        <div>
                            <h2 className="text-2xl font-black italic text-white tracking-tighter">{selectedCard.name} Exchange</h2>
                            <span className="text-[10px] text-blue-500 font-bold">Rate: {currencySymbol}{localRate.rate.toLocaleString()}/$</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
                </div>

                <div className="max-w-md mx-auto w-full space-y-6">
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl text-center">
                        <p className="text-zinc-400 text-sm">Enter Gift Card Details</p>
                        <p className="text-zinc-500 text-xs mt-1">We'll verify and credit your wallet instantly</p>
                    </div>

                    <div>
                        <label className="text-zinc-400 text-sm mb-1 block">Card Face Value ({userCurrency})</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{currencySymbol}</span>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white text-2xl"
                                value={cardDetails.amount}
                                onChange={(e) => setCardDetails({...cardDetails, amount: e.target.value})}
                            />
                        </div>
                        {cardDetails.amount && (
                            <p className="text-zinc-500 text-xs mt-1">
                                Min: {currencySymbol}{selectedCard.minAmount} {userCurrency} • Max: {currencySymbol}{selectedCard.maxAmount} {userCurrency}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-zinc-400 text-sm mb-1 block">Gift Card Code</label>
                        <input
                            type="text"
                            placeholder="Enter the card code"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({...cardDetails, number: e.target.value.toUpperCase()})}
                        />
                    </div>

                    <div>
                        <label className="text-zinc-400 text-sm mb-1 block">PIN (Optional)</label>
                        <input
                            type="password"
                            placeholder="Enter card PIN if required"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                            value={cardDetails.pin}
                            onChange={(e) => setCardDetails({...cardDetails, pin: e.target.value})}
                        />
                    </div>

                    {cardDetails.amount && parseFloat(cardDetails.amount) > 0 && (
                        <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 text-center">
                            <p className="text-zinc-400 text-xs">Estimated Payout</p>
                            <p className="text-3xl font-bold text-green-400">
                                {currencySymbol}{estimatedPayout.toLocaleString()} {userCurrency}
                            </p>
                            <p className="text-zinc-500 text-[10px] mt-1">
                                Based on rate: {currencySymbol}{localRate.rate.toLocaleString()}/$
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !cardDetails.amount || !cardDetails.number}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Complete Trade"}
                    </button>

                    <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <p className="text-yellow-400 text-[10px] font-bold">⚠️ Important</p>
                        <p className="text-zinc-500 text-[10px] mt-1">
                            1. Ensure the gift card is valid and unused<br/>
                            2. Once traded, the transaction cannot be reversed<br/>
                            3. Funds will be credited instantly after verification<br/>
                            4. For high-value cards, verification may take up to 5 minutes<br/>
                            5. All rates are based on USD and converted to {userCurrency}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}