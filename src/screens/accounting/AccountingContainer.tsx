import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, X, RefreshCw, AlertTriangle, ChevronDown, Upload, Check, Archive, ArchiveRestore } from 'lucide-react'
import efasApi from '@/plugin/axios'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrsOption {
    ors: string
    ors_original: string
    saro_no: string
    class_type: string
    fund_source: string
    object_code: string
    payee: string
    gross_amount: string
    ada_check_no: string
    date: string
    pap_name: string
    particulars: string
}

interface AccountingEntry {
    id: number
    dv_no: string
    ors_no: string
    ors_original: string
    saro_no: string
    class_type: string
    fund_source: string
    object_code: string
    payee: string
    gross_amount: string
    net_amount: string
    tax: string
    other_deductions: string
    ada_check_no: string
    date: string | null
}

interface AccountingResponse {
    count: number
    total_gross: number
    total_net: number
    total_tax: number
    total_other: number
    results: AccountingEntry[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(v: string | number | null | undefined) {
    if (v === null || v === undefined || v === '') return '—'
    const n = parseFloat(String(v))
    return isNaN(n) ? '—' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function deriveOrsOriginal(orsNo: string): string {
    const m = orsNo.match(/(\d{4}-\d{2}-\d+[A-Za-z]*)$/)
    return m ? m[1] : orsNo
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    dv_no: '', ors_no: '', ors_original: '', saro_no: '',
    class_type: '', fund_source: '', object_code: '', payee: '',
    gross_amount: '', net_amount: '', tax: '', other_deductions: '',
    ada_check_no: '', date: '',
}

function AccountingFormDialog({
    initial,
    onClose,
    onSaved,
    orsOptions,
}: {
    initial?: AccountingEntry
    onClose: () => void
    onSaved: () => void
    orsOptions: OrsOption[]
}) {
    const [form, setForm] = useState(initial
        ? {
            dv_no: initial.dv_no, ors_no: initial.ors_no, ors_original: initial.ors_original,
            saro_no: initial.saro_no, class_type: initial.class_type, fund_source: initial.fund_source,
            object_code: initial.object_code, payee: initial.payee,
            gross_amount: initial.gross_amount, net_amount: initial.net_amount,
            tax: initial.tax, other_deductions: initial.other_deductions,
            ada_check_no: initial.ada_check_no, date: initial.date ?? '',
        }
        : { ...EMPTY_FORM }
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [orsQuery, setOrsQuery] = useState(initial?.ors_no ?? '')
    const [orsOpen, setOrsOpen] = useState(false)
    const orsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (orsRef.current && !orsRef.current.contains(e.target as Node)) setOrsOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const filteredOrs = (orsQuery.trim()
        ? orsOptions.filter(o =>
            o.ors.toLowerCase().includes(orsQuery.toLowerCase()) ||
            o.payee.toLowerCase().includes(orsQuery.toLowerCase()) ||
            o.saro_no.toLowerCase().includes(orsQuery.toLowerCase())
        )
        : orsOptions
    ).slice(0, 50)

    const handleOrsInput = (val: string) => {
        setOrsQuery(val)
        setOrsOpen(true)
        setForm(f => ({ ...f, ors_no: val, ors_original: deriveOrsOriginal(val) }))
    }

    const handleOrsSelect = (opt: OrsOption) => {
        setOrsQuery(opt.ors)
        setOrsOpen(false)
        setForm(f => ({
            ...f,
            ors_no:       opt.ors,
            ors_original: opt.ors_original,
            saro_no:      opt.saro_no      || f.saro_no,
            class_type:   opt.class_type   || f.class_type,
            fund_source:  opt.fund_source  || f.fund_source,
            object_code:  opt.object_code  || f.object_code,
            payee:        opt.payee        || f.payee,
            gross_amount: opt.gross_amount || f.gross_amount,
            ada_check_no: opt.ada_check_no || f.ada_check_no,
            date:         opt.date         || f.date,
        }))
    }

    const set = (key: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))

    const handleSave = async () => {
        setError('')
        setSaving(true)
        try {
            if (initial) {
                await efasApi.patch(`accounting/${initial.id}/`, form)
            } else {
                await efasApi.post('accounting/', form)
            }
            onSaved()
            onClose()
        } catch (err: any) {
            const msg = err?.response?.data?.detail
                || Object.values(err?.response?.data ?? {}).flat().join(' ')
                || 'Failed to save.'
            setError(String(msg))
        } finally {
            setSaving(false)
        }
    }

    const inp = 'w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-muted-foreground'
    const lbl = 'block text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide mb-1'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-base">
                            {initial ? 'Edit Accounting Entry' : 'New Accounting Entry'}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Disbursement Voucher / ORS Record</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            <AlertTriangle size={13} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* DV No + ORS No + ORS Original */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={lbl}>DV No.</label>
                            <input value={form.dv_no} onChange={set('dv_no')} placeholder="2026-01-0001" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>ORS No.</label>
                            <div ref={orsRef} className="relative">
                                <input
                                    value={orsQuery}
                                    onChange={e => handleOrsInput(e.target.value)}
                                    onFocus={() => setOrsOpen(true)}
                                    placeholder="Type or search ORS…"
                                    className={inp}
                                    autoComplete="off"
                                />
                                <ChevronDown
                                    size={12}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                />
                                {orsOpen && filteredOrs.length > 0 && (
                                    <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-56 overflow-y-auto">
                                        {filteredOrs.map(opt => (
                                            <button
                                                key={opt.ors}
                                                type="button"
                                                onMouseDown={e => { e.preventDefault(); handleOrsSelect(opt) }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition border-b border-border/40 last:border-0"
                                            >
                                                <div className="font-gmedium text-foreground">{opt.ors}</div>
                                                <div className="text-muted-foreground text-[10px] truncate">{opt.payee}{opt.saro_no ? ` · ${opt.saro_no}` : ''}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>ORS Original</label>
                            <input
                                value={form.ors_original}
                                onChange={set('ors_original')}
                                placeholder="auto-derived"
                                className={`${inp} text-muted-foreground`}
                            />
                        </div>
                    </div>

                    {/* SARO No + Class Type + Fund Source + Object Code */}
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className={lbl}>SARO No.</label>
                            <input value={form.saro_no} onChange={set('saro_no')} placeholder="2026-01-0098" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Class Type</label>
                            <input value={form.class_type} onChange={set('class_type')} placeholder="01" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Fund Source</label>
                            <input value={form.fund_source} onChange={set('fund_source')} placeholder="01101101" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Object Code</label>
                            <input value={form.object_code} onChange={set('object_code')} placeholder="5010101001" className={inp} />
                        </div>
                    </div>

                    {/* Payee */}
                    <div>
                        <label className={lbl}>Payee</label>
                        <input value={form.payee} onChange={set('payee')} placeholder="Name of payee / claimant" className={inp} />
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className={lbl}>Gross Amount</label>
                            <input type="number" value={form.gross_amount} onChange={set('gross_amount')} placeholder="0.00" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Tax</label>
                            <input type="number" value={form.tax} onChange={set('tax')} placeholder="0.00" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Other Deductions</label>
                            <input type="number" value={form.other_deductions} onChange={set('other_deductions')} placeholder="0.00" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Net Amount</label>
                            <input type="number" value={form.net_amount} onChange={set('net_amount')} placeholder="0.00" className={inp} />
                        </div>
                    </div>

                    {/* ADA/Check No + Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={lbl}>ADA / Check No.</label>
                            <input value={form.ada_check_no} onChange={set('ada_check_no')} placeholder="101-01-329-2026" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Date</label>
                            <input type="date" value={form.date} onChange={set('date')} className={inp} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Entry'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 text-sm font-gsemibold text-muted-foreground hover:text-foreground border border-border rounded-lg transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Bulk Import Dialog ───────────────────────────────────────────────────────

interface ParsedAccRow {
    row: number
    dv_no: string
    ors_no: string
    ors_original: string
    saro_no: string
    class_type: string
    fund_source: string
    object_code: string
    payee: string
    gross_amount: string
    net_amount: string
    tax: string
    other_deductions: string
    ada_check_no: string
    date: string
}

function parseAmount(raw: string): string {
    const s = raw.trim().replace(/,/g, '')
    if (/^\([\d.]+\)$/.test(s)) return '-' + s.slice(1, -1)
    return s
}

function parseAccRows(text: string): ParsedAccRow[] {
    const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
    const rows: ParsedAccRow[] = []
    for (const line of lines) {
        const cols = line.split('\t')
        // Auto-detect leading row-number column
        const o = /^\d+$/.test((cols[0] ?? '').trim()) ? 1 : 0
        // Support 13 cols (no ors_original) or 14 cols (with ors_original)
        const has14 = cols.length - o >= 14
        const c = (i: number) => (cols[i + o] ?? '').trim()
        let idx = 0
        const dv_no       = c(idx++)
        const ors_no      = c(idx++)
        const ors_original = has14 ? c(idx++) : ''
        const saro_no     = c(idx++)
        const class_type  = c(idx++)
        const fund_source = c(idx++)
        const object_code = c(idx++)
        const payee       = c(idx++)
        const gross_amount     = parseAmount(c(idx++))
        const net_amount       = parseAmount(c(idx++))
        const tax              = parseAmount(c(idx++))
        const other_deductions = parseAmount(c(idx++))
        const ada_check_no = c(idx++)
        const date         = c(idx++)
        if (!dv_no && !ors_no && !payee) continue  // skip blank lines
        rows.push({
            row: rows.length + 1,
            dv_no, ors_no, ors_original, saro_no, class_type,
            fund_source, object_code, payee,
            gross_amount, net_amount, tax, other_deductions,
            ada_check_no, date,
        })
    }
    return rows
}

function BulkImportAccountingDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [tab, setTab] = useState<'paste' | 'file'>('paste')
    const [raw, setRaw] = useState('')
    const [parsed, setParsed] = useState<ParsedAccRow[]>([])
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ created_count: number; skipped_count: number; skipped: { row: number; reason: string }[] } | null>(null)
    const [error, setError] = useState('')

    const handleParse = (text: string) => {
        setRaw(text)
        setParsed(parseAccRows(text))
        setResult(null)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const text = ev.target?.result as string
            // Convert CSV commas to tabs for the same parser (simple CSV — no quoted commas)
            const converted = file.name.endsWith('.csv')
                ? text.split('\n').map(l => l.split(',').join('\t')).join('\n')
                : text
            handleParse(converted)
        }
        reader.readAsText(file)
    }

    const handleImport = async () => {
        if (!parsed.length) return
        setImporting(true)
        setError('')
        try {
            const res = await efasApi.post('accounting/bulk/', { rows: parsed })
            setResult(res.data)
            if (res.data.created_count > 0) onSaved()
        } catch {
            setError('Import failed. Please try again.')
        } finally {
            setImporting(false)
        }
    }

    const tabCls = (t: typeof tab) =>
        `px-4 py-2 text-xs font-gmedium rounded-t-lg transition ${tab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`

    const thCls = 'px-2 py-1.5 text-left text-[10px] font-gsemibold text-white whitespace-nowrap'
    const tdCls = 'px-2 py-1 text-[10px] text-foreground whitespace-nowrap max-w-[120px] truncate'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-base">Bulk Import Accounting Entries</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Paste from Excel / Google Sheets, or upload a CSV file.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={16} /></button>
                </div>

                <div className="overflow-y-auto flex flex-col gap-4 px-6 py-5 flex-1 min-h-0">
                    {/* Column guide */}
                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-gmedium text-foreground">Expected columns (tab-separated):</span>{' '}
                        DV No. · ORS No. · ORS Original <span className="italic">(optional)</span> · SARO No. · Class Type · Fund Source · Object Code · Payee · Gross Amount · Net Amount · Tax · Other Deductions · ADA/Check No. · Date
                        <br />
                        <span className="text-[10px]">Leading row-number columns are ignored automatically. Dates: MM/DD/YYYY or YYYY-MM-DD.</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-border">
                        <button className={tabCls('paste')} onClick={() => setTab('paste')}>Paste Data</button>
                        <button className={tabCls('file')} onClick={() => setTab('file')}>Upload CSV</button>
                    </div>

                    {tab === 'paste' && (
                        <div className="flex flex-col gap-2">
                            <textarea
                                rows={6}
                                value={raw}
                                onChange={e => handleParse(e.target.value)}
                                placeholder="Copy rows from Excel or Google Sheets and paste here…"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-mono"
                            />
                            {raw && (
                                <p className="text-xs text-muted-foreground">{parsed.length} row{parsed.length !== 1 ? 's' : ''} detected</p>
                            )}
                        </div>
                    )}

                    {tab === 'file' && (
                        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-10 cursor-pointer hover:border-primary/50 transition">
                            <Upload size={22} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to choose a CSV or TSV file</span>
                            <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
                            {parsed.length > 0 && <span className="text-xs text-primary font-gmedium">{parsed.length} rows loaded</span>}
                        </label>
                    )}

                    {/* Preview table */}
                    {parsed.length > 0 && !result && (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="bg-primary">
                                        <th className={thCls}>#</th>
                                        <th className={thCls}>DV NO.</th>
                                        <th className={thCls}>ORS NO.</th>
                                        <th className={thCls}>ORS ORIG.</th>
                                        <th className={thCls}>SARO NO.</th>
                                        <th className={thCls}>CLASS</th>
                                        <th className={thCls}>FUND SRC</th>
                                        <th className={thCls}>OBJ CODE</th>
                                        <th className={`${thCls} min-w-[140px]`}>PAYEE</th>
                                        <th className={`${thCls} text-right`}>GROSS</th>
                                        <th className={`${thCls} text-right`}>NET</th>
                                        <th className={`${thCls} text-right`}>TAX</th>
                                        <th className={`${thCls} text-right`}>OTHER DED.</th>
                                        <th className={thCls}>ADA/CHECK</th>
                                        <th className={thCls}>DATE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsed.map((r, i) => (
                                        <tr key={r.row} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : 'bg-background'}`}>
                                            <td className={`${tdCls} text-muted-foreground`}>{r.row}</td>
                                            <td className={`${tdCls} font-gmedium text-primary`}>{r.dv_no || '—'}</td>
                                            <td className={tdCls}>{r.ors_no || '—'}</td>
                                            <td className={`${tdCls} text-muted-foreground`}>{r.ors_original || '—'}</td>
                                            <td className={tdCls}>{r.saro_no || '—'}</td>
                                            <td className={tdCls}>{r.class_type || '—'}</td>
                                            <td className={tdCls}>{r.fund_source || '—'}</td>
                                            <td className={tdCls}>{r.object_code || '—'}</td>
                                            <td className={`${tdCls} max-w-[140px]`} title={r.payee}>{r.payee || '—'}</td>
                                            <td className={`${tdCls} text-right`}>{r.gross_amount || '0'}</td>
                                            <td className={`${tdCls} text-right`}>{r.net_amount || '0'}</td>
                                            <td className={`${tdCls} text-right`}>{r.tax || '0'}</td>
                                            <td className={`${tdCls} text-right`}>{r.other_deductions || '0'}</td>
                                            <td className={tdCls}>{r.ada_check_no || '—'}</td>
                                            <td className={tdCls}>{r.date || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Result summary */}
                    {result && (
                        <div className="flex flex-col gap-3">
                            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm ${result.skipped_count === 0 ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'}`}>
                                <Check size={14} />
                                {result.created_count} entr{result.created_count !== 1 ? 'ies' : 'y'} imported
                                {result.skipped_count > 0 && ` · ${result.skipped_count} skipped`}
                            </div>
                            {result.skipped.length > 0 && (
                                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
                                    {result.skipped.map(s => (
                                        <div key={s.row}><span className="font-gmedium">Row {s.row}:</span> {s.reason}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            <AlertTriangle size={13} />{error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
                    {!result ? (
                        <button
                            onClick={handleImport}
                            disabled={parsed.length === 0 || importing}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {importing ? <><RefreshCw size={13} className="animate-spin" /> Importing…</> : `Import ${parsed.length} Row${parsed.length !== 1 ? 's' : ''}`}
                        </button>
                    ) : (
                        <button onClick={onClose} className="flex-1 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition">
                            Done
                        </button>
                    )}
                    <button onClick={onClose} className="px-6 text-sm font-gsemibold text-muted-foreground hover:text-foreground border border-border rounded-lg transition">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Container ───────────────────────────────────────────────────────────

export default function AccountingContainer() {
    const [data, setData] = useState<AccountingResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [deleting, setDeleting] = useState<number | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [editTarget, setEditTarget] = useState<AccountingEntry | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [showArchived, setShowArchived] = useState(false)
    const [page, setPage] = useState(1)
    const [orsOptions, setOrsOptions] = useState<OrsOption[]>([])
    const PAGE_SIZE = 20

    const tableRef = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true
        dragStartX.current = e.clientX
        scrollStartX.current = tableRef.current?.scrollLeft ?? 0
    }
    const onMouseMove = (e: React.MouseEvent) => {
        if (!dragging.current || !tableRef.current) return
        tableRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current)
    }
    const onMouseUp = () => { dragging.current = false }

    const fetchData = async () => {
        setLoading(true)
        setSelectedIds(new Set())
        try {
            const params = new URLSearchParams()
            if (search.trim()) params.set('search', search.trim())
            params.set('archived', String(showArchived))
            const res = await efasApi.get(`accounting/?${params}`)
            setData(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        efasApi.get('accounting/ors-list/').then(r => setOrsOptions(r.data)).catch(() => {})
    }, [])

    useEffect(() => { fetchData() }, [search, showArchived])

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this accounting entry? This cannot be undone.')) return
        setDeleting(id)
        try {
            await efasApi.delete(`accounting/${id}/`)
            setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
            fetchData()
        } finally {
            setDeleting(null)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Delete ${selectedIds.size} selected entr${selectedIds.size !== 1 ? 'ies' : 'y'}? This cannot be undone.`)) return
        try {
            await efasApi.post('accounting/bulk-action/', { action: 'delete', ids: [...selectedIds] })
            setSelectedIds(new Set())
            fetchData()
        } catch {
            fetchData()
        }
    }

    const handleBulkArchiveAction = async (action: 'archive' | 'restore') => {
        if (selectedIds.size === 0) return
        const label = action === 'archive' ? 'Archive' : 'Restore'
        if (!window.confirm(`${label} ${selectedIds.size} selected entr${selectedIds.size !== 1 ? 'ies' : 'y'}?`)) return
        try {
            await efasApi.post('accounting/bulk-action/', { action, ids: [...selectedIds] })
            fetchData()
        } catch { /* silent */ }
    }

    const handleSingleArchiveAction = async (id: number, action: 'archive' | 'restore') => {
        try {
            await efasApi.post('accounting/bulk-action/', { action, ids: [id] })
            fetchData()
        } catch { /* silent */ }
    }

    const toggleSelect = (id: number) =>
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

    const entries = data?.results ?? []
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
    const paginated = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const allPageSelected = paginated.length > 0 && paginated.every(e => selectedIds.has(e.id))
    const toggleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(e => n.delete(e.id)); return n })
        } else {
            setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(e => n.add(e.id)); return n })
        }
    }

    const th = 'px-3 py-2.5 text-left text-xs font-gmedium text-white whitespace-nowrap select-none'
    const td = 'px-3 py-2 text-xs text-foreground whitespace-nowrap'
    const thCheck = 'px-3 py-2.5 sticky left-0 bg-primary z-20 border-r border-white/20 w-10 text-center'
    const tdCheck = 'px-3 py-2 sticky left-0 z-10 border-r border-border text-center w-10'
    const thActions = `${th} sticky right-0 bg-primary z-20 border-l border-white/20`
    const tdActions = `${td} sticky right-0 z-10 border-l border-border text-center`

    const STICKY_BG = {
        even: 'hsl(var(--background))',
        odd:  'color-mix(in srgb, hsl(var(--muted)) 20%, hsl(var(--background)))',
        sel:  'color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--background)))',
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">Accounting</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {data?.count ?? 0} entr{(data?.count ?? 0) !== 1 ? 'ies' : 'y'} · Disbursement Voucher records
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                        <>
                            {showArchived ? (
                                <button
                                    onClick={() => handleBulkArchiveAction('restore')}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                                >
                                    <ArchiveRestore size={14} /> Restore ({selectedIds.size})
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleBulkArchiveAction('archive')}
                                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-500/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                                >
                                    <Archive size={14} /> Archive ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                            >
                                <Trash2 size={14} /> Delete ({selectedIds.size})
                            </button>
                        </>
                    )}
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw size={15} />
                    </button>
                    {!showArchived && (
                        <>
                            <button
                                onClick={() => setShowBulk(true)}
                                className="flex items-center gap-2 bg-muted hover:bg-muted/80 border border-border text-foreground text-sm font-gmedium px-4 py-2 rounded-lg transition"
                            >
                                <Upload size={15} /> Bulk Import
                            </button>
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                            >
                                <Plus size={15} /> Add Entry
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search + Active/Archived toggle */}
            <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    <button
                        onClick={() => { setShowArchived(false); setSelectedIds(new Set()) }}
                        className={`px-3 py-1.5 text-xs font-gmedium transition ${!showArchived ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => { setShowArchived(true); setSelectedIds(new Set()) }}
                        className={`px-3 py-1.5 text-xs font-gmedium transition flex items-center gap-1 ${showArchived ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                    >
                        <Archive size={11} /> Archived
                    </button>
                </div>
                <div className="relative w-80">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search DV no., ORS, SARO, payee…"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                    {search && (
                        <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-4">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-blue-600 dark:text-blue-400">Gross Amount</p>
                    <p className="text-xl font-gbold text-foreground mt-1">{fmtNum(data?.total_gross)}</p>
                </div>
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-5 py-4">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-orange-600 dark:text-orange-400">Total Tax</p>
                    <p className="text-xl font-gbold text-foreground mt-1">{fmtNum(data?.total_tax)}</p>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-red-600 dark:text-red-400">Other Deductions</p>
                    <p className="text-xl font-gbold text-foreground mt-1">{fmtNum(data?.total_other)}</p>
                </div>
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-green-600 dark:text-green-400">Net Amount</p>
                    <p className="text-xl font-gbold text-foreground mt-1">{fmtNum(data?.total_net)}</p>
                </div>
            </div>

            {/* Table */}
            <div
                ref={tableRef}
                className="overflow-x-auto border border-border rounded-xl cursor-grab active:cursor-grabbing"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-primary">
                            <th className={thCheck}>
                                <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="rounded cursor-pointer accent-white" />
                            </th>
                            <th className={th}>#</th>
                            <th className={th}>DV NO.</th>
                            <th className={th}>ORS NO.</th>
                            <th className={th}>ORS ORIGINAL</th>
                            <th className={th}>SARO NO.</th>
                            <th className={th}>CLASS TYPE</th>
                            <th className={th}>FUND SOURCE</th>
                            <th className={th}>OBJECT CODE</th>
                            <th className={`${th} min-w-[180px]`}>PAYEE</th>
                            <th className={`${th} text-right`}>GROSS AMOUNT</th>
                            <th className={`${th} text-right`}>NET AMOUNT</th>
                            <th className={`${th} text-right`}>TAX</th>
                            <th className={`${th} text-right`}>OTHER DEDUCTIONS</th>
                            <th className={th}>ADA / CHECK NO.</th>
                            <th className={th}>DATE</th>
                            <th className={thActions}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={17} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
                        ) : paginated.length === 0 ? (
                            <tr><td colSpan={17} className="text-center py-12 text-muted-foreground text-sm">No records found.</td></tr>
                        ) : paginated.map((entry, idx) => {
                            const isOdd = idx % 2 === 1
                            const isSel = selectedIds.has(entry.id)
                            const stickyBg = isSel ? STICKY_BG.sel : isOdd ? STICKY_BG.odd : STICKY_BG.even
                            return (
                                <tr
                                    key={entry.id}
                                    className={`border-b border-border last:border-0 transition-colors ${
                                        isSel ? 'bg-primary/10' : isOdd ? 'bg-muted/20 hover:bg-muted/40' : 'bg-background hover:bg-muted/20'
                                    }`}
                                >
                                    <td className={tdCheck} style={{ background: stickyBg }}>
                                        <input
                                            type="checkbox"
                                            checked={isSel}
                                            onChange={() => toggleSelect(entry.id)}
                                            className="rounded cursor-pointer"
                                        />
                                    </td>
                                    <td className={`${td} text-muted-foreground`}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                                    <td className={`${td} font-gmedium text-primary`}>{entry.dv_no || '—'}</td>
                                    <td className={`${td} font-gmedium`}>{entry.ors_no || '—'}</td>
                                    <td className={`${td} text-muted-foreground`}>{entry.ors_original || '—'}</td>
                                    <td className={`${td} font-gmedium text-primary`}>{entry.saro_no || '—'}</td>
                                    <td className={td}>
                                        {entry.class_type
                                            ? <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-gmedium">{entry.class_type}</span>
                                            : '—'}
                                    </td>
                                    <td className={td}>{entry.fund_source || '—'}</td>
                                    <td className={td}>{entry.object_code || '—'}</td>
                                    <td className={`${td} max-w-[220px] truncate`} title={entry.payee}>{entry.payee || '—'}</td>
                                    <td className={`${td} text-right font-gbold`}>{fmtNum(entry.gross_amount)}</td>
                                    <td className={`${td} text-right font-gbold text-green-600 dark:text-green-400`}>{fmtNum(entry.net_amount)}</td>
                                    <td className={`${td} text-right`}>{fmtNum(entry.tax)}</td>
                                    <td className={`${td} text-right`}>{fmtNum(entry.other_deductions)}</td>
                                    <td className={td}>{entry.ada_check_no || '—'}</td>
                                    <td className={td}>{fmtDate(entry.date)}</td>
                                    <td className={tdActions} style={{ background: stickyBg }}>
                                        <div className="flex items-center justify-center gap-1">
                                            {showArchived ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSingleArchiveAction(entry.id, 'restore')}
                                                        className="p-1 rounded hover:bg-emerald-500/10 transition text-muted-foreground hover:text-emerald-600"
                                                        title="Restore"
                                                    >
                                                        <ArchiveRestore size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        disabled={deleting === entry.id}
                                                        className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive disabled:opacity-40"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditTarget(entry)}
                                                        className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-primary"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSingleArchiveAction(entry.id, 'archive')}
                                                        className="p-1 rounded hover:bg-amber-500/10 transition text-muted-foreground hover:text-amber-500"
                                                        title="Archive"
                                                    >
                                                        <Archive size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        disabled={deleting === entry.id}
                                                        className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive disabled:opacity-40"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && entries.length > PAGE_SIZE && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing {Math.min((page - 1) * PAGE_SIZE + 1, entries.length)}–{Math.min(page * PAGE_SIZE, entries.length)} of {entries.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs font-gmedium">«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs font-gmedium">Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, i) => p === '…'
                                ? <span key={`e-${i}`} className="px-2 text-xs">…</span>
                                : <button key={p} onClick={() => setPage(p as number)} className={`px-3 py-1 rounded border text-xs font-gmedium transition ${page === p ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}>{p}</button>
                            )}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs font-gmedium">Next</button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs font-gmedium">»</button>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            {showBulk && (
                <BulkImportAccountingDialog onClose={() => setShowBulk(false)} onSaved={fetchData} />
            )}
            {showAdd && (
                <AccountingFormDialog onClose={() => setShowAdd(false)} onSaved={fetchData} orsOptions={orsOptions} />
            )}
            {editTarget && (
                <AccountingFormDialog
                    initial={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={() => { fetchData(); setEditTarget(null) }}
                    orsOptions={orsOptions}
                />
            )}
        </div>
    )
}
