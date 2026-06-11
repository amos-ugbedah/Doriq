import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(`Password reset email sent to ${email}. Check your inbox and follow the instructions.`);
            setEmail('');
        } catch (err) {
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Invalid email address');
                    break;
                case 'auth/user-not-found':
                    setError('No account found with this email');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many requests. Please try again later.');
                    break;
                default:
                    setError('Failed to send reset email. Please try again.');
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black italic bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                        DORIQ
                    </h1>
                    <p className="text-zinc-500 text-xs mt-2">Reset your password</p>
                </div>

                <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">Forgot Password?</h2>
                    
                    {message && (
                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl mb-4">
                            <p className="text-green-400 text-xs text-center">{message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                            <p className="text-red-400 text-xs text-center">{error}</p>
                        </div>
                    )}

                    <p className="text-zinc-400 text-sm mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Email'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-blue-400 text-sm hover:underline">
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}