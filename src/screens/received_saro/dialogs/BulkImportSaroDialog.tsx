import { useState } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/axios'
import type { PAPCode, FundType, ClassType, ObjectDescription } from '../ReceivedSaroMainContainer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow {
    date_recd_in_email: string
    date_of_saro: string
    allotment_no: string
    saro_class: string
    notes_validity: string
    total_amount: string
    pap_code: string
    description: string
    class_type: string
    fund_type: string
    object_code_no: string
    object_code_desc: string
    amount: string
    purpose: string
    nca_amount: string
    nca_date: string
    nta_no: string
    status: 'pending' | 'success' | 'error'
    error?: string
}

type RowField = keyof Omit<BulkRow, 'status' | 'error'>

interface Props {
    paps: PAPCode[]
    fundTypes: FundType[]
    classTypes: ClassType[]
    objectDescriptions: ObjectDescription[]
    onClose: () => void
    onDone: () => void
}

// ─── Column metadata ──────────────────────────────────────────────────────────

const COLS: { key: RowField; label: string; width: string }[] = [
    { key: 'date_recd_in_email', label: 'Date Recd (Email)', width: 'min-w-[120px]' },
    { key: 'date_of_saro', label: 'Date of SARO', width: 'min-w-[110px]' },
    { key: 'allotment_no', label: 'Allotment No.', width: 'min-w-[140px]' },
    { key: 'saro_class', label: 'Class (SARO)', width: 'min-w-[80px]' },
    { key: 'notes_validity', label: 'Notes/Validity', width: 'min-w-[140px]' },
    { key: 'total_amount', label: 'Total Amount', width: 'min-w-[110px]' },
    { key: 'pap_code', label: 'PAP Code', width: 'min-w-[150px]' },
    { key: 'description', label: 'Description', width: 'min-w-[180px]' },
    { key: 'class_type', label: 'Class Type', width: 'min-w-[90px]' },
    { key: 'fund_type', label: 'Fund Type', width: 'min-w-[120px]' },
    { key: 'object_code_no', label: 'Obj. Code No.', width: 'min-w-[120px]' },
    { key: 'object_code_desc', label: 'Obj. Code Desc', width: 'min-w-[160px]' },
    { key: 'amount', label: 'Amount', width: 'min-w-[100px]' },
    { key: 'purpose', label: 'Purpose', width: 'min-w-[180px]' },
    { key: 'nca_amount', label: 'NCA Amount', width: 'min-w-[100px]' },
    { key: 'nca_date', label: 'NCA Date', width: 'min-w-[100px]' },
    { key: 'nta_no', label: 'NTA No.', width: 'min-w-[110px]' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(val: string): string {
    const s = val.trim()
    if (!s) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
    return s
}

/**
 * Proper TSV parser that handles quoted fields containing embedded newlines/tabs.
 * Excel wraps cells that contain newlines in double-quotes when copying to clipboard.
 */
function parseTSV(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuote = false
    let i = 0

    while (i < text.length) {
        const ch = text[i]
        if (inQuote) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"'; i += 2          // escaped ""
            } else if (ch === '"') {
                inQuote = false; i++           // closing quote
            } else {
                field += ch; i++
            }
        } else {
            if (ch === '"') {
                inQuote = true; i++
            } else if (ch === '\t') {
                row.push(field); field = ''; i++
            } else if (ch === '\r' && text[i + 1] === '\n') {
                row.push(field); field = ''
                if (row.some(f => f.trim())) rows.push(row)
                row = []; i += 2
            } else if (ch === '\n') {
                row.push(field); field = ''
                if (row.some(f => f.trim())) rows.push(row)
                row = []; i++
            } else {
                field += ch; i++
            }
        }
    }
    // flush last field/row
    if (field || row.length > 0) {
        row.push(field)
        if (row.some(f => f.trim())) rows.push(row)
    }
    return rows
}

// Strip thousand-separators and handle Excel dash-zeros (e.g. " -  ", "-")
const stripNum = (v: string) => {
    const s = v.replace(/,/g, '').trim()
    return (s && s !== '-') ? s : '0'
}

const rowInp = 'w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportSaroDialog({ paps, onClose, onDone }: Props) {
    const [rawText, setRawText] = useState('')
    const [rows, setRows] = useState<BulkRow[]>([])
    const [parsed, setParsed] = useState(false)
    const [importing, setImporting] = useState(false)
    const [done, setDone] = useState(false)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

    const parseRows = () => {
        const allRows = parseTSV(rawText)
        const result: BulkRow[] = []
        for (const cols of allRows) {
            const g = (i: number) => (cols[i] ?? '').trim()
            const first = g(0).toLowerCase()
            // Skip header rows
            if (first === 'date recd in email' || first === 'date_recd_in_email' || first === 'date recd') continue
            result.push({
                date_recd_in_email: parseDate(g(0)),
                date_of_saro: parseDate(g(1)),
                allotment_no: g(2),
                saro_class: g(3),
                notes_validity: g(4),
                total_amount: g(5),
                pap_code: g(6),
                description: g(7),
                class_type: g(8),
                fund_type: g(9),
                object_code_no: g(10),
                object_code_desc: g(11),
                amount: g(12),
                purpose: g(13),
                nca_amount: g(14),
                nca_date: parseDate(g(15)),
                nta_no: g(16),
                status: 'pending',
            })
        }
        setRows(result)
        setParsed(true)
    }

    const updateRow = (idx: number, field: RowField, val: string) =>
        setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val, status: 'pending', error: undefined } : r))

    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]

        // Group indices by allotment_no, preserving first-occurrence order
        const groups = new Map<string, number[]>()
        updated.forEach((row, i) => {
            if (!groups.has(row.allotment_no)) groups.set(row.allotment_no, [])
            groups.get(row.allotment_no)!.push(i)
        })

        const groupEntries = [...groups.entries()]
        setImportProgress({ current: 0, total: groupEntries.length })

        for (let gi = 0; gi < groupEntries.length; gi++) {
            const [allotmentNo, indices] = groupEntries[gi]
            setImportProgress({ current: gi + 1, total: groupEntries.length })
            const first = updated[indices[0]]
            try {
                const payload = {
                    date_recd_in_email: first.date_recd_in_email,
                    date_of_saro: first.date_of_saro,
                    allotment_no: allotmentNo,
                    class_type: first.saro_class,
                    notes_validity: first.notes_validity,
                    total_amount: stripNum(first.total_amount),
                    items: indices.map(i => {
                        const r = updated[i]
                        const pap = paps.find(p => p.pap_code === r.pap_code)
                        return {
                            pap: pap?.id ?? null,
                            description: r.description,
                            class_type: r.class_type,
                            fund_type: r.fund_type,
                            object_code_no: r.object_code_no,
                            object_code_desc: r.object_code_desc,
                            amount: stripNum(r.amount),
                            purpose: r.purpose,
                            nca_amount: stripNum(r.nca_amount),
                            nca_date: r.nca_date || null,
                            nta_no: r.nta_no,
                        }
                    }),
                }
                await efasApi.post('received-saro/', payload)
                indices.forEach(i => { updated[i] = { ...updated[i], status: 'success', error: undefined } })
            } catch (err: unknown) {
                const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
                const msg =
                    (data?.allotment_no as string[])?.[0] ??
                    (data?.non_field_errors as string[])?.[0] ??
                    (typeof data?.detail === 'string' ? data.detail : null) ??
                    'Failed'
                indices.forEach(i => { updated[i] = { ...updated[i], status: 'error', error: msg } })
            }
            setRows([...updated])
        }

        setImporting(false)
        setDone(true)
        onDone()
        setTimeout(onClose, 1200)
    }

    const successCount = rows.filter(r => r.status === 'success').length
    const errorCount = rows.filter(r => r.status === 'error').length
    const pendingCount = rows.filter(r => r.status === 'pending').length
    const saroCount = new Set(rows.map(r => r.allotment_no).filter(Boolean)).size

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            {/* Money-themed loading overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl px-10 py-10 flex flex-col items-center gap-6 shadow-2xl max-w-sm w-full">
                        {/* Animated coin stack */}
                        <div className="relative flex items-center justify-center w-24 h-24">
                            <svg viewBox="0 0 96 96" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }}>
                                <circle cx="48" cy="48" r="44" fill="none" stroke="hsl(var(--primary)/0.15)" strokeWidth="6" />
                                <circle cx="48" cy="48" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                                    strokeDasharray="276" strokeDashoffset={276 - (276 * importProgress.current / Math.max(importProgress.total, 1))}
                                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
                            </svg>
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-3xl">&#x1F4B0;</span>
                            </div>
                        </div>
                        <div className="text-center flex flex-col gap-1">
                            <p className="font-gbold text-foreground text-lg">Importing SAROs…</p>
                            <p className="text-sm text-muted-foreground">
                                Processing <span className="font-gbold text-primary">{importProgress.current}</span> of <span className="font-gbold text-primary">{importProgress.total}</span> SARO record{importProgress.total !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Please wait. Do not close this window.</p>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="h-2 bg-primary rounded-full transition-all duration-400"
                                style={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }}
                            />
                        </div>
                        <button onClick={onClose}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition">
                            Cancel &amp; close
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-card border border-border rounded-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl">

                {/* Title */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">Bulk Import Received SARO</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex flex-col gap-4 px-6 py-5">
                    {!parsed ? (
                        /* ── Step 1: Paste ── */
                        <div className="flex flex-col gap-4">
                            <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">How to paste:</strong> Copy rows directly from the SARO spreadsheet (tab-separated, e.g. from Excel/Google Sheets).
                                Expected column order: <em>Date Recd in Email, Date of SARO, Allotment No., Class (SARO header), Notes/Validity, Total Amount, PAP Code, Description, Class Type, Fund Type, Obj. Code No., Obj. Code Desc, Amount, Purpose, NCA Amount, NCA Date, NTA No.</em><br className="mt-1" />
                                Rows with the <strong className="text-foreground">same Allotment No.</strong> are grouped into one SARO record automatically. The header row is skipped.
                            </div>
                            <textarea
                                autoFocus
                                rows={12}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                placeholder={`01/07/2026\t01/05/2026\t2026-01-0031\tMOOE\tValid until Dec 31, 2027\t13105512.00\t200000100002000\tInternal Systems…\t2 MOOE\tCURRENT\t5021199000\tOther Prof Services\t553147.20\tPurpose…\t46095.60\t\tNTA2601011`}
                                className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={onClose}
                                    className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                    Cancel
                                </button>
                                <button type="button" disabled={!rawText.trim()} onClick={parseRows}
                                    className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 font-gmedium">
                                    Preview ({rawText.trim().split('\n').filter(l => l.trim()).length} rows)
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Step 2: Preview & Import ── */
                        <div className="flex flex-col gap-4">
                            {done && (
                                <div className="flex gap-4 text-sm bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
                                    <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 size={14} /> {successCount} rows saved</span>
                                    {errorCount > 0 && <span className="flex items-center gap-1.5 text-destructive"><AlertCircle size={14} /> {errorCount} failed</span>}
                                    {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase sticky top-0">
                                            <th className="px-2 py-2 text-left w-6">#</th>
                                            {COLS.map(c => (
                                                <th key={c.key} className={`px-2 py-2 text-left whitespace-nowrap ${c.width}`}>{c.label}</th>
                                            ))}
                                            <th className="px-2 py-2 text-left min-w-[100px]">Status</th>
                                            <th className="px-2 py-2 w-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, idx) => (
                                            <tr key={idx} className={`border-b border-border last:border-0 ${row.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' :
                                                row.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''
                                                }`}>
                                                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                                                {COLS.map(c => (
                                                    <td key={c.key} className={`px-2 py-1 ${c.width}`}>
                                                        <input
                                                            value={row[c.key]}
                                                            onChange={e => updateRow(idx, c.key, e.target.value)}
                                                            disabled={row.status === 'success' || importing}
                                                            className={rowInp}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1 whitespace-nowrap">
                                                    {row.status === 'pending' && (
                                                        <span className="text-muted-foreground">Pending</span>
                                                    )}
                                                    {row.status === 'success' && (
                                                        <span className="flex items-center gap-1 text-green-600">
                                                            <CheckCircle2 size={12} /> Saved
                                                        </span>
                                                    )}
                                                    {row.status === 'error' && (
                                                        <span className="flex items-center gap-1 text-destructive" title={row.error}>
                                                            <AlertCircle size={12} /> {row.error?.slice(0, 24)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1">
                                                    {row.status !== 'success' && (
                                                        <button type="button" onClick={() => removeRow(idx)} disabled={importing}
                                                            className="text-muted-foreground hover:text-destructive transition disabled:opacity-40">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-1 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                    {rows.length} row{rows.length !== 1 ? 's' : ''} &middot; {saroCount} SARO record{saroCount !== 1 ? 's' : ''}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={onClose}
                                        className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                        {done ? 'Close' : 'Cancel'}
                                    </button>
                                    {pendingCount > 0 && (
                                        <button type="button" onClick={handleImport} disabled={importing || rows.length === 0}
                                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 font-gmedium">
                                            {importing && <Loader2 size={14} className="animate-spin" />}
                                            {importing ? 'Importing…' : `Import ${pendingCount} row${pendingCount !== 1 ? 's' : ''}`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
