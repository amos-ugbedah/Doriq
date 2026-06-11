import React, { useState, useEffect } from 'react';
import TransactionPinModal from './TransactionPinModal';
import API_BASE from "../config/api";

export default function WithdrawModal({ userId, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [accountName, setAccountName] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [userCurrency, setUserCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [usdBalance, setUsdBalance] = useState(0);
    const [localBalance, setLocalBalance] = useState(0);
    const [withdrawalFee, setWithdrawalFee] = useState({ fee: 0, youReceive: 0 });
    const [banks, setBanks] = useState([]);
    const [showBankSearch, setShowBankSearch] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
    const [hasPin, setHasPin] = useState(true);
    const [checkingPin, setCheckingPin] = useState(true);
    const [fetchingBanks, setFetchingBanks] = useState(false);
    const [bankSearchTerm, setBankSearchTerm] = useState('');

    useEffect(() => {
        fetchUserData();
        fetchBalance();
        fetchBanks();
        checkUserPin();
    }, [userId]);

    const checkUserPin = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/has-transaction-pin/${userId}`);
            const data = await res.json();
            setHasPin(data.hasPin);
        } catch (err) {
            console.error('PIN check error:', err);
            setHasPin(false);
        } finally {
            setCheckingPin(false);
        }
    };

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

    const fetchBanks = async () => {
        setFetchingBanks(true);
        try {
            const res = await fetch(`${API_BASE}/banks/NG`);
            const data = await res.json();
            
            if (data.status === 'success' && data.data) {
                setBanks(data.data);
            } else {
                setFallbackBanks();
            }
        } catch (err) {
            console.error('Failed to fetch banks:', err);
            setFallbackBanks();
        } finally {
            setFetchingBanks(false);
        }
    };

    const setFallbackBanks = () => {
        setBanks([
            { code: "001", name: "Access Bank" },
            { code: "002", name: "GTBank" },
            { code: "003", name: "First Bank" },
            { code: "004", name: "UBA" },
            { code: "005", name: "Zenith Bank" },
            { code: "006", name: "Fidelity Bank" },
            { code: "007", name: "Union Bank" },
            { code: "008", name: "Sterling Bank" },
            { code: "009", name: "Ecobank" },
            { code: "010", name: "Stanbic IBTC" }
        ]);
    };

    const calculateWithdrawalFees = (inputAmount) => {
        const parsedAmount = parseFloat(inputAmount) || 0;
        
        const feeConfig = {
            'USD': { flat: 2, percentage: 1, min: 2, max: 50 },
            'NGN': { flat: 100, percentage: 0.5, min: 100, max: 5000 },
            'GBP': { flat: 1.5, percentage: 1, min: 1.5, max: 30 },
            'EUR': { flat: 1.5, percentage: 1, min: 1.5, max: 30 },
            'CAD': { flat: 2, percentage: 1, min: 2, max: 40 }
        };
        
        const config = feeConfig[userCurrency] || feeConfig['USD'];
        const percentageFee = parsedAmount * (config.percentage / 100);
        let totalFee = config.flat + percentageFee;
        totalFee = Math.max(config.min, Math.min(config.max, totalFee));
        
        const youReceive = parsedAmount - totalFee;
        
        return {
            fee: totalFee,
            youReceive: youReceive,
            flatFee: config.flat,
            percentageFee: config.percentage,
            minFee: config.min,
            maxFee: config.max
        };
    };

    useEffect(() => {
        if (amount && parseFloat(amount) > 0) {
            setWithdrawalFee(calculateWithdrawalFees(amount));
        } else {
            setWithdrawalFee({ fee: 0, youReceive: 0 });
        }
    }, [amount, userCurrency]);

    const handleWithdrawClick = () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert(`Please enter a valid amount in ${userCurrency}`);
            return;
        }
        
        const minAmount = userCurrency === 'NGN' ? 1000 : 10;
        if (parseFloat(amount) < minAmount) {
            alert(`Minimum withdrawal amount is ${currencySymbol}${minAmount.toLocaleString()} ${userCurrency}`);
            return;
        }
        
        if (parseFloat(amount) > localBalance) {
            alert(`Insufficient balance. Your balance is ${currencySymbol}${localBalance.toLocaleString()} ${userCurrency}`);
            return;
        }
        
        if (!bankAccount || !bankName) {
            alert("Please enter bank details");
            return;
        }
        
        if (!bankCode) {
            alert("Please select a valid bank");
            return;
        }

        if (!hasPin) {
            alert("Please set up a transaction PIN first in your profile settings.");
            onClose();
            return;
        }

        setPendingWithdrawal({
            userId: userId,
            amount: parseFloat(amount),
            bankCode: bankCode,
            accountNumber: bankAccount,
            accountName: accountName,
            currency: userCurrency,
            bankName: bankName
        });
        setShowPinModal(true);
    };

    const handlePinVerified = async () => {
        setShowPinModal(false);
        setLoading(true);
        
        try {
            const res = await fetch(`${API_BASE}/withdraw-to-bank`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingWithdrawal)
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Withdrawal of ${currencySymbol}${pendingWithdrawal.amount.toLocaleString()} ${userCurrency} initiated!\n\nYou will receive: ${currencySymbol}${withdrawalFee.youReceive.toLocaleString()} ${userCurrency}\n\nFunds will arrive in 1-3 business days.`);
                onClose();
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(data.error || "Withdrawal failed. Please try again.");
            }
        } catch (err) {
            console.error("Withdrawal error:", err);
            alert("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleBankSelect = (bank) => {
        setBankName(bank.name);
        setBankCode(bank.code);
        setBankSearchTerm(bank.name);
        setShowBankSearch(false);
    };

    const filteredBanks = banks.filter(bank => 
        bank.name.toLowerCase().includes(bankSearchTerm.toLowerCase())
    );

    if (checkingPin) {
        return (
            <div className="fixed inset-0 bg-black z-[300] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            <TransactionPinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onVerify={handlePinVerified}
                amount={pendingWithdrawal?.amount}
                recipient="Bank Account"
                transactionType="withdrawal"
                userId={userId}
            />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black italic text-white tracking-tighter">Withdraw Funds</h2>
                    <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase mt-1">
                        {userCurrency} • {currencySymbol}{localBalance.toLocaleString()} available
                    </span>
                </div>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            <div className="max-w-md mx-auto w-full space-y-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl text-center">
                    <p className="text-zinc-400 text-sm">Withdraw to your bank account</p>
                    <p className="text-zinc-500 text-xs mt-1">
                        Fee: {userCurrency === 'NGN' ? '₦100 + 0.5%' : userCurrency === 'USD' ? '$2 + 1%' : '1.5 + 1%'} 
                        (min {currencySymbol}{userCurrency === 'NGN' ? '100' : userCurrency === 'USD' ? '2' : '1.5'})
                    </p>
                </div>

                <div className="bg-zinc-900/40 p-4 rounded-xl text-center">
                    <p className="text-zinc-400 text-xs">Available Balance</p>
                    <p className="text-2xl font-bold text-white">{currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
                    {userCurrency !== 'USD' && (
                        <p className="text-zinc-500 text-[10px] mt-1">≈ ${usdBalance.toLocaleString()} USD</p>
                    )}
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
                    {amount && parseFloat(amount) > localBalance && (
                        <p className="text-red-400 text-xs mt-1">
                            Insufficient balance. Available: {currencySymbol}{localBalance.toLocaleString()}
                        </p>
                    )}
                </div>

                {amount && parseFloat(amount) > 0 && (
                    <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                        <p className="text-yellow-400 text-sm font-bold mb-2">💰 Fee Breakdown</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Withdrawal amount:</span>
                                <span className="text-white">{currencySymbol}{parseFloat(amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Flat fee:</span>
                                <span className="text-red-400">{currencySymbol}{withdrawalFee.flatFee?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Percentage fee ({withdrawalFee.percentageFee}%):</span>
                                <span className="text-red-400">{currencySymbol}{((parseFloat(amount) * (withdrawalFee.percentageFee / 100))).toLocaleString()}</span>
                            </div>
                            <div className="border-t border-white/10 my-2"></div>
                            <div className="flex justify-between font-bold">
                                <span className="text-green-400">You will receive:</span>
                                <span className="text-green-400">{currencySymbol}{withdrawalFee.youReceive.toLocaleString()} {userCurrency}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Bank Name</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={fetchingBanks ? "Loading banks..." : "Search for your bank..."}
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white"
                            value={bankSearchTerm}
                            onChange={(e) => {
                                setBankSearchTerm(e.target.value);
                                setShowBankSearch(true);
                                if (e.target.value === '') {
                                    setBankName('');
                                    setBankCode('');
                                }
                            }}
                            onFocus={() => setShowBankSearch(true)}
                        />
                        {showBankSearch && !fetchingBanks && (
                            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-white/10 rounded-xl max-h-48 overflow-y-auto">
                                {filteredBanks.length > 0 ? (
                                    filteredBanks.map(bank => (
                                        <button
                                            key={bank.code}
                                            onClick={() => handleBankSelect(bank)}
                                            className="w-full p-3 text-left hover:bg-white/10 text-white text-sm transition-colors"
                                        >
                                            {bank.name}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-zinc-500 text-sm text-center">
                                        No banks found matching "{bankSearchTerm}"
                                    </div>
                                )}
                            </div>
                        )}
                        {fetchingBanks && (
                            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-white/10 rounded-xl p-3">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                    <p className="text-zinc-400 text-sm">Loading banks...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Account Number</label>
                    <input
                        type="text"
                        placeholder="0123456789"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                    />
                </div>

                <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Account Name</label>
                    <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white uppercase"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    />
                </div>

                {!hasPin && (
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                        <p className="text-red-400 text-xs text-center">
                            ⚠️ No transaction PIN set. Please go to Profile to set up a PIN for withdrawals.
                        </p>
                    </div>
                )}

                <button
                    onClick={handleWithdrawClick}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || !bankAccount || !bankName || parseFloat(amount) > localBalance || !hasPin}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Processing...
                        </div>
                    ) : (
                        `Withdraw ${currencySymbol}${amount || '0'} ${userCurrency}`
                    )}
                </button>

                <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                    <p className="text-yellow-400 text-[10px] font-bold">ℹ️ Processing Information</p>
                    <p className="text-zinc-500 text-[10px] mt-1">
                        • Withdrawals take 1-3 business days to process<br/>
                        • Fees are deducted from your withdrawal amount<br/>
                        • Minimum withdrawal: {currencySymbol}{userCurrency === 'NGN' ? '1,000' : '10'} {userCurrency}<br/>
                        • Ensure bank details are correct to avoid delays<br/>
                        • You'll receive {currencySymbol}{withdrawalFee.youReceive.toLocaleString()} {userCurrency} after fees
                    </p>
                </div>
            </div>
        </div>
    );
}