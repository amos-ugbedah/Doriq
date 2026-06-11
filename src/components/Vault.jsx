import React, { useState, useEffect } from 'react';
import API_BASE from "../config/api";

export default function Vault({ userId, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [usdBalance, setUsdBalance] = useState(0);
    const [vaultHistory, setVaultHistory] = useState([]);
    const [selectedTier, setSelectedTier] = useState('GROWTH');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState({ symbol: '$', code: 'USD', name: 'US Dollar' });

    const tiers = {
        'STARTER': { name: 'Starter Vault', days: 30, rate: 2, rateDecimal: 0.02, color: 'blue', description: 'Short-term savings' },
        'GROWTH': { name: 'Growth Vault', days: 90, rate: 7.5, rateDecimal: 0.075, color: 'purple', description: 'Medium-term growth' },
        'WEALTH': { name: 'Wealth Vault', days: 365, rate: 12, rateDecimal: 0.12, color: 'yellow', description: 'Long-term wealth building' }
    };

    useEffect(() => {
        fetchBalance();
        fetchVaultHistory();
        fetchUserCurrency();
    }, [userId]);

    const fetchUserCurrency = async () => {
        try {
            const res = await fetch(`${API_BASE}/user/${userId}`);
            const data = await res.json();
            if (data.success) {
                setCurrency({ 
                    symbol: data.symbol || '$', 
                    code: data.currency || 'USD',
                    name: data.currencyName || 'US Dollar'
                });
            }
        } catch (error) {
            console.error('Currency fetch error:', error);
        }
    };

    const fetchBalance = async () => {
        try {
            const res = await fetch(`${API_BASE}/convert-balance/${userId}`);
            const data = await res.json();
            setBalance(data.localBalance || 0);
            setUsdBalance(data.usdBalance || 0);
        } catch (error) {
            console.error('Balance fetch error:', error);
        }
    };

    const fetchVaultHistory = async () => {
        try {
            const res = await fetch(`${API_BASE}/vault/history/${userId}`);
            const data = await res.json();
            if (data.success) setVaultHistory(data.vaults);
        } catch (error) {
            console.error('Vault history error:', error);
        }
    };

    const handleDeposit = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert(`Please enter a valid amount in ${currency.code}`);
            return;
        }
        if (parsedAmount > balance) {
            alert(`Insufficient balance. Your balance is ${currency.symbol}${balance.toLocaleString()} ${currency.code}`);
            return;
        }

        const tier = tiers[selectedTier];
        const expectedReturn = parsedAmount * (1 + tier.rateDecimal);
        
        const confirmMessage = `Vault Deposit Summary:
        Amount: ${currency.symbol}${parsedAmount.toLocaleString()} ${currency.code}
        Vault: ${tier.name}
        Lock Period: ${tier.days} days
        Interest Rate: ${tier.rate}%
        Expected Return: ${currency.symbol}${expectedReturn.toLocaleString()} ${currency.code}
        
        Funds will be locked and cannot be withdrawn until maturity.
        Confirm deposit?`;

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/vault/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: parsedAmount, tierKey: selectedTier })
            });
            const result = await res.json();

            if (result.success) {
                alert(`✅ Success!\n\n${currency.symbol}${parsedAmount.toLocaleString()} ${currency.code} locked in ${tier.name}\nInterest: ${tier.rate}%\nExpected Return: ${currency.symbol}${expectedReturn.toLocaleString()} ${currency.code}\nUnlock Date: ${new Date(result.unlockDate).toLocaleDateString()}`);
                setAmount('');
                fetchBalance();
                fetchVaultHistory();
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(result.error || "Failed to lock funds");
            }
        } catch (error) {
            alert("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const calculateProjectedReturn = () => {
        const parsedAmount = parseFloat(amount) || 0;
        const tier = tiers[selectedTier];
        const interest = parsedAmount * (tier.rate / 100);
        return parsedAmount + interest;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Processing';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString();
        }
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black italic text-white tracking-tighter">DORIQ Vault</h2>
                    <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase mt-1">
                        Earn up to 12% annually • {currency.code}
                    </span>
                </div>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            <div className="max-w-md mx-auto w-full space-y-6">
                {/* Balance Display */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl border border-white/10 text-center">
                    <p className="text-zinc-400 text-sm">Available Balance ({currency.code})</p>
                    <p className="text-4xl font-black text-white">{currency.symbol}{balance.toLocaleString()}</p>
                    {currency.code !== 'USD' && (
                        <p className="text-zinc-500 text-xs mt-1">≈ ${usdBalance.toLocaleString()} USD</p>
                    )}
                </div>

                {/* Tier Selection */}
                <div className="grid grid-cols-3 gap-3">
                    {Object.entries(tiers).map(([key, tier]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedTier(key)}
                            className={`p-4 rounded-2xl border-2 transition-all ${
                                selectedTier === key 
                                    ? `border-${tier.color}-500 bg-${tier.color}-500/20` 
                                    : 'border-white/10 bg-zinc-900/40'
                            }`}
                        >
                            <p className="font-bold text-white text-sm">{tier.name}</p>
                            <p className={`text-${tier.color}-400 text-lg font-black`}>{tier.rate}%</p>
                            <p className="text-zinc-500 text-[8px]">{tier.days} days</p>
                            <p className="text-zinc-600 text-[7px] mt-1">{tier.description}</p>
                        </button>
                    ))}
                </div>

                {/* Amount Input */}
                <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/10">
                    <label className="text-zinc-400 text-sm mb-2 block">Amount to Lock ({currency.code})</label>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-zinc-500">{currency.symbol}</span>
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full bg-transparent text-3xl font-black text-white outline-none"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    {amount && parseFloat(amount) > balance && (
                        <p className="text-red-400 text-xs mt-2">Insufficient balance. Available: {currency.symbol}{balance.toLocaleString()}</p>
                    )}
                </div>

                {/* Projected Return */}
                {amount && parseFloat(amount) > 0 && (
                    <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20">
                        <p className="text-green-400 text-sm">Projected Return ({currency.code})</p>
                        <p className="text-2xl font-bold text-white">{currency.symbol}{calculateProjectedReturn().toLocaleString()}</p>
                        <p className="text-zinc-500 text-[10px] mt-1">
                            After {tiers[selectedTier].days} days ({tiers[selectedTier].rate}% interest)
                        </p>
                        <p className="text-zinc-500 text-[10px]">
                            You earn: {currency.symbol}{(calculateProjectedReturn() - parseFloat(amount)).toLocaleString()} {currency.code}
                        </p>
                    </div>
                )}

                {/* Deposit Button */}
                <button
                    onClick={handleDeposit}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-5 rounded-2xl font-bold text-white disabled:opacity-50"
                >
                    {loading ? "Processing..." : `Lock ${currency.symbol}${amount || '0'} ${currency.code} in Vault`}
                </button>

                {/* Vault History */}
                {vaultHistory.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-white font-bold mb-3">Your Active Savings</h3>
                        <div className="space-y-3">
                            {vaultHistory.filter(v => v.status === 'LOCKED').map(vault => (
                                <div key={vault.vaultId} className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400 text-sm">{tiers[vault.tier]?.name || vault.tier}</span>
                                        <span className="text-blue-400 font-bold">{currency.symbol}{vault.amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-zinc-500 text-[10px]">Expected: {currency.symbol}{vault.expectedReturn?.toLocaleString()}</span>
                                        <span className="text-zinc-500 text-[10px]">Unlocks: {formatDate(vault.unlockDate)}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-green-400 text-[10px]">Interest: {tiers[vault.tier]?.rate}%</span>
                                        <span className="text-yellow-400 text-[10px]">Status: {vault.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Section */}
                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                    <p className="text-yellow-400 text-[10px] font-bold">ℹ️ Vault Information</p>
                    <p className="text-zinc-500 text-[10px] mt-1">
                        • Funds are locked for the selected duration<br/>
                        • Early withdrawal is not permitted<br/>
                        • Interest is calculated at the end of the lock period<br/>
                        • All amounts are stored in USD and converted to {currency.code}<br/>
                        • Your balance: {currency.symbol}{balance.toLocaleString()} {currency.code}
                    </p>
                </div>
            </div>
        </div>
    );
}