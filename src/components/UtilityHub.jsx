import React, { useState, useEffect, useMemo } from 'react';

import API_BASE from "../config/api";

export default function UtilityHub({ userId, mode, onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [validating, setValidating] = useState(false);
    const [data, setData] = useState({
        airtime: [],
        data: [],
        electricity: [],
        tv: [],
        giftcards: [],
        country: "US",
        currencySymbol: "$",
        currencyCode: "USD"
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [variants, setVariants] = useState([]);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [meterNumber, setMeterNumber] = useState("");
    const [validatedName, setValidatedName] = useState("");
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState('list');
    const [localBalance, setLocalBalance] = useState(0);

    // Fetch user balance
    useEffect(() => {
        const fetchBalance = async () => {
            if (!userId) return;
            try {
                const res = await fetch(`${API_BASE}/convert-balance/${userId}`);
                const result = await res.json();
                setLocalBalance(result.localBalance || 0);
            } catch (err) {
                console.error(err);
            }
        };
        fetchBalance();
    }, [userId]);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/utility/categories/${userId}`);
                const result = await res.json();
                if (result.success) {
                    setData({
                        airtime: result.airtime || [],
                        data: result.data || [],
                        electricity: result.electricity || [],
                        tv: result.tv || [],
                        giftcards: result.giftcards || [],
                        country: result.country || "US",
                        currencySymbol: result.currencySymbol || "$",
                        currencyCode: result.currencyCode || "USD"
                    });
                }
            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    // Get current list based on mode
    const currentList = useMemo(() => {
        switch (mode) {
            case 'AIRTIME': return data.airtime;
            case 'DATA': return data.data;
            case 'ELECTRICITY': return data.electricity;
            case 'TV': return data.tv;
            case 'GIFTCARD': return data.giftcards;
            default: return [];
        }
    }, [mode, data]);

    const filteredList = useMemo(() => {
        if (!Array.isArray(currentList)) return [];
        if (!searchQuery.trim()) return currentList;
        const term = searchQuery.toLowerCase();
        return currentList.filter(item =>
            item.name?.toLowerCase().includes(term) ||
            item.short_name?.toLowerCase().includes(term)
        );
    }, [currentList, searchQuery]);

    // Fetch variants
    const fetchVariants = async (item) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/utility/variants/${item.id}`);
            const result = await res.json();
            if (result.success && result.variants.length > 0) {
                setVariants(result.variants);
                setSelectedItem(item);
                setStep('variants');
            } else {
                setSelectedItem(item);
                setStep('purchase');
            }
        } catch (error) {
            setSelectedItem(item);
            setStep('purchase');
        } finally {
            setLoading(false);
        }
    };

    // Validate meter number
    const handleValidate = async () => {
        if (!meterNumber) {
            alert("Please enter meter number");
            return;
        }
        setValidating(true);
        try {
            const res = await fetch(`${API_BASE}/utility/validate/${selectedItem.id}/${meterNumber}`);
            const result = await res.json();
            if (result.success) {
                setValidatedName(result.name);
                alert(`✅ Verified: ${result.name}`);
            } else {
                setValidatedName("");
                alert("❌ Meter number not found");
            }
        } catch (error) {
            alert("Validation failed");
        } finally {
            setValidating(false);
        }
    };

    // Handle purchase
    const handlePurchase = async () => {
        let finalAmount = amount;
        let itemName = selectedItem?.name;
        
        if (selectedVariant) {
            finalAmount = selectedVariant.amount;
            itemName = `${selectedItem?.name} - ${selectedVariant.name}`;
        }
        
        if (!finalAmount || parseFloat(finalAmount) <= 0) {
            alert(`Please enter amount in ${data.currencyCode}`);
            return;
        }
        
        if (parseFloat(finalAmount) > localBalance) {
            alert(`Insufficient balance. Your balance: ${data.currencySymbol}${localBalance.toLocaleString()} ${data.currencyCode}`);
            return;
        }
        
        if ((mode === 'AIRTIME' || mode === 'DATA') && !phoneNumber) {
            alert("Please enter phone number");
            return;
        }
        
        if (mode === 'ELECTRICITY' && !validatedName) {
            alert("Please validate meter number first");
            return;
        }

        const confirmMessage = `Purchase Summary:
        Service: ${itemName}
        Amount: ${data.currencySymbol}${parseFloat(finalAmount).toLocaleString()} ${data.currencyCode}
        
        Confirm purchase?`;

        if (!window.confirm(confirmMessage)) return;

        setProcessing(true);
        try {
            const payload = {
                userId,
                type: mode,
                amount: parseFloat(finalAmount),
                phoneNumber: phoneNumber,
                meterNumber: meterNumber,
                serviceID: selectedItem?.id,
                variationCode: selectedVariant?.id,
                itemName: itemName,
                currency: data.currencyCode
            };

            const res = await fetch(`${API_BASE}/utility/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.success) {
                alert(`✅ Purchase Successful!\n\n${itemName}\nAmount: ${data.currencySymbol}${parseFloat(finalAmount).toLocaleString()} ${data.currencyCode}`);
                setSelectedItem(null);
                setSelectedVariant(null);
                setVariants([]);
                setPhoneNumber("");
                setMeterNumber("");
                setAmount("");
                setValidatedName("");
                setStep('list');
                if (onBalanceUpdate) onBalanceUpdate();
            } else {
                alert(result.error || "Transaction failed");
            }
        } catch (error) {
            alert("Network error");
        } finally {
            setProcessing(false);
        }
    };

    // Variants selection screen
    if (step === 'variants' && variants.length > 0) {
        return (
            <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Select {selectedItem?.name} Plan</h2>
                        <span className="text-[10px] text-blue-500">{data.currencyCode}</span>
                    </div>
                    <button onClick={() => { setStep('list'); setSelectedItem(null); setVariants([]); }} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {variants.map((variant, idx) => (
                        <button
                            key={idx}
                            onClick={() => { setSelectedVariant(variant); setStep('purchase'); }}
                            className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all text-left"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white">{variant.name}</h4>
                                    {variant.dataAmount && <p className="text-zinc-400 text-sm">{variant.dataAmount} • {variant.validity}</p>}
                                    {variant.package && <p className="text-zinc-400 text-sm">{variant.package} Package</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-blue-400 font-bold">{data.currencySymbol}{variant.amount.toLocaleString()}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Purchase form screen
    if (step === 'purchase' && selectedItem) {
        const isElectricity = mode === 'ELECTRICITY';
        const isAirtimeOrData = mode === 'AIRTIME' || mode === 'DATA';
        const showAmountInput = !selectedVariant && !selectedItem?.amount;
        
        return (
            <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {selectedVariant ? `${selectedItem?.name} - ${selectedVariant.name}` : selectedItem?.name}
                        </h2>
                        <span className="text-[10px] text-blue-500">Balance: {data.currencySymbol}{localBalance.toLocaleString()} {data.currencyCode}</span>
                    </div>
                    <button onClick={() => { setStep('list'); setSelectedItem(null); setSelectedVariant(null); }} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
                </div>

                <div className="max-w-md mx-auto w-full space-y-5">
                    {isAirtimeOrData && (
                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Phone Number</label>
                            <input 
                                type="tel" 
                                placeholder="08012345678" 
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                value={phoneNumber} 
                                onChange={(e) => setPhoneNumber(e.target.value)} 
                            />
                        </div>
                    )}

                    {isElectricity && (
                        <>
                            <div>
                                <label className="text-zinc-400 text-sm mb-1 block">Meter Number</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Enter meter number" 
                                        className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                        value={meterNumber} 
                                        onChange={(e) => { setMeterNumber(e.target.value); setValidatedName(""); }} 
                                    />
                                    <button 
                                        onClick={handleValidate} 
                                        disabled={validating || !meterNumber} 
                                        className="bg-blue-600 px-6 rounded-xl font-bold disabled:opacity-50"
                                    >
                                        {validating ? "..." : "Verify"}
                                    </button>
                                </div>
                            </div>
                            {validatedName && (
                                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                    <p className="text-green-400 text-sm">Customer Name</p>
                                    <p className="text-white font-bold">{validatedName}</p>
                                </div>
                            )}
                        </>
                    )}

                    {showAmountInput && (
                        <div>
                            <label className="text-zinc-400 text-sm mb-1 block">Amount ({data.currencyCode})</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{data.currencySymbol}</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="w-full bg-white/5 border border-white/10 p-4 pl-10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)} 
                                />
                            </div>
                            {selectedItem?.minAmount && (
                                <p className="text-zinc-500 text-xs mt-1">Min: {data.currencySymbol}{selectedItem.minAmount.toLocaleString()} {data.currencyCode}</p>
                            )}
                            {amount && parseFloat(amount) > localBalance && (
                                <p className="text-red-400 text-xs mt-1">Insufficient balance. Available: {data.currencySymbol}{localBalance.toLocaleString()}</p>
                            )}
                        </div>
                    )}

                    {selectedVariant && (
                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                            {selectedVariant.dataAmount && <p className="text-zinc-400">Data: {selectedVariant.dataAmount}</p>}
                            {selectedVariant.validity && <p className="text-zinc-400">Validity: {selectedVariant.validity}</p>}
                            <p className="text-blue-400 font-bold mt-2">{data.currencySymbol}{selectedVariant.amount.toLocaleString()} {data.currencyCode}</p>
                        </div>
                    )}

                    <button 
                        onClick={handlePurchase} 
                        disabled={processing || (isElectricity && !validatedName) || (amount && parseFloat(amount) > localBalance)} 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-xl font-bold text-white disabled:opacity-50"
                    >
                        {processing ? "Processing..." : `Confirm Payment - ${data.currencySymbol}${selectedVariant?.amount || amount || '0'} ${data.currencyCode}`}
                    </button>
                </div>
            </div>
        );
    }

    // Main list screen
    return (
        <div className="fixed inset-0 bg-black z-[300] flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black italic text-white tracking-tighter uppercase">
                        {mode === 'AIRTIME' ? 'Airtime' : 
                         mode === 'DATA' ? 'Data Bundles' : 
                         mode === 'ELECTRICITY' ? 'Electricity' : 
                         mode === 'TV' ? 'TV Subscriptions' : 'Gift Cards'}
                    </h2>
                    <span className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase">
                        {loading ? 'Loading...' : `${data.country} Market • ${data.currencyCode}`}
                    </span>
                </div>
                <button onClick={onClose} className="text-white text-2xl p-2 hover:bg-white/10 rounded-full">✕</button>
            </div>

            {/* Balance Display */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl mb-6 text-center">
                <p className="text-zinc-400 text-xs">Your Balance</p>
                <p className="text-xl font-bold text-white">{data.currencySymbol}{localBalance.toLocaleString()} {data.currencyCode}</p>
            </div>

            <div className="mb-6">
                <input 
                    type="text" 
                    placeholder={`Search ${mode === 'AIRTIME' ? 'providers' : mode === 'DATA' ? 'data plans' : mode === 'ELECTRICITY' ? 'DISCOs' : mode === 'TV' ? 'packages' : 'gift cards'}...`} 
                    className="w-full bg-zinc-900/80 border border-white/10 p-5 rounded-2xl text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-zinc-600"
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                            Loading services...
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                        {filteredList.length > 0 ? filteredList.map((item, idx) => (
                            <button
                                key={item.id || idx}
                                onClick={() => {
                                    if (item.hasVariants || (mode === 'DATA') || (mode === 'TV')) {
                                        fetchVariants(item);
                                    } else {
                                        setSelectedItem(item);
                                        setStep('purchase');
                                    }
                                }}
                                className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-blue-500/50 hover:bg-zinc-800/60 transition-all text-left group"
                            >
                                <div className="h-12 w-12 bg-black rounded-xl flex items-center justify-center text-xl border border-white/5 group-hover:scale-110 transition-transform">
                                    {mode === 'AIRTIME' ? '📱' : 
                                     mode === 'DATA' ? '📶' : 
                                     mode === 'ELECTRICITY' ? '⚡' : 
                                     mode === 'TV' ? '📺' : '🎁'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider">
                                            {item.short_name || 'Service'}
                                        </p>
                                        {item.minAmount && (
                                            <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                                Min: {data.currencySymbol}{item.minAmount.toLocaleString()}
                                            </span>
                                        )}
                                        {item.hasVariants && (
                                            <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                                Multiple Plans
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-zinc-700 group-hover:text-blue-500 transition-colors text-xl">→</div>
                            </button>
                        )) : (
                            <div className="col-span-full text-center py-20 bg-zinc-900/10 rounded-2xl border border-dashed border-white/5">
                                <div className="text-4xl mb-3">🔍</div>
                                <p className="text-zinc-600 font-medium text-sm">No {mode.toLowerCase()} found</p>
                                <p className="text-zinc-700 text-xs mt-1">Try a different search term</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}