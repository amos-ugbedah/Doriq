import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import API_BASE from "../config/api";

export default function ProfilePage({ userId, userData, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showAccountActions, setShowAccountActions] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [actionType, setActionType] = useState(null);
    const [freezeDays, setFreezeDays] = useState(7);
    const [confirmText, setConfirmText] = useState('');
    const navigate = useNavigate();

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setMessage('Password updated successfully!');
            setShowPasswordChange(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            if (err.code === 'auth/wrong-password') {
                setError('Current password is incorrect');
            } else {
                setError('Failed to update password. Please try again.');
            }
        }
        setLoading(false);
    };

    const handleGoToKYC = () => {
        navigate('/kyc');
    };

    const handleSetPin = () => {
        navigate('/set-pin');
    };

    const openConfirmModal = (action) => {
        setActionType(action);
        setConfirmText('');
        setCurrentPassword('');
        setShowConfirmModal(true);
    };

    const closeConfirmModal = () => {
        setShowConfirmModal(false);
        setActionType(null);
        setConfirmText('');
        setCurrentPassword('');
        setError('');
    };

    const handleAccountAction = async () => {
        if (confirmText !== 'CONFIRM') {
            setError('Please type CONFIRM to proceed');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            const userEmail = userId || user?.email;
            
            switch (actionType) {
                case 'deactivate':
                    await fetch(`${API_BASE}/user/deactivate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userEmail, reason: 'user_requested' })
                    });
                    await signOut(auth);
                    alert('Your account has been deactivated. You can reactivate by contacting support.');
                    navigate('/login');
                    break;

                case 'freeze':
                    await fetch(`${API_BASE}/user/freeze`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userEmail, days: freezeDays, reason: 'user_requested' })
                    });
                    await signOut(auth);
                    alert(`Your account has been frozen for ${freezeDays} days. You can log back in after this period.`);
                    navigate('/login');
                    break;

                case 'delete':
                    if (!currentPassword) {
                        setError('Current password is required to delete your account');
                        setLoading(false);
                        return;
                    }
                    const credential = EmailAuthProvider.credential(user.email, currentPassword);
                    await reauthenticateWithCredential(user, credential);
                    await deleteUser(user);
                    await fetch(`${API_BASE}/user/delete`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userEmail, email: user.email })
                    });
                    alert('Your account has been permanently deleted. We are sorry to see you go.');
                    navigate('/signup');
                    break;

                default:
                    break;
            }
        } catch (err) {
            if (actionType === 'delete' && err.code === 'auth/wrong-password') {
                setError('Current password is incorrect');
            } else {
                setError(`Failed to ${actionType} account. Please try again.`);
            }
            setLoading(false);
            return;
        }
        
        closeConfirmModal();
        setLoading(false);
    };

    const getActionDetails = () => {
        switch (actionType) {
            case 'deactivate':
                return {
                    title: 'Deactivate Account',
                    message: 'Are you sure you want to deactivate your account?',
                    warning: 'Your account will be hidden but data will be preserved. You can reactivate later by contacting support.',
                    buttonText: 'Deactivate',
                    buttonColor: 'bg-yellow-600'
                };
            case 'freeze':
                return {
                    title: 'Freeze Account',
                    message: 'Are you sure you want to freeze your account?',
                    warning: `Your account will be frozen for ${freezeDays} days. You will not be able to login during this period.`,
                    buttonText: 'Freeze Account',
                    buttonColor: 'bg-orange-600'
                };
            case 'delete':
                return {
                    title: 'Delete Account - PERMANENT ACTION',
                    message: 'Are you absolutely sure you want to delete your account?',
                    warning: 'This action CANNOT be undone. All your data, transactions, and wallet balance will be permanently lost.',
                    buttonText: 'Permanently Delete',
                    buttonColor: 'bg-red-600'
                };
            default:
                return {};
        }
    };

    const actionDetails = getActionDetails();

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/')} className="text-blue-400 text-xl">←</button>
                    <h1 className="text-2xl font-black italic text-white">Profile</h1>
                </div>

                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/10">
                    {/* User Info */}
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                            {userData?.fullName?.charAt(0) || 'U'}
                        </div>
                        <h2 className="text-xl font-bold text-white mt-3">{userData?.fullName || 'User'}</h2>
                        <p className="text-zinc-500 text-sm">{userId || userData?.email || 'No email'}</p>
                    </div>

                    {/* KYC Status */}
                    <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-zinc-400 text-sm">KYC Status</p>
                                <p className={`font-bold ${userData?.identityVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {userData?.identityVerified ? 'Verified ✓' : 'Not Verified ⚠️'}
                                </p>
                            </div>
                            {!userData?.identityVerified && (
                                <button
                                    onClick={handleGoToKYC}
                                    className="bg-yellow-600 px-4 py-2 rounded-lg text-xs font-bold"
                                >
                                    Verify Now
                                </button>
                            )}
                        </div>
                    </div>

                    {/* PIN Status */}
                    <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-zinc-400 text-sm">Transaction PIN</p>
                                <p className={`font-bold ${userData?.hasTransactionPin ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {userData?.hasTransactionPin ? 'Set ✓' : 'Not Set ⚠️'}
                                </p>
                            </div>
                            {!userData?.hasTransactionPin && (
                                <button
                                    onClick={handleSetPin}
                                    className="bg-blue-600 px-4 py-2 rounded-lg text-xs font-bold"
                                >
                                    Set PIN
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-zinc-500 text-sm">Country</span>
                            <span className="text-white text-sm">{userData?.country || 'US'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-zinc-500 text-sm">Currency</span>
                            <span className="text-white text-sm">{userData?.currency || 'USD'} {userData?.symbol}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-zinc-500 text-sm">Phone</span>
                            <span className="text-white text-sm">{userData?.phone || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-zinc-500 text-sm">Member Since</span>
                            <span className="text-white text-sm">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>

                    {/* Change Password Button */}
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="w-full bg-white/10 py-3 rounded-xl text-white mt-6 hover:bg-white/20 transition-colors"
                    >
                        {showPasswordChange ? 'Cancel' : 'Change Password'}
                    </button>

                    {/* Password Change Form */}
                    {showPasswordChange && (
                        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                            {error && (
                                <div className="bg-red-500/10 p-2 rounded-lg">
                                    <p className="text-red-400 text-xs text-center">{error}</p>
                                </div>
                            )}
                            {message && (
                                <div className="bg-green-500/10 p-2 rounded-lg">
                                    <p className="text-green-400 text-xs text-center">{message}</p>
                                </div>
                            )}
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                required
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-2 rounded-xl text-white font-bold hover:shadow-lg transition-all"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}

                    {/* Account Actions Section */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <button
                            onClick={() => setShowAccountActions(!showAccountActions)}
                            className="w-full bg-red-600/20 text-red-400 py-3 rounded-xl font-bold hover:bg-red-600/30 transition-colors"
                        >
                            {showAccountActions ? '▼' : '▶'} Account Management
                        </button>

                        {showAccountActions && (
                            <div className="mt-4 space-y-3">
                                <button
                                    onClick={() => openConfirmModal('deactivate')}
                                    className="w-full bg-yellow-600/20 text-yellow-400 p-3 rounded-xl text-sm font-bold hover:bg-yellow-600/30 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">⏸️</span>
                                        <div>
                                            <p className="font-bold">Deactivate Account</p>
                                            <p className="text-[10px] opacity-70">Temporarily hide your account</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => openConfirmModal('freeze')}
                                    className="w-full bg-orange-600/20 text-orange-400 p-3 rounded-xl text-sm font-bold hover:bg-orange-600/30 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">❄️</span>
                                        <div>
                                            <p className="font-bold">Freeze Account</p>
                                            <p className="text-[10px] opacity-70">Temporary lock for selected days</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => openConfirmModal('delete')}
                                    className="w-full bg-red-600/20 text-red-400 p-3 rounded-xl text-sm font-bold hover:bg-red-600/30 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">🗑️</span>
                                        <div>
                                            <p className="font-bold">Delete Account</p>
                                            <p className="text-[10px] opacity-70">Permanently remove all data</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && actionDetails && (
                <div className="fixed inset-0 bg-black/90 z-[500] flex items-center justify-center p-6 overflow-auto">
                    <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                                actionType === 'delete' ? 'bg-red-600/20' : actionType === 'freeze' ? 'bg-orange-600/20' : 'bg-yellow-600/20'
                            }`}>
                                <span className="text-3xl">
                                    {actionType === 'delete' ? '⚠️' : actionType === 'freeze' ? '❄️' : '⏸️'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white">{actionDetails.title}</h2>
                            <p className="text-zinc-400 text-sm mt-2">{actionDetails.message}</p>
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-3">
                                <p className="text-red-400 text-xs">{actionDetails.warning}</p>
                            </div>
                        </div>

                        {actionType === 'freeze' && (
                            <div className="mb-4">
                                <label className="text-zinc-400 text-sm mb-2 block">Freeze Duration</label>
                                <select
                                    value={freezeDays}
                                    onChange={(e) => setFreezeDays(parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                </select>
                            </div>
                        )}

                        {actionType === 'delete' && (
                            <div className="mb-4">
                                <label className="text-zinc-400 text-sm mb-2 block">Enter your password to confirm</label>
                                <input
                                    type="password"
                                    placeholder="Your password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="text-zinc-400 text-sm mb-2 block">
                                Type <span className="text-red-400 font-bold">CONFIRM</span> to proceed
                            </label>
                            <input
                                type="text"
                                placeholder="CONFIRM"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-center font-mono tracking-wider focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                                <p className="text-red-400 text-xs text-center">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={closeConfirmModal}
                                className="flex-1 bg-white/10 py-3 rounded-xl text-white font-bold hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAccountAction}
                                disabled={loading || confirmText !== 'CONFIRM' || (actionType === 'delete' && !currentPassword)}
                                className={`flex-1 ${actionDetails.buttonColor} py-3 rounded-xl text-white font-bold hover:opacity-80 transition-colors disabled:opacity-50`}
                            >
                                {loading ? 'Processing...' : actionDetails.buttonText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}