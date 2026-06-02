import { useRef, useState, useMemo } from 'react'
import { X, CheckCircle2, AlertCircle, Loader2, Trash2, UploadCloud, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import efasApi from '@/plugin/axios'
import type { PAPCode, ReceivedSARO, FundType, ClassType } from '../RAODMainContainer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkRow {
    pap_name: string
    pap_code: string
    date_of_saro: string
    saro_no: string
    amount_of_allotment: string
    remarks: string
    object_description: string
    object_code: string
    date_of_obligation: string
    fund_type_description: string
    class_type: string
    fund_source: string
    ors_no: string
    name_of_claimant: string
    particulars: string
    obligated_amount: string
    disbursement_date: string
    ada_check: string
    cash: string
    non_tra: string
    status: 'pending' | 'success' | 'error'
    error?: string
}

type RowField = keyof Omit<BulkRow, 'status' | 'error'>

interface ColDef { key: RowField; label: string; width: string; options?: { value: string; label: string }[] }

interface Props {
    paps: PAPCode[]
    fundTypes: FundType[]
    classTypes: ClassType[]
    receivedSaros: ReceivedSARO[]
    onClose: () => void
    onDone: () => void
}

// ─── Column metadata is built dynamically inside the component ────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(val: string): string {
    const s = val.trim()
    if (!s) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
    return s
}

function parseCSV(text: string): string[][] {
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
            else if (ch === ',') { row.push(field); field = ''; i++ }
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

const stripNum = (v: string) => { const s = v.replace(/,/g, '').trim(); return (s && s !== '-') ? s : '0' }

const rowInp = 'w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportRaodDialog({ paps, fundTypes, classTypes, receivedSaros, onClose, onDone }: Props) {

    const [rows, setRows] = useState<BulkRow[]>([])
    const [parsed, setParsed] = useState(false)
    const [importing, setImporting] = useState(false)
    const [done, setDone] = useState(false)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [fileError, setFileError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dragCounter = useRef(0)

    const COLS = useMemo((): ColDef[] => [
        { key: 'pap_name', label: 'PAP Name', width: 'min-w-[160px]' },
        { key: 'pap_code', label: 'PAP Code', width: 'min-w-[130px]' },
        { key: 'date_of_saro', label: 'Date of SARO', width: 'min-w-[110px]' },
        { key: 'saro_no', label: 'SARO No.', width: 'min-w-[150px]' },
        { key: 'amount_of_allotment', label: 'Amt of Allotment', width: 'min-w-[130px]' },
        { key: 'remarks', label: 'Remarks', width: 'min-w-[130px]' },
        { key: 'object_description', label: 'Object Description', width: 'min-w-[160px]' },
        { key: 'object_code', label: 'Object Code', width: 'min-w-[110px]' },
        { key: 'date_of_obligation', label: 'Date of Obligation', width: 'min-w-[120px]' },
        {
            key: 'fund_type_description', label: 'Fund Type Desc', width: 'min-w-[180px]',
            options: fundTypes.map(ft => ({ value: ft.name, label: `${ft.code} — ${ft.name}` }))
        },
        {
            key: 'class_type', label: 'Class Type', width: 'min-w-[150px]',
            options: classTypes.map(ct => ({ value: ct.code, label: `${ct.code} — ${ct.name}` }))
        },
        {
            key: 'fund_source', label: 'Fund Source', width: 'min-w-[140px]',
            options: fundTypes.map(ft => ({ value: ft.code, label: `${ft.code} — ${ft.name}` }))
        },
        { key: 'ors_no', label: 'ORS No.', width: 'min-w-[110px]' },
        { key: 'name_of_claimant', label: 'Name of Claimant', width: 'min-w-[160px]' },
        { key: 'particulars', label: 'Particulars', width: 'min-w-[180px]' },
        { key: 'obligated_amount', label: 'Obligated Amt', width: 'min-w-[120px]' },
        { key: 'disbursement_date', label: 'Date (Disbursement)', width: 'min-w-[130px]' },
        { key: 'ada_check', label: 'ADA/Check', width: 'min-w-[110px]' },
        { key: 'cash', label: 'Cash', width: 'min-w-[100px]' },
        { key: 'non_tra', label: 'Non-TRA', width: 'min-w-[100px]' },
    ], [fundTypes, classTypes])

    const processGrid = (allRows: string[][]) => {
        const result: BulkRow[] = []
        for (const cols of allRows) {
            const g = (i: number) => (cols[i] ?? '').toString().trim()
            const first = g(0).toLowerCase()
            // Skip header rows
            if (['pap', 'pap name', 'pap_name', 'pap code', 'pap_code'].includes(first)) continue
            // Skip fully empty rows
            if (cols.every(c => !String(c).trim())) continue
            // Skip rows with no obligation data
            const hasOrs = !!g(12)
            const hasObligated = !!g(15) && g(15) !== '-' && g(15) !== '0'
            if (!hasOrs && !hasObligated) continue

            // Column layout:
            // A(0)=PAP Name  B(1)=PAP Code  C(2)=Date of SARO  D(3)=SARO No.
            // E(4)=Amt of Allotment  F(5)=Remarks  G(6)=Object Desc  H(7)=Object Code
            // I(8)=Date of Obligation  J(9)=Fund Type  K(10)=Class Type  L(11)=Fund Source
            // M(12)=ORS No.  N(13)=Name of Claimant  O(14)=Particulars  P(15)=Obligated Amt
            // Q(16)=Date (Disbursement)  R(17)=ADA/Check  S(18)=Cash  T(19)=Non-TRA

            const rawClass = g(10).toLowerCase()
            const matchedCT = rawClass ? classTypes.find(ct =>
                rawClass === ct.code || rawClass.includes(ct.name.toLowerCase())
            ) : undefined

            const rawFund = g(9).toLowerCase()
            const matchedFT = rawFund ? fundTypes.find(ft => {
                const words = ft.name.toLowerCase().split(/[\s\-]+/)
                return ft.name.toLowerCase().includes(rawFund) ||
                    rawFund.includes(ft.name.toLowerCase()) ||
                    words.some(w => w.length > 3 && rawFund.includes(w))
            }) : undefined

            const rawFundSource = g(11)
            const fundSourceCode = fundTypes.find(ft => ft.code === rawFundSource)
                ? rawFundSource
                : (matchedFT?.code || rawFundSource)

            result.push({
                pap_name: g(0),
                pap_code: g(1),
                date_of_saro: parseDate(g(2)),
                saro_no: g(3),
                amount_of_allotment: g(4),
                remarks: g(5),
                object_description: g(6),
                object_code: g(7),
                date_of_obligation: parseDate(g(8)),
                fund_type_description: matchedFT?.name || g(9),
                class_type: matchedCT?.code || g(10),
                fund_source: fundSourceCode,
                ors_no: g(12),
                name_of_claimant: g(13),
                particulars: g(14),
                obligated_amount: g(15),
                disbursement_date: parseDate(g(16)),
                ada_check: g(17),
                cash: g(18),
                non_tra: g(19),
                status: 'pending',
            })
        }
        return result
    }

    const parseRows = (text: string) => {
        const result = processGrid(parseCSV(text))
        setRows(result)
        setParsed(true)
    }

    const processFile = (file: File) => {
        setFileError(null)
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader()
            reader.onload = ev => {
                try {
                    const wb = XLSX.read(ev.target?.result, { type: 'binary', raw: true, cellDates: false })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    const grid: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
                    setRows(processGrid(grid))
                    setParsed(true)
                } catch {
                    setFileError(`Could not read "${file.name}". Make sure it is a valid Excel file.`)
                }
            }
            reader.readAsBinaryString(file)
        } else {
            const reader = new FileReader()
            reader.onload = ev => parseRows(ev.target?.result as string ?? '')
            reader.onerror = () => setFileError(`Could not read "${file.name}".`)
            reader.readAsText(file)
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        processFile(file)
    }

    // ── Drag & Drop ───────────────────────────────────────────────────────────

    const onDragEnter = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current++
        setIsDragging(true)
    }
    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current === 0) setIsDragging(false)
    }
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation()
        dragCounter.current = 0
        setIsDragging(false)
        let file: File | null = e.dataTransfer.files?.[0] ?? null
        if (!file) {
            const item = Array.from(e.dataTransfer.items ?? []).find(it => it.kind === 'file')
            file = item?.getAsFile() ?? null
        }
        if (file) {
            processFile(file)
        } else {
            setFileError('No file detected. Drag from Windows File Explorer instead of the browser download panel, or click to browse.')
        }
    }

    const updateRow = (idx: number, field: RowField, val: string) =>
        setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val, status: 'pending', error: undefined } : r))

    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]

        // Group by saro_no
        const groups = new Map<string, number[]>()
        updated.forEach((row, i) => {
            if (!groups.has(row.saro_no)) groups.set(row.saro_no, [])
            groups.get(row.saro_no)!.push(i)
        })

        const groupEntries = [...groups.entries()]
        setImportProgress({ current: 0, total: groupEntries.length })

        for (let gi = 0; gi < groupEntries.length; gi++) {
            const [saroNo, indices] = groupEntries[gi]
            setImportProgress({ current: gi + 1, total: groupEntries.length })
            const first = updated[indices[0]]

            // Try to auto-match pap from receivedSaros or paps list
            const matchedSaro = receivedSaros.find(s => s.allotment_no === saroNo)
            const papRecord = paps.find(p => p.pap_code === first.pap_code)
                ?? paps.find(p => p.pap_name === first.pap_name)

            try {
                const payload = {
                    pap: papRecord?.id ?? (matchedSaro?.items?.[0]?.pap ?? null),
                    date_of_saro: first.date_of_saro || matchedSaro?.date_of_saro || '',
                    saro_no: saroNo,
                    amount_of_allotment: stripNum(first.amount_of_allotment || matchedSaro?.total_amount || '0'),
                    remarks: first.remarks,
                    object_description: first.object_description || matchedSaro?.items?.[0]?.object_code_desc || '',
                    object_code: first.object_code || matchedSaro?.items?.[0]?.object_code_no || '',
                    entries: indices.map(i => {
                        const r = updated[i]
                        return {
                            date_of_obligation: r.date_of_obligation || null,
                            fund_type_description: r.fund_type_description,
                            class_type: r.class_type,
                            fund_source: r.fund_source,
                            ors_no: r.ors_no,
                            name_of_claimant: r.name_of_claimant,
                            particulars: r.particulars,
                            obligated_amount: stripNum(r.obligated_amount),
                            disbursement_date: r.disbursement_date || null,
                            ada_check: r.ada_check.trim(),
                            cash: stripNum(r.cash),
                            non_tra: stripNum(r.non_tra),
                        }
                    }),
                }
                await efasApi.post('raod/', payload)
                indices.forEach(i => { updated[i] = { ...updated[i], status: 'success', error: undefined } })
            } catch (err: unknown) {
                const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
                const msg =
                    (data?.saro_no as string[])?.[0] ??
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
    const raodCount = new Set(rows.map(r => r.saro_no).filter(Boolean)).size

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            {importing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl px-10 py-10 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full">
                        <Loader2 size={40} className="text-primary animate-spin" />
                        <p className="font-gbold text-foreground text-base text-center">
                            Importing {importProgress.current} / {importProgress.total} RAOD{importProgress.total !== 1 ? 's' : ''}…
                        </p>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-xl w-full max-w-[95vw] max-h-[92vh] flex flex-col shadow-2xl">
                {/* Title bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">Bulk Import RAOD</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Upload a CSV file exported from Excel. Each row = one obligation entry. Rows sharing the same SARO No. are grouped into one RAOD.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-5">

                    {/* Column reference */}
                    <div className="bg-muted/30 border border-border rounded-lg p-3">
                        <p className="text-xs font-gbold text-muted-foreground uppercase tracking-widest mb-2">Expected Column Order (A→T)</p>
                        <div className="flex flex-wrap gap-1.5">
                            {COLS.map((c, i) => (
                                <span key={c.key} className="text-[11px] bg-background border border-border rounded px-2 py-0.5 text-foreground">
                                    <span className="text-primary font-gbold">{String.fromCharCode(65 + i)}</span> {c.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* File upload area */}
                    {!parsed && (
                        <div className="flex flex-col gap-3">
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
                                    accept=".csv,.xlsx,.xls,.tsv,text/csv"
                                    className="hidden"
                                    onChange={handleFileInput}
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
                                            {['.xlsx', '.xls', '.csv'].map(ext => (
                                                <span key={ext} className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                                                    <FileSpreadsheet size={10} /> {ext}
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
                        </div>
                    )}

                    {/* Parsed row editor */}
                    {parsed && (
                        <div className="flex flex-col gap-4">
                            {/* Summary bar */}
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">{rows.length} row{rows.length !== 1 ? 's' : ''} · {raodCount} RAOD{raodCount !== 1 ? 's' : ''}</span>
                                {successCount > 0 && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 size={14} />{successCount} success</span>}
                                {errorCount > 0 && <span className="flex items-center gap-1 text-destructive"><AlertCircle size={14} />{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
                                {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
                                <button
                                    onClick={() => { setParsed(false); setRows([]) }}
                                    className="ml-auto text-xs text-muted-foreground hover:text-foreground transition underline"
                                >
                                    ← Change file
                                </button>
                            </div>

                            {done && rows.every(r => r.status === 'success') && (
                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-lg px-4 py-3 text-sm font-gmedium">
                                    <CheckCircle2 size={16} /> All records imported successfully!
                                </div>
                            )}

                            {/* Editable table */}
                            <div className="overflow-x-auto border border-border rounded-xl">
                                <table className="min-w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-primary">
                                            <th className="px-2 py-2 text-left text-white font-gmedium whitespace-nowrap w-8">#</th>
                                            {COLS.map(c => (
                                                <th key={c.key} className={`px-2 py-2 text-left text-white font-gmedium whitespace-nowrap ${c.width}`}>{c.label}</th>
                                            ))}
                                            <th className="px-2 py-2 text-white font-gmedium whitespace-nowrap w-16 text-center">Status</th>
                                            <th className="px-2 py-2 text-white font-gmedium w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={`border-b border-border last:border-0 ${row.status === 'success'
                                                    ? 'bg-green-50 dark:bg-green-950/20'
                                                    : row.status === 'error'
                                                        ? 'bg-red-50 dark:bg-red-950/20'
                                                        : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                                    }`}
                                            >
                                                <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                                                {COLS.map(c => (
                                                    <td key={c.key} className={`px-1 py-1 ${c.width}`}>
                                                        {c.options ? (
                                                            <select
                                                                value={row[c.key]}
                                                                onChange={e => updateRow(idx, c.key, e.target.value)}
                                                                disabled={row.status === 'success'}
                                                                className={rowInp}
                                                            >
                                                                <option value="">— Select —</option>
                                                                {c.options.map(o => (
                                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                value={row[c.key]}
                                                                onChange={e => updateRow(idx, c.key, e.target.value)}
                                                                disabled={row.status === 'success'}
                                                                className={rowInp}
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1 text-center">
                                                    {row.status === 'success' && <CheckCircle2 size={14} className="text-green-500 mx-auto" />}
                                                    {row.status === 'error' && (
                                                        <span title={row.error}>
                                                            <AlertCircle size={14} className="text-destructive mx-auto" />
                                                        </span>
                                                    )}
                                                    {row.status === 'pending' && <span className="text-muted-foreground">—</span>}
                                                </td>
                                                <td className="px-1 py-1 text-center">
                                                    <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive transition">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Error details */}
                            {errorCount > 0 && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                                    <p className="text-xs font-gbold text-destructive mb-2">Import Errors:</p>
                                    {rows.filter(r => r.status === 'error').map((r, i) => (
                                        <p key={i} className="text-xs text-destructive">• <span className="font-gmedium">{r.saro_no || '(no SARO)'}</span>: {r.error}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                        {done ? 'Close' : 'Cancel'}
                    </button>
                    {parsed && !done && (
                        <button
                            onClick={handleImport}
                            disabled={importing || pendingCount === 0}
                            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-gmedium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition"
                        >
                            {importing ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : `Import ${raodCount} RAOD${raodCount !== 1 ? 's' : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
