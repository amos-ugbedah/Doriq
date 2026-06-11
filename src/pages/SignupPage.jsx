import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import EmailVerificationModal from '../components/EmailVerificationModal';

// Fix: Ensure API_BASE includes /api for production
const getApiBase = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        // If URL already ends with /api, use as is
        if (envUrl.endsWith('/api')) {
            return envUrl;
        }
        // If URL ends with /, add api
        if (envUrl.endsWith('/')) {
            return `${envUrl}api`;
        }
        // Otherwise add /api
        return `${envUrl}/api`;
    }
    // Default to localhost for development
    return "http://localhost:5000/api";
};

const API_BASE = getApiBase();

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [tempEmail, setTempEmail] = useState('');
    const [tempName, setTempName] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [tempUserId, setTempUserId] = useState('');
    const navigate = useNavigate();

    // Check if email already exists in Firebase Auth and Firestore
    const checkEmailExists = async (email) => {
        try {
            // Check in Firestore first
            const userDoc = await getDoc(doc(db, 'users', email.toLowerCase().trim()));
            if (userDoc.exists()) {
                return { exists: true, source: 'firestore' };
            }
            
            // Check via backend API for Auth existence
            const response = await fetch(`${API_BASE}/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });
            
            const data = await response.json();
            return { exists: data.exists, source: data.source || 'auth' };
        } catch (error) {
            console.error('Email check error:', error);
            return { exists: false, error: error.message };
        }
    };

    // Check if email is banned
    const checkIfEmailBanned = async (email) => {
        try {
            const response = await fetch(`${API_BASE}/auth/check-banned/${encodeURIComponent(email)}`);
            const data = await response.json();
            if (data.banned) {
                setError(`This email has been banned. Reason: ${data.reason || 'Violation of terms'}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Banned check error:', error);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate name
        if (!name.trim()) {
            setError('Full name is required');
            return;
        }

        // Validate email
        if (!email.trim()) {
            setError('Email address is required');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            // FIRST: Check if email is banned
            const isBanned = await checkIfEmailBanned(email);
            if (isBanned) {
                setLoading(false);
                return;
            }

            // SECOND: Check if email already exists (prevents duplicate accounts)
            const emailCheck = await checkEmailExists(email);
            
            if (emailCheck.exists) {
                setError(`An account with ${email} already exists. Please login instead.`);
                setLoading(false);
                return;
            }
            
            // Generate a temporary ID for this verification session
            const tempId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setTempUserId(tempId);
            
            console.log('Sending verification code to:', email);
            console.log('API_BASE URL:', API_BASE);
            
            // Send verification code WITHOUT creating Firebase user
            const verifyRes = await fetch(`${API_BASE}/auth/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    userId: tempId,
                    userName: name.trim()
                })
            });
            
            const verifyData = await verifyRes.json();
            console.log('Verification API response:', verifyData);
            
            if (!verifyRes.ok) {
                setError(verifyData.error || 'Failed to send verification code. Please try again.');
                setLoading(false);
                return;
            }
            
            // Store temp data for verification modal
            setTempEmail(email.toLowerCase().trim());
            setTempName(name.trim());
            setTempPassword(password);
            
            // Show verification modal
            setShowVerification(true);
            
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'Signup failed. Please try again.');
            setLoading(false);
        }
    };

    // Show verification modal
    if (showVerification) {
        return (
            <EmailVerificationModal
                email={tempEmail}
                userName={tempName}
                password={tempPassword}
                tempUserId={tempUserId}
                onVerified={() => {
                    console.log('Email verified, account created');
                    setShowVerification(false);
                    navigate('/login');
                }}
                onClose={() => {
                    console.log('Verification cancelled');
                    setShowVerification(false);
                    setLoading(false);
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl font-black italic text-white">D</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-black italic bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                        DORIQ
                    </h1>
                    <p className="text-zinc-500 text-xs mt-2">Create your global wallet</p>
                </div>

                <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/10 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                            <p className="text-red-400 text-xs text-center">{error}</p>
                            {error.includes('already exists') && (
                                <div className="text-center mt-2">
                                    <Link to="/login" className="text-blue-400 text-xs hover:underline">
                                        Go to Login →
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="John Doe"
                                required
                                disabled={loading}
                                autoComplete="name"
                            />
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                                autoComplete="email"
                            />
                            <p className="text-zinc-600 text-[10px] mt-1">
                                We'll send a verification code to this email
                            </p>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12 transition-all"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12 transition-all"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 p-3 rounded-xl">
                            <p className="text-blue-400 text-[10px] text-center">
                                ✅ Verification required • Code sent to your email • 15 minutes expiry
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-98"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Sending Code...
                                </div>
                            ) : (
                                'Send Verification Code'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-zinc-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-400 hover:underline transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 text-center">
                        <p className="text-zinc-600 text-[10px]">
                            By signing up, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}