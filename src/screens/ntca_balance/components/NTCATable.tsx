import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, ChevronDown } from 'lucide-react';
import {
    NTCARow,
    ActiveSection,
    ActiveQuarter,
    SECTION_META,
    QUARTER_LABELS,
    formatAmount,
    QuarterData,
} from './types';
import { exportCSV, exportExcel, exportPDF } from './exportUtils';

interface NTCATableProps {
    rows: NTCARow[];
    activeSection: ActiveSection | 'all';
    activeQuarter: ActiveQuarter;
}

type QuarterKey = keyof QuarterData;

// ─── Table Head ───────────────────────────────────────────────────────────────
const TableHead: React.FC<{
    visibleSections: typeof SECTION_META;
    visibleQuarters: QuarterKey[];
}> = ({ visibleSections, visibleQuarters }) => (
    <thead>
        {/* Row 1 — fixed cols + section group labels */}
        <tr className="bg-green-950/80 backdrop-blur-sm">
            <th rowSpan={2} className="sticky left-0 z-30 bg-green-950 text-green-300 font-semibold px-4 py-4 text-left border-b border-r border-green-700/40 min-w-[260px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                PAP
            </th>
            <th rowSpan={2} className="bg-green-950 text-green-300 font-semibold px-3 py-4 text-left border-b border-r border-green-700/40 min-w-[160px] whitespace-nowrap">
                PAP CODE
            </th>
            <th rowSpan={2} className="bg-green-950 text-green-300 font-semibold px-3 py-4 text-center border-b border-r border-green-700/40 whitespace-nowrap">
                CLASS<br />TYPE
            </th>
            <th rowSpan={2} className="bg-green-950 text-green-300 font-semibold px-3 py-4 text-center border-b border-r border-green-700/40 min-w-[120px] whitespace-nowrap">
                SARO NO.
            </th>

            {visibleSections.map((sm) => (
                <th
                    key={sm.key}
                    colSpan={visibleQuarters.length}
                    className={`${sm.headBg} ${sm.text} font-bold px-3 py-3 text-center border-b border-r border-green-700/30 tracking-wide uppercase text-[10px]`}
                >
                    {sm.label}
                </th>
            ))}
        </tr>

        {/* Row 2 — quarter sub-columns per section */}
        <tr className="bg-green-900/40">
            {visibleSections.map((sm) =>
                visibleQuarters.map((q) => (
                    <th
                        key={`${sm.key}-${q}`}
                        className={`${sm.bg} text-green-200/60 font-medium px-3 py-2 text-center border-b border-r border-green-700/30 whitespace-nowrap text-[10px] uppercase`}
                    >
                        {QUARTER_LABELS[q] || q}
                    </th>
                ))
            )}
        </tr>
    </thead>
);

// ─── Section Header Row ───────────────────────────────────────────────────────
const SectionHeaderRow: React.FC<{
    label: string;
    colSpan: number;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ label, colSpan, isExpanded, onToggle }) => (
    <tr className="hover:bg-green-800/20 transition-colors">
        <td
            colSpan={colSpan}
            className="sticky left-0 z-10 bg-green-800/40 text-green-300 font-bold px-4 py-2 border-b border-green-700/30 uppercase tracking-[0.2em] text-[14px]"
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-2 text-left"
                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
                <ChevronDown className={`w-4 h-4 text-green-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <span>{label}</span>
            </button>
        </td>
    </tr>
);

// ─── PAP Total Row ────────────────────────────────────────────────────────────
const PAPTotalRow: React.FC<{
    dataRows: NTCARow[];
    visibleSections: typeof SECTION_META;
    visibleQuarters: QuarterKey[];
}> = ({ dataRows, visibleSections, visibleQuarters }) => (
    <tr className="bg-green-900/50 border-b-2 border-green-600/40">
        <td className="sticky left-0 z-10 bg-green-900/80 px-4 py-2 text-green-200 font-black text-[10px] uppercase tracking-[0.25em] border-r border-green-700/40 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
            Total
        </td>
        <td className="px-3 py-2 border-r border-green-700/30" />
        <td className="px-3 py-2 border-r border-green-700/30" />
        <td className="px-3 py-2 border-r border-green-700/30" />
        {visibleSections.map((sm) =>
            visibleQuarters.map((q) => {
                const val = dataRows.reduce((sum, r) => sum + ((r[sm.key] as QuarterData)[q] ?? 0), 0);
                return (
                    <td
                        key={`pap-total-${sm.key}-${q}`}
                        className={`px-3 py-2 text-right font-black font-mono text-[11px] border-r border-green-700/30 ${sm.text} ${q === 'total' ? 'bg-white/10' : ''} ${val < 0 ? 'text-rose-400' : ''}`}
                    >
                        {formatAmount(val)}
                    </td>
                );
            })
        )}
    </tr>
);

// ─── Data Row ─────────────────────────────────────────────────────────────────
const DataRow: React.FC<{
    row: NTCARow;
    isEven: boolean;
    visibleSections: typeof SECTION_META;
    visibleQuarters: QuarterKey[];
}> = ({ row, isEven, visibleSections, visibleQuarters }) => (
    <tr className={`group transition-all duration-200 ${isEven ? 'bg-green-950/20' : 'bg-transparent'} hover:bg-green-500/10`}>
        {/* PAP — sticky */}
        <td className={`sticky left-0 z-10 ${isEven ? 'bg-[#1E3A5F1F]' : 'bg-[#1E3A5F14]'} group-hover:bg-[#3B82F626] px-4 py-3 text-green-100 font-medium border-b border-r border-green-700/20 min-w-[260px] leading-snug text-[11px] shadow-[2px_0_5px_rgba(0,0,0,0.2)]`}>
            {row.pap}
        </td>
        <td className="px-3 py-3 text-green-400/60 border-b border-r border-green-700/20 font-mono whitespace-nowrap text-[10px]">
            {row.papCode}
        </td>
        <td className="px-3 py-3 text-center border-b border-r border-green-700/20">
            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-green-950/50 border border-green-700/40 text-green-400 font-bold text-[9px] uppercase">
                {row.classType}
            </span>
        </td>
        <td className="px-3 py-3 text-green-400/60 text-center border-b border-r border-green-700/20 font-mono whitespace-nowrap text-[10px]">
            {row.saroNo}
        </td>

        {/* Section data cells */}
        {visibleSections.map((sm) =>
            visibleQuarters.map((q) => {
                const sectionData = row[sm.key] as QuarterData;
                const val = sectionData[q] ?? 0;
                const isTotal = q === 'total';
                return (
                    <td
                        key={`${sm.key}-${q}`}
                        className={`px-3 py-3 text-right border-b border-r font-mono text-[11px] transition-colors
              ${isTotal ? `font-bold ${sm.text} bg-white/5 border-green-700/40` : `${sm.text} border-green-700/10 group-hover:text-green-200`}
              ${val < 0 ? 'text-rose-400' : ''}`}
                    >
                        {formatAmount(val)}
                    </td>
                );
            })
        )}
    </tr>
);

// ─── Grand Total Row ──────────────────────────────────────────────────────────
const GrandTotalRow: React.FC<{
    rows: NTCARow[];
    visibleSections: typeof SECTION_META;
    visibleQuarters: QuarterKey[];
}> = ({ rows, visibleSections, visibleQuarters }) => {
    const dataRows = rows.filter((r) => !r.isHeader);

    const sumSection = (section: ActiveSection, q: QuarterKey) =>
        dataRows.reduce((acc, row) => {
            const sectionData = row[section] as QuarterData;
            return acc + (sectionData[q] ?? 0);
        }, 0);

    return (
        <tr className="bg-green-900/60 backdrop-blur-md">
            <td
                colSpan={4}
                className="sticky left-0 z-10 bg-green-900 text-green-200 font-black px-4 py-4 border-t-2 border-green-500/50 border-r border-green-700/40 uppercase tracking-[0.3em] text-[10px] shadow-[2px_0_10px_rgba(0,0,0,0.4)]"
            >
                Grand Total
            </td>

            {visibleSections.map((sm) =>
                visibleQuarters.map((q) => {
                    const val = sumSection(sm.key, q);
                    const isTotal = q === 'total';
                    return (
                        <td
                            key={`total-${sm.key}-${q}`}
                            className={`px-3 py-4 text-right border-t-2 border-green-500/50 border-r border-green-700/30 font-black font-mono text-[11px]
                ${isTotal ? 'text-white bg-green-500/20' : sm.text}
                ${val < 0 ? 'text-rose-400' : ''}`}
                        >
                            {formatAmount(val)}
                        </td>
                    );
                })
            )}
        </tr>
    );
};

// ─── Main NTCATable ───────────────────────────────────────────────────────────
const NTCATable: React.FC<NTCATableProps> = ({ rows, activeSection, activeQuarter }) => {
    const [showExport, setShowExport] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        setExpandedGroups({});
        setExpandedSections({});
    }, [rows, searchTerm]);

    const visibleSections =
        activeSection === 'all' ? SECTION_META : SECTION_META.filter((s) => s.key === activeSection);

    const visibleQuarters: QuarterKey[] =
        activeQuarter === 'all' ? ['q1', 'q2', 'q3', 'q4', 'total'] : [activeQuarter as unknown as QuarterKey];

    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch = (row: NTCARow): boolean => {
        if (!normalizedSearch) return true;

        const baseValues = [row.pap, row.papCode, row.classType, row.saroNo]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

        const quarterValues = SECTION_META.flatMap((section) => {
            const data = row[section.key] as QuarterData;
            if (!data) return [];
            return [data.q1, data.q2, data.q3, data.q4, data.total]
                .filter((value) => value !== undefined && value !== null)
                .map((value) => String(value).toLowerCase());
        });

        return [...baseValues, ...quarterValues].some((value) => value.includes(normalizedSearch));
    };

    const filteredTableRows = useMemo(() => {
        if (!normalizedSearch) return rows;

        const result: NTCARow[] = [];
        let currentHeader: NTCARow | null = null;
        let sectionRows: NTCARow[] = [];

        const flushSection = () => {
            if (!currentHeader) return;

            const headerMatches = currentHeader.pap.toLowerCase().includes(normalizedSearch);
            const matchedRows = headerMatches ? sectionRows : sectionRows.filter(matchesSearch);

            if (matchedRows.length > 0) {
                result.push(currentHeader, ...matchedRows);
            }
        };

        for (const row of rows) {
            if (row.isHeader) {
                flushSection();
                currentHeader = row;
                sectionRows = [];
                continue;
            }

            sectionRows.push(row);
        }

        flushSection();
        return result;
    }, [rows, normalizedSearch]);

    const totalCols = 4 + visibleSections.length * visibleQuarters.length;

    // Group consecutive data rows by pap (handled below with papGroups)
    let groupCounter = 0;

    // For each PAP header, collect its data rows for totals
    const papGroups: Array<{
        id: string;
        groupKey: string;
        sectionId: string;
        rows: NTCARow[];
        header: NTCARow;
        dataRows: NTCARow[];
    }> = [];
    let lastHeader: NTCARow | null = null;
    let lastHeaderId = '';
    let dataRowsForHeader: NTCARow[] = [];
    groupCounter = 0;
    for (const row of filteredTableRows) {
        if (row.isHeader) {
            if (lastHeader) {
                papGroups.push({
                    id: lastHeaderId,
                    groupKey: `header-${lastHeader.pap}`,
                    sectionId: lastHeaderId,
                    rows: [lastHeader],
                    header: lastHeader,
                    dataRows: dataRowsForHeader,
                });
            }
            lastHeader = row;
            lastHeaderId = `header-${row.id}-${groupCounter++}`;
            dataRowsForHeader = [];
        } else {
            dataRowsForHeader.push(row);
        }
    }
    if (lastHeader) {
        papGroups.push({
            id: lastHeaderId,
            groupKey: `header-${lastHeader.pap}`,
            sectionId: lastHeaderId,
            rows: [lastHeader],
            header: lastHeader,
            dataRows: dataRowsForHeader,
        });
    }

    // Now, build groupedRows for rendering (header, then group for each data row group)
    const groupedRows: Array<{ id: string; groupKey: string; sectionId: string; rows: NTCARow[]; header?: NTCARow; dataRows?: NTCARow[] }> = [];
    for (const group of papGroups) {
        groupedRows.push({ ...group });
        // ...existing code for data row grouping...
        let currentGroup: { id: string; groupKey: string; sectionId: string; rows: NTCARow[] } | null = null;
        for (const row of group.dataRows) {
            const papKey = row.pap || row.papCode || row.id;
            if (!currentGroup || currentGroup.groupKey !== papKey) {
                if (currentGroup) groupedRows.push(currentGroup);
                currentGroup = { id: `group-${group.id}-${papKey}`, groupKey: papKey, sectionId: group.id, rows: [row] };
            } else {
                currentGroup.rows.push(row);
            }
        }
        if (currentGroup) groupedRows.push(currentGroup);
    }

    const hasVisibleData = filteredTableRows.some((row) => !row.isHeader);

    let dataRowIndex = 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Table Controls (Export) */}
            <div className="grid grid-cols-4 md:grid-cols-[minmax(0,2fr)_auto] items-center gap-3">
                <div className="w-full col-span-3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search PAP, code, class, SARO, amount..."
                        className="w-full rounded-xl border border-green-700/40 bg-green-950/40 text-green-100 placeholder:text-green-400/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    />
                </div>
                <div className="relative md:justify-self-end">
                    <button
                        onClick={() => setShowExport(!showExport)}
                        className="group flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-[0_4px_14px_rgba(59,130,246,0.4)] transition-all duration-300 transform active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-bold tracking-wide">Export Business Report</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showExport ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Export Dropdown */}
                    {showExport && (
                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-green-950 border border-green-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl z-[100] overflow-hidden p-2 animate-in fade-in zoom-in duration-200">
                            <p className="px-3 py-2 text-[10px] uppercase font-bold text-green-500/60 tracking-widest border-b border-green-800/50 mb-1">Select Format</p>

                            <button
                                onClick={() => { exportPDF(rows, visibleSections, visibleQuarters as any); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-900/40 text-green-100 hover:text-green-300 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20 group-hover:text-red-300 transition-all">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold">PDF Document</p>
                                    <p className="text-[10px] text-green-500/40">Premium layout for printing</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { exportExcel(rows, visibleSections, visibleQuarters as any); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-900/40 text-green-100 hover:text-green-300 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-all">
                                    <FileSpreadsheet className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold">Excel Workbook</p>
                                    <p className="text-[10px] text-green-500/40">Editable .xlsx spreadsheet</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { exportCSV(rows, visibleSections, visibleQuarters as any); setShowExport(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-900/40 text-green-100 hover:text-green-300 transition-all group"
                            >
                                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-sky-300 transition-all">
                                    <FileCode className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold">CSV Flat File</p>
                                    <p className="text-[10px] text-green-500/40">Raw data for analysis</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-green-700/30 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.8)] bg-black/40 backdrop-blur-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <TableHead visibleSections={visibleSections} visibleQuarters={visibleQuarters} />
                        <tbody>
                            {!hasVisibleData ? (
                                <tr>
                                    <td colSpan={totalCols} className="px-4 py-8 text-center text-green-300/80 text-sm">
                                        No matching records found.
                                    </td>
                                </tr>
                            ) : groupedRows.map((group: any) => {
                                // Section header rows
                                if (group.groupKey.startsWith('header-')) {
                                    const row = group.header;
                                    const isSectionExpanded = expandedSections[group.id] ?? false;
                                    // Calculate totals for this PAP respecting active quarter
                                    const sumQ = (data: QuarterData | undefined): number => {
                                        if (!data) return 0;
                                        if (activeQuarter === 'all') return (data.q1 ?? 0) + (data.q2 ?? 0) + (data.q3 ?? 0) + (data.q4 ?? 0);
                                        return data[activeQuarter as keyof QuarterData] ?? 0;
                                    };
                                    const ntcaTotal = group.dataRows.reduce((sum: number, r: NTCARow) => sum + sumQ(r.ntcaReceived), 0);
                                    const disbTotal = group.dataRows.reduce((sum: number, r: NTCARow) => sum + sumQ(r.disbursements), 0);
                                    const balanceTotal = group.dataRows.reduce((sum: number, r: NTCARow) => sum + sumQ(r.ntcaBalance), 0);
                                    void ntcaTotal; void disbTotal; void balanceTotal;
                                    return (
                                        <React.Fragment key={group.id}>
                                            <SectionHeaderRow
                                                label={row.pap}
                                                colSpan={totalCols}
                                                isExpanded={isSectionExpanded}
                                                onToggle={() =>
                                                    setExpandedSections((prev) => ({
                                                        ...prev,
                                                        [group.id]: !(prev[group.id] ?? false),
                                                    }))
                                                }
                                            />
                                            <PAPTotalRow
                                                dataRows={group.dataRows}
                                                visibleSections={visibleSections}
                                                visibleQuarters={visibleQuarters}
                                            />
                                        </React.Fragment>
                                    );
                                }

                                if (!(expandedSections[group.sectionId] ?? false)) {
                                    return null;
                                }

                                // Accordion group
                                const groupKey = group.id;
                                const isExpanded = expandedGroups[groupKey];
                                const firstRow = group.rows[0];
                                const isEven = dataRowIndex % 2 === 0;
                                dataRowIndex++;
                                return (
                                    <React.Fragment key={group.id}>
                                        <tr
                                            className="cursor-pointer group transition-all duration-200 hover:bg-green-900/30"
                                            onClick={() => setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                        >
                                            <td colSpan={totalCols} className="p-0 border-0">
                                                <div className="flex items-center">
                                                    <button
                                                        className={`flex items-center px-2 py-2 focus:outline-none transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                        aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronDown className="w-4 h-4 text-green-400" />
                                                    </button>
                                                    <span className="ml-2 text-green-300 font-semibold text-sm">
                                                        {firstRow.pap || firstRow.papCode}
                                                    </span>
                                                    <span className="ml-4 text-xs text-neutral-400">{group.rows.length} record{group.rows.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Show no rows if collapsed, all rows if expanded */}
                                        {(isExpanded ? group.rows : []).map((row: any) => (
                                            <DataRow
                                                key={row.id}
                                                row={row}
                                                isEven={isEven}
                                                visibleSections={visibleSections}
                                                visibleQuarters={visibleQuarters}
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                            {hasVisibleData && (
                                <GrandTotalRow rows={filteredTableRows} visibleSections={visibleSections} visibleQuarters={visibleQuarters} />
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Backdrop for closing export dropdown */}
            {showExport && <div className="fixed inset-0 z-[90]" onClick={() => setShowExport(false)} />}
        </div>
    );
};

export default NTCATable;


