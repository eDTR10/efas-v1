import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NTCARequestHeader from './components/NTCARequestHeader';
import NTCARequestTable from './components/NTCARequestTable';
import AddNTCARequestRowDialog from './components/AddNTCARequestRowDialog';
import { NTCA_REQUEST_SHEET_INFO, appendNTCARequestRow, fetchNTCARequestData, fetchNTCARequestDataWithToken } from './components/data';
import { requestGoogleSheetsAccessToken } from './components/googleAuth';
import { MONTH_KEYS, NTCARequestRow, NTCARequestYear, getRowObligatedTotal, getRowRequestedTotal } from './components/types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const formatPeso = (value: number): string =>
    value.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const LoadingSkeleton: React.FC = () => (
    <div className="rounded-2xl overflow-hidden border border-sky-700/30 bg-sky-950/40 backdrop-blur-md p-6 space-y-3 animate-pulse">
        {[...Array(6)].map((_, index) => (
            <div key={index} className="flex gap-4">
                <div className="h-4 bg-sky-800/50 rounded w-24" />
                <div className="h-4 bg-sky-800/30 rounded w-64" />
                <div className="h-4 bg-sky-800/30 rounded w-28" />
                <div className="h-4 bg-sky-800/30 rounded w-28" />
                {[...Array(8)].map((__, columnIndex) => (
                    <div key={columnIndex} className="h-4 bg-sky-800/20 rounded w-16" />
                ))}
            </div>
        ))}
    </div>
);

const ErrorCard: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="rounded-2xl border border-rose-700/40 bg-rose-950/30 backdrop-blur-md p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
        </div>
        <div>
            <p className="text-rose-300 font-semibold text-sm">Failed to load NTCA Request data</p>
            <p className="text-rose-400/70 text-xs mt-1">{message}</p>
        </div>
        <button
            onClick={onRetry}
            className="px-5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 transition-all duration-200 text-sm font-medium"
        >
            Retry
        </button>
    </div>
);

const NTCARequestMainContainer: React.FC = () => {
    const [sheetRows, setSheetRows] = useState<NTCARequestRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeYear] = useState<NTCARequestYear>('2026');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    const loadData = useCallback(async (tokenOverride?: string | null) => {
        setLoading(true);
        setError(null);

        try {
            const effectiveToken = tokenOverride ?? accessToken;
            const data = effectiveToken
                ? await fetchNTCARequestDataWithToken(effectiveToken, activeYear)
                : await fetchNTCARequestData(activeYear);
            setSheetRows(data);
            setLastUpdated(new Date());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeYear]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const allRows = useMemo(() => sheetRows, [sheetRows]);

    const connectGoogle = useCallback(async (): Promise<string> => {
        setConnecting(true);
        setError(null);

        try {
            const token = await requestGoogleSheetsAccessToken(GOOGLE_CLIENT_ID);
            setAccessToken(token);
            return token;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unable to connect Google account.';
            setError(message);
            throw err;
        } finally {
            setConnecting(false);
        }
    }, []);

    const totals = useMemo(() => {
        const requested = allRows.reduce((sum, row) => sum + getRowRequestedTotal(row), 0);
        const obligated = allRows.reduce((sum, row) => sum + getRowObligatedTotal(row), 0);
        const rowsWithSchedule = allRows.filter((row) =>
            MONTH_KEYS.some((month) => row.monthly[month].amountRequested > 0 || row.monthly[month].obligatedWithSupplier > 0)
        ).length;

        return {
            requested,
            obligated,
            balance: requested - obligated,
            rowsWithSchedule,
        };
    }, [allRows]);

    const handleAddRow = async (row: NTCARequestRow) => {
        const token = accessToken ?? await connectGoogle();
        await appendNTCARequestRow(token, row);
        await loadData(token);
    };

    return (
        <div className="min-h-screen w-full bg-background relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[32rem] h-[32rem] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse" />

            <NTCARequestHeader />

            <main className="relative z-10 px-4 py-8">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:justify-between rounded-2xl border border-border bg-card/80 backdrop-blur-md p-4">
                        <div>
                            <p className="text-primary/70 text-[11px] uppercase tracking-[0.35em]">Request Schedule</p>
                            <h2 className="text-foreground text-2xl font-bold mt-2">NTCA Request Monitoring</h2>
                            <p className="text-muted-foreground text-sm mt-2 max-w-3xl">
                                Reads from the live Google Sheet and appends new request rows back into the same sheet after Google authorization.
                            </p>
                        </div>

                        <div className="grid grid-cols-4 xl:grid-cols-1 m:grid-cols-1 sm:grid-cols-1 gap-3 xl:min-w-[780px]">
                            {lastUpdated && (
                                <span className="flex items-center justify-center rounded-xl border border-border bg-muted/40 px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={() => loadData()}
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium text-primary hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {loading ? 'Loading…' : 'Refresh'}
                            </button>
                            <button
                                onClick={() => void connectGoogle().then((token) => loadData(token))}
                                disabled={connecting}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M8 12H4m13.657-5.657l-2.829 2.829M9.172 14.828l-2.829 2.829m0-11.314l2.829 2.829m5.656 5.656l2.829 2.829" />
                                </svg>
                                {connecting ? 'Connecting…' : accessToken ? 'Reconnect Google' : 'Connect Google'}
                            </button>
                            {/* <button
                                onClick={() => setIsAddDialogOpen(true)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Request Row
                            </button> */}
                            <a
                                href="https://docs.google.com/spreadsheets/d/1j3_tmDE774xHsLzCYY0nPpckexAbJRVBmSX7x4PNpxY/edit?gid=976348003#gid=976348003"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Go to Sheet
                            </a>
                        </div>
                    </div>
                </div>

                {!loading && !error && (
                    <div className="grid grid-cols-3 sm:grid-cols-1 gap-3 mb-5">
                        <div className="rounded-2xl border border-border bg-card backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-primary/70">Total Requested</p>
                            <p className="mt-1 text-lg font-bold text-foreground">₱ {formatPeso(totals.requested)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-primary/70">Total Obligated</p>
                            <p className="mt-1 text-lg font-bold text-foreground">₱ {formatPeso(totals.obligated)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card backdrop-blur-md p-4">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Open Balance</p>
                            <p className="mt-1 text-lg font-bold text-foreground">₱ {formatPeso(totals.balance)}</p>
                        </div>
                        {/* <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 backdrop-blur-md p-4 xl:col-span-3">
                            <p className="text-[10px] uppercase tracking-widest text-violet-300/70">Rows with Schedule</p>
                            <p className="mt-1 text-lg font-bold text-violet-100">{totals.rowsWithSchedule}</p>
                        </div> */}
                    </div>
                )}

                {!loading && !error && allRows.length > 0 && (
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {allRows.length} records in view
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-medium">
                            {accessToken ? 'Google connected for read/write' : 'Connect Google for read/write'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-medium">
                            Sheet: {NTCA_REQUEST_SHEET_INFO.name}
                        </span>
                    </div>
                )}

                {loading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <ErrorCard message={error} onRetry={loadData} />
                ) : (
                    <NTCARequestTable rows={allRows} />
                )}

                {/* {!loading && !error && (
                    <p className="mt-4 text-neutral-500 text-xs">
                        Monthly columns run from January through December. This screen targets spreadsheet {NTCA_REQUEST_SHEET_INFO.id} and tab {NTCA_REQUEST_SHEET_INFO.name}.
                    </p>
                )} */}
            </main>

            <AddNTCARequestRowDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAddRow}
            />
        </div>
    );
};

export default NTCARequestMainContainer;