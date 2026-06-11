import React from 'react';

export default function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-zinc-500 text-sm">Loading DORIQ...</p>
            </div>
        </div>
    );
}