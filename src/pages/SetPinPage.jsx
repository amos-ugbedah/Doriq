import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SetTransactionPin from '../components/SetTransactionPin';

import API_BASE from "../config/api";

export default function SetPinPage({ userId }) {
    const [hasPin, setHasPin] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkPinStatus();
    }, [userId]);

    const checkPinStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/has-transaction-pin/${userId}`);
            const data = await res.json();
            setHasPin(data.hasPin);
        } catch (error) {
            console.error('Error checking PIN status:', error);
            setHasPin(false);
        }
        setLoading(false);
    };

    const handleComplete = () => {
        navigate('/profile');
    };

    const handleSkip = () => {
        navigate('/profile');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // If user already has a PIN, redirect to profile
    if (hasPin) {
        navigate('/profile');
        return null;
    }

    return (
        <SetTransactionPin
            userId={userId}
            onComplete={handleComplete}
            onSkip={handleSkip}
        />
    );
}