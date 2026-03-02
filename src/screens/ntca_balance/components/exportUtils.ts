import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NTCARow, SectionMeta, QUARTER_LABELS } from './types';

// ─── Shared: build flat header arrays and data rows ──────────────────────────

const FIXED_HEADERS = ['PAP', 'PAP CODE', 'CLASS TYPE', 'SARO NO.'];

const buildHeaders = (visibleSections: SectionMeta[], visibleQuarters: string[]) => {
    const subHeaders: string[] = [];
    for (const sm of visibleSections) {
        for (const q of visibleQuarters) {
            subHeaders.push(`${sm.label} – ${QUARTER_LABELS[q] ?? q}`);
        }
    }
    return [...FIXED_HEADERS, ...subHeaders];
};

const buildDataRows = (
    rows: NTCARow[],
    visibleSections: SectionMeta[],
    visibleQuarters: string[]
): (string | number)[][] => {
    return rows.map((row) => {
        if (row.isHeader) {
            return [row.pap, '', '', '', ...visibleSections.flatMap(() => visibleQuarters.map(() => ''))];
        }
        const cells: (string | number)[] = [row.pap, row.papCode, row.classType, row.saroNo];
        for (const sm of visibleSections) {
            for (const q of visibleQuarters) {
                const val = (row[sm.key] as unknown as Record<string, number>)[q] ?? 0;
                cells.push(val);
            }
        }
        return cells;
    });
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
export const exportCSV = (
    rows: NTCARow[],
    visibleSections: SectionMeta[],
    visibleQuarters: string[]
) => {
    const headers = buildHeaders(visibleSections, visibleQuarters);
    const data = buildDataRows(rows, visibleSections, visibleQuarters);

    const csvContent = [headers, ...data]
        .map((row) =>
            row
                .map((cell) =>
                    typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : String(cell)
                )
                .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'NTCA_Balance_2026.csv');
};

// ─── Excel Export ─────────────────────────────────────────────────────────────
export const exportExcel = (
    rows: NTCARow[],
    visibleSections: SectionMeta[],
    visibleQuarters: string[]
) => {
    const headers = buildHeaders(visibleSections, visibleQuarters);
    const data = buildDataRows(rows, visibleSections, visibleQuarters);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Column widths
    ws['!cols'] = [
        { wch: 50 }, { wch: 22 }, { wch: 12 }, { wch: 16 },
        ...visibleSections.flatMap(() => visibleQuarters.map(() => ({ wch: 16 }))),
    ];

    XLSX.utils.book_append_sheet(wb, ws, '2026 NTCA Balance');
    XLSX.writeFile(wb, 'NTCA_Balance_2026.xlsx');
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
export const exportPDF = (
    rows: NTCARow[],
    visibleSections: SectionMeta[],
    visibleQuarters: string[]
) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    // Title
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('AFD-FM-MNT-001 — Monitoring of NTCA Balance (2026)', 14, 14);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);

    const headers = buildHeaders(visibleSections, visibleQuarters);
    const data = buildDataRows(rows, visibleSections, visibleQuarters).map((row) =>
        row.map((c) => String(c))
    );

    autoTable(doc, {
        startY: 25,
        head: [headers],
        body: data,
        styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 12 },
            3: { cellWidth: 18 },
        },
        didParseCell(data:any) {
            // Highlight section header rows
            if (
                data.row.index >= 0 &&
                data.section === 'body' &&
                data.row.raw[1] === '' &&
                data.row.raw[2] === ''
            ) {
                data.cell.styles.fillColor = [20, 83, 45];
                data.cell.styles.textColor = [134, 239, 172];
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    doc.save('NTCA_Balance_2026.pdf');
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
