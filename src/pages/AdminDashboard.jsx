import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ================= COMPONENTS =================

const StatCard = ({ title, value, subText, icon, color }) => (
    <div className={`bg-gradient-to-br ${color} p-4 rounded-xl border border-white/10`}>
        <p className="text-zinc-400 text-xs">{title}</p>
        <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-white">{value?.toLocaleString() || 0}</p>
            <span className="text-2xl">{icon}</span>
        </div>
        {subText && <p className="text-[10px] text-green-400 mt-1">{subText}</p>}
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
        pending_review: 'bg-yellow-500/20 text-yellow-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        active: 'bg-green-500/20 text-green-400',
        disabled: 'bg-red-500/20 text-red-400',
        processing: 'bg-yellow-500/20 text-yellow-400'
    };
    const labels = {
        approved: 'Approved',
        rejected: 'Rejected',
        pending_review: 'Pending Review',
        pending: 'Pending',
        active: 'Active',
        disabled: 'Disabled',
        processing: 'Processing'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${styles[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
            {labels[status] || status}
        </span>
    );
};

const LoadingSpinner = () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
    </div>
);

const EmptyState = ({ icon, title, message }) => (
    <div className="text-center py-16 bg-zinc-900/20 rounded-2xl">
        <div className="text-5xl mb-3">{icon}</div>
        <p className="text-zinc-500">{title}</p>
        <p className="text-zinc-600 text-xs mt-1">{message}</p>
    </div>
);

// Professional Rejection Reasons Modal
const RejectionModal = ({ isOpen, onClose, onConfirm, userName }) => {
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const rejectionReasons = [
        { id: 'blurry', label: '📷 Document is blurry or unreadable', defaultMessage: 'Document is blurry or unreadable' },
        { id: 'edited', label: '⚠️ Document appears to be edited or fake', defaultMessage: 'Document appears to be edited or fake' },
        { id: 'name_mismatch', label: '📝 Name does not match ID document', defaultMessage: 'Name does not match ID document' },
        { id: 'invalid_format', label: '🔢 ID number format is invalid', defaultMessage: 'ID number format is invalid' },
        { id: 'expired', label: '📅 Document is expired', defaultMessage: 'Document is expired' },
        { id: 'unable_verify', label: '❓ Unable to verify information', defaultMessage: 'Unable to verify information' },
        { id: 'selfie_mismatch', label: '📸 Selfie does not match ID photo', defaultMessage: 'Selfie does not match ID photo' },
        { id: 'incomplete', label: '📄 Incomplete documents submitted', defaultMessage: 'Incomplete documents submitted' },
        { id: 'age_restriction', label: '👤 User does not meet age requirements', defaultMessage: 'User does not meet age requirements' },
        { id: 'address_mismatch', label: '🏠 Address does not match ID', defaultMessage: 'Address does not match ID' }
    ];

    if (!isOpen) return null;

    const handleConfirm = () => {
        const finalReason = reason === 'custom' ? customReason : rejectionReasons.find(r => r.id === reason)?.defaultMessage;
        if (finalReason && finalReason.trim()) {
            onConfirm(finalReason);
        } else {
            alert('Please select or enter a rejection reason');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[600] flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Reject KYC Request</h3>
                    <button onClick={onClose} className="text-zinc-400 text-2xl hover:text-white">✕</button>
                </div>
                <p className="text-zinc-400 text-sm mb-4">Rejecting KYC for <span className="text-white font-bold">{userName}</span></p>
                
                <div className="space-y-3 mb-4">
                    <p className="text-zinc-400 text-xs font-bold">SELECT REJECTION REASON:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {rejectionReasons.map(r => (
                            <label key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer">
                                <input type="radio" name="reason" value={r.id} onChange={(e) => setReason(e.target.value)} className="w-4 h-4" />
                                <span className="text-white text-sm">{r.label}</span>
                            </label>
                        ))}
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer">
                            <input type="radio" name="reason" value="custom" onChange={(e) => setReason(e.target.value)} className="w-4 h-4" />
                            <span className="text-white text-sm">✏️ Custom reason</span>
                        </label>
                    </div>
                    
                    {reason === 'custom' && (
                        <textarea 
                            placeholder="Enter custom rejection reason..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            rows="3"
                            className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white text-sm mt-2"
                        />
                    )}
                </div>
                
                <div className="flex gap-3 mt-4">
                    <button onClick={handleConfirm} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl text-white font-bold">Confirm Rejection</button>
                    <button onClick={onClose} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-xl text-white font-bold">Cancel</button>
                </div>
            </div>
        </div>
    );
};

// KYC Detail Modal - Shows full details when clicking on a request
const KYCDetailModal = ({ request, onClose, onApprove, onReject }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    
    if (!request) return null;
    
    return (
        <>
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[550] flex items-center justify-center p-6 overflow-auto">
                <div className="bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                    <div className="sticky top-0 bg-zinc-900 p-6 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">KYC Request Details</h3>
                        <button onClick={onClose} className="text-zinc-400 text-2xl hover:text-white">✕</button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* User Information */}
                        <div className="bg-zinc-800/30 rounded-xl p-4">
                            <h4 className="text-blue-400 text-sm font-bold mb-3">👤 Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-zinc-500 text-xs">Full Name</p><p className="text-white font-medium">{request.submittedData?.fullName || request.userName}</p></div>
                                <div><p className="text-zinc-500 text-xs">Email</p><p className="text-white">{request.userEmail}</p></div>
                                <div><p className="text-zinc-500 text-xs">Country</p><p className="text-white">{request.submittedData?.country}</p></div>
                                <div><p className="text-zinc-500 text-xs">Phone</p><p className="text-white">{request.submittedData?.phoneNumber || 'Not provided'}</p></div>
                                <div><p className="text-zinc-500 text-xs">ID Number</p><p className="text-white font-mono">{request.submittedData?.idNumber || 'Not provided'}</p></div>
                                <div><p className="text-zinc-500 text-xs">Document Type</p><p className="text-white">{request.submittedData?.documentType || 'National ID'}</p></div>
                                <div><p className="text-zinc-500 text-xs">Submitted</p><p className="text-white">{request.submittedAt?.toDate ? new Date(request.submittedAt.toDate()).toLocaleString() : 'Recently'}</p></div>
                                <div><p className="text-zinc-500 text-xs">ID Format Valid</p><StatusBadge status={request.idFormatValid ? 'approved' : 'rejected'} /></div>
                            </div>
                        </div>
                        
                        {/* Documents */}
                        {request.documents && request.documents.length > 0 && (
                            <div className="bg-zinc-800/30 rounded-xl p-4">
                                <h4 className="text-blue-400 text-sm font-bold mb-3">📎 Uploaded Documents</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {request.documents.map((doc, idx) => (
                                        <div key={idx} className="bg-zinc-800 rounded-lg p-3 text-center">
                                            <div className="text-4xl mb-2">{doc.type === 'document' ? '📄' : '📸'}</div>
                                            <p className="text-white text-sm capitalize">{doc.type}</p>
                                            <button 
                                                onClick={() => window.open(`${API_BASE}${doc.path}`, '_blank')}
                                                className="mt-2 text-blue-400 text-xs hover:underline"
                                            >
                                                View Document →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Rejection Reason if rejected */}
                        {request.rejectionReason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <h4 className="text-red-400 text-sm font-bold mb-2">❌ Rejection Reason</h4>
                                <p className="text-red-300 text-sm">{request.rejectionReason}</p>
                                {request.rejectedAt && (
                                    <p className="text-zinc-500 text-[10px] mt-2">Rejected on: {new Date(request.rejectedAt.toDate()).toLocaleString()}</p>
                                )}
                            </div>
                        )}
                        
                        {/* Action Buttons */}
                        {(request.status === 'pending' || request.status === 'pending_review') && (
                            <div className="flex gap-3 pt-4 border-t border-white/10">
                                <button onClick={() => onApprove(request.id, request.userId)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold text-white transition-colors">
                                    ✓ Approve KYC
                                </button>
                                <button onClick={() => setShowRejectModal(true)} className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-3 rounded-xl font-bold transition-colors">
                                    ✗ Reject KYC
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <RejectionModal 
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                onConfirm={(reason) => {
                    onReject(request.id, request.userId, reason);
                    setShowRejectModal(false);
                }}
                userName={request.submittedData?.fullName || request.userName}
            />
        </>
    );
};

// KYC Request Card - Clickable
const KYCRequestCard = ({ request, onClick }) => {
    const isPending = request.status === 'pending' || request.status === 'pending_review';
    
    return (
        <div 
            onClick={onClick}
            className="bg-zinc-900/40 rounded-xl border border-white/10 overflow-hidden hover:border-blue-500/30 hover:bg-zinc-900/60 transition-all cursor-pointer"
        >
            <div className="p-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-lg">{request.submittedData?.fullName || request.userName}</p>
                            <StatusBadge status={request.status === 'pending' ? 'pending_review' : request.status} />
                        </div>
                        <p className="text-zinc-400 text-sm">{request.userEmail}</p>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">ID: {request.userId?.slice(-12)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-zinc-400">Submitted: {request.submittedAt?.toDate ? new Date(request.submittedAt.toDate()).toLocaleDateString() : 'Recently'}</p>
                        <p className="text-xs text-zinc-500">Document: {request.submittedData?.documentType || 'National ID'}</p>
                        {request.documents && request.documents.length > 0 && (
                            <p className="text-[10px] text-green-400 mt-1">📎 {request.documents.length} document(s)</p>
                        )}
                    </div>
                </div>
                
                <div className="mt-3 flex gap-2 flex-wrap">
                    <div className="bg-zinc-800/50 px-2 py-1 rounded text-[10px] text-zinc-400">
                        {request.submittedData?.country || 'Unknown'}
                    </div>
                    <div className="bg-zinc-800/50 px-2 py-1 rounded text-[10px] text-zinc-400">
                        ID Valid: {request.idFormatValid ? '✓' : '✗'}
                    </div>
                    {request.rejectionReason && (
                        <div className="bg-red-500/20 px-2 py-1 rounded text-[10px] text-red-400">
                            Rejected
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// User Detail Modal - View and manage user details with Ban/Suspend/Restrict/Delete
const UserDetailModal = ({ user, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState('');
    const [actionReason, setActionReason] = useState('');
    const [actionDuration, setActionDuration] = useState('7d');
    const [restrictions, setRestrictions] = useState(['withdrawals', 'send_money']);
    
    if (!user) return null;
    
    const handleToggleAdmin = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/admin/toggle-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'admin-email': localStorage.getItem('adminEmail')
                },
                body: JSON.stringify({ 
                    userId: user.id, 
                    email: user.email,
                    isAdmin: !user.isAdmin 
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Admin status ${!user.isAdmin ? 'granted' : 'revoked'} successfully!`);
                onUpdate();
                onClose();
            } else {
                alert(data.error || 'Failed to update admin status');
            }
        } catch (error) {
            console.error('Toggle admin error:', error);
            alert('Failed to update admin status. Please try again.');
        }
        setLoading(false);
    };
    
    const handleAction = async () => {
        if (!actionReason.trim() && actionType !== 'restore') {
            alert('Please provide a reason for this action');
            return;
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const endpoint = `/admin/${actionType}-user`;
            
            const body = {
                userId: user.id || user.email,
                reason: actionReason
            };
            
            if (actionType === 'ban' || actionType === 'suspend') {
                body.duration = actionDuration;
            }
            
            if (actionType === 'restrict') {
                body.restrictions = restrictions;
            }
            
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'admin-email': localStorage.getItem('adminEmail')
                },
                body: JSON.stringify(body)
            });
            
            const data = await res.json();
            if (data.success) {
                const messages = {
                    ban: 'User has been banned',
                    suspend: 'User has been suspended',
                    restrict: 'User has been restricted',
                    restore: 'User has been restored to active status',
                    delete: 'User has been permanently deleted'
                };
                alert(`✅ ${messages[actionType]}`);
                setShowActionModal(false);
                setActionReason('');
                onUpdate();
                if (actionType === 'delete') {
                    onClose();
                } else {
                    onClose();
                }
            } else {
                alert(data.error || 'Action failed');
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('Failed to perform action. Please try again.');
        }
        setLoading(false);
    };
    
    const ActionModal = () => (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[700] flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white capitalize">
                        {actionType === 'ban' ? '🔨 Ban User' : 
                         actionType === 'suspend' ? '⏸️ Suspend User' :
                         actionType === 'restrict' ? '🔒 Restrict User' :
                         actionType === 'restore' ? '🔄 Restore User' :
                         '🗑️ Delete User'}
                    </h3>
                    <button onClick={() => setShowActionModal(false)} className="text-zinc-400 text-2xl hover:text-white">✕</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <p className="text-zinc-400 text-sm">User: <span className="text-white font-bold">{user.fullName || user.email}</span></p>
                    </div>
                    
                    {(actionType === 'ban' || actionType === 'suspend') && (
                        <div>
                            <label className="text-zinc-400 text-sm block mb-2">Duration</label>
                            <select 
                                value={actionDuration} 
                                onChange={(e) => setActionDuration(e.target.value)}
                                className="w-full bg-zinc-800 border border-white/10 p-3 rounded-xl text-white"
                            >
                                <option value="1d">1 Day</option>
                                <option value="7d">7 Days</option>
                                <option value="14d">14 Days</option>
                                <option value="30d">30 Days</option>
                                <option value="permanent">Permanent</option>
                            </select>
                        </div>
                    )}
                    
                    {actionType === 'restrict' && (
                        <div>
                            <label className="text-zinc-400 text-sm block mb-2">Restrictions</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={restrictions.includes('withdrawals')}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setRestrictions([...restrictions, 'withdrawals']);
                                            } else {
                                                setRestrictions(restrictions.filter(r => r !== 'withdrawals'));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-white">Cannot Withdraw</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={restrictions.includes('send_money')}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setRestrictions([...restrictions, 'send_money']);
                                            } else {
                                                setRestrictions(restrictions.filter(r => r !== 'send_money'));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-white">Cannot Send Money</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={restrictions.includes('vault')}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setRestrictions([...restrictions, 'vault']);
                                            } else {
                                                setRestrictions(restrictions.filter(r => r !== 'vault'));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-white">Cannot Access Vault</span>
                                </label>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="text-zinc-400 text-sm block mb-2">
                            {actionType === 'delete' ? 'Deletion Reason' : 'Reason for Action'}
                        </label>
                        <textarea 
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder={actionType === 'delete' ? 
                                "Permanent deletion - user cannot re-register with this email" :
                                "Provide detailed reason for this action..."
                            }
                            rows="3"
                            className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white text-sm"
                        />
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={handleAction} 
                            disabled={loading}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                                actionType === 'delete' ? 'bg-red-600 hover:bg-red-500' :
                                actionType === 'ban' ? 'bg-red-600 hover:bg-red-500' :
                                actionType === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-500' :
                                actionType === 'restrict' ? 'bg-orange-600 hover:bg-orange-500' :
                                'bg-green-600 hover:bg-green-500'
                            } text-white`}
                        >
                            {loading ? 'Processing...' : 'Confirm'}
                        </button>
                        <button 
                            onClick={() => setShowActionModal(false)} 
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-xl text-white font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
    
    return (
        <>
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-6 overflow-y-auto">
                <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">User Details</h3>
                        <button onClick={onClose} className="text-zinc-400 text-2xl hover:text-white">✕</button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-zinc-500 text-xs">Full Name</p>
                            <p className="text-white font-medium">{user.fullName || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">Email</p>
                            <p className="text-white break-all">{user.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">User ID</p>
                            <p className="text-white text-xs font-mono break-all">{user.id || user.userId || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">Balance</p>
                            <p className="text-white">${user.balance?.toLocaleString() || '0.00'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">KYC Status</p>
                            <StatusBadge status={user.identityVerified ? 'approved' : 'pending'} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">Account Status</p>
                            <StatusBadge status={user.accountStatus || 'active'} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs">Admin Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={user.isAdmin ? 'approved' : 'pending'} />
                                <span className="text-xs text-zinc-500">
                                    {user.isAdmin ? 'Has admin privileges' : 'No admin privileges'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-6">
                        <button 
                            onClick={() => {
                                setActionType('ban');
                                setActionReason('');
                                setShowActionModal(true);
                            }}
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            🔨 Ban
                        </button>
                        <button 
                            onClick={() => {
                                setActionType('suspend');
                                setActionReason('');
                                setShowActionModal(true);
                            }}
                            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            ⏸️ Suspend
                        </button>
                        <button 
                            onClick={() => {
                                setActionType('restrict');
                                setActionReason('');
                                setShowActionModal(true);
                            }}
                            className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            🔒 Restrict
                        </button>
                        <button 
                            onClick={() => {
                                setActionType('restore');
                                setActionReason('Restoring account to active status');
                                setShowActionModal(true);
                            }}
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            🔄 Restore
                        </button>
                        <button 
                            onClick={() => {
                                setActionType('delete');
                                setActionReason('');
                                setShowActionModal(true);
                            }}
                            className="col-span-2 bg-red-600/40 hover:bg-red-600/50 text-red-300 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            🗑️ Delete Account (Permanent)
                        </button>
                        <button 
                            onClick={handleToggleAdmin} 
                            disabled={loading}
                            className={`col-span-2 py-2 rounded-lg text-sm font-bold transition-colors ${
                                user.isAdmin 
                                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                                    : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                            }`}
                        >
                            {loading ? 'Processing...' : (user.isAdmin ? '👑 Remove Admin' : '👑 Make Admin')}
                        </button>
                    </div>
                    
                    <button onClick={onClose} className="w-full mt-3 bg-zinc-700 hover:bg-zinc-600 py-2 rounded-lg text-white font-bold text-sm transition-colors">
                        Close
                    </button>
                </div>
            </div>
            
            {showActionModal && <ActionModal />}
        </>
    );
};

// Image Zoom Modal component
const ImageZoomModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[700] flex items-center justify-center p-6 cursor-pointer" onClick={onClose}>
            <div className="max-w-4xl max-h-[90vh] relative">
                <button onClick={onClose} className="absolute -top-12 right-0 text-white bg-red-600/80 hover:bg-red-600 rounded-full w-10 h-10 flex items-center justify-center text-xl">✕</button>
                <img src={`${API_BASE}${imageUrl}`} alt="Document Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()} />
                <p className="text-center text-zinc-400 text-xs mt-4">Click anywhere to close</p>
            </div>
        </div>
    );
};

// Main AdminDashboard Component
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [kycRequests, setKycRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedKYC, setSelectedKYC] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [kycFilter, setKycFilter] = useState('pending_review');
    const [zoomImage, setZoomImage] = useState(null);
    const navigate = useNavigate();

    const adminEmail = localStorage.getItem('adminEmail');
    const adminToken = localStorage.getItem('adminToken');

    useEffect(() => {
        const checkAdminStatus = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) { navigate('/login'); return; }
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch(`${API_BASE}/admin/check/${currentUser.email}`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                const data = await res.json();
                if (!data.isAdmin) { navigate('/'); return; }
                localStorage.setItem('adminToken', token);
                localStorage.setItem('adminEmail', currentUser.email);
                await fetchData(token);
            } catch (err) { console.error(err); navigate('/'); }
        };
        checkAdminStatus();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token && activeTab !== 'dashboard') {
            fetchData(token);
        }
    }, [activeTab, kycFilter]);

    const fetchData = async (token) => {
        setLoading(true);
        setError('');
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'admin-email': adminEmail };
            
            const endpoints = {
                dashboard: { url: `${API_BASE}/admin/stats`, setter: setStats, key: 'stats' },
                users: { url: `${API_BASE}/admin/users`, setter: setUsers, key: 'users' },
                kyc: { url: `${API_BASE}/admin/all-kyc-requests?status=${kycFilter}`, setter: setKycRequests, key: 'requests' },
                deposits: { url: `${API_BASE}/admin/all-pending-deposits`, setter: setDeposits, key: 'deposits' },
                withdrawals: { url: `${API_BASE}/admin/all-withdrawals`, setter: setWithdrawals, key: 'withdrawals' },
                tickets: { url: `${API_BASE}/admin/support-tickets`, setter: setTickets, key: 'tickets' }
            };
            
            const endpoint = endpoints[activeTab];
            if (endpoint) {
                const res = await fetch(endpoint.url, { headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.success) {
                    endpoint.setter(data[endpoint.key] || []);
                } else {
                    setError(data.error || `Failed to load ${activeTab}`);
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(`Failed to load ${activeTab}. Please refresh.`);
        }
        setLoading(false);
    };

    const handleApproveKyc = async (kycRequestId, userId) => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API_BASE}/admin/approve-kyc`, {
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`, 
                    'admin-email': adminEmail 
                },
                body: JSON.stringify({ kycRequestId, userId, notes: '' })
            });
            const data = await res.json();
            if (data.success) { 
                alert('✅ KYC approved successfully!'); 
                setSelectedKYC(null);
                await fetchData(token); 
            } else {
                alert(data.error); 
            }
        } catch (error) { 
            alert('Failed to approve KYC'); 
        }
    };

    const handleRejectKyc = async (kycRequestId, userId, reason) => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API_BASE}/admin/reject-kyc`, {
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`, 
                    'admin-email': adminEmail 
                },
                body: JSON.stringify({ kycRequestId, userId, reason })
            });
            const data = await res.json();
            if (data.success) { 
                alert('❌ KYC rejected'); 
                setSelectedKYC(null);
                await fetchData(token); 
            } else {
                alert(data.error); 
            }
        } catch (error) { 
            alert('Failed to reject KYC'); 
        }
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'kyc', label: 'KYC Review', icon: '🪪' },
        { id: 'deposits', label: 'Deposits', icon: '💰' },
        { id: 'withdrawals', label: 'Withdrawals', icon: '🏦' },
        { id: 'tickets', label: 'Support', icon: '🎫' }
    ];

    const filteredUsers = users.filter(user =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = kycRequests.filter(r => r.status === 'pending' || r.status === 'pending_review').length;

    if (loading && activeTab === 'dashboard') return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-black">
            <header className="bg-zinc-900/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-20">
                <div className="px-6 py-4 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-black italic bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">DORIQ ADMIN</h1>
                            <p className="text-[8px] text-blue-400">{adminEmail}</p>
                        </div>
                    </div>
                    <button onClick={async () => { await signOut(auth); localStorage.clear(); navigate('/login'); }} className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600/30">Logout</button>
                </div>
                
                {/* Responsive Tab Bar */}
                <div className="px-6 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => { setActiveTab(tab.id); fetchData(localStorage.getItem('adminToken')); }} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize flex items-center gap-1 whitespace-nowrap transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.id === 'kyc' && pendingCount > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <div className="p-4 sm:p-6">
                {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4"><p className="text-red-400 text-sm">{error}</p></div>}

                {/* Dashboard */}
                {activeTab === 'dashboard' && stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard title="Total Users" value={stats.totalUsers} subText={`${stats.verifiedUsers || 0} KYC verified`} icon="👥" color="from-blue-600/20 to-blue-800/20" />
                        <StatCard title="Total Balance" value={stats.totalBalance} icon="💰" color="from-green-600/20 to-green-800/20" />
                        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 p-4 rounded-xl border border-yellow-500/20">
                            <p className="text-zinc-400 text-xs">Pending Approvals</p>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div><p className="text-[10px] text-zinc-500">KYC</p><p className="text-xl sm:text-2xl font-bold text-yellow-400">{pendingCount}</p></div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div><p className="text-[10px] text-zinc-500">Deposits</p><p className="text-xl sm:text-2xl font-bold text-yellow-400">{stats.pendingDeposits || 0}</p></div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div><p className="text-[10px] text-zinc-500">Withdrawals</p><p className="text-xl sm:text-2xl font-bold text-yellow-400">{stats.pendingWithdrawals || 0}</p></div>
                            </div>
                        </div>
                        <StatCard title="Open Tickets" value={stats.openTickets || 0} icon="🎫" color="from-orange-600/20 to-orange-800/20" />
                        <StatCard title="Total Deposits" value={stats.totalDeposits} icon="💰" color="from-emerald-600/20 to-emerald-800/20" />
                        <StatCard title="Total Withdrawals" value={stats.totalWithdrawals} icon="🏦" color="from-rose-600/20 to-rose-800/20" />
                        <StatCard title="Fees Collected" value={stats.totalFees} icon="💸" color="from-purple-600/20 to-purple-800/20" />
                        <StatCard title="7-Day Volume" value={stats.recentVolume} icon="📊" color="from-cyan-600/20 to-cyan-800/20" />
                    </div>
                )}

                {/* KYC Review - Improved */}
                {activeTab === 'kyc' && (
                    <>
                        <div className="mb-4 flex flex-col sm:flex-row gap-3">
                            <input 
                                type="text" 
                                placeholder="Search by name, email or ID..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="flex-1 bg-zinc-900/50 border border-white/10 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-blue-500" 
                            />
                            <div className="flex gap-2 overflow-x-auto">
                                {['pending_review', 'approved', 'rejected'].map(filter => (
                                    <button 
                                        key={filter} 
                                        onClick={() => { setKycFilter(filter); fetchData(localStorage.getItem('adminToken')); }} 
                                        className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${
                                            kycFilter === filter ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {filter === 'pending_review' ? '⏳ Pending Review' : filter === 'approved' ? '✓ Approved' : '✗ Rejected'}
                                        {filter === 'pending_review' && pendingCount > 0 && (
                                            <span className="ml-2 bg-yellow-500 text-black px-1.5 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {kycRequests.length === 0 ? (
                                <EmptyState 
                                    icon={kycFilter === 'pending_review' ? "🪪" : kycFilter === 'approved' ? "✅" : "❌"} 
                                    title={`No ${kycFilter === 'pending_review' ? 'pending' : kycFilter} KYC requests`} 
                                    message={kycFilter === 'pending_review' ? "Users who submit KYC will appear here" : `No ${kycFilter} KYC requests found`} 
                                />
                            ) : (
                                kycRequests
                                    .filter(req => 
                                        req.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        req.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        req.userId?.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map(request => (
                                        <KYCRequestCard 
                                            key={request.id} 
                                            request={request} 
                                            onClick={() => setSelectedKYC(request)}
                                        />
                                    ))
                            )}
                        </div>
                    </>
                )}

                {/* Users Table - Responsive */}
                {activeTab === 'users' && (
                    <>
                        <div className="mb-4 flex flex-col sm:flex-row gap-3">
                            <input type="text" placeholder="Search by name, email or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-zinc-900/50 border border-white/10 px-4 py-3 rounded-xl text-white" />
                            <div className="text-zinc-500 text-sm bg-zinc-900/50 px-4 py-3 rounded-xl text-center sm:text-left">{filteredUsers.length} / {users.length} users</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="border-b border-white/10">
                                    <tr className="text-left text-zinc-400 text-sm">
                                        <th className="pb-3">User</th>
                                        <th className="pb-3">Email</th>
                                        <th className="pb-3">Balance</th>
                                        <th className="pb-3">KYC</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-12 text-zinc-500">No users found</td></tr>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3"><p className="text-white font-medium">{user.fullName || 'N/A'}</p></td>
                                                <td className="py-3 text-zinc-400 text-sm">{user.email || 'N/A'}</td>
                                                <td className="py-3"><p className="text-white">${user.balance?.toLocaleString()}</p></td>
                                                <td className="py-3"><StatusBadge status={user.identityVerified ? 'approved' : 'pending'} /></td>
                                                <td className="py-3"><StatusBadge status={user.isPremium ? 'active' : 'pending'} /></td>
                                                <td className="py-3"><button onClick={() => setSelectedUser(user)} className="bg-blue-600/80 hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold">View</button></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Deposits */}
                {activeTab === 'deposits' && (
                    <div className="space-y-3">
                        {deposits.length === 0 ? <EmptyState icon="📭" title="No pending deposits" message="All deposits have been processed" /> :
                            deposits.map(deposit => (
                                <div key={deposit.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                                    <div className="flex justify-between flex-wrap gap-4">
                                        <div><p className="text-white font-bold">{deposit.userName}</p><p className="text-zinc-400 text-xs">{deposit.userEmail}</p></div>
                                        <div className="text-right"><p className="text-2xl font-bold text-green-400">${deposit.amount?.toLocaleString()}</p></div>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <button className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg text-sm font-bold">✓ Approve</button>
                                        <button className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-5 py-2 rounded-lg text-sm font-bold">✗ Reject</button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Withdrawals */}
                {activeTab === 'withdrawals' && (
                    <div className="space-y-3">
                        {withdrawals.length === 0 ? <EmptyState icon="🏦" title="No withdrawal requests" message="Withdrawals will appear here" /> :
                            withdrawals.map(withdrawal => (
                                <div key={withdrawal.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                                    <div className="flex justify-between flex-wrap gap-4">
                                        <div><p className="text-white font-bold">{withdrawal.userName}</p><p className="text-zinc-400 text-xs">{withdrawal.userEmail}</p></div>
                                        <div className="text-right"><p className="text-2xl font-bold text-red-400">${withdrawal.amount?.toLocaleString()}</p><p className="text-zinc-500 text-[10px] capitalize">Status: {withdrawal.status}</p></div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Tickets */}
                {activeTab === 'tickets' && (
                    <div className="space-y-3">
                        {tickets.length === 0 ? <EmptyState icon="🎫" title="No support tickets" message="Tickets from users will appear here" /> :
                            tickets.map(ticket => (
                                <div key={ticket.id} className="bg-zinc-900/40 p-4 rounded-xl border border-white/10">
                                    <div className="flex justify-between flex-wrap gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap"><p className="text-white font-bold">{ticket.subject}</p><StatusBadge status={ticket.status} /></div>
                                            <p className="text-zinc-400 text-xs">From: {ticket.userName}</p>
                                            <p className="text-zinc-300 text-sm mt-2 bg-black/30 p-2 rounded-lg">{ticket.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <KYCDetailModal 
                request={selectedKYC} 
                onClose={() => setSelectedKYC(null)} 
                onApprove={handleApproveKyc}
                onReject={handleRejectKyc}
            />
            
            <UserDetailModal 
                user={selectedUser} 
                onClose={() => setSelectedUser(null)} 
                onUpdate={() => fetchData(localStorage.getItem('adminToken'))}
            />
            
            <ImageZoomModal imageUrl={zoomImage} onClose={() => setZoomImage(null)} />
        </div>
    );
}