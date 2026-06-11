import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import API_BASE from "../config/api";

export default function TransactionHistory({ userId }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTransactions();
    }, [userId]);

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`${API_BASE}/transactions/${userId}`);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'all') return true;
        return tx.type === filter;
    });

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'deposit': return '💰';
            case 'withdrawal': return '🏦';
            case 'send_money': return '📤';
            case 'tpi_receive': return '📥';
            case 'utility': return '⚡';
            case 'vault': return '💎';
            default: return '💳';
        }
    };

    const getTransactionColor = (type) => {
        switch (type) {
            case 'deposit': return 'text-green-400';
            case 'withdrawal': return 'text-red-400';
            case 'send_money': return 'text-orange-400';
            case 'tpi_receive': return 'text-blue-400';
            default: return 'text-white';
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleDateString();
        }
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/')} className="text-blue-400 text-xl">←</button>
                    <h1 className="text-2xl font-black italic text-white">Transaction History</h1>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['all', 'deposit', 'withdrawal', 'send_money', 'utility'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                                filter === tab 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                            }`}
                        >
                            {tab === 'all' ? 'All' : 
                             tab === 'send_money' ? 'Sent' : 
                             tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-zinc-500 text-xs mt-3">Loading transactions...</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/30 rounded-2xl">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-zinc-500 text-sm">No transactions yet</p>
                        <p className="text-zinc-600 text-xs mt-1">Your transactions will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTransactions.map((tx, idx) => (
                            <div key={tx.transactionId || idx} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg">
                                            {getTransactionIcon(tx.type)}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm capitalize">{tx.type?.replace(/_/g, ' ')}</p>
                                            <p className="text-zinc-500 text-[10px]">{formatDate(tx.timestamp || tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className={`text-right ${getTransactionColor(tx.type)}`}>
                                        <p className="font-bold">
                                            {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}
                                            ${tx.amountUSD?.toLocaleString() || tx.amount?.toLocaleString()}
                                        </p>
                                        {tx.fee > 0 && (
                                            <p className="text-[8px] text-red-400">Fee: ${tx.fee?.toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                                {tx.note && (
                                    <p className="text-zinc-500 text-[10px] mt-2 border-t border-white/10 pt-2">{tx.note}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}