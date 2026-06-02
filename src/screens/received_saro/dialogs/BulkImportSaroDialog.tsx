import { useRef, useState } from 'react'
import { useDragScroll } from '@/hooks/useDragScroll'
import { X, CheckCircle2, AlertCircle, Loader2, Trash2, UploadCloud, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
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
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2 }
            else if (ch === '"') { inQuote = false; i++ }
            else { field += ch; i++ }
        } else {
            if (ch === '"') { inQuote = true; i++ }
            else if (ch === '\t') { row.push(field); field = ''; i++ }
            else if (ch === '\r' && text[i + 1] === '\n') {
                row.push(field); field = ''
                if (row.some(f => f.trim())) rows.push(row)
                row = []; i += 2
            } else if (ch === '\n') {
                row.push(field); field = ''
                if (row.some(f => f.trim())) rows.push(row)
                row = []; i++
            } else { field += ch; i++ }
        }
    }
    if (field || row.length > 0) { row.push(field); if (row.some(f => f.trim())) rows.push(row) }
    return rows
}

const stripNum = (v: string) => {
    const s = v.replace(/,/g, '').trim()
    return (s && s !== '-') ? s : '0'
}

// ─── Header-aware column mapper ───────────────────────────────────────────────

type HeaderMap = Partial<Record<RowField, number>>

/**
 * Rules for all fields EXCEPT `amount` (handled separately due to ambiguity
 * when a sheet has both "Amount" [SARO total] and "AMOUNT" [line-item] columns).
 */
const HEADER_RULES: [Exclude<RowField, 'amount'>, (c: string) => boolean][] = [
    ['date_recd_in_email', c => (c.includes('recd') || c.includes('received')) && (c.includes('email') || c.includes('date'))],
    ['date_of_saro', c => c.includes('date') && c.includes('saro')],
    ['allotment_no', c => c.includes('allotment')],
    // "CLASS" (no "type") → saro_class; "CLASS TYPE" → class_type
    ['saro_class', c => c.includes('class') && !c.includes('type') && !c.includes('item')],
    ['notes_validity', c => c.includes('notes') || c.includes('validity')],
    // "Total Amount" explicit; plain "Amount" before pap_code is handled in detectHeaderMap
    ['total_amount', c => c.includes('total') && c.includes('amount')],
    // Only "PAP CODE", not "PAP NAME" (PAP NAME → description below)
    ['pap_code', c => c.includes('pap') && c.includes('code')],
    // "Description" or "PAP NAME"
    ['description', c => (c.includes('descri') && !c.includes('obj')) || (c.includes('pap') && c.includes('name'))],
    ['class_type', c => c.includes('class') && c.includes('type')],
    ['fund_type', c => c.includes('fund')],
    ['object_code_no', c => c.includes('obj') && !c.includes('desc') && (c.includes('no') || c.includes('num') || c.includes('code'))],
    ['object_code_desc', c => c.includes('obj') && c.includes('desc')],
    ['nca_amount', c => c.includes('nca') && c.includes('amount')],
    // "NCA DATE" or standalone "DATE" column (common in SARO sheets)
    ['nca_date', c => (c.includes('nca') && c.includes('date')) || c === 'date'],
    ['nta_no', c => c.includes('nta')],
    ['purpose', c => c.includes('purpose')],
]

function detectHeaderMap(cells: string[], offset: number): HeaderMap | null {
    const slice = cells.slice(offset)
    const map: HeaderMap = {}

    // Phase 1 — map all non-amount fields
    for (const [field, test] of HEADER_RULES) {
        const idx = slice.findIndex(c => test(c))
        if (idx !== -1) map[field] = idx
    }

    // Phase 2 — smart amount detection
    // Collect columns that contain "amount" but are NOT already claimed by nca_amount / total_amount
    const claimed = new Set([map['nca_amount'], map['total_amount']].filter((v): v is number => v !== undefined))
    const amtCandidates = slice
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => c.includes('amount') && !claimed.has(i))

    if (amtCandidates.length === 1) {
        map['amount'] = amtCandidates[0].i
    } else if (amtCandidates.length >= 2) {
        // A column BEFORE pap_code / description is the SARO-level total
        const anchorLeft = Math.min(map['pap_code'] ?? Infinity, map['description'] ?? Infinity)
        // A column AFTER object codes is the line-item amount
        const anchorRight = Math.max(map['object_code_desc'] ?? -1, map['object_code_no'] ?? -1)

        const beforePap = amtCandidates.find(({ i }) => i < anchorLeft)
        const afterObj = amtCandidates.find(({ i }) => i > anchorRight)

        if (beforePap && !map['total_amount']) map['total_amount'] = beforePap.i
        if (afterObj) map['amount'] = afterObj.i
        else if (!beforePap) map['amount'] = amtCandidates[0].i
    }

    // Need allotment_no + at least 3 other fields to be confident
    return (map['allotment_no'] !== undefined && Object.keys(map).length >= 4) ? map : null
}

/** Convert raw 2D string grid into typed BulkRow objects.
 *  Tries header-based column detection first; falls back to positional mapping. */
function buildBulkRows(allRows: string[][]): BulkRow[] {
    // ── Step 1: detect leading non-data columns (REGION, row-number, etc.) ────
    let offset = 0
    for (const cols of allRows) {
        const c0 = (cols[0] ?? '').toString().trim().toLowerCase()
        if (!c0) continue
        // "REGION" prefix sheet
        if (c0 === 'region') { offset = 1; break }
        // Row-number first column: "#", "No.", or a plain integer
        if (c0 === '#' || c0 === 'no.' || /^\d+$/.test(c0)) { offset = 1; break }
        break
    }

    // ── Step 2: scan first 6 rows for a recognisable header row ──────────────
    let headerMap: HeaderMap | null = null
    let headerRowIdx = -1
    for (let ri = 0; ri < Math.min(6, allRows.length); ri++) {
        const cells = allRows[ri].map(c => c.toString().trim().toLowerCase())
        const map = detectHeaderMap(cells, offset)
        if (map) { headerMap = map; headerRowIdx = ri; break }
    }

    // ── Step 3: build rows ────────────────────────────────────────────────────
    const result: BulkRow[] = []
    for (let ri = 0; ri < allRows.length; ri++) {
        if (ri === headerRowIdx) continue // skip header row itself
        const cols = allRows[ri]

        if (headerMap) {
            // Header-mapped mode: column order doesn't matter
            const get = (field: RowField) => {
                const idx = headerMap![field]
                return idx !== undefined ? (cols[offset + idx] ?? '').toString().trim() : ''
            }
            const allotmentNo = get('allotment_no')
            if (!allotmentNo) continue
            // Skip rows that look like labels (region name, extra header, etc.)
            const c0 = (cols[0] ?? '').toString().trim().toLowerCase()
            if (!c0 || c0 === 'region' || c0.includes('date recd')) continue

            result.push({
                date_recd_in_email: parseDate(get('date_recd_in_email')),
                date_of_saro: parseDate(get('date_of_saro')),
                allotment_no: allotmentNo,
                saro_class: get('saro_class'),
                notes_validity: get('notes_validity'),
                total_amount: get('total_amount'),
                pap_code: get('pap_code'),
                description: get('description'),
                class_type: get('class_type'),
                fund_type: get('fund_type'),
                object_code_no: get('object_code_no'),
                object_code_desc: get('object_code_desc'),
                amount: get('amount'),
                purpose: get('purpose'),
                nca_amount: get('nca_amount'),
                nca_date: parseDate(get('nca_date')),
                nta_no: get('nta_no'),
                status: 'pending',
            })
        } else {
            // Positional fallback (original mapping)
            const g = (i: number) => (cols[offset + i] ?? '').toString().trim()
            const c0 = g(0).toLowerCase()
            if (!c0 || c0.includes('date recd') || c0 === 'date_recd_in_email' || c0 === 'region') continue
            if (!g(2)) continue // no allotment_no at expected position → skip
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
    }
    return result
}

const rowInp = 'w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

const ACCEPTED = '.xlsx,.xls,.csv,.tsv,.txt'

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportSaroDialog({ paps, onClose, onDone }: Props) {
    const dragScroll = useDragScroll<HTMLDivElement>()
    const [rawText, setRawText] = useState('')
    const [rows, setRows] = useState<BulkRow[]>([])
    const [parsed, setParsed] = useState(false)
    const [importing, setImporting] = useState(false)
    const [done, setDone] = useState(false)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [droppedFile, setDroppedFile] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragCounter = useRef(0)

    // ── File parsing ──────────────────────────────────────────────────────────

    const loadRows = (bulkRows: BulkRow[]) => {
        setRows(bulkRows)
        setParsed(true)
        setFileError(null)
    }

    const parseTextRows = () => loadRows(buildBulkRows(parseTSV(rawText)))

    const handleFile = async (file: File) => {
        setFileError(null)
        const name = file.name.toLowerCase()
        try {
            if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
                const buf = await file.arrayBuffer()
                const wb = XLSX.read(buf, { type: 'array', cellDates: true, cellText: false })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const grid = XLSX.utils.sheet_to_json<string[]>(ws, {
                    header: 1,
                    raw: false,
                    dateNF: 'mm/dd/yyyy',
                    defval: '',
                })
                setDroppedFile(file.name)
                loadRows(buildBulkRows(grid as string[][]))
            } else {
                // CSV / TSV / TXT — read as plain text
                const text = await file.text()
                const delimiter = name.endsWith('.csv') ? ',' : '\t'
                let grid: string[][]
                if (delimiter === ',') {
                    // Simple CSV split (handles basic cases)
                    grid = text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(',').map(f => f.replace(/^"|"$/g, '').trim()))
                } else {
                    grid = parseTSV(text)
                }
                setDroppedFile(file.name)
                loadRows(buildBulkRows(grid))
            }
        } catch {
            setFileError(`Could not read "${file.name}". Make sure it is a valid Excel or text file.`)
        }
    }

    // ── Drag & Drop handlers ──────────────────────────────────────────────────

    const onDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current++
        setIsDragging(true)
    }
    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current === 0) setIsDragging(false)
    }
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current = 0
        setIsDragging(false)
        // Try files first (OS file manager drag)
        let file: File | null = e.dataTransfer.files?.[0] ?? null
        // Fallback to items API (browser download panel, some other sources)
        if (!file) {
            const item = Array.from(e.dataTransfer.items ?? []).find(it => it.kind === 'file')
            file = item?.getAsFile() ?? null
        }
        if (file) {
            handleFile(file)
        } else {
            setFileError('No file detected. Drag from Windows File Explorer instead of the browser download panel, or use the "click to browse" button.')
        }
    }

    // ── Import ────────────────────────────────────────────────────────────────

    const updateRow = (idx: number, field: RowField, val: string) =>
        setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val, status: 'pending', error: undefined } : r))

    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]
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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

            {/* Import progress overlay */}
            {importing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl px-10 py-10 flex flex-col items-center gap-6 shadow-2xl max-w-sm w-full">
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
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-2 bg-primary rounded-full transition-all duration-400" style={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }} />
                        </div>
                        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition">
                            Cancel &amp; close
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl">

                {/* Title */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">Bulk Import Received SARO</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Upload a spreadsheet or paste tab-separated rows</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex flex-col gap-4 px-6 py-5">
                    {!parsed ? (
                        /* ── Step 1: Upload or Paste ── */
                        <div className="flex flex-col gap-4">

                            {/* Drag & Drop zone */}
                            <div
                                className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-12 px-6 text-center cursor-pointer transition-all duration-200 select-none ${isDragging
                                    ? 'border-primary bg-primary/8 scale-[1.01]'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/20'
                                    }`}
                                onDragEnter={onDragEnter}
                                onDragLeave={onDragLeave}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED}
                                    className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
                                />

                                {isDragging ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UploadCloud size={28} className="text-primary animate-bounce" />
                                        </div>
                                        <p className="font-gbold text-primary text-base">Drop to import</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                            <UploadCloud size={28} className="text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-gbold text-foreground text-sm">Drag & drop your spreadsheet here</p>
                                            <p className="text-xs text-muted-foreground mt-1">or <span className="text-primary underline underline-offset-2">click to browse</span></p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-center">
                                            {['.xlsx', '.xls', '.csv', '.tsv'].map(ext => (
                                                <span key={ext} className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                                                    <FileSpreadsheet size={10} />
                                                    {ext}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {fileError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    {fileError}
                                </div>
                            )}

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">or paste directly from Excel / Google Sheets</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Column order hint */}
                            <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Column order:</strong>{' '}
                                <em>Date Recd in Email, Date of SARO, Allotment No., Class (SARO), Notes/Validity, Total Amount, PAP Code, Description, Class Type, Fund Type, Obj. Code No., Obj. Code Desc, Amount, Purpose, NCA Amount, NCA Date, NTA No.</em>
                                <br className="mt-1" />
                                Rows with the same <strong className="text-foreground">Allotment No.</strong> are grouped into one SARO. A leading <strong className="text-foreground">REGION</strong> column is detected and skipped automatically. Header rows are ignored.
                            </div>

                            <textarea
                                rows={8}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                placeholder={`01/07/2026\t01/05/2026\t2026-01-0031\tMOOE\tValid until Dec 31, 2027\t13105512.00\t200000100002000\tInternal Systems…\t2 MOOE\tCURRENT\t5021199000\tOther Prof Services\t553147.20\tPurpose…\t46095.60\t\tNTA2601011`}
                                className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                    Cancel
                                </button>
                                <button type="button" disabled={!rawText.trim()} onClick={parseTextRows}
                                    className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 font-gmedium">
                                    Preview ({rawText.trim().split('\n').filter(l => l.trim()).length} rows)
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Step 2: Preview & Import ── */
                        <div className="flex flex-col gap-4">
                            {/* File name pill */}
                            {droppedFile && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                                    <FileSpreadsheet size={13} className="text-primary shrink-0" />
                                    <span className="truncate">{droppedFile}</span>
                                    <span className="ml-auto shrink-0 text-muted-foreground/60">{rows.length} rows · {saroCount} SAROs detected</span>
                                </div>
                            )}

                            {done && (
                                <div className="flex gap-4 text-sm bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
                                    <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 size={14} /> {successCount} rows saved</span>
                                    {errorCount > 0 && <span className="flex items-center gap-1.5 text-destructive"><AlertCircle size={14} /> {errorCount} failed</span>}
                                    {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
                                </div>
                            )}

                            {rows.length === 0 && (
                                <div className="flex flex-col items-center gap-2 py-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
                                    <AlertCircle size={22} className="text-amber-500" />
                                    <p className="text-sm font-gmedium text-foreground">No data rows detected</p>
                                    <p className="text-xs text-muted-foreground max-w-sm">
                                        Make sure your data has an <strong>Allotment No.</strong> column and at least 4 labelled header columns.<br />
                                        If your sheet has a different column order, include a header row so the importer can map fields automatically.
                                    </p>
                                    <button type="button" onClick={() => { setParsed(false); setDroppedFile(null) }}
                                        className="mt-1 px-4 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition">
                                        ← Go back and try again
                                    </button>
                                </div>
                            )}

                            {rows.length > 0 && (
                                <div ref={dragScroll.ref} onMouseDown={dragScroll.onMouseDown} onMouseMove={dragScroll.onMouseMove} onMouseUp={dragScroll.onMouseUp} onMouseLeave={dragScroll.onMouseLeave} className="overflow-x-auto rounded-lg border border-border cursor-grab">
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
                                                        {row.status === 'pending' && <span className="text-muted-foreground">Pending</span>}
                                                        {row.status === 'success' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> Saved</span>}
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
                            )}

                            <div className="flex items-center justify-between pt-1 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                    {rows.length} row{rows.length !== 1 ? 's' : ''} &middot; {saroCount} SARO record{saroCount !== 1 ? 's' : ''}
                                </span>
                                <div className="flex gap-2">
                                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
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
