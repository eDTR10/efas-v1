import { useRef, useState } from 'react'
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import efasApi from '@/plugin/axios'

interface BulkRow {
    month: string
    fund: string
    class_type: string
    pap_name: string
    saro_no: string
    realignment_ref: string
    account_code: string
    account_title: string
    transfer_to: string
    transfer_from: string
    status: 'pending' | 'success' | 'error'
    error?: string
}

interface Props {
    onClose: () => void
    onDone: () => void
}

const inp = 'w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

function parseDate(v: string) {
    const s = v.trim()
    // Accept YYYY-MM directly
    if (/^\d{4}-\d{2}$/.test(s)) return s
    // "Feb 2026" or "February 2026"
    const months: Record<string, string> = {
        jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
        jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
    }
    const m = s.match(/^([a-z]{3})[a-z]*[\s\-,]+(\d{4})$/i)
    if (m) {
        const mo = months[m[1].toLowerCase()]
        if (mo) return `${m[2]}-${mo}`
    }
    return s
}

function buildRows(grid: string[][]): BulkRow[] {
    const result: BulkRow[] = []
    for (const cols of grid) {
        const g = (i: number) => (cols[i] ?? '').toString().trim()
        const c0 = g(0).toLowerCase()
        // Skip header rows
        if (!c0 || c0 === 'month' || c0.includes('realign')) continue
        // Skip rows without a saro_no and realignment_ref
        if (!g(4) && !g(5)) continue
        result.push({
            month: parseDate(g(0)),
            fund: g(1),
            class_type: g(2),
            pap_name: g(3),
            saro_no: g(4),
            realignment_ref: g(5),
            account_code: g(6),
            account_title: g(7),
            transfer_to: g(8).replace(/,/g,''),
            transfer_from: g(9).replace(/,/g,''),
            status: 'pending',
        })
    }
    return result
}

function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = [], field = '', inQ = false, i = 0
    while (i < text.length) {
        const ch = text[i]
        if (inQ) {
            if (ch === '"' && text[i+1] === '"') { field += '"'; i += 2 }
            else if (ch === '"') { inQ = false; i++ }
            else { field += ch; i++ }
        } else {
            if (ch === '"') { inQ = true; i++ }
            else if (ch === ',') { row.push(field); field = ''; i++ }
            else if (ch === '\r' && text[i+1] === '\n') {
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

const COLS: { key: keyof Omit<BulkRow,'status'|'error'>; label: string; w: string }[] = [
    { key: 'month',           label: 'Month',         w: 'min-w-[90px]' },
    { key: 'fund',            label: 'Fund',          w: 'min-w-[90px]' },
    { key: 'class_type',      label: 'Class',         w: 'min-w-[70px]' },
    { key: 'pap_name',        label: 'PAP Name',      w: 'min-w-[140px]' },
    { key: 'saro_no',         label: 'SUBARO No.',    w: 'min-w-[130px]' },
    { key: 'realignment_ref', label: 'MAP Ref',       w: 'min-w-[120px]' },
    { key: 'account_code',    label: 'Account Code',  w: 'min-w-[110px]' },
    { key: 'account_title',   label: 'Account Title', w: 'min-w-[160px]' },
    { key: 'transfer_to',     label: 'Transfer To (+)', w: 'min-w-[110px]' },
    { key: 'transfer_from',   label: 'Transfer From (-)', w: 'min-w-[110px]' },
]

export default function BulkImportRealignmentDialog({ onClose, onDone }: Props) {
    const [rows, setRows] = useState<BulkRow[]>([])
    const [parsed, setParsed] = useState(false)
    const [importing, setImporting] = useState(false)
    const [done, setDone] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [fileError, setFileError] = useState<string | null>(null)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragCounter = useRef(0)

    const load = (grid: string[][]) => {
        const built = buildRows(grid)
        setRows(built)
        setParsed(true)
        setFileError(null)
    }

    const processFile = async (file: File) => {
        setFileError(null)
        const ext = file.name.split('.').pop()?.toLowerCase()
        try {
            if (ext === 'xlsx' || ext === 'xls') {
                const buf = await file.arrayBuffer()
                const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const grid: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
                load(grid)
            } else {
                const text = await file.text()
                load(parseCSV(text))
            }
        } catch {
            setFileError(`Could not read "${file.name}".`)
        }
    }

    const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true) }
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
    const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy' }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current = 0; setIsDragging(false)
        let file: File | null = e.dataTransfer.files?.[0] ?? null
        if (!file) { const it = Array.from(e.dataTransfer.items ?? []).find(i => i.kind === 'file'); file = it?.getAsFile() ?? null }
        if (file) processFile(file)
        else setFileError('No file detected. Drag from Windows File Explorer.')
    }

    const updateRow = (idx: number, key: keyof Omit<BulkRow,'status'|'error'>, val: string) =>
        setRows(p => p.map((r, i) => i === idx ? { ...r, [key]: val, status: 'pending', error: undefined } : r))
    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]
        setImportProgress({ current: 0, total: updated.length })
        for (let i = 0; i < updated.length; i++) {
            setImportProgress({ current: i + 1, total: updated.length })
            const r = updated[i]
            try {
                await efasApi.post('realignment/', {
                    month: r.month,
                    fund: r.fund,
                    class_type: r.class_type,
                    pap_name: r.pap_name,
                    saro_no: r.saro_no,
                    realignment_ref: r.realignment_ref,
                    account_code: r.account_code,
                    account_title: r.account_title,
                    transfer_to: r.transfer_to || '0',
                    transfer_from: r.transfer_from || '0',
                })
                updated[i] = { ...updated[i], status: 'success' }
            } catch (err: unknown) {
                const data = (err as { response?: { data?: Record<string,unknown> } })?.response?.data
                const msg = Object.values(data ?? {}).flat().join(' ') || 'Failed'
                updated[i] = { ...updated[i], status: 'error', error: String(msg) }
            }
            setRows([...updated])
        }
        setImporting(false)
        setDone(true)
        onDone()
    }

    const successCount = rows.filter(r => r.status === 'success').length
    const errorCount   = rows.filter(r => r.status === 'error').length
    const pendingCount = rows.filter(r => r.status === 'pending').length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl">

                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">Bulk Import Realignment</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Upload a CSV/Excel file. Columns: month, fund, class, pap_name, saro_no, map_ref, account_code, account_title, transfer_to, transfer_from
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-5">
                    {!parsed ? (
                        <div className="flex flex-col gap-3">
                            <div
                                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-12 px-6 text-center cursor-pointer transition-all select-none ${isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/20'}`}
                                onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
                                {isDragging ? (
                                    <><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <UploadCloud size={28} className="text-primary animate-bounce" />
                                    </div><p className="font-gbold text-primary">Drop to import</p></>
                                ) : (
                                    <><div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                        <UploadCloud size={28} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-gbold text-foreground text-sm">Drag & drop your CSV / Excel here</p>
                                        <p className="text-xs text-muted-foreground mt-1">or <span className="text-primary underline underline-offset-2">click to browse</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        {['.csv', '.xlsx', '.xls'].map(ext => (
                                            <span key={ext} className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                                                <FileSpreadsheet size={10} />{ext}
                                            </span>
                                        ))}
                                    </div></>
                                )}
                            </div>
                            {fileError && (
                                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                                    <AlertCircle size={14} className="shrink-0" />{fileError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">{rows.length} rows</span>
                                {successCount > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={13} />{successCount} saved</span>}
                                {errorCount > 0 && <span className="flex items-center gap-1 text-destructive"><AlertCircle size={13} />{errorCount} errors</span>}
                                {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
                                {importing && (
                                    <span className="text-muted-foreground">{importProgress.current}/{importProgress.total}</span>
                                )}
                                <button onClick={() => { setParsed(false); setRows([]); setDone(false) }}
                                    className="ml-auto text-xs text-muted-foreground hover:text-foreground underline transition">
                                    ← Change file
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-border rounded-xl">
                                <table className="min-w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-primary">
                                            <th className="px-2 py-2 text-white font-gmedium text-left w-6">#</th>
                                            {COLS.map(c => (
                                                <th key={c.key} className={`px-2 py-2 text-left text-white font-gmedium whitespace-nowrap ${c.w}`}>{c.label}</th>
                                            ))}
                                            <th className="px-2 py-2 text-white font-gmedium w-16 text-center">Status</th>
                                            <th className="px-2 py-2 w-6" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, idx) => (
                                            <tr key={idx} className={`border-b border-border last:border-0 ${row.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : row.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                                                {COLS.map(c => (
                                                    <td key={c.key} className={`px-1 py-1 ${c.w}`}>
                                                        <input value={row[c.key]} onChange={e => updateRow(idx, c.key, e.target.value)}
                                                            disabled={row.status === 'success' || importing} className={inp} />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1 text-center">
                                                    {row.status === 'success' && <CheckCircle2 size={13} className="text-green-500 mx-auto" />}
                                                    {row.status === 'error' && <span title={row.error}><AlertCircle size={13} className="text-destructive mx-auto" /></span>}
                                                    {row.status === 'pending' && <span className="text-muted-foreground text-[10px]">—</span>}
                                                </td>
                                                <td className="px-1 py-1 text-center">
                                                    <button onClick={() => removeRow(idx)} disabled={importing}
                                                        className="text-muted-foreground hover:text-destructive transition disabled:opacity-40">
                                                        <Trash2 size={11} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border shrink-0 flex justify-between items-center">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                        {done ? 'Close' : 'Cancel'}
                    </button>
                    {parsed && !done && (
                        <button onClick={handleImport} disabled={importing || pendingCount === 0}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition font-gmedium">
                            {importing && <Loader2 size={13} className="animate-spin" />}
                            {importing ? `Importing ${importProgress.current}/${importProgress.total}…` : `Import ${pendingCount} rows`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
