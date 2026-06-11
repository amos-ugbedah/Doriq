import React, { useState, useEffect } from 'react';
import WithdrawModal from './WithdrawModal';
import AddFundsModal from './AddFundsModal';

export default function BalanceCard({ userId, localDisplay, onAddMoney, onRefresh, isKYCVerified = false }) {
    const [showBalance, setShowBalance] = useState(true);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showAddFunds, setShowAddFunds] = useState(false);
    const [usdEquivalent, setUsdEquivalent] = useState(0);
    const [showKYCWarning, setShowKYCWarning] = useState(false);

    // Calculate USD equivalent
    useEffect(() => {
        if (localDisplay.balance && localDisplay.currency !== 'USD') {
            // Approximate conversion (you can fetch live rate from API)
            const rates = { NGN: 1500, GBP: 0.78, EUR: 0.92, CAD: 1.35, GHS: 15, KES: 130, ZAR: 18.5 };
            const rate = rates[localDisplay.currency] || 1;
            setUsdEquivalent(localDisplay.balance / rate);
        } else {
            setUsdEquivalent(localDisplay.balance);
        }
    }, [localDisplay.balance, localDisplay.currency]);

    const toggleBalance = () => {
        setShowBalance(!showBalance);
    };

    const handleWithdrawClick = () => {
        if (!isKYCVerified) {
            setShowKYCWarning(true);
        } else {
            setShowWithdraw(true);
        }
    };

    if (showAddFunds) {
        return (
            <AddFundsModal
                userId={userId}
                onClose={() => setShowAddFunds(false)}
                onBalanceUpdate={onRefresh}
            />
        );
    }

    if (showWithdraw) {
        return (
            <WithdrawModal
                userId={userId}
                onClose={() => setShowWithdraw(false)}
                onBalanceUpdate={onRefresh}
            />
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Total Balance</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <h2 className="text-3xl font-black text-white">
                            {showBalance ? `${localDisplay.symbol}${localDisplay.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                        </h2>
                        <span className="text-xs text-zinc-500">{localDisplay.currency}</span>
                        <button 
                            onClick={toggleBalance}
                            className="text-zinc-500 hover:text-white transition-colors text-sm p-1"
                        >
                            {showBalance ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                    {localDisplay.currency !== 'USD' && showBalance && (
                        <p className="text-[8px] text-zinc-500 mt-1">
                            ≈ ${usdEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                        </p>
                    )}
                    {localDisplay.pendingBalance > 0 && (
                        <p className="text-[8px] text-yellow-400 mt-1 animate-pulse">
                            {localDisplay.symbol}{localDisplay.pendingBalance.toLocaleString()} {localDisplay.currency} pending
                        </p>
                    )}
                </div>
                <button 
                    onClick={onRefresh}
                    className="bg-white/5 h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
                    title="Refresh Balance"
                >
                    🔄
                </button>
            </div>

            <div className="flex gap-3 mt-6">
                <button 
                    onClick={() => setShowAddFunds(true)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-xl text-sm active:scale-95 transition-all shadow-lg hover:shadow-blue-500/20"
                >
                    + Add Funds
                </button>
                <button 
                    onClick={handleWithdrawClick}
                    className={`flex-1 font-bold py-3 rounded-xl text-sm active:scale-95 transition-all ${
                        isKYCVerified 
                            ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' 
                            : 'bg-zinc-800/50 border border-yellow-500/20 text-zinc-400 cursor-not-allowed'
                    }`}
                    title={!isKYCVerified ? 'Verify identity to withdraw' : 'Withdraw funds'}
                >
                    Withdraw {!isKYCVerified && '🔒'}
                </button>
            </div>

            {/* KYC Warning Modal */}
            {showKYCWarning && (
                <div className="fixed inset-0 bg-black/80 z-[500] flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-yellow-500/20">
                        <div className="text-center">
                            <div className="text-yellow-500 text-4xl mb-3">⚠️</div>
                            <h3 className="text-white font-bold text-lg mb-2">Verification Required</h3>
                            <p className="text-zinc-400 text-sm mb-4">
                                You need to verify your identity before you can withdraw funds.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowKYCWarning(false);
                                        // Trigger KYC modal from parent
                                        if (window.openKYCModal) window.openKYCModal();
                                    }}
                                    className="flex-1 bg-yellow-600 py-2 rounded-xl text-white font-bold"
                                >
                                    Verify Now
                                </button>
                                <button
                                    onClick={() => setShowKYCWarning(false)}
                                    className="flex-1 bg-white/10 py-2 rounded-xl text-white"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Available Balance</span>
                    <span className="text-green-400 font-bold">
                        {showBalance ? `${localDisplay.symbol}${localDisplay.balance.toLocaleString()}` : '••••••'} {localDisplay.currency}
                    </span>
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                    <span className="text-zinc-500">Account Status</span>
                    <span className={isKYCVerified ? "text-green-400" : "text-yellow-400"}>
                        {isKYCVerified ? 'Verified ✓' : 'Unverified ⚠️'}
                    </span>
                </div>
                {!isKYCVerified && (
                    <div className="flex justify-between text-[10px] mt-1">
                        <span className="text-zinc-500">Withdrawals</span>
                        <span className="text-yellow-400">Locked 🔒</span>
                    </div>
                )}
            </div>

            {/* Quick Actions Hint */}
            <div className="mt-4 pt-2">
                <p className="text-[6px] text-zinc-600 text-center">
                    Tap "Add Funds" to deposit • Tap "Withdraw" to cash out
                </p>
            </div>
        </div>
    );
}