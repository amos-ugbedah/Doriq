import React from 'react';

export default function ActionGrid({ 
    onVaultClick, 
    onGiftCardClick, 
    onAirtimeClick, 
    onBillsClick, 
    onDataClick, 
    onElectricityClick, 
    onTvClick,
    onSendReceiveClick
}) {
    const actions = [
        { name: "Send/Receive", icon: "📥📤", action: onSendReceiveClick, color: "from-green-500 to-emerald-600" },
        { name: "Airtime", icon: "📱", action: onAirtimeClick, color: "from-blue-500 to-cyan-600" },
        { name: "Data", icon: "📶", action: onDataClick, color: "from-purple-500 to-pink-600" },
        { name: "Electricity", icon: "⚡", action: onElectricityClick, color: "from-yellow-500 to-orange-600" },
        { name: "TV", icon: "📺", action: onTvClick, color: "from-red-500 to-rose-600" },
        { name: "Giftcards", icon: "🎁", action: onGiftCardClick, color: "from-pink-500 to-rose-600" },
        { name: "Vault", icon: "🔒", action: onVaultClick, color: "from-indigo-500 to-purple-600" }
    ];

    return (
        <div className="grid grid-cols-4 gap-3 w-full">
            {actions.map((act) => (
                <button 
                    key={act.name} 
                    onClick={act.action} 
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className={`bg-gradient-to-br ${act.color} h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-active:scale-95 transition-all`}>
                        {act.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">
                        {act.name}
                    </span>
                </button>
            ))}
        </div>
    );
}