import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const INACTIVITY_TIMEOUT = 10 * 1000; // 10 seconds

export function useInactivityTimer() {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const userRef = useRef(null);

    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        
        const currentUser = auth.currentUser;
        userRef.current = currentUser;
        if (currentUser) {
            timerRef.current = setTimeout(() => {
                handleAutoLogout();
            }, INACTIVITY_TIMEOUT);
        }
    };

    const handleAutoLogout = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            console.log('Auto-logout due to inactivity');
            await signOut(auth);
            navigate('/login');
        }
    };

    useEffect(() => {
        const activities = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'mousemove'];
        
        const handleActivity = () => {
            resetTimer();
        };
        
        activities.forEach(activity => {
            window.addEventListener(activity, handleActivity);
        });
        
        resetTimer();
        
        return () => {
            activities.forEach(activity => {
                window.removeEventListener(activity, handleActivity);
            });
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { resetTimer };
}