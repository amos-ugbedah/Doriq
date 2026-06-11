import React, { useState } from 'react';

import API_BASE from "../config/api";

export default function ValidationForm({ provider, onVerified }) {
  const [customerID, setCustomerID] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifiedName, setVerifiedName] = useState(null);

  const handleVerify = async () => {
    if (!customerID) return;

    setVerifying(true);
    setError('');
    setVerifiedName(null);

    try {
      const res = await fetch(`${API_BASE}/utility/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode: provider?.item_code,
          billerCode: provider?.biller_code,
          customerId: customerID
        })
      });

      const result = await res.json();

      if (result.success) {
        const name = result.data?.name || result.data?.customer_name;
        setVerifiedName(name || "Verified User");

        onVerified({
          ...result.data,
          customerID
        });

      } else {
        setError(result.error || "Validation failed");
      }

    } catch (e) {
      setError("Validation service unreachable");
    }

    setVerifying(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom">

      <div className="bg-doriq-card p-6 rounded-3xl border border-white/10">
        <label className="text-[10px] text-gray-400 font-bold uppercase mb-2 block tracking-widest">
          {provider?.biller_name?.toLowerCase().includes('electric')
            ? 'Meter Number'
            : 'SmartCard / IUC Number'}
        </label>

        <input 
          type="text" 
          placeholder="Enter ID here..."
          className="w-full bg-transparent text-2xl font-black outline-none text-white"
          value={customerID}
          onChange={(e) => {
            setCustomerID(e.target.value);
            setVerifiedName(null);
            setError('');
          }}
        />
      </div>

      {/* VERIFIED */}
      {verifiedName && (
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center">
          <p className="text-green-400 text-xs font-bold uppercase">Verified</p>
          <p className="text-white font-bold">{verifiedName}</p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <p className="text-red-500 text-xs font-bold text-center uppercase">
          {error}
        </p>
      )}

      <button 
        disabled={verifying || !customerID}
        onClick={handleVerify}
        className="w-full bg-white text-black font-black py-5 rounded-2xl disabled:opacity-30"
      >
        {verifying ? "VERIFYING..." : "VERIFY ACCOUNT"}
      </button>

    </div>
  );
}