import React, { useState, useEffect } from 'react';
import TPIGenerator from './TPIGenerator';
import TPIPayment from './TPIPayment';
import SendMoney from './SendMoney';
import API_BASE from "../config/api";

export default function SendReceiveModal({ userId, isPremium, onClose, onBalanceUpdate }) {
    const [mode, setMode] = useState('receive'); // 'send', 'receive', 'tpi_send', 'tpi_receive'
    const [userCurrency, setUserCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [localBalance, setLocalBalance] = useState(0);

    // Fetch user currency on mount
    useEffect(() => {
        fetchUserCurrency();
        fetchBalance();
    }, [userId]);

    const fetchUserCurrency = async () => {
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
            setLocalBalance(data.localBalance || 0);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
            {/* Toggle Switch */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2 bg-zinc-900/40 p-1 rounded-xl flex-wrap">
                    <button
                        onClick={() => setMode('receive')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                            mode === 'receive' 
                                ? 'bg-green-600 text-white' 
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Receive (TPI)
                    </button>
                    <button
                        onClick={() => setMode('send')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                            mode === 'send' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Send (Wallet)
                    </button>
                    <button
                        onClick={() => setMode('tpi_send')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                            mode === 'tpi_send' 
                                ? 'bg-purple-600 text-white' 
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Send (TPI)
                    </button>
                </div>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            {/* Balance Display */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl mb-6 max-w-md mx-auto w-full text-center">
                <p className="text-zinc-400 text-xs">Your Balance</p>
                <p className="text-2xl font-bold text-white">{currencySymbol}{localBalance.toLocaleString()} {userCurrency}</p>
            </div>

            {/* Content based on mode */}
            {mode === 'receive' && (
                <TPIGenerator 
                    userId={userId} 
                    isPremium={isPremium}
                    onClose={onClose}
                    onBalanceUpdate={onBalanceUpdate}
                    embedded={true}
                />
            )}
            
            {mode === 'send' && (
                <SendMoney 
                    userId={userId}
                    onClose={onClose}
                    onBalanceUpdate={onBalanceUpdate}
                />
            )}
            
            {mode === 'tpi_send' && (
                <TPIPayment 
                    userId={userId}
                    isPremium={isPremium}
                    onClose={onClose}
                    onBalanceUpdate={onBalanceUpdate}
                />
            )}
        </div>
    );
}