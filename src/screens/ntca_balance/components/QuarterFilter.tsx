import React from 'react';
import { ActiveSection, ActiveQuarter, ActiveBudgetCategory, NTCAYear, SECTION_META } from './types';

interface TableFiltersProps {
    activeYear: NTCAYear;
    activeSection: ActiveSection | 'all';
    activeQuarter: ActiveQuarter;
    activeBudgetCategory: ActiveBudgetCategory;
    activePAP: string;
    papOptions: string[];
    lastUpdated: Date | null;
    loading: boolean;
    onRefresh: () => void;
    onYearChange: (y: NTCAYear) => void;
    onSectionChange: (s: ActiveSection | 'all') => void;
    onQuarterChange: (q: ActiveQuarter) => void;
    onBudgetCategoryChange: (c: ActiveBudgetCategory) => void;
    onPAPChange: (p: string) => void;
}

const QUARTERS: { key: ActiveQuarter; label: string }[] = [
    { key: 'all', label: 'All Quarters' },
    { key: 'q1', label: '1st Qtr' },
    { key: 'q2', label: '2nd Qtr' },
    { key: 'q3', label: '3rd Qtr' },
    { key: 'q4', label: '4th Qtr' },
];

const TableFilters: React.FC<TableFiltersProps> = ({
    activeYear,
    activeSection,
    activeQuarter,
    activeBudgetCategory,
    activePAP,
    papOptions,
    lastUpdated,
    loading,
    onRefresh,
    onYearChange,
    onSectionChange,
    onQuarterChange,
    onBudgetCategoryChange,
    onPAPChange,
}) => {
    return (
        <div className="w-max min-w-full flex items-center gap-3">
            {/* ── Year filter ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">Year:</span>

                <select
                    value={activeYear}
                    onChange={(e) => onYearChange(e.target.value as NTCAYear)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-green-900/50 text-green-300 border border-green-700/40 hover:bg-green-800/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                </select>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-green-700/30 self-stretch" />

            {/* ── Budget category filter ────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">Category:</span>

                <select
                    value={activeBudgetCategory}
                    onChange={(e) => onBudgetCategoryChange(e.target.value as ActiveBudgetCategory)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-green-900/50 text-green-300 border border-green-700/40 hover:bg-green-800/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                    <option value="regular">Regular</option>
                    <option value="special">Special</option>
                </select>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-green-700/30 self-stretch" />

            {/* ── PAP filter ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">PAP:</span>
                <select
                    value={activePAP}
                    onChange={(e) => onPAPChange(e.target.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-green-900/50 text-green-300 border border-green-700/40 hover:bg-green-800/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                    <option value="">All PAPs</option>
                    {papOptions.map((pap) => (
                        <option key={pap} value={pap}>{pap}</option>
                    ))}
                </select>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-green-700/30 self-stretch" />

            {/* ── Section filter ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">View:</span>

                <select
                    value={activeSection}
                    onChange={(e) => onSectionChange(e.target.value as ActiveSection | 'all')}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-green-900/50 text-green-300 border border-green-700/40 hover:bg-green-800/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                    <option value="all">All Sections</option>
                    {SECTION_META.map((sm) => (
                        <option key={sm.key} value={sm.key}>
                            {sm.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-green-700/30 self-stretch" />

            {/* ── Quarter filter ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">Quarter:</span>

                <select
                    value={activeQuarter}
                    onChange={(e) => onQuarterChange(e.target.value as ActiveQuarter)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-green-900/50 text-green-300 border border-green-700/40 hover:bg-green-800/60 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                >
                    {QUARTERS.map((q) => (
                        <option key={q.key} value={q.key}>
                            {q.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="ml-auto flex items-center gap-3 pl-2">
                {lastUpdated && (
                    <span className="text-neutral-500 text-xs hidden sm:block whitespace-nowrap">
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    title="Refresh data"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                bg-neutral-800 border border-neutral-700 text-green-400
                hover:bg-neutral-700 hover:text-green-300 hover:border-green-500/40
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 text-xs font-medium whitespace-nowrap"
                >
                    <svg
                        className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>
        </div>
    );
};

export default TableFilters;
