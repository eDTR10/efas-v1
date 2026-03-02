import React from 'react';

interface SettingsDropdownProps {
    onClose: () => void;
}

const SETTINGS_ITEMS = [
    {
        label: 'Account',
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
        label: 'Notifications',
        icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
        label: 'Privacy',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    },
    {
        label: 'Help & Support',
        icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
];

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ onClose }) => {
    return (
        <div
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden
        bg-green-900/90 backdrop-blur-xl border border-green-700/40
        shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-50"
        >
            <div className="px-4 py-3 border-b border-green-700/30">
                <p className="text-green-400 text-xs font-semibold tracking-widest uppercase">
                    Settings
                </p>
            </div>

            {SETTINGS_ITEMS.map((item) => (
                <button
                    key={item.label}
                    onClick={onClose}
                    className="w-full flex items-center gap-3 px-4 py-3
            text-green-300/80 hover:text-white hover:bg-green-800/50
            transition-all duration-150 text-sm"
                >
                    <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d={item.icon}
                        />
                    </svg>
                    {item.label}
                </button>
            ))}
        </div>
    );
};

export default SettingsDropdown;
