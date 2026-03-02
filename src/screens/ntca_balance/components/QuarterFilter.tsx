import React from 'react';
import { ActiveSection, ActiveQuarter, ActiveBudgetCategory, SECTION_META } from './types';

interface TableFiltersProps {
    activeSection: ActiveSection | 'all';
    activeQuarter: ActiveQuarter;
    activeBudgetCategory: ActiveBudgetCategory;
    onSectionChange: (s: ActiveSection | 'all') => void;
    onQuarterChange: (q: ActiveQuarter) => void;
    onBudgetCategoryChange: (c: ActiveBudgetCategory) => void;
}

const QUARTERS: { key: ActiveQuarter; label: string }[] = [
    { key: 'all', label: 'All Quarters' },
    { key: 'q1', label: '1st Qtr' },
    { key: 'q2', label: '2nd Qtr' },
    { key: 'q3', label: '3rd Qtr' },
    { key: 'q4', label: '4th Qtr' },
];

const TableFilters: React.FC<TableFiltersProps> = ({
    activeSection,
    activeQuarter,
    activeBudgetCategory,
    onSectionChange,
    onQuarterChange,
    onBudgetCategoryChange,
}) => {
    return (
        <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="hidden sm:block w-px bg-green-700/30 self-stretch" />

            {/* ── Section filter ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">View:</span>

                <button
                    onClick={() => onSectionChange('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200
            ${activeSection === 'all'
                            ? 'bg-green-500 text-white shadow-[0_0_14px_rgba(34,197,94,0.35)]'
                            : 'bg-green-900/50 text-green-400 border border-green-700/40 hover:bg-green-800/60'}`}
                >
                    All Sections
                </button>

                {SECTION_META.map((sm) => (
                    <button
                        key={sm.key}
                        onClick={() => onSectionChange(sm.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200
              ${activeSection === sm.key
                                ? `${sm.bg} ${sm.text} border ${sm.border} shadow-lg`
                                : 'bg-green-900/50 text-green-400 border border-green-700/40 hover:bg-green-800/60'}`}
                    >
                        {sm.label}
                    </button>
                ))}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px bg-green-700/30 self-stretch" />

            {/* ── Quarter filter ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-green-500/50 text-xs uppercase tracking-widest mr-1">Quarter:</span>

                {QUARTERS.map((q) => (
                    <button
                        key={q.key}
                        onClick={() => onQuarterChange(q.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200
              ${activeQuarter === q.key
                                ? 'bg-green-500 text-white shadow-[0_0_14px_rgba(34,197,94,0.35)]'
                                : 'bg-green-900/50 text-green-400 border border-green-700/40 hover:bg-green-800/60'}`}
                    >
                        {q.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TableFilters;
