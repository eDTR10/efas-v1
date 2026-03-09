import React, { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
    MONTH_KEYS,
    MONTH_LABELS,
    NTCARequestRow,
    formatRequestAmount,
    getRowObligatedTotal,
    getRowRequestedTotal,
} from './types';

interface NTCARequestTableProps {
    rows: NTCARequestRow[];
}

const NTCARequestTable: React.FC<NTCARequestTableProps> = ({ rows }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef({
        pointerId: -1,
        startX: 0,
        startScrollLeft: 0,
    });

    const filteredRows = useMemo(() => {
        const normalized = searchTerm.trim().toLowerCase();
        if (!normalized) {
            return rows;
        }

        return rows.filter((row) => {
            const baseFields = [
                row.project,
                row.activity,
                row.saroNo,
                row.targetDateOfActivity,
                row.originalCashFlowProgramLink,
            ];

            const monthlyFields = MONTH_KEYS.flatMap((month) => [
                String(row.monthly[month].amountRequested),
                String(row.monthly[month].obligatedWithSupplier),
            ]);

            return [...baseFields, ...monthlyFields]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalized));
        });
    }, [rows, searchTerm]);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const container = scrollContainerRef.current;
        if (!container) {
            return;
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: container.scrollLeft,
        };

        setIsDragging(true);
        container.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = scrollContainerRef.current;
        if (!container || !isDragging || dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - dragStateRef.current.startX;
        container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = scrollContainerRef.current;
        if (!container || dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        if (container.hasPointerCapture(event.pointerId)) {
            container.releasePointerCapture(event.pointerId);
        }

        dragStateRef.current.pointerId = -1;
        setIsDragging(false);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
                <div className="relative max-w-xl w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-400/60" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by project, activity, SARO, target date, or month amounts..."
                        className="w-full rounded-xl border border-sky-700/40 bg-sky-950/30 pl-9 pr-3 py-2 text-xs text-sky-50 placeholder:text-sky-300/45 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                    {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'} in view
                </div>
            </div>

            {/* <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-500/15 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-200/80">
                <span>Drag anywhere on the table to scroll horizontally.</span>
                <span className="text-sky-300/50">Left-right drag enabled</span>
            </div> */}

            <div className="rounded-2xl border border-sky-500/20 bg-neutral-950/80 overflow-hidden shadow-[0_18px_60px_rgba(2,8,23,0.45)]">
                <div
                    ref={scrollContainerRef}
                    className={`overflow-x-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerLeave={(event) => {
                        if (isDragging) {
                            endDrag(event);
                        }
                    }}
                >
                    <table className="min-w-[2550px] w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="bg-sky-950/85 backdrop-blur-sm">
                                <th rowSpan={2} className="sticky sm:static left-0 z-30 bg-sky-950 px-3 py-3 text-left text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[110px] text-xs">
                                    Project
                                </th>
                                <th rowSpan={2} className="sticky sm:static left-[110px] z-30 bg-sky-950 px-3 py-3 text-left text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[300px] text-xs">
                                    Activity
                                </th>
                                <th rowSpan={2} className="bg-sky-950 px-2.5 py-3 text-center text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[130px] whitespace-nowrap text-xs">
                                    SARO No.
                                </th>
                                <th rowSpan={2} className="bg-sky-950 px-2.5 py-3 text-right text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[130px] whitespace-nowrap text-xs">
                                    SARO Amount
                                </th>
                                <th rowSpan={2} className="bg-sky-950 px-2.5 py-3 text-right text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[155px] whitespace-nowrap text-xs">
                                    Estimated Amount w/o SARO
                                </th>
                                <th rowSpan={2} className="bg-sky-950 px-2.5 py-3 text-center text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[140px] whitespace-nowrap text-xs">
                                    Target Date of Activity
                                </th>
                                <th rowSpan={2} className="bg-sky-950 px-2.5 py-3 text-left text-sky-200 font-semibold border-b border-r border-sky-700/30 min-w-[190px] whitespace-nowrap text-xs">
                                    Original CashFlow Program Link
                                </th>
                                {MONTH_KEYS.map((month) => (
                                    <th
                                        key={month}
                                        colSpan={2}
                                        className="bg-sky-900/50 px-2 py-2.5 text-center text-sky-100 font-bold border-b border-r border-sky-700/30 uppercase tracking-[0.16em] text-[9px]"
                                    >
                                        {MONTH_LABELS[month]}
                                    </th>
                                ))}
                                <th rowSpan={2} className="bg-emerald-950/60 px-2.5 py-3 text-right text-emerald-200 font-semibold border-b border-r border-sky-700/30 min-w-[140px] whitespace-nowrap text-xs">
                                    Total Requested
                                </th>
                                <th rowSpan={2} className="bg-emerald-950/60 px-2.5 py-3 text-right text-emerald-200 font-semibold border-b border-sky-700/30 min-w-[140px] whitespace-nowrap text-xs">
                                    Total Obligated
                                </th>
                            </tr>
                            <tr className="bg-sky-900/35">
                                {MONTH_KEYS.map((month) => (
                                    <React.Fragment key={`${month}-subhead`}>
                                        <th className="px-2 py-1.5 text-center text-sky-200/75 font-medium border-b border-r border-sky-700/20 text-[9px] uppercase whitespace-nowrap">
                                            Amount to be Requested
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-emerald-200/75 font-medium border-b border-r border-sky-700/20 text-[9px] uppercase whitespace-nowrap">
                                            Obligated with Supplier
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={33} className="px-4 py-10 text-center text-neutral-500 bg-black/10">
                                        No request rows matched the current search.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row, index) => {
                                    const isEven = index % 2 === 0;
                                    const rowBaseClass = isEven ? 'bg-white/[0.02]' : 'bg-transparent';
                                    // const sourceBadgeClass = row.source === 'manual'
                                    //     ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                                    //     : row.source === 'sheet'
                                    //         ? 'bg-sky-500/15 text-sky-200 border-sky-500/30'
                                    //         : 'bg-amber-500/15 text-amber-200 border-amber-500/30';

                                    return (
                                        <tr key={row.id} className={`${rowBaseClass} hover:bg-sky-500/8 transition-colors`}>
                                            <td className={`sticky sm:static left-0 z-20 px-3 py-2.5 border-b border-r border-sky-900/30 text-sky-100 font-semibold text-xs ${isEven ? 'bg-[#08111d]' : 'bg-[#050b14]'}`}>
                                                <div className="space-y-1.5">
                                                    <span>{row.project || '—'}</span>
                                                    {/* <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${sourceBadgeClass}`}>
                                                        {row.source ?? 'sheet'}
                                                    </span> */}
                                                </div>
                                            </td>
                                            <td className={`sticky sm:static left-[110px] z-20 px-3 py-2.5 border-b border-r border-sky-900/30 text-[11px] text-neutral-100 leading-snug ${isEven ? 'bg-[#08111d]' : 'bg-[#050b14]'}`}>
                                                {row.activity}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-r border-sky-900/30 text-center text-sky-100/75 font-mono text-[10px]">
                                                {row.saroNo || '—'}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-r border-sky-900/30 text-right text-sky-100/85 font-mono text-[10px]">
                                                {formatRequestAmount(row.saroAmount)}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-r border-sky-900/30 text-right text-sky-100/85 font-mono text-[10px]">
                                                {formatRequestAmount(row.estimatedAmountWithoutSaro)}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-r border-sky-900/30 text-center text-neutral-300 text-[10px] whitespace-nowrap">
                                                {row.targetDateOfActivity || '—'}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-r border-sky-900/30 text-left text-neutral-300 text-[10px]">
                                                {row.originalCashFlowProgramLink ? (
                                                    <a
                                                        href={row.originalCashFlowProgramLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sky-300 hover:text-sky-200 underline underline-offset-4"
                                                    >
                                                        {row.originalCashFlowProgramLink}
                                                    </a>
                                                ) : '—'}
                                            </td>
                                            {MONTH_KEYS.map((month) => (
                                                <React.Fragment key={`${row.id}-${month}`}>
                                                    <td className="px-2 py-2.5 border-b border-r border-sky-900/25 text-right text-sky-100/85 font-mono text-[10px] whitespace-nowrap">
                                                        {formatRequestAmount(row.monthly[month].amountRequested)}
                                                    </td>
                                                    <td className="px-2 py-2.5 border-b border-r border-sky-900/25 text-right text-emerald-100/85 font-mono text-[10px] whitespace-nowrap">
                                                        {formatRequestAmount(row.monthly[month].obligatedWithSupplier)}
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                            <td className="px-2.5 py-2.5 border-b border-r border-emerald-900/30 bg-emerald-950/10 text-right text-emerald-200 font-semibold font-mono text-[10px] whitespace-nowrap">
                                                {formatRequestAmount(getRowRequestedTotal(row))}
                                            </td>
                                            <td className="px-2.5 py-2.5 border-b border-emerald-900/30 bg-emerald-950/10 text-right text-emerald-200 font-semibold font-mono text-[10px] whitespace-nowrap">
                                                {formatRequestAmount(getRowObligatedTotal(row))}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NTCARequestTable;