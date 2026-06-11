import React, { useState, useEffect } from 'react';
import API_BASE from "../config/api";

export default function TransactionPinModal({ isOpen, onClose, onVerify, amount, recipient, transactionType, userId }) {
    const [pin, setPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setError('');
            setTimeout(() => {
                document.getElementById('pin-input-0')?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handlePinChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return;
        
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        
        if (value && index < 3) {
            document.getElementById(`pin-input-${index + 1}`)?.focus();
        }
        
        if (index === 3 && value && newPin.every(digit => digit !== '')) {
            handleSubmit(newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            document.getElementById(`pin-input-${index - 1}`)?.focus();
        }
    };

    const handleSubmit = async (pinCode) => {
        if (pinCode.length !== 4) {
            setError('Please enter your 4-digit PIN');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const res = await fetch(`${API_BASE}/auth/verify-transaction-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, pin: pinCode })
            });
            const data = await res.json();
            
            if (data.success) {
                onVerify();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                setError(`${data.error || 'Invalid PIN'}. ${3 - newAttempts} attempts remaining.`);
                
                if (newAttempts >= 3) {
                    setError('Too many failed attempts. Please try again later.');
                    setTimeout(() => {
                        onClose();
                        setAttempts(0);
                    }, 30000);
                }
                
                setPin(['', '', '', '']);
                document.getElementById('pin-input-0')?.focus();
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
        setLoading(false);
    };

    const handleVerifyClick = () => {
        handleSubmit(pin.join(''));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[600] flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Confirm Transaction</h2>
                    <p className="text-zinc-400 text-sm mt-2">Enter your 4-digit PIN to authorize this {transactionType}</p>
                </div>

                <div className="bg-zinc-800/50 p-4 rounded-xl mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Amount:</span>
                        <span className="text-green-400 font-bold">${amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Recipient:</span>
                        <span className="text-white">{recipient}</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                        <p className="text-red-400 text-xs text-center">{error}</p>
                    </div>
                )}

                <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3].map((index) => (
                        <input
                            key={index}
                            id={`pin-input-${index}`}
                            type="password"
                            maxLength="1"
                            value={pin[index]}
                            onChange={(e) => handlePinChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            autoComplete="off"
                        />
                    ))}
                </div>

                <button onClick={handleVerifyClick} disabled={loading || pin.some(d => d === '')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all">
                    {loading ? 'Verifying...' : 'Confirm & Complete'}
                </button>

                <button onClick={onClose} className="w-full text-zinc-500 text-sm mt-4 hover:text-white transition-colors">Cancel</button>

                <div className="mt-4 text-center">
                    <p className="text-zinc-600 text-[10px]">Forgot your PIN? Contact support to reset.</p>
                </div>
            </div>
        </div>
    );
}