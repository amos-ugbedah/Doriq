import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { getApiUrl } from '../config/api';

export default function EmailVerificationModal({ email, userName, password, tempUserId, onVerified, onClose }) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(900);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (timeLeft > 0 && !canResend) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !canResend) {
            setCanResend(true);
        }
    }, [timeLeft, canResend]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return;
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        if (value && index < 5) {
            document.getElementById(`code-input-${index + 1}`)?.focus();
        }
        
        if (index === 5 && value && newCode.every(digit => digit !== '')) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            document.getElementById(`code-input-${index - 1}`)?.focus();
        }
    };

    const handleVerify = async (verificationCode) => {
        const finalCode = verificationCode || code.join('');
        if (finalCode.length !== 6) {
            setError('Please enter the 6-digit verification code');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const verifyRes = await fetch(getApiUrl('/auth/verify-email-code'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: email,
                    code: finalCode,
                    email: email
                })
            });
            
            const verifyData = await verifyRes.json();
            
            if (!verifyData.success) {
                setError(verifyData.error || 'Invalid verification code');
                setCode(['', '', '', '', '', '']);
                document.getElementById('code-input-0')?.focus();
                setLoading(false);
                return;
            }
            
            console.log('✅ Code verified! Creating Firebase user...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: userName });
            
            await fetch(getApiUrl('/user/create'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userCredential.user.uid,
                    email: email,
                    fullName: userName
                })
            });
            
            await fetch(getApiUrl('/user/create'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: email,
                    email: email,
                    fullName: userName
                })
            }).catch(() => {});
            
            console.log('✅ Account created successfully!');
            alert('✅ Account created successfully! You can now login.');
            onVerified();
            
        } catch (err) {
            console.error('Account creation error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email already registered. Please login.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.');
            } else {
                setError(err.message || 'Verification failed. Please try again.');
            }
        }
        setLoading(false);
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        
        try {
            const res = await fetch(getApiUrl('/auth/resend-verification-code'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email,
                    userName: userName
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                setTimeLeft(900);
                setCanResend(false);
                setCode(['', '', '', '', '', '']);
                alert('New verification code sent! Check your email.');
                document.getElementById('code-input-0')?.focus();
            } else {
                setError(data.error || 'Failed to resend code');
            }
        } catch (err) {
            console.error('Resend error:', err);
            setError('Network error. Please try again.');
        }
        setResending(false);
    };

    const handleVerifyClick = () => {
        handleVerify();
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[600] flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📧</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
                    <p className="text-zinc-400 text-sm mt-2">
                        We've sent a verification code to<br />
                        <span className="text-blue-400 font-medium">{email}</span>
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                        <p className="text-red-400 text-xs text-center">{error}</p>
                    </div>
                )}

                <div className="flex justify-center gap-2 mb-6">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                            key={index}
                            id={`code-input-${index}`}
                            type="text"
                            maxLength="1"
                            value={code[index]}
                            onChange={(e) => handleCodeChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            autoComplete="off"
                        />
                    ))}
                </div>

                <button
                    onClick={handleVerifyClick}
                    disabled={loading || code.some(d => d === '')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                    {loading ? 'Verifying & Creating Account...' : 'Verify & Create Account'}
                </button>

                <div className="text-center mt-4">
                    {canResend ? (
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="text-blue-400 text-sm hover:underline disabled:opacity-50"
                        >
                            {resending ? 'Sending...' : 'Resend Code'}
                        </button>
                    ) : (
                        <p className="text-zinc-500 text-xs">
                            Resend code in {formatTime(timeLeft)}
                        </p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full text-zinc-500 text-sm mt-4 hover:text-white transition-colors"
                >
                    Back to Signup
                </button>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <p className="text-zinc-600 text-[10px]">
                        Didn't receive the email? Check your spam folder or contact support.
                    </p>
                </div>
            </div>
        </div>
    );
}