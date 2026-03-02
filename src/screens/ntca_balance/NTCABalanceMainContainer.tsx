import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NTCAHeader from './components/NTCAHeader';
import TableFilters from './components/QuarterFilter';
import NTCATable from './components/NTCATable';
import { NTCARow, ActiveSection, ActiveQuarter, ActiveBudgetCategory } from './components/types';
import { fetchNTCAData } from './components/data';

const REGULAR_TITLES = [
    'Personal Services',
    'Automatic Appropriations (RLIP)',
    'General Management Activities (MOOE)',
    'PNPKI',
    'Cybersecurity',
    'eGov & eLGU',
    'eGOV DGP',
    'IIDB',
    'NIPPSB',
    'ICT-PCFI',
    'SPARK',
    'DWIA',
    'Tech4Ed/DTC',
    'ILCDB',
    'NBP',
    'MISS',
    'Infostructure',
    'DRRM',
] as const;

const SPECIAL_TITLES = ['Free WiFi'] as const;

const normalizeTitle = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton: React.FC = () => (
    <div className="rounded-2xl overflow-hidden border border-green-700/30 bg-green-950/50 backdrop-blur-md p-6 space-y-3 animate-pulse">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4">
                <div className="h-4 bg-green-800/60 rounded w-64" />
                <div className="h-4 bg-green-800/40 rounded w-32" />
                <div className="h-4 bg-green-800/40 rounded w-10" />
                <div className="h-4 bg-green-800/40 rounded w-24" />
                {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-green-800/30 rounded w-20" />
                ))}
            </div>
        ))}
    </div>
);

// ─── Error card ───────────────────────────────────────────────────────────────
const ErrorCard: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="rounded-2xl border border-red-700/40 bg-red-950/30 backdrop-blur-md p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
        </div>
        <div>
            <p className="text-red-300 font-semibold text-sm">Failed to load sheet data</p>
            <p className="text-red-400/60 text-xs mt-1">{message}</p>
        </div>
        <button
            onClick={onRetry}
            className="px-5 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300
        hover:bg-red-500/30 transition-all duration-200 text-sm font-medium"
        >
            Retry
        </button>
    </div>
);

// ─── Main Container ───────────────────────────────────────────────────────────
const NTCABalanceMainContainer: React.FC = () => {
    const [rows, setRows] = useState<NTCARow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [activeSection, setActiveSection] = useState<ActiveSection | 'all'>('all');
    const [activeQuarter, setActiveQuarter] = useState<ActiveQuarter>('all');
    const [activeBudgetCategory, setActiveBudgetCategory] = useState<ActiveBudgetCategory>('regular');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNTCAData();
            setRows(data);
            setLastUpdated(new Date());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRows = useMemo(() => {
        const allowedTitles =
            activeBudgetCategory === 'special'
                ? SPECIAL_TITLES
                : REGULAR_TITLES;

        const allowedKeys = new Set(allowedTitles.map((title) => normalizeTitle(title)));
        const selected: NTCARow[] = [];
        let currentAllowed = false;

        for (const row of rows) {
            if (row.isHeader) {
                const isAllowed = allowedKeys.has(normalizeTitle(row.pap));
                currentAllowed = isAllowed;
                if (isAllowed) selected.push(row);
                continue;
            }

            if (currentAllowed) {
                selected.push(row);
            }
        }

        return selected;
    }, [rows, activeBudgetCategory]);

    return (
        <div className="min-h-screen w-full bg-neutral-950 relative overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-green-400/5 blur-3xl pointer-events-none animate-pulse" />

            {/* Logo
            <div className="relative z-20 flex flex-col items-center pt-8 pb-2">
                <img src={logo} alt="Logo" className="w-32 h-auto max-w-xs object-contain bg-transparent" />
            </div> */}

            {/* Header */}
            <NTCAHeader />

            {/* Main content */}
            <main className="relative z-10 px-4 py-8">

                {/* Top meta row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    {/* Filters */}
                    <TableFilters
                        activeSection={activeSection}
                        activeQuarter={activeQuarter}
                        activeBudgetCategory={activeBudgetCategory}
                        onSectionChange={setActiveSection}
                        onQuarterChange={setActiveQuarter}
                        onBudgetCategoryChange={setActiveBudgetCategory}
                    />

                    {/* Refresh + last updated */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {lastUpdated && (
                            <span className="text-neutral-500 text-xs hidden sm:block">
                                Updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={loadData}
                            disabled={loading}
                            title="Refresh data"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                bg-neutral-800 border border-neutral-700 text-green-400
                hover:bg-neutral-700 hover:text-green-300 hover:border-green-500/40
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200 text-xs font-medium"
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

                {/* Row count badge */}
                {!loading && !error && filteredRows.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
              bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            {filteredRows.filter(r => !r.isHeader).length} records · Live from Google Sheets
                        </span>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <ErrorCard message={error} onRetry={loadData} />
                ) : (
                    <NTCATable
                        rows={filteredRows}
                        activeSection={activeSection}
                        activeQuarter={activeQuarter}
                    />
                )}

                {/* Footer legend */}
                {!loading && !error && (
                    <p className="mt-4 text-neutral-500 text-xs">
                        S = Personal Services &nbsp;·&nbsp; Values in Philippine Peso (₱) &nbsp;·&nbsp; AFD-FM-MNT-001 — 2026 NTCA Balance Test
                    </p>
                )}
            </main>
        </div>
    );
};

export default NTCABalanceMainContainer;
