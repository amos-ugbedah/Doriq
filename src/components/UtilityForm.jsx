import React, { useState, useEffect } from 'react';

import API_BASE from "../config/api";

export default function UtilityForm({ userId, service, provider, symbol, currencyCode, onSuccess }) {
  const [formData, setFormData] = useState({ 
    customer: '', 
    amount: provider?.amount || '' 
  });
  const [loading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedName, setValidatedName] = useState(null);
  const [error, setError] = useState('');
  const [userCurrency, setUserCurrency] = useState(currencyCode || 'USD');
  const [userSymbol, setUserSymbol] = useState(symbol || '$');

  // Fetch user's actual currency
  useEffect(() => {
    const fetchUserCurrency = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/${userId}`);
        const data = await res.json();
        if (data.success) {
          setUserCurrency(data.currency || 'USD');
          setUserSymbol(data.symbol || '$');
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (userId) fetchUserCurrency();
  }, [userId]);

  // Services that REQUIRE validation
  const needsValidation = ['ELECTRICITY', 'CABLE', 'BILLS'].includes(service);

  // Validate customer
  const validateCustomer = async () => {
    if (!formData.customer) return;

    setIsValidating(true);
    setError('');
    setValidatedName(null);

    try {
      const res = await fetch(`${API_BASE}/utility/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCode: provider?.item_code,
          billerCode: provider?.biller_code,
          customerId: formData.customer
        })
      });

      const result = await res.json();

      if (result.success) {
        const name = result.data?.name || result.data?.customer_name;
        setValidatedName(name || "Verified User");
      } else {
        setError(result.error || "Account not found");
      }
    } catch (e) {
      setError("Validation server unreachable");
    } finally {
      setIsValidating(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!formData.customer || !formData.amount) {
      return setError("Missing details");
    }

    if (needsValidation && !validatedName) {
      return setError("Please verify account first");
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/utility/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: service,
          amount: Number(formData.amount),
          phoneNumber: formData.customer,
          customerId: formData.customer,
          operatorId: provider?.operatorId,
          billerCode: provider?.biller_code,
          itemCode: provider?.item_code,
          item: provider,
          currency: userCurrency
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(`✅ Transaction Successful!\n\nService: ${service}\nAmount: ${userSymbol}${Number(formData.amount).toLocaleString()} ${userCurrency}\nID: ${result.transactionId}`);
        onSuccess && onSuccess();
      } else {
        setError(result.error || "Transaction Failed");
      }
    } catch (e) {
      setError("System Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in zoom-in-95">
      {/* Account Input */}
      <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/10">
        <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block tracking-widest">
          {needsValidation ? "Meter / Smartcard ID" : "Phone / Account Number"}
        </label>

        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder={needsValidation ? "Enter ID" : "08012345678"}
            className="w-full bg-transparent text-2xl font-black outline-none text-white"
            value={formData.customer}
            onChange={(e) => {
              setFormData({ ...formData, customer: e.target.value });
              setValidatedName(null);
              setError('');
            }}
          />

          {needsValidation && (
            <button 
              onClick={validateCustomer}
              disabled={isValidating || !formData.customer}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 disabled:opacity-20 transition-all"
            >
              {isValidating ? "..." : "Verify"}
            </button>
          )}
        </div>
      </div>

      {/* Verified Name */}
      {validatedName && (
        <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-3xl">
          <p className="text-[8px] text-green-500 font-black uppercase tracking-tighter">
            Ownership Confirmed
          </p>
          <p className="text-sm font-black text-white uppercase">
            {validatedName}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p className="text-[10px] text-red-500 font-black uppercase text-center">
            {error}
          </p>
        </div>
      )}

      {/* Amount */}
      <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/10">
        <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block tracking-widest">
          Amount ({userCurrency})
        </label>

        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl text-zinc-500">{userSymbol}</span>
          <input 
            type="number" 
            readOnly={!!provider?.amount}
            value={formData.amount}
            placeholder="0.00"
            className={`w-full bg-transparent text-4xl font-black outline-none pl-8 ${
              provider?.amount ? 'text-zinc-600' : 'text-blue-500'
            }`}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>
        {provider?.minAmount && (
          <p className="text-zinc-500 text-[10px] mt-1">Minimum: {userSymbol}{provider.minAmount.toLocaleString()} {userCurrency}</p>
        )}
      </div>

      {/* Submit */}
      <button 
        disabled={loading || (needsValidation && !validatedName)}
        onClick={handlePayment}
        className="w-full bg-white text-black font-black py-6 rounded-[2rem] shadow-xl active:scale-95 transition-all disabled:opacity-10 disabled:grayscale"
      >
        {loading ? "PROCESSING..." : `CONFIRM ${userSymbol}${formData.amount || '0'} ${userCurrency}`}
      </button>
    </div>
  );
}