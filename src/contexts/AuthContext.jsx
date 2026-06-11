import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// 30 minutes inactivity timeout (1800 seconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Component that handles inactivity timer
function InactivityHandler({ children }) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    const [currentUser, setCurrentUser] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const warningTimerRef = useRef(null);

    // Track auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (user) {
                // Check if there was a stored last activity
                const savedLastActivity = localStorage.getItem('lastActivity');
                if (savedLastActivity) {
                    const timeSinceLastActivity = Date.now() - parseInt(savedLastActivity);
                    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
                        // User was inactive for too long, log them out
                        handleAutoLogout();
                    } else {
                        // Resume the timer with remaining time
                        const remainingTime = INACTIVITY_TIMEOUT - timeSinceLastActivity;
                        startTimer(remainingTime);
                    }
                } else {
                    startTimer();
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const startTimer = (customTimeout = INACTIVITY_TIMEOUT) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }
        setShowWarning(false);
        
        if (currentUser) {
            // Show warning 1 minute before logout
            const warningTime = Math.max(0, customTimeout - 60 * 1000);
            if (warningTime > 0) {
                warningTimerRef.current = setTimeout(() => {
                    setShowWarning(true);
                    // Auto-hide warning after 30 seconds if user is active
                    setTimeout(() => setShowWarning(false), 30000);
                }, warningTime);
            }
            
            timerRef.current = setTimeout(() => {
                handleAutoLogout();
            }, customTimeout);
        }
    };

    const resetInactivityTimer = () => {
        if (!currentUser) return;
        
        lastActivityRef.current = Date.now();
        localStorage.setItem('lastActivity', lastActivityRef.current.toString());
        startTimer();
        
        // Hide warning if user becomes active
        if (showWarning) {
            setShowWarning(false);
        }
    };

    const handleAutoLogout = async () => {
        if (currentUser) {
            console.log('Auto-logout due to inactivity');
            localStorage.removeItem('lastActivity');
            await signOut(auth);
            navigate('/login');
        }
    };

    useEffect(() => {
        const activities = [
            'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 
            'mousemove', 'wheel', 'touchmove', 'touchcancel', 'touchend'
        ];
        
        const handleActivity = () => {
            resetInactivityTimer();
        };
        
        activities.forEach(activity => {
            window.addEventListener(activity, handleActivity);
        });
        
        // Also track page visibility (tab switching)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resetInactivityTimer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        resetInactivityTimer();
        
        return () => {
            activities.forEach(activity => {
                window.removeEventListener(activity, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (warningTimerRef.current) {
                clearTimeout(warningTimerRef.current);
            }
        };
    }, [currentUser]);

    return (
        <>
            {children}
            {/* Inactivity Warning Toast */}
            {showWarning && currentUser && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-yellow-500/95 backdrop-blur-md text-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-yellow-400">
                        <span className="text-xl">⏰</span>
                        <div>
                            <p className="font-bold text-sm">Session expiring soon!</p>
                            <p className="text-xs opacity-90">You'll be logged out in 1 minute due to inactivity.</p>
                        </div>
                        <button 
                            onClick={resetInactivityTimer}
                            className="ml-2 bg-black/20 hover:bg-black/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                        >
                            Stay Logged In
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        setUser,
        loading,
        setLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            <InactivityHandler>
                {children}
            </InactivityHandler>
        </AuthContext.Provider>
    );
}