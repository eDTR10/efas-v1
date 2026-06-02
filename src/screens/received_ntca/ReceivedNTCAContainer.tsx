import { useEffect, useRef, useState } from 'react'
import { Search, X, RefreshCw, Pencil, Check, ChevronDown, Plus, Upload, AlertTriangle, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import efasApi from '@/plugin/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NTCAItem {
    id: number
    particulars: string
    purpose: string
    pap_code: string
    fund_type: string
    year: number | null
    class_type: string
    saro_no: string
    saro_year: string
    nca_date: string | null
    nta_no: string
    nca_amount: string
    nca_no: string
    remarks: string
}

interface NTCAResponse {
    total_amount: number
    count: number
    results: NTCAItem[]
}

// Received SARO types (for the Add dialog picker)
interface SaroLineItem {
    id: number
    pap_code: string
    pap_name: string
    description: string
    class_type: string
    fund_type: string
    purpose: string
    nca_amount: string
    nca_date: string | null
    nta_no: string
    nca_no: string
    year: number | null
    remarks: string
}

interface ReceivedSARO {
    id: number
    allotment_no: string
    date_of_saro: string
    class_type: string
    items: SaroLineItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    if (isNaN(n)) return '0.00'
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fmtDate = (d: string | null) => {
    if (!d) return '—'
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse()

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
    label, value, onChange, type = 'text', placeholder = '', readOnly = false,
}: {
    label: string; value: string; onChange?: (v: string) => void
    type?: string; placeholder?: string; readOnly?: boolean
}) {
    return (
        <div>
            <label className="block text-xs font-gmedium text-muted-foreground mb-1">{label}</label>
            <input
                type={type}
                value={value}
                readOnly={readOnly}
                onChange={e => onChange?.(e.target.value)}
                placeholder={placeholder}
                className={`h-9 w-full rounded-lg border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40
                    ${readOnly ? 'bg-muted/40 cursor-default' : 'bg-background'}`}
            />
        </div>
    )
}

// ─── Add NTCA Dialog ──────────────────────────────────────────────────────────

function AddNTCADialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [loadingSaros, setLoadingSaros] = useState(true)
    const [selectedSaroId, setSelectedSaroId] = useState<number | ''>('')
    const [selectedItemId, setSelectedItemId] = useState<number | ''>('')
    const [form, setForm] = useState({
        nca_date: '',
        nta_no: '',
        nca_amount: '',
        nca_no: '',
        year: '',
        remarks: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        efasApi.get('received-saro/')
            .then(res => setSaros(res.data))
            .catch(() => setError('Failed to load SAROs.'))
            .finally(() => setLoadingSaros(false))
    }, [])

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    const selectedSaro = saros.find(s => s.id === selectedSaroId)
    const selectedItem = selectedSaro?.items.find(i => i.id === selectedItemId)

    // When item changes, pre-fill any existing NTCA values
    useEffect(() => {
        if (!selectedItem) return
        setForm({
            nca_date: selectedItem.nca_date ?? '',
            nta_no: selectedItem.nta_no ?? '',
            nca_amount: selectedItem.nca_amount ?? '',
            nca_no: selectedItem.nca_no ?? '',
            year: selectedItem.year != null ? String(selectedItem.year) : '',
            remarks: selectedItem.remarks ?? '',
        })
    }, [selectedItemId])

    // Reset item when SARO changes
    useEffect(() => {
        setSelectedItemId('')
        setForm({ nca_date: '', nta_no: '', nca_amount: '', nca_no: '', year: '', remarks: '' })
    }, [selectedSaroId])

    const handleSave = async () => {
        if (!selectedItemId) { setError('Please select a line item.'); return }
        if (!form.nca_date) { setError('NTCA Date is required.'); return }
        setSaving(true)
        setError('')
        try {
            await efasApi.patch(`received-saro/ntca/${selectedItemId}/`, {
                nca_date: form.nca_date || null,
                nta_no: form.nta_no,
                nca_amount: parseFloat(form.nca_amount) || 0,
                nca_no: form.nca_no,
                year: form.year ? parseInt(form.year, 10) : null,
                remarks: form.remarks,
            })
            onSaved()
            onClose()
        } catch {
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 shrink-0">
                    <div>
                        <h2 className="text-sm font-gbold text-foreground">Add Received NTCA</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Select a SARO and line item, then fill in the NTCA details.</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
                    {/* SARO picker */}
                    <div>
                        <label className="block text-xs font-gmedium text-muted-foreground mb-1">SARO NO. <span className="text-destructive">*</span></label>
                        {loadingSaros ? (
                            <div className="h-9 flex items-center text-xs text-muted-foreground"><RefreshCw size={12} className="animate-spin mr-1" /> Loading SAROs…</div>
                        ) : (
                            <select
                                value={selectedSaroId}
                                onChange={e => setSelectedSaroId(e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="">— Select SARO —</option>
                                {saros.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.allotment_no} {s.class_type ? `[${s.class_type}]` : ''} — {s.date_of_saro}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Line item picker */}
                    {selectedSaro && (
                        <div>
                            <label className="block text-xs font-gmedium text-muted-foreground mb-1">LINE ITEM / PAP <span className="text-destructive">*</span></label>
                            {selectedSaro.items.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No line items found for this SARO.</p>
                            ) : (
                                <select
                                    value={selectedItemId}
                                    onChange={e => setSelectedItemId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="">— Select Line Item —</option>
                                    {selectedSaro.items.map(it => (
                                        <option key={it.id} value={it.id}>
                                            {it.pap_code || it.pap_name || it.description || `Item #${it.id}`}
                                            {it.fund_type ? ` — ${it.fund_type}` : ''}
                                            {it.class_type ? ` [${it.class_type}]` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Read-only info from the selected item */}
                    {selectedItem && (
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <Field label="PARTICULARS" value={selectedItem.pap_name || selectedItem.description} readOnly />
                            <Field label="PAP CODE" value={selectedItem.pap_code} readOnly />
                            <Field label="FUND SOURCE" value={selectedItem.fund_type} readOnly />
                            <Field label="CLASS TYPE" value={selectedItem.class_type} readOnly />
                            <div className="col-span-2">
                                <Field label="PURPOSE" value={selectedItem.purpose} readOnly />
                            </div>
                        </div>
                    )}

                    {/* NTCA fields */}
                    {selectedItem && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="NTCA DATE *" type="date" value={form.nca_date} onChange={v => set('nca_date', v)} />
                            <Field label="NTCA NO." value={form.nta_no} onChange={v => set('nta_no', v)} placeholder="e.g. 26-01-011" />
                            <Field label="NTCA AMOUNT" type="number" value={form.nca_amount} onChange={v => set('nca_amount', v)} placeholder="0.00" />
                            <Field label="NCA NO." value={form.nca_no} onChange={v => set('nca_no', v)} placeholder="e.g. 771" />
                            <Field label="YEAR (Appropriation)" type="number" value={form.year} onChange={v => set('year', v)} placeholder={String(currentYear)} />
                            <div className="col-span-2">
                                <label className="block text-xs font-gmedium text-muted-foreground mb-1">REMARKS</label>
                                <textarea
                                    rows={3}
                                    value={form.remarks}
                                    onChange={e => set('remarks', e.target.value)}
                                    placeholder="Payment details, batch, etc."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="px-5 pb-2 text-xs text-destructive shrink-0">{error}</p>}

                {/* Footer */}
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
                    <button
                        onClick={onClose}
                        className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedItemId}
                        className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        Save NTCA
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── PAP Combobox ─────────────────────────────────────────────────────────────

interface PAPOption { pap_code: string; pap_name: string }

function PAPCombobox({
    value, onSelect,
}: {
    value: string
    onSelect: (pap: PAPOption) => void
}) {
    const [query, setQuery] = useState(value)
    const [paps, setPaps] = useState<PAPOption[]>([])
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        efasApi.get('pap/').then(r => setPaps(r.data.results ?? r.data)).catch(() => {})
    }, [])

    useEffect(() => {
        setQuery(value)
    }, [value])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = query.trim()
        ? paps.filter(p =>
            p.pap_code.toLowerCase().includes(query.toLowerCase()) ||
            p.pap_name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)
        : paps.slice(0, 10)

    return (
        <div ref={ref} className="relative col-span-2">
            <label className="block text-xs font-gmedium text-muted-foreground mb-1">PAP SEARCH</label>
            <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search by code or name…"
                    className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
            </div>
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-52 overflow-y-auto">
                    {filtered.map(p => (
                        <button
                            key={p.pap_code}
                            type="button"
                            onMouseDown={() => { onSelect(p); setQuery(p.pap_code); setOpen(false) }}
                            className="w-full text-left px-3 py-2 hover:bg-muted/60 transition"
                        >
                            <span className="text-xs font-gmedium text-primary">{p.pap_code}</span>
                            <span className="text-xs text-muted-foreground ml-2 truncate">{p.pap_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({ item, onClose, onSaved }: { item: NTCAItem; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        particulars: item.particulars,
        pap_code: item.pap_code,
        saro_no: item.saro_no,
        fund_type: item.fund_type,
        nca_date: item.nca_date ?? '',
        nta_no: item.nta_no,
        nca_amount: item.nca_amount,
        nca_no: item.nca_no,
        year: item.year != null ? String(item.year) : '',
        remarks: item.remarks,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    const handlePapSelect = (pap: PAPOption) => {
        setForm(p => ({ ...p, pap_code: pap.pap_code, particulars: pap.pap_name }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        try {
            await efasApi.patch(`received-saro/ntca/${item.id}/`, {
                pap_code: form.pap_code.trim(),
                saro_no: form.saro_no.trim(),
                fund_type: form.fund_type,
                description: form.particulars,
                nca_date: form.nca_date,
                nta_no: form.nta_no,
                nca_amount: parseFloat(form.nca_amount) || 0,
                nca_no: form.nca_no,
                year: form.year ? parseInt(form.year, 10) : null,
                remarks: form.remarks,
            })
            onSaved()
            onClose()
        } catch {
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                    <div>
                        <h2 className="text-sm font-gbold text-foreground">Edit NTCA Record</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.particulars} — {item.saro_no}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 grid grid-cols-2 gap-4">
                    {/* PAP search combobox — auto-fills PAP Code + Particulars */}
                    <PAPCombobox value={form.pap_code} onSelect={handlePapSelect} />

                    {/* Editable context fields */}
                    <Field label="PARTICULARS" value={form.particulars} onChange={v => set('particulars', v)} />
                    <Field label="PAP CODE" value={form.pap_code} onChange={v => set('pap_code', v)} placeholder="e.g. 310201200002000" />
                    <Field label="SARO NO." value={form.saro_no} onChange={v => set('saro_no', v)} />
                    <Field label="FUND SOURCE" value={form.fund_type} onChange={v => set('fund_type', v)} />

                    {/* NTCA fields */}
                    <div className="col-span-2 border-t border-border pt-4 grid grid-cols-2 gap-4">
                        <Field label="NTCA DATE" type="date" value={form.nca_date} onChange={v => set('nca_date', v)} />
                        <Field label="NTCA NO." value={form.nta_no} onChange={v => set('nta_no', v)} placeholder="e.g. 26-01-011" />
                        <Field label="NTCA AMOUNT" type="number" value={form.nca_amount} onChange={v => set('nca_amount', v)} />
                        <Field label="NCA NO." value={form.nca_no} onChange={v => set('nca_no', v)} placeholder="e.g. 771" />
                        <Field label="YEAR (Appropriation)" type="number" value={form.year} onChange={v => set('year', v)} placeholder={String(currentYear)} />
                        <div className="col-span-2">
                            <label className="block text-xs font-gmedium text-muted-foreground mb-1">REMARKS</label>
                            <textarea
                                rows={3}
                                value={form.remarks}
                                onChange={e => set('remarks', e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="px-5 pb-2 text-xs text-destructive">{error}</p>}

                <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
                    <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Bulk Import Dialog ───────────────────────────────────────────────────────

interface ParsedRow {
    row: number
    saro_no: string
    pap_code: string
    particulars: string
    purpose: string
    fund_type: string
    class_type: string
    nca_date: string
    nta_no: string
    nca_amount: string
    nca_no: string
    year: string
    remarks: string
}

interface BulkResult {
    created_count: number
    skipped_count: number
    created: { row: number; saro_no: string; pap_code: string; item_id: number; saro_created: boolean; pap_found: boolean }[]
    skipped: { row: number; saro_no: string; pap_code: string; reason: string }[]
}

function parsePastedRows(raw: string): ParsedRow[] {
    const lines = raw.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
    const rows: ParsedRow[] = []

    for (const line of lines) {
        const cols = line.split('\t')

        // Auto-detect if the first column is a row number — if so, shift everything by 1.
        // Without #: PARTICULARS=0, PURPOSE=1, PAP=2, FUND=3, YEAR=4, CLASS=5,
        //            SARO NO=6, SARO YEAR=7, NTCA DATE=8, NTCA NO=9, NTCA AMOUNT=10, NCA NO=11, REMARKS=12
        // With #:    same but every index +1
        const o = /^\d+$/.test((cols[0] ?? '').trim()) ? 1 : 0

        const saroNo  = (cols[6 + o] ?? '').trim()
        const papCode = (cols[2 + o] ?? '').trim()
        if (!saroNo && !papCode) continue  // skip fully empty lines

        // Convert MM/DD/YYYY → YYYY-MM-DD
        const rawDate = (cols[8 + o] ?? '').trim()
        let ncaDate = ''
        if (rawDate) {
            const m = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
            ncaDate = m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : rawDate
        }

        rows.push({
            row:        rows.length + 1,
            saro_no:    saroNo,
            pap_code:   papCode,
            particulars: (cols[0 + o] ?? '').trim(),
            purpose:    (cols[1 + o] ?? '').trim(),
            fund_type:  (cols[3 + o] ?? '').trim(),
            class_type: (cols[5 + o] ?? '').trim(),
            nca_date:   ncaDate,
            nta_no:     (cols[9 + o] ?? '').trim(),
            nca_amount: (cols[10 + o] ?? '').replace(/,/g, '').trim(),
            nca_no:     (cols[11 + o] ?? '').trim(),
            year:       (cols[4 + o] ?? '').trim(),
            remarks:    (cols[12 + o] ?? '').trim(),
        })
    }
    return rows
}

function BulkImportNTCADialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [step, setStep]         = useState<'paste' | 'preview' | 'result'>('paste')
    const [raw, setRaw]           = useState('')
    const [rows, setRows]         = useState<ParsedRow[]>([])
    const [result, setResult]     = useState<BulkResult | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError]       = useState('')

    const handleParse = () => {
        const parsed = parsePastedRows(raw)
        if (parsed.length === 0) { setError('No valid rows detected. Make sure you copied from the correct spreadsheet.'); return }
        setError('')
        setRows(parsed)
        setStep('preview')
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')
        try {
            const payload = rows.map(r => ({
                saro_no:    r.saro_no,
                pap_code:   r.pap_code,
                particulars: r.particulars,
                purpose:    r.purpose,
                fund_type:  r.fund_type,
                class_type: r.class_type,
                nca_date:   r.nca_date || null,
                nta_no:     r.nta_no,
                nca_amount: r.nca_amount ? parseFloat(r.nca_amount) : null,
                nca_no:     r.nca_no,
                year:       r.year ? parseInt(r.year, 10) : null,
                remarks:    r.remarks,
            }))
            const res = await efasApi.post('received-saro/ntca/bulk/', { rows: payload })
            setResult(res.data)
            setStep('result')
            onSaved()
        } catch {
            setError('Failed to submit. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl rounded-xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 shrink-0">
                    <div>
                        <h2 className="text-sm font-gbold text-foreground">Bulk Import NTCA</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {step === 'paste'   && 'Paste spreadsheet rows (copy directly from Google Sheets or Excel).'}
                            {step === 'preview' && `${rows.length} row${rows.length !== 1 ? 's' : ''} parsed — review before importing.`}
                            {step === 'result'  && 'Import complete.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-0 px-5 py-3 border-b border-border bg-muted/10 shrink-0 text-xs">
                    {(['paste', 'preview', 'result'] as const).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            {i > 0 && <div className="w-8 h-px bg-border mx-1" />}
                            <span className={`px-2.5 py-1 rounded-full font-gmedium ${step === s ? 'bg-primary text-white' : 'text-muted-foreground'}`}>
                                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* ── Step 1: Paste ── */}
                    {step === 'paste' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground">
                                Expected columns (in order) — the leading <span className="font-gmedium text-foreground">#</span> column is optional and will be detected automatically:
                                <span className="font-gmedium text-foreground"> PARTICULARS, PURPOSE, PAP, FUND SOURCE, YEAR, CLASS, SARO NO., SARO YEAR, NTCA DATE, NTCA NO., NTCA AMOUNT, NCA NO., REMARKS</span>
                            </p>
                            <textarea
                                className="w-full h-64 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                placeholder="Paste rows from your spreadsheet here…"
                                value={raw}
                                onChange={e => { setRaw(e.target.value); setError('') }}
                            />
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                    )}

                    {/* ── Step 2: Preview ── */}
                    {step === 'preview' && (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
                                <thead>
                                    <tr className="bg-primary text-white">
                                        {['#', 'SARO NO.', 'PAP CODE', 'NTCA DATE', 'NTCA NO.', 'NTCA AMOUNT', 'NCA NO.', 'YEAR', 'REMARKS'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left font-gbold whitespace-nowrap border-r border-white/20">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className={`border-b border-border/30 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                                            <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{r.row}</td>
                                            <td className="px-3 py-1.5 font-gmedium text-primary/80">{r.saro_no || '—'}</td>
                                            <td className="px-3 py-1.5">{r.pap_code || '—'}</td>
                                            <td className="px-3 py-1.5">{r.nca_date || '—'}</td>
                                            <td className="px-3 py-1.5">{r.nta_no || '—'}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                                {r.nca_amount ? parseFloat(r.nca_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5">{r.nca_no || '—'}</td>
                                            <td className="px-3 py-1.5">{r.year || '—'}</td>
                                            <td className="px-3 py-1.5 max-w-[200px]">
                                                <span className="line-clamp-1 text-foreground/70">{r.remarks || '—'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Step 3: Result ── */}
                    {step === 'result' && result && (() => {
                        const createdMap = new Map(result.created.map(c => [c.row, c]))
                        const skippedMap = new Map(result.skipped.map(s => [s.row, s]))
                        const allRows = rows.map(r => ({
                            row:     r.row,
                            saro_no: r.saro_no,
                            pap_code: r.pap_code,
                            created: createdMap.get(r.row),
                            skipped: skippedMap.get(r.row),
                        }))
                        return (
                            <div className="flex flex-col gap-4">
                                {/* Summary cards */}
                                <div className="grid grid-cols-2 gap-3 shrink-0">
                                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                                        <Plus size={24} className="text-blue-500 shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Created</p>
                                            <p className="text-xl font-gbold text-foreground">{result.created_count}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                                        <AlertTriangle size={24} className={result.skipped_count > 0 ? 'text-amber-500 shrink-0' : 'text-muted-foreground shrink-0'} />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Skipped (no SARO NO.)</p>
                                            <p className="text-xl font-gbold text-foreground">{result.skipped_count}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* All-rows combined table */}
                                <div className="rounded-lg border border-border overflow-hidden">
                                    <table className="w-full text-xs" style={{ minWidth: 600 }}>
                                        <thead>
                                            <tr className="bg-primary text-white">
                                                <th className="px-3 py-2 text-left font-gbold border-r border-white/20 w-8">#</th>
                                                <th className="px-3 py-2 text-left font-gbold border-r border-white/20">SARO NO.</th>
                                                <th className="px-3 py-2 text-left font-gbold border-r border-white/20">PAP CODE</th>
                                                <th className="px-3 py-2 text-left font-gbold border-r border-white/20">STATUS</th>
                                                <th className="px-3 py-2 text-left font-gbold">DETAIL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allRows.map((r, i) => (
                                                <tr key={i} className={`border-t border-border/30 ${r.skipped ? 'bg-amber-500/5' : r.created?.saro_created ? 'bg-orange-500/5' : 'bg-blue-500/5'}`}>
                                                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{r.row}</td>
                                                    <td className="px-3 py-1.5 font-gmedium">{r.saro_no || '—'}</td>
                                                    <td className="px-3 py-1.5">{r.pap_code || '—'}</td>
                                                    <td className="px-3 py-1.5">
                                                        {r.skipped
                                                            ? <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-gmedium"><AlertTriangle size={11} /> Skipped</span>
                                                            : r.created?.saro_created
                                                            ? <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-gmedium"><Plus size={11} /> Created (new SARO)</span>
                                                            : <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-gmedium"><Plus size={11} /> Created</span>
                                                        }
                                                    </td>
                                                    <td className="px-3 py-1.5 text-muted-foreground">
                                                        {r.skipped
                                                            ? r.skipped.reason
                                                            : r.created?.saro_created
                                                            ? 'SARO auto-created from import'
                                                            : r.created?.pap_found ? 'PAP matched' : 'PAP code stored as description'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {error && step !== 'paste' && <p className="px-5 pb-2 text-xs text-destructive shrink-0">{error}</p>}

                {/* Footer */}
                <div className="flex justify-between items-center gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
                    <div>
                        {step === 'preview' && (
                            <button
                                onClick={() => setStep('paste')}
                                className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition"
                            >
                                ← Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition"
                        >
                            {step === 'result' ? 'Close' : 'Cancel'}
                        </button>
                        {step === 'paste' && (
                            <button
                                onClick={handleParse}
                                disabled={!raw.trim()}
                                className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                Parse →
                            </button>
                        )}
                        {step === 'preview' && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                                Import {rows.length} row{rows.length !== 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Table columns config ─────────────────────────────────────────────────────

const COLS = [
    { key: 'particulars', label: 'PARTICULARS', width: 220 },
    { key: 'purpose', label: 'PURPOSE', width: 240 },
    { key: 'pap_code', label: 'PAP', width: 160 },
    { key: 'fund_type', label: 'FUND SOURCE', width: 180 },
    { key: 'year', label: 'YEAR', width: 60 },
    { key: 'class_type', label: 'CLASS', width: 80 },
    { key: 'saro_no', label: 'SARO NO.', width: 150 },
    { key: 'saro_year', label: 'SARO YEAR', width: 80 },
    { key: 'nca_date', label: 'NTCA DATE', width: 110 },
    { key: 'nta_no', label: 'NTCA NO.', width: 110 },
    { key: 'nca_amount', label: 'NTCA AMOUNT', width: 130 },
    { key: 'nca_no', label: 'NCA NO.', width: 90 },
    { key: 'remarks', label: 'REMARKS', width: 260 },
]

// ─── Main Container ───────────────────────────────────────────────────────────

export default function ReceivedNTCAContainer() {
    const [data, setData] = useState<NTCAResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState('')
    const [saroYear, setSaroYear] = useState('')
    const [classType, setClassType] = useState('')
    const [search, setSearch] = useState('')
    const [debSearch, setDebSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [editItem, setEditItem] = useState<NTCAItem | null>(null)
    const [panelItem, setPanelItem] = useState<NTCAItem | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [showArchived, setShowArchived] = useState(false)
    const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Drag-to-scroll
    const wrapRef = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollX = useRef(0)

    useEffect(() => { fetchData() }, [year, saroYear, classType, debSearch, showArchived, dateFrom, dateTo])

    useEffect(() => {
        if (debRef.current) clearTimeout(debRef.current)
        debRef.current = setTimeout(() => setDebSearch(search), 350)
        return () => { if (debRef.current) clearTimeout(debRef.current) }
    }, [search])

    const fetchData = async () => {
        setLoading(true)
        setSelectedIds(new Set())
        try {
            const p = new URLSearchParams()
            if (year) p.set('year', year)
            if (saroYear) p.set('saro_year', saroYear)
            if (classType) p.set('class_type', classType)
            if (debSearch) p.set('search', debSearch)
            if (dateFrom) p.set('date_from', dateFrom)
            if (dateTo) p.set('date_to', dateTo)
            p.set('archived', String(showArchived))
            const res = await efasApi.get(`received-saro/ntca/?${p}`)
            setData(res.data)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }

    const toggleSelect = (id: number) => setSelectedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })

    const toggleSelectAll = () => {
        const allSelected = items.length > 0 && items.every(it => selectedIds.has(it.id))
        setSelectedIds(allSelected ? new Set() : new Set(items.map(it => it.id)))
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this NTCA record?')) return
        try {
            await efasApi.delete(`received-saro/ntca/${id}/`)
            if (panelItem?.id === id) setPanelItem(null)
            fetchData()
        } catch { /* silent */ }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Delete ${selectedIds.size} selected NTCA record(s)?`)) return
        try {
            await Promise.all([...selectedIds].map(id => efasApi.delete(`received-saro/ntca/${id}/`)))
            fetchData()
        } catch { /* silent */ }
    }

    const handleBulkArchiveAction = async (action: 'archive' | 'restore') => {
        if (selectedIds.size === 0) return
        const label = action === 'archive' ? 'Archive' : 'Restore'
        if (!window.confirm(`${label} ${selectedIds.size} selected NTCA record(s)?`)) return
        try {
            await efasApi.post('received-saro/ntca/bulk-action/', { action, ids: [...selectedIds] })
            fetchData()
        } catch { /* silent */ }
    }

    const handleSingleArchiveAction = async (id: number, action: 'archive' | 'restore') => {
        try {
            await efasApi.post('received-saro/ntca/bulk-action/', { action, ids: [id] })
            if (panelItem?.id === id) setPanelItem(null)
            fetchData()
        } catch { /* silent */ }
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current || !wrapRef.current) return
            wrapRef.current.scrollLeft = scrollX.current - (e.clientX - dragStartX.current)
        }
        const onUp = () => {
            dragging.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [])

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true
        dragStartX.current = e.clientX
        scrollX.current = wrapRef.current?.scrollLeft ?? 0
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
    }

    const items = data?.results ?? []
    const classTypes = [...new Set(items.map(r => r.class_type).filter(Boolean))].sort()
    const allSelected = items.length > 0 && items.every(it => selectedIds.has(it.id))

    const activeYear = year ? parseInt(year) : currentYear
    const QUARTERS = [
        { label: 'Q1', from: `${activeYear}-01-01`, to: `${activeYear}-03-31` },
        { label: 'Q2', from: `${activeYear}-04-01`, to: `${activeYear}-06-30` },
        { label: 'Q3', from: `${activeYear}-07-01`, to: `${activeYear}-09-30` },
        { label: 'Q4', from: `${activeYear}-10-01`, to: `${activeYear}-12-31` },
    ]
    const activeQ = QUARTERS.find(q => q.from === dateFrom && q.to === dateTo)?.label ?? null

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-gbold text-foreground">Received NTCA</h1>
                    <p className="text-sm text-muted-foreground">
                        Notice of Transfer of Cash Allocation — all recorded NTCA receipts from Received SAROs.
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <>
                            {showArchived ? (
                                <button
                                    onClick={() => handleBulkArchiveAction('restore')}
                                    className="shrink-0 h-9 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-gmedium text-white hover:bg-emerald-600/90 transition shadow-sm"
                                >
                                    <ArchiveRestore size={15} />
                                    Restore ({selectedIds.size})
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleBulkArchiveAction('archive')}
                                    className="shrink-0 h-9 flex items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-gmedium text-white hover:bg-amber-500/90 transition shadow-sm"
                                >
                                    <Archive size={15} />
                                    Archive ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={handleBulkDelete}
                                className="shrink-0 h-9 flex items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-gmedium text-white hover:bg-destructive/90 transition shadow-sm"
                            >
                                <Trash2 size={15} />
                                Delete ({selectedIds.size})
                            </button>
                        </>
                    )}
                    {!showArchived && (
                        <>
                            <button
                                onClick={() => setShowBulk(true)}
                                className="shrink-0 h-9 flex items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-gmedium text-foreground hover:bg-muted transition shadow-sm"
                            >
                                <Upload size={15} />
                                Bulk Import
                            </button>
                            <button
                                onClick={() => setShowAdd(true)}
                                className="shrink-0 h-9 flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-gmedium text-white hover:bg-primary/90 transition shadow-sm"
                            >
                                <Plus size={15} />
                                Add NTCA
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Summary cards ── */}
            {data && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 px-5 py-4 flex flex-col gap-1">
                        <span className="text-xs font-gmedium text-teal-600 dark:text-teal-400 uppercase tracking-widest">Total NTCA Amount</span>
                        <span className="text-2xl font-gbold text-foreground">{fmt(data.total_amount)}</span>
                        <span className="text-xs text-muted-foreground">{data.count} record{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-4 flex flex-col gap-1">
                        <span className="text-xs font-gmedium text-blue-600 dark:text-blue-400 uppercase tracking-widest">Unique SAROs</span>
                        <span className="text-2xl font-gbold text-foreground">
                            {new Set(items.map(r => r.saro_no)).size}
                        </span>
                        <span className="text-xs text-muted-foreground">across {data.count} records</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 flex flex-col gap-1">
                        <span className="text-xs font-gmedium text-amber-600 dark:text-amber-400 uppercase tracking-widest">Unique PAPs</span>
                        <span className="text-2xl font-gbold text-foreground">
                            {new Set(items.map(r => r.pap_code).filter(Boolean)).size}
                        </span>
                        <span className="text-xs text-muted-foreground">program / activity / project</span>
                    </div>
                </div>
            )}

            {/* ── Filters ── */}
            <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
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
                <div className="relative">
                    <select
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background pl-3 pr-7 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                    >
                        <option value="">All NCA Years</option>
                        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                <div className="relative">
                    <select
                        value={saroYear}
                        onChange={e => setSaroYear(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background pl-3 pr-7 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                    >
                        <option value="">All SARO Years</option>
                        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                <div className="relative">
                    <select
                        value={classType}
                        onChange={e => setClassType(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background pl-3 pr-7 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                    >
                        <option value="">All Classes</option>
                        {classTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search PAP, SARO, NTCA No…"
                        className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="h-9 flex items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── Date range row ── */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-gmedium text-muted-foreground whitespace-nowrap">NTCA Date:</span>
                {QUARTERS.map(q => (
                    <button
                        key={q.label}
                        onClick={() => { setDateFrom(q.from); setDateTo(q.to) }}
                        className={`h-8 px-3 rounded-lg text-xs font-gmedium border transition ${
                            activeQ === q.label
                                ? 'bg-primary text-white border-primary'
                                : 'bg-background text-foreground/80 border-border hover:bg-muted'
                        }`}
                    >
                        {q.label} {activeYear}
                    </button>
                ))}
                <span className="text-xs text-muted-foreground mx-1">|</span>
                <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {(dateFrom || dateTo) && (
                    <button
                        onClick={() => { setDateFrom(''); setDateTo('') }}
                        className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition"
                    >
                        <X size={11} /> Clear
                    </button>
                )}
            </div>
            </div>

            {/* ── Table + Panel ── */}
            <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                            <RefreshCw size={16} className="animate-spin mr-2" />Loading…
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-sm text-muted-foreground">
                            <p>No NTCA records found.</p>
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 text-primary hover:underline text-xs"
                            >
                                <Plus size={13} /> Add the first NTCA record
                            </button>
                        </div>
                    ) : (
                        <div
                            ref={wrapRef}
                            onMouseDown={onMouseDown}
                            className="overflow-x-auto cursor-grab active:cursor-grabbing"
                        >
                            <table className="w-full border-collapse text-sm" style={{ minWidth: 1900 }}>
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-primary text-white">
                                        <th className="sticky left-0 z-20 bg-primary px-3 py-2.5 text-center border-r border-white/20 w-10">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                                className="rounded cursor-pointer accent-white"
                                            />
                                        </th>
                                        <th className="px-3 py-2.5 text-left font-gmedium text-white whitespace-nowrap border-r border-white/20 w-8">#</th>
                                        {COLS.map(col => (
                                            <th
                                                key={col.key}
                                                className="px-3 py-2.5 text-left font-gmedium text-white whitespace-nowrap border-r border-white/20"
                                                style={{ minWidth: col.width }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="sticky right-0 z-20 bg-primary px-3 py-2.5 text-center font-gmedium text-white whitespace-nowrap min-w-[80px] border-l border-white/20">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <TableRow
                                            key={item.id}
                                            item={item}
                                            idx={idx}
                                            selected={selectedIds.has(item.id)}
                                            isPanelSelected={panelItem?.id === item.id}
                                            showArchived={showArchived}
                                            onToggle={() => toggleSelect(item.id)}
                                            onEdit={() => setEditItem(item)}
                                            onDelete={() => handleDelete(item.id)}
                                            onArchive={() => handleSingleArchiveAction(item.id, 'archive')}
                                            onRestore={() => handleSingleArchiveAction(item.id, 'restore')}
                                            onRowClick={() => setPanelItem(item)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {panelItem && (
                    <NTCADetailPanel
                        item={panelItem}
                        showArchived={showArchived}
                        onClose={() => setPanelItem(null)}
                        onEdit={() => { setEditItem(panelItem); setPanelItem(null) }}
                        onDelete={() => { handleDelete(panelItem.id); setPanelItem(null) }}
                        onArchiveAction={(action) => { handleSingleArchiveAction(panelItem.id, action); setPanelItem(null) }}
                    />
                )}
            </div>

            {/* ── Dialogs ── */}
            {showBulk && <BulkImportNTCADialog onClose={() => setShowBulk(false)} onSaved={fetchData} />}
            {showAdd && <AddNTCADialog onClose={() => setShowAdd(false)} onSaved={fetchData} />}
            {editItem && <EditDialog item={editItem} onClose={() => setEditItem(null)} onSaved={() => { fetchData(); setEditItem(null) }} />}
        </div>
    )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
            <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-xs font-gsemibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
        </div>
    )
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

function NTCADetailPanel({ item, showArchived, onClose, onEdit, onDelete, onArchiveAction }: {
    item: NTCAItem
    showArchived: boolean
    onClose: () => void
    onEdit: () => void
    onDelete: () => void
    onArchiveAction: (action: 'archive' | 'restore') => void
}) {
    const [panelWidth, setPanelWidth] = useState(460)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(460)

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isResizing.current) return
            const delta = startX.current - e.clientX
            setPanelWidth(Math.max(320, Math.min(640, startWidth.current + delta)))
        }
        const onUp = () => { isResizing.current = false }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
    }, [])

    return (
        <div className="shrink-0 sticky top-4 max-h-[calc(100vh-8rem)] flex" style={{ width: panelWidth }}>
            {/* Resize handle */}
            <div
                className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors rounded-l-xl"
                onMouseDown={e => {
                    isResizing.current = true
                    startX.current = e.clientX
                    startWidth.current = panelWidth
                    e.preventDefault()
                }}
            />

            <div className="flex-1 border border-border rounded-lg bg-card flex flex-col overflow-hidden min-w-0 shadow-lg">

                {/* ── Header ── */}
                <div className="px-5 pt-4 pb-4 border-b border-border shrink-0 bg-card">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[11px] font-gsemibold tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                    Received NTCA
                                </span>
                                {item.nca_date && (
                                    <span className="text-xs text-muted-foreground">{fmtDate(item.nca_date)}</span>
                                )}
                            </div>
                            <p className="text-lg font-gbold text-blue-600 dark:text-blue-400 leading-tight line-clamp-2" title={item.particulars}>
                                {item.particulars || '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-gbold text-primary">{item.saro_no}</span>
                                {item.class_type && (
                                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-[10px] font-gmedium">{item.class_type}</span>
                                )}
                                {item.year != null && (
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-gmedium">{item.year}</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-0.5 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    {/* Amount card */}
                    <div className="mt-3 rounded-lg bg-teal-500/10 border border-teal-500/30 px-4 py-3">
                        <p className="text-[10px] font-gsemibold text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-0.5">NTCA Amount</p>
                        <p className="text-2xl font-gbold text-foreground">₱{fmt(item.nca_amount)}</p>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

                    {/* NTCA Details */}
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-1 h-4 rounded-full bg-primary shrink-0" />
                            <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">NTCA Details</p>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <InfoCell label="NTCA Date" value={fmtDate(item.nca_date)} />
                                <InfoCell label="NTA No." value={item.nta_no || '—'} highlight />
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <InfoCell label="NCA No." value={item.nca_no || '—'} />
                                <InfoCell label="SARO No." value={item.saro_no} highlight />
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <InfoCell label="SARO Year" value={item.saro_year || '—'} />
                                <InfoCell label="Year" value={item.year != null ? String(item.year) : '—'} />
                            </div>
                        </div>
                    </div>

                    {/* Item Details */}
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-1 h-4 rounded-full bg-amber-500/70 shrink-0" />
                            <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">Item Details</p>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <InfoCell label="PAP Code" value={item.pap_code || '—'} highlight />
                                <InfoCell label="Class Type" value={item.class_type || '—'} />
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <InfoCell label="Fund Source" value={item.fund_type || '—'} />
                                <InfoCell label="Year" value={item.year != null ? String(item.year) : '—'} />
                            </div>
                            {item.purpose && (
                                <div className="border-t border-border px-4 py-3">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Purpose</p>
                                    <p className="text-xs text-foreground leading-relaxed">{item.purpose}</p>
                                </div>
                            )}
                            {item.remarks && (
                                <div className="border-t border-border px-4 py-3">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Remarks</p>
                                    <p className="text-xs text-foreground leading-relaxed">{item.remarks}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Footer Actions ── */}
                <div className="flex gap-2 px-4 py-3 border-t border-border bg-card/80 backdrop-blur shrink-0">
                    {showArchived ? (
                        <button
                            onClick={() => onArchiveAction('restore')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
                        >
                            <ArchiveRestore size={14} /> Restore NTCA
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onEdit}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
                            >
                                <Pencil size={14} /> Edit NTCA
                            </button>
                            <button
                                onClick={() => onArchiveAction('archive')}
                                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-gsemibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                                title="Archive NTCA"
                            >
                                <Archive size={14} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-sm font-gsemibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

// Opaque backgrounds for sticky/header cells — prevents scrolled content from bleeding through
const STICKY_BG = {
    default:  'hsl(var(--card))',
    striped:  'color-mix(in srgb, hsl(var(--muted)) 10%, hsl(var(--card)))',
    selected: 'color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--card)))',
    totalRow: 'color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--card)))',
} as const

function TableRow({ item, idx, selected, isPanelSelected, showArchived, onToggle, onEdit, onDelete, onArchive, onRestore, onRowClick }: {
    item: NTCAItem; idx: number
    selected: boolean; isPanelSelected: boolean; showArchived: boolean; onToggle: () => void
    onEdit: () => void; onDelete: () => void; onArchive: () => void; onRestore: () => void; onRowClick: () => void
}) {
    const striped  = idx % 2 === 1
    const rowBg    = isPanelSelected ? 'bg-primary/10' : selected ? 'bg-primary/5' : striped ? 'bg-muted/10' : ''
    const stickyBg = isPanelSelected ? STICKY_BG.selected : selected ? STICKY_BG.selected : striped ? STICKY_BG.striped : STICKY_BG.default

    return (
        <tr onClick={onRowClick} className={`border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer ${rowBg}`}>
            {/* Checkbox — sticky left, always opaque */}
            <td
                className="sticky left-0 z-10 px-3 py-2 text-center border-r border-border/30 w-10"
                style={{ background: stickyBg }}
            >
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggle}
                    onClick={e => e.stopPropagation()}
                    className="rounded cursor-pointer accent-primary"
                />
            </td>

            {/* # */}
            <td className="px-3 py-2 text-muted-foreground text-right tabular-nums border-r border-border/30 w-8">
                {idx + 1}
            </td>

            {/* PARTICULARS */}
            <td className="px-3 py-2 border-r border-border/20 align-top" style={{ minWidth: 220, maxWidth: 220 }}>
                <span className="line-clamp-2 text-foreground/85" title={item.particulars}>{item.particulars || '—'}</span>
            </td>

            {/* PURPOSE */}
            <td className="px-3 py-2 border-r border-border/20 align-top" style={{ minWidth: 240, maxWidth: 240 }}>
                <span className="line-clamp-2 text-foreground/70" title={item.purpose}>{item.purpose || '—'}</span>
            </td>

            {/* PAP */}
            <td className="px-3 py-2 border-r border-border/20 align-top">
                <span className="font-gmedium text-foreground/85">{item.pap_code || '—'}</span>
            </td>

            {/* FUND SOURCE */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/70">{item.fund_type || '—'}</td>

            {/* YEAR */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/80">{item.year ?? '—'}</td>

            {/* CLASS */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/70">{item.class_type || '—'}</td>

            {/* SARO NO. */}
            <td className="px-3 py-2 border-r border-border/20 align-top">
                <span className="font-gmedium text-primary/80">{item.saro_no}</span>
            </td>

            {/* SARO YEAR */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/70">{item.saro_year || '—'}</td>

            {/* NTCA DATE */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/80">{fmtDate(item.nca_date)}</td>

            {/* NTCA NO. */}
            <td className="px-3 py-2 border-r border-border/20 align-top">
                {item.nta_no
                    ? <span className="font-gmedium text-primary/80">{item.nta_no}</span>
                    : <span className="text-muted-foreground">—</span>
                }
            </td>

            {/* NTCA AMOUNT */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-right tabular-nums font-gbold text-foreground">
                {fmt(item.nca_amount)}
            </td>

            {/* NCA NO. */}
            <td className="px-3 py-2 border-r border-border/20 align-top text-foreground/80">{item.nca_no || '—'}</td>

            {/* REMARKS */}
            <td className="px-3 py-2 border-r border-border/20 align-top" style={{ minWidth: 260, maxWidth: 260 }}>
                <span className="line-clamp-2 text-foreground/60" title={item.remarks}>{item.remarks || '—'}</span>
            </td>

            {/* Action — sticky right, always opaque */}
            <td
                className="sticky right-0 z-10 px-3 py-2 text-center align-top border-l border-border/30"
                style={{ background: stickyBg }}
            >
                <div className="flex items-center justify-center gap-1">
                    {showArchived ? (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); onRestore() }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition"
                                title="Restore"
                            >
                                <ArchiveRestore size={13} />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onDelete() }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                title="Delete"
                            >
                                <Trash2 size={13} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); onEdit() }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                                title="Edit NTCA fields"
                            >
                                <Pencil size={13} />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onArchive() }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition"
                                title="Archive"
                            >
                                <Archive size={13} />
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); onDelete() }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
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
}
