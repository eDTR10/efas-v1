import React, { useState, useEffect, useCallback, useMemo } from 'react';
import NTCAHeader from './components/NTCAHeader';
import TableFilters from './components/QuarterFilter';
import NTCATable from './components/NTCATable';
import { NTCARow, ActiveSection, ActiveQuarter, ActiveBudgetCategory, NTCAYear } from './components/types';
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

const formatPeso = (value: number): string =>
    value.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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
    const [activeYear, setActiveYear] = useState<NTCAYear>('2026');
    const [activePAP, setActivePAP] = useState<string>('');

    // Compute PAP options from rows (headers only, unique)
    const papOptions = useMemo(() => {
        const set = new Set<string>();
        for (const row of rows) {
            if (row.isHeader && row.pap) set.add(row.pap);
        }
        return Array.from(set);
    }, [rows]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNTCAData(activeYear);
            setRows(data);
            setLastUpdated(new Date());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [activeYear]);

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
                const papMatches = !activePAP || row.pap === activePAP;
                currentAllowed = isAllowed && papMatches;
                if (currentAllowed) selected.push(row);
                continue;
            }

            if (currentAllowed) {
                selected.push(row);
            }
        }

        return selected;
    }, [rows, activeBudgetCategory, activePAP]);

    const grandTotals = useMemo(() => {
        const dataRows = filteredRows.filter((row) => !row.isHeader);

        const valueForQuarter = (quarterData: { q1: number; q2: number; q3: number; q4: number; total: number }) => {
            if (activeQuarter !== 'all') {
                return quarterData[activeQuarter] ?? 0;
            }

            if ((quarterData.total ?? 0) !== 0) {
                return quarterData.total;
            }

            return (quarterData.q1 ?? 0) + (quarterData.q2 ?? 0) + (quarterData.q3 ?? 0) + (quarterData.q4 ?? 0);
        };

        return dataRows.reduce(
            (acc, row) => {
                acc.ntca += valueForQuarter(row.ntcaReceived);
                acc.disbursements += valueForQuarter(row.disbursements);
                acc.balance += valueForQuarter(row.ntcaBalance);
                return acc;
            },
            { ntca: 0, disbursements: 0, balance: 0 }
        );
    }, [filteredRows, activeQuarter]);

    return (
        <div className="min-h-screen w-full bg-background relative overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse" />

            {/* Logo
            <div className="relative z-20 flex flex-col items-center pt-8 pb-2">
                <img src={logo} alt="Logo" className="w-32 h-auto max-w-xs object-contain bg-transparent" />
            </div> */}

            {/* Header */}
            <NTCAHeader />

            {/* Main content */}
            <main className="relative z-10 px-4 py-8">

                {/* Top meta row */}
                <div className="flex flex-col gap-4 mb-6">
                    {/* Filters */}
                    <div className="w-full overflow-x-auto pb-1">
                        <TableFilters
                            activeYear={activeYear}
                            activeSection={activeSection}
                            activeQuarter={activeQuarter}
                            activeBudgetCategory={activeBudgetCategory}
                            activePAP={activePAP}
                            papOptions={papOptions}
                            lastUpdated={lastUpdated}
                            loading={loading}
                            onRefresh={loadData}
                            onYearChange={setActiveYear}
                            onSectionChange={setActiveSection}
                            onQuarterChange={setActiveQuarter}
                            onBudgetCategoryChange={setActiveBudgetCategory}
                            onPAPChange={setActivePAP}
                        />
                    </div>
                </div>

                {/* Grand total cards */}
                {!loading && !error && (
                    <div className="grid grid-cols-3 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
                        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/30 backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-sky-300/70">Grand Total NTCA</p>
                            <p className="mt-1 text-lg font-bold text-sky-200">₱ {formatPeso(grandTotals.ntca)}</p>
                        </div>
                        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/30 backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-violet-300/70">Grand Total Disbursement</p>
                            <p className="mt-1 text-lg font-bold text-violet-200">₱ {formatPeso(grandTotals.disbursements)}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">Grand Total NTCA Balance</p>
                            <p className="mt-1 text-lg font-bold text-emerald-200">₱ {formatPeso(grandTotals.balance)}</p>
                        </div>
                    </div>
                )}

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
