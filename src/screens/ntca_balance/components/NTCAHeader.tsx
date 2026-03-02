import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/eFAS_Logo.png';

const NTCAHeader: React.FC = () => {
    const navigate = useNavigate();


    return (
        <>
            <header
                className="relative z-20 flex items-center justify-between px-6 py-4
          border-b border-green-500/20 bg-black"
            >
                {/* ── Back Button ─────────────────────────────────── */}
                <button
                    id="ntca-back-button"
                    onClick={() => navigate('/efas-v1/portal')}
                    className="flex items-center gap-2 text-white hover:text-green-400
            px-3 py-2 rounded-xl hover:bg-neutral-800 border border-neutral-700 hover:border-green-500/40
            transition-all duration-200 text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>

                {/* ── Center Title ─────────────────────────────────── */}
                <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
                    <p className="text-green-400/70 text-[10px] tracking-widest uppercase">
                        AFD-FM-MNT-001
                    </p>
                    <h1 className="text-white font-bold text-sm tracking-tight">
                        Monitoring of NTCA Balance
                    </h1>
                </div>

                {/* ── Logo ──────────────────────────────── */}
                <div className="flex items-center">
                    <img src={logo} alt="Logo" className="h-10 w-auto object-contain bg-transparent ml-2" />
                </div>
            </header>


        </>
    );
};

export default NTCAHeader;
