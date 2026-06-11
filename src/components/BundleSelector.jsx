import React from 'react';

export default function BundleSelector({ bundles, symbol, onSelect }) {
  if (!bundles || bundles.length === 0) return <p className="text-center opacity-50 py-10">No plans found.</p>;

  return (
    <div className="space-y-3 animate-in fade-in">
      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Select Your Plan</h3>
      <div className="grid grid-cols-1 gap-3">
        {bundles.map((bundle) => (
          <button 
            key={bundle.id}
            onClick={() => onSelect(bundle)}
            className="w-full bg-doriq-card p-5 rounded-2xl border border-white/5 flex justify-between items-center active:bg-doriq-blue/10 transition-colors"
          >
            <span className="font-bold text-sm text-left">{bundle.name}</span>
            <span className="text-doriq-blue font-black">{symbol}{bundle.amount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}