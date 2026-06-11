import React, { useState } from 'react';

const TIERS = [
    { key: 'STARTER', label: 'Starter', days: 30, rate: 5, color: 'blue' },
    { key: 'GROWTH', label: 'Growth', days: 90, rate: 18, color: 'purple' },
    { key: 'WEALTH', label: 'Wealth', days: 365, rate: 85, color: 'yellow' },
];

export default function VaultModal({ pendingBalance, localDisplay, onClose, onDeposit }) {
    const [amount, setAmount] = useState('');
    const [selectedTier, setSelectedTier] = useState(TIERS[1]);

    // Safe calculation to prevent NaN
    const interest = amount > 0 
        ? (Number(amount) * (selectedTier.rate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
        : "0.00";

    const totalReturn = amount > 0 ? Number(amount) + (Number(amount) * (selectedTier.rate / 100)) : 0;

    const getTierColor = (tierKey) => {
        const colors = { STARTER: 'blue', GROWTH: 'purple', WEALTH: 'yellow' };
        return colors[tierKey] || 'blue';
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[400] flex items-end sm:items-center justify-center p-4">
            <div className="bg-zinc-950 w-full max-w-md rounded-[3rem] border border-white/10 p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black italic text-white leading-none">LOCK FUNDS</h2>
                        <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase mt-1">Wealth Vault Protocol</span>
                    </div>
                    <button onClick={onClose} className="bg-white/5 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="flex gap-2">
                    {TIERS.map(t => (
                        <button 
                            key={t.key}
                            onClick={() => setSelectedTier(t)}
                            className={`flex-1 py-4 rounded-[1.5rem] flex flex-col items-center justify-center transition-all border ${selectedTier.key === t.key ? `bg-${t.color}-600 border-${t.color}-400 text-white shadow-lg` : 'bg-white/5 border-white/5 text-zinc-500'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-tighter">{t.label}</span>
                            <span className="text-lg font-black">{t.rate}%</span>
                            <span className="text-[8px] text-zinc-500">{t.days}d</span>
                        </button>
                    ))}
                </div>

                <div className="text-center py-4">
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-transparent text-6xl font-black outline-none text-white text-center placeholder:text-zinc-900" 
                        placeholder="0"
                    />
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
                        Balance: <span className="text-white">{localDisplay.symbol}{pendingBalance?.toLocaleString()}</span>
                    </p>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="text-left">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Lock Period</p>
                            <p className="text-lg font-bold text-white">{selectedTier.days} Days</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Interest Rate</p>
                            <p className="text-lg font-bold text-green-400">{selectedTier.rate}%</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <div className="text-left">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Your Deposit</p>
                            <p className="text-lg font-bold text-white">{localDisplay.symbol}{Number(amount).toLocaleString() || '0'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Total Return</p>
                            <p className="text-lg font-bold text-green-400">+{localDisplay.symbol}{interest}</p>
                        </div>
                    </div>
                    {amount > 0 && (
                        <div className="bg-green-500/10 p-3 rounded-xl mt-2">
                            <p className="text-[10px] text-green-400 text-center font-bold">
                                Maturity Value: {localDisplay.symbol}{totalReturn.toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => onDeposit(amount, selectedTier.key)}
                    disabled={!amount || Number(amount) <= 0 || Number(amount) > pendingBalance}
                    className="w-full bg-white text-black font-black py-6 rounded-[2rem] shadow-xl disabled:opacity-10 active:scale-95 transition-all uppercase tracking-widest text-sm"
                >
                    {Number(amount) > pendingBalance ? "Insufficient Balance" : "Initialize Lock"}
                </button>
            </div>
        </div>
    );
}