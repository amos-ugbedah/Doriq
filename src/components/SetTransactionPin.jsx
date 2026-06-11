import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import API_BASE from "../config/api";

const auth = getAuth(firebaseApp);

export default function SetTransactionPin({ userId, onComplete, onSkip }) {
    const [step, setStep] = useState('enter');
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePinChange = (index, value, isConfirm = false) => {
        if (value.length > 1) return;
        
        const newPin = isConfirm ? [...confirmPin] : [...pin];
        newPin[index] = value;
        
        if (isConfirm) {
            setConfirmPin(newPin);
        } else {
            setPin(newPin);
        }
        
        if (value && index < 3) {
            const nextInput = document.getElementById(`${isConfirm ? 'confirm' : 'pin'}-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
        
        setError('');
    };

    const handleKeyDown = (index, e, isConfirm = false) => {
        if (e.key === 'Backspace' && !(isConfirm ? confirmPin[index] : pin[index]) && index > 0) {
            const prevInput = document.getElementById(`${isConfirm ? 'confirm' : 'pin'}-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleSubmit = async () => {
        const pinString = pin.join('');
        const confirmPinString = confirmPin.join('');
        
        if (pinString.length !== 4) {
            setError('Please enter a 4-digit PIN');
            return;
        }
        
        if (step === 'enter') {
            setStep('confirm');
            setConfirmPin(['', '', '', '']);
            setTimeout(() => {
                const firstInput = document.getElementById('confirm-0');
                if (firstInput) firstInput.focus();
            }, 100);
            return;
        }
        
        if (pinString !== confirmPinString) {
            setError('PINs do not match. Please try again.');
            setStep('enter');
            setPin(['', '', '', '']);
            setConfirmPin(['', '', '', '']);
            setTimeout(() => {
                const firstInput = document.getElementById('pin-0');
                if (firstInput) firstInput.focus();
            }, 100);
            return;
        }
        
        setLoading(true);
        
        try {
            const currentUser = auth.currentUser;
            const token = await currentUser.getIdToken();
            
            const response = await fetch(`${API_BASE}/auth/set-transaction-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: userId,
                    pin: pinString
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ Transaction PIN set successfully!');
                if (onComplete) onComplete();
            } else {
                setError(data.error || 'Failed to set PIN. Please try again.');
            }
        } catch (error) {
            console.error('Set PIN error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderPinInputs = (values, onChange, onKeyDown, prefix) => (
        <div className="flex gap-3 justify-center">
            {[0, 1, 2, 3].map((index) => (
                <input
                    key={index}
                    id={`${prefix}-${index}`}
                    type="password"
                    maxLength={1}
                    value={values[index]}
                    onChange={(e) => onChange(index, e.target.value)}
                    onKeyDown={(e) => onKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-bold bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus={index === 0}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl font-black italic text-white">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Set Transaction PIN</h2>
                    <p className="text-zinc-400 text-xs mt-2">
                        {step === 'enter' 
                            ? 'Create a 4-digit PIN for secure transactions' 
                            : 'Confirm your 4-digit PIN'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                        <p className="text-red-400 text-xs text-center">{error}</p>
                    </div>
                )}

                <div className="mb-6">
                    {step === 'enter' 
                        ? renderPinInputs(pin, handlePinChange, handleKeyDown, 'pin')
                        : renderPinInputs(confirmPin, (idx, val) => handlePinChange(idx, val, true), (idx, e) => handleKeyDown(idx, e, true), 'confirm')
                    }
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-xl font-bold text-white disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (step === 'enter' ? 'Continue' : 'Set PIN')}
                    </button>
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            disabled={loading}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-xl font-bold text-zinc-400"
                        >
                            Skip
                        </button>
                    )}
                </div>

                <p className="text-zinc-500 text-[10px] text-center mt-4">
                    This PIN will be required for withdrawals and sending money
                </p>
            </div>
        </div>
    );
}