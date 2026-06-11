import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { AuthProvider } from './contexts/AuthContext';
import BalanceCard from './components/BalanceCard';
import ActionGrid from './components/ActionGrid';
import UtilityHub from './components/UtilityHub';
import Vault from './components/Vault';
import SendReceiveModal from './components/SendReceiveModal';
import BankAccountManager from './components/BankAccountManager';
import AddFundsModal from './components/AddFundsModal';
import KYCModal from './components/KYCModal';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import TransactionHistory from './pages/TransactionHistory';
import SetPinPage from './pages/SetPinPage';
import LoadingSpinner from './components/LoadingSpinner';
import API_BASE from './config/api';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDz-XeDNEVZoAL3mrcNYrIOO84rqDU4nt8",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "doriq-e0e2a.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "doriq-e0e2a",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "doriq-e0e2a.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "444027998115",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:444027998115:web:4a96fc7a274e118874d416"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Main Dashboard Component
function Dashboard({ userId, userData: initialUserData, onRefresh }) {
    const [userData, setUserData] = useState(initialUserData || {
        pendingBalance: 0,
        identityVerified: false,
        country: "US",
        isPremium: false,
        currency: "USD",
        symbol: "$",
        isAdmin: false,
        hasTransactionPin: false
    });
    const [localDisplay, setLocalDisplay] = useState({
        balance: 0,
        pendingBalance: 0,
        symbol: "$",
        conversionRate: 1,
        currency: "USD"
    });
    const [showKYC, setShowKYC] = useState(false);
    const [showAddFunds, setShowAddFunds] = useState(false);
    const [screen, setScreen] = useState("HOME");
    const [utilityMode, setUtilityMode] = useState(null);
    const [showSendReceive, setShowSendReceive] = useState(false);
    const [showKYCBanner, setShowKYCBanner] = useState(true);
    const navigate = useNavigate();

    // Fetch balance - FIXED to use email instead of UID
    const fetchBalance = async () => {
        if (!userId) return;
        try {
            // Get user email from Firebase Auth
            const currentUser = auth.currentUser;
            const userEmail = currentUser?.email || userId;
            
            const res = await fetch(`${API_BASE}/convert-balance/${userEmail}`);
            const data = await res.json();
            setLocalDisplay({
                balance: data.localBalance || 0,
                pendingBalance: data.pendingBalance || 0,
                symbol: data.currencySymbol || userData.symbol || "$",
                conversionRate: data.conversionRate || 1,
                currency: data.currency || userData.currency || "USD"
            });
        } catch (error) {
            console.error('Balance fetch error:', error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchBalance();
            const interval = setInterval(fetchBalance, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    // Update userData when prop changes
    useEffect(() => {
        if (initialUserData) {
            setUserData(initialUserData);
        }
    }, [initialUserData]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const openUtility = (mode) => {
        setUtilityMode(mode);
        setScreen("UTILITY");
    };

    const openVault = () => {
        setScreen("VAULT");
    };

    const openBankManager = () => {
        setScreen("BANK_MANAGER");
    };

    const openSendReceive = () => {
        setShowSendReceive(true);
    };

    const openAddFunds = () => {
        setShowAddFunds(true);
    };

    const goBack = () => {
        setUtilityMode(null);
        setScreen("HOME");
    };

    const handleKYCVerified = async () => {
        setShowKYC(false);
        if (onRefresh) await onRefresh();
        await fetchBalance();
    };

    const goToProfile = () => {
        navigate('/profile');
    };

    const goToTransactions = () => {
        navigate('/transactions');
    };

    const goToAdminDashboard = () => {
        navigate('/admin');
    };

    // KYC Modal
    if (showKYC) {
        return (
            <KYCModal
                userId={userId}
                onVerified={handleKYCVerified}
                onClose={() => setShowKYC(false)}
            />
        );
    }

    // Send/Receive Modal
    if (showSendReceive) {
        return (
            <SendReceiveModal
                userId={userId}
                isPremium={userData.isPremium}
                onClose={() => setShowSendReceive(false)}
                onBalanceUpdate={fetchBalance}
            />
        );
    }

    // Add Funds Modal
    if (showAddFunds) {
        return (
            <AddFundsModal
                userId={userId}
                onClose={() => setShowAddFunds(false)}
                onBalanceUpdate={fetchBalance}
            />
        );
    }

    // Bank Account Manager Screen
    if (screen === "BANK_MANAGER") {
        return (
            <BankAccountManager
                userId={userId}
                onClose={goBack}
                onAccountLinked={fetchBalance}
            />
        );
    }

    // Vault Screen
    if (screen === "VAULT") {
        return (
            <Vault
                userId={userId}
                onClose={goBack}
                onBalanceUpdate={fetchBalance}
            />
        );
    }

    // Utility Hub Screen
    if (screen === "UTILITY") {
        return (
            <UtilityHub
                userId={userId}
                mode={utilityMode}
                onClose={goBack}
                onBalanceUpdate={fetchBalance}
            />
        );
    }

    // HOME SCREEN
    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Inactivity Warning */}
            <div className="fixed bottom-4 right-4 z-50">
                <div className="text-[8px] text-zinc-600 bg-black/50 px-2 py-1 rounded-full">
                    Session active
                </div>
            </div>

            {/* Header */}
            <header className="sticky top-0 bg-black/95 backdrop-blur-sm z-20 px-4 py-4 flex justify-between items-center border-b border-white/5">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
                        DORIQ
                    </h1>
                    <span className="text-[8px] text-blue-500 font-bold tracking-[0.2em] uppercase">
                        {userData.country} • {localDisplay.currency}
                    </span>
                </div>
                <div className="flex gap-2">
                    {/* Admin Dashboard Button - Only shows if user is admin */}
                    {userData.isAdmin && (
                        <button 
                            onClick={goToAdminDashboard}
                            className="bg-purple-600/20 h-10 w-10 rounded-full flex items-center justify-center text-purple-400 hover:bg-purple-600/30 transition-colors"
                            title="Admin Dashboard"
                        >
                            👑
                        </button>
                    )}
                    
                    {/* KYC Button */}
                    <button 
                        onClick={() => setShowKYC(true)}
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                            !userData.identityVerified 
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                        title={userData.identityVerified ? 'Verified Account' : 'Verify Identity'}
                    >
                        {userData.identityVerified ? '✓' : '⚠️'}
                    </button>
                    
                    {/* Profile Button */}
                    <button 
                        onClick={goToProfile}
                        className="bg-white/5 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        title="Profile"
                    >
                        👤
                    </button>
                    
                    {/* Transactions Button */}
                    <button 
                        onClick={goToTransactions}
                        className="bg-white/5 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        title="Transaction History"
                    >
                        📋
                    </button>
                    
                    {/* Refresh Button */}
                    <button 
                        onClick={fetchBalance} 
                        className="bg-white/5 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
                        title="Refresh Balance"
                    >
                        🔄
                    </button>
                    
                    {/* Logout Button */}
                    <button 
                        onClick={handleLogout}
                        className="bg-white/5 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        🚪
                    </button>
                </div>
            </header>

            <div className="px-4">
                {/* Balance Card */}
                <BalanceCard
                    userId={userId}
                    localDisplay={localDisplay}
                    onAddMoney={openAddFunds}
                    onRefresh={fetchBalance}
                    isKYCVerified={userData.identityVerified}
                />

                {/* Pending Balance Notice */}
                {localDisplay.pendingBalance > 0 && (
                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl animate-pulse">
                        <p className="text-[10px] text-yellow-400 text-center">
                            {localDisplay.symbol}{localDisplay.pendingBalance.toLocaleString()} {localDisplay.currency} pending • Available in 30 minutes
                        </p>
                    </div>
                )}

                {/* KYC Reminder Banner */}
                {!userData.identityVerified && showKYCBanner && (
                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400 text-lg">⚠️</span>
                                    <p className="text-yellow-400 text-sm font-bold">Verify Your Identity</p>
                                </div>
                                <p className="text-zinc-400 text-[10px] mt-1">
                                    Complete KYC to unlock withdrawals, higher limits, and vault savings
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowKYC(true)}
                                    className="bg-yellow-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-500 transition-colors"
                                >
                                    Verify Now
                                </button>
                                <button 
                                    onClick={() => setShowKYCBanner(false)}
                                    className="bg-white/10 px-3 py-2 rounded-lg text-xs hover:bg-white/20 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Message for New Users */}
                {userData.identityVerified && !userData.fullName && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                        <p className="text-blue-400 text-xs font-bold">Welcome to DORIQ!</p>
                        <p className="text-zinc-400 text-[10px] mt-1">
                            Your wallet is active in {localDisplay.currency}. You can now send, receive, and pay bills globally.
                        </p>
                    </div>
                )}

                {/* Action Grid */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Quick Actions</p>
                        <button 
                            onClick={openBankManager}
                            className="text-[8px] text-blue-400 underline active:text-blue-300"
                        >
                            Manage Bank Accounts
                        </button>
                    </div>
                    <ActionGrid
                        onSendReceiveClick={openSendReceive}
                        onAirtimeClick={() => openUtility("AIRTIME")}
                        onDataClick={() => openUtility("DATA")}
                        onBillsClick={() => openUtility("BILLS")}
                        onElectricityClick={() => openUtility("ELECTRICITY")}
                        onTvClick={() => openUtility("TV")}
                        onGiftCardClick={() => openUtility("GIFTCARD")}
                        onVaultClick={openVault}
                    />
                </div>

                {/* Download App Banner */}
                {typeof window !== 'undefined' && !window.matchMedia('(display-mode: standalone)').matches && (
                    <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-bold">Install DORIQ App</p>
                                <p className="text-zinc-400 text-[10px]">Faster, safer, offline access</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.deferredPrompt) {
                                        window.deferredPrompt.prompt();
                                    } else {
                                        alert('Tap Share → Add to Home Screen');
                                    }
                                }}
                                className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors"
                            >
                                Install
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-12 text-center pb-8">
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">
                        Secure • Fast • Reliable
                    </p>
                    <p className="text-[6px] text-zinc-700 mt-2">
                        © 2024 DORIQ Technologies. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
}

// Main App Component with Routing
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await fetchUserData(firebaseUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchUserData = async (firebaseUser) => {
        try {
            const userEmail = firebaseUser.email;
            
            // Use email for API calls (your backend uses email as identifier)
            const emailBasedId = userEmail;
            
            // Fetch user data using email
            const res = await fetch(`${API_BASE}/user/${emailBasedId}`);
            const data = await res.json();
            
            if (data.success) {
                // Get admin status
                let isAdmin = false;
                try {
                    const token = await firebaseUser.getIdToken();
                    const adminCheck = await fetch(`${API_BASE}/admin/status`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (adminCheck.ok) {
                        const adminData = await adminCheck.json();
                        isAdmin = adminData.isAdmin;
                    } else {
                        const fallbackCheck = await fetch(`${API_BASE}/admin/check/${userEmail}`);
                        const fallbackData = await fallbackCheck.json();
                        isAdmin = fallbackData.isAdmin;
                    }
                } catch (adminError) {
                    console.error("Admin check error:", adminError);
                    if (userEmail === "ugbedahamos@gmail.com") {
                        isAdmin = true;
                    }
                }
                
                // Check if user has transaction PIN
                let hasTransactionPin = false;
                try {
                    const pinCheck = await fetch(`${API_BASE}/auth/has-transaction-pin/${userEmail}`);
                    const pinData = await pinCheck.json();
                    hasTransactionPin = pinData.hasPin || false;
                } catch (pinError) {
                    console.error("PIN check error:", pinError);
                }
                
                setUserData({
                    ...data,
                    isAdmin: isAdmin,
                    hasTransactionPin: hasTransactionPin
                });
            } else {
                // Create user if doesn't exist
                await fetch(`${API_BASE}/user/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userEmail,
                        email: userEmail,
                        fullName: firebaseUser.displayName || userEmail.split('@')[0]
                    })
                });
                
                // Fetch again
                const retryRes = await fetch(`${API_BASE}/user/${userEmail}`);
                const retryData = await retryRes.json();
                if (retryData.success) {
                    setUserData({
                        ...retryData,
                        isAdmin: userEmail === "ugbedahamos@gmail.com",
                        hasTransactionPin: false
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const refreshUserData = async () => {
        if (user) {
            await fetchUserData(user);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    // Get the email-based ID for routes
    const getUserIdentifier = () => {
        if (user && user.email) {
            return user.email;
        }
        return user?.uid;
    };

    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
                    <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
                    <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />} />
                    <Route 
                        path="/profile" 
                        element={user ? <ProfilePage userId={getUserIdentifier()} userData={userData} onUpdate={refreshUserData} /> : <Navigate to="/login" />} 
                    />
                    <Route 
                        path="/transactions" 
                        element={user ? <TransactionHistory userId={getUserIdentifier()} /> : <Navigate to="/login" />} 
                    />
                    <Route 
                        path="/set-pin" 
                        element={user && !userData?.hasTransactionPin ? <SetPinPage userId={getUserIdentifier()} /> : <Navigate to="/profile" />} 
                    />
                    <Route 
                        path="/admin" 
                        element={user && userData?.isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
                    />
                    <Route 
                        path="/" 
                        element={user ? <Dashboard userId={getUserIdentifier()} userData={userData} onRefresh={refreshUserData} /> : <Navigate to="/login" />} 
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}