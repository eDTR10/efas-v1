import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/eFAS_Logo.png';

const NTCARequestHeader: React.FC = () => {
    const navigate = useNavigate();

    return (
        <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
            <button
                id="ntca-request-back-button"
                onClick={() => navigate('/efas-v1/portal')}
                className="flex items-center gap-2 text-foreground hover:text-primary px-3 py-2 rounded-xl hover:bg-muted border border-border hover:border-primary/40 transition-all duration-200 text-sm font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
                <p className="text-primary/60 text-[10px] tracking-widest uppercase">
                    AFD-FM-MNT-001
                </p>
                <h1 className="text-foreground font-bold text-sm tracking-tight">
                    Monitoring of NTCA Request
                </h1>
            </div>

            <div className="flex items-center">
                <img src={logo} alt="Logo" className="h-10 w-auto object-contain bg-transparent ml-2" />
            </div>
        </header>
    );
};

export default NTCARequestHeader;