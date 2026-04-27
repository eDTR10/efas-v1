import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Search, X, Archive, ArchiveRestore, ChevronDown } from 'lucide-react'
import efasApi from '@/plugin/efasApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassType { id: number; code: string; name: string }
interface FundSource { id: number; code: string; name: string }

interface SaroOption {
    id: number
    saro_no: string
    pap: string
    pap_code: string
    purpose: string
    year: number | null
    fund_source: number | null
    class_type: number | null
    date_of_saro: string
}

interface NTCARecord {
    id: number
    particulars: string
    purpose: string
    pap_code: string
    fund_source: number | null
    fund_source_detail: FundSource | null
    year: number | null
    class_type: number | null
    class_type_detail: ClassType | null
    saro_no: string
    saro_year: number | null
    date_of_ntca: string
    ntca_no: string
    amount: string
    nca_no: string
    remarks: string
    is_archived: boolean
}

const emptyForm = {
    particulars: '',
    purpose: '',
    pap_code: '',
    fund_source: '',
    year: String(new Date().getFullYear()),
    class_type: '',
    saro_no: '',
    saro_year: String(new Date().getFullYear()),
    date_of_ntca: '',
    ntca_no: '',
    amount: '',
    nca_no: '',
    remarks: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPHP(val: string | number | null) {
    if (val === null || val === undefined || val === '') return '—'
    const n = typeof val === 'number' ? val : parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) }
    catch { return d }
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
const inpDisabled = 'w-full rounded-md bg-muted/50 border border-input px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-none'
const inpSm = inp + ' py-1.5 text-xs'

// ─── SearchDropdown ───────────────────────────────────────────────────────────

function SearchDropdown({
    options, value, onChange, onSelect, placeholder, required,
}: {
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
    onSelect: (v: string) => void
    placeholder?: string
    required?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = query
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options

    return (
        <div ref={ref} className="relative">
            <input
                type="text"
                required={required}
                placeholder={placeholder}
                className={inp}
                value={open ? query : value}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
                onFocus={() => { setQuery(''); setOpen(true) }}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-40 w-full mt-1 bg-card border border-border rounded-md shadow-xl max-h-56 overflow-y-auto">
                    {filtered.map(o => (
                        <div
                            key={o.value}
                            onMouseDown={e => { e.preventDefault(); onSelect(o.value); setQuery(''); setOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition ${o.value === value ? 'bg-primary/10 text-primary font-gmedium' : 'text-foreground'}`}
                        >
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────

function NTCADialog({
    mode,
    record,
    classTypes,
    fundSources,
    saros,
    onClose,
    onSaved,
}: {
    mode: 'add' | 'edit'
    record?: NTCARecord
    classTypes: ClassType[]
    fundSources: FundSource[]
    saros: SaroOption[]
    onClose: () => void
    onSaved: () => void
}) {
    const [form, setForm] = useState(() => {
        if (record) {
            return {
                particulars: record.particulars,
                purpose: record.purpose,
                pap_code: record.pap_code,
                fund_source: record.fund_source ? String(record.fund_source) : '',
                year: record.year ? String(record.year) : '',
                class_type: record.class_type ? String(record.class_type) : '',
                saro_no: record.saro_no,
                saro_year: record.saro_year ? String(record.saro_year) : '',
                date_of_ntca: record.date_of_ntca,
                ntca_no: record.ntca_no,
                amount: record.amount,
                nca_no: record.nca_no,
                remarks: record.remarks,
            }
        }
        return emptyForm
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    // Track whether a SARO was matched (for field locking)
    const [saroMatched, setSaroMatched] = useState<boolean>(() => {
        if (record) return saros.some(s => s.saro_no === record.saro_no)
        return false
    })

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    // Auto-fill fields when SARO No. is selected from dropdown
    const handleSaroSelect = (saroNo: string) => {
        const found = saros.find(s => s.saro_no === saroNo)
        if (!found) { set('saro_no', saroNo); setSaroMatched(false); return }
        const saroYear = found.year
            ? String(found.year)
            : found.date_of_saro ? String(new Date(found.date_of_saro).getFullYear()) : ''
        setForm(prev => ({
            ...prev,
            saro_no: found.saro_no,
            particulars: found.pap || prev.particulars,
            purpose: found.purpose || prev.purpose,
            pap_code: found.pap_code || prev.pap_code,
            fund_source: found.fund_source ? String(found.fund_source) : prev.fund_source,
            year: found.year ? String(found.year) : prev.year,
            class_type: found.class_type ? String(found.class_type) : prev.class_type,
            saro_year: saroYear || prev.saro_year,
        }))
        setSaroMatched(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const payload = {
                ...form,
                fund_source: form.fund_source || null,
                class_type: form.class_type || null,
                year: form.year ? parseInt(form.year) : null,
                saro_year: form.saro_year ? parseInt(form.saro_year) : null,
            }
            if (mode === 'edit' && record) {
                await efasApi.patch(`saro/ntcas/${record.id}/`, payload)
            } else {
                await efasApi.post('saro/ntcas/', payload)
            }
            onSaved()
            onClose()
        } catch (err: any) {
            setError(JSON.stringify(err.response?.data || 'Error saving.'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="font-gbold text-foreground text-lg">
                        {mode === 'edit' ? 'Edit NTCA Record' : 'Add NTCA Record'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>
                    )}

                    {/* Row: Particulars + Purpose */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Particulars <span className="text-destructive">*</span></label>
                            <input className={saroMatched ? inpDisabled : inp} value={form.particulars} onChange={e => set('particulars', e.target.value)} readOnly={saroMatched} required placeholder="PAP / program name" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Purpose</label>
                            <input className={saroMatched ? inpDisabled : inp} value={form.purpose} onChange={e => set('purpose', e.target.value)} readOnly={saroMatched} placeholder="Payment of…" />
                        </div>
                    </div>

                    {/* Row: PAP Code + Fund Source */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">PAP Code</label>
                            <input className={saroMatched ? inpDisabled : inp} value={form.pap_code} onChange={e => set('pap_code', e.target.value)} readOnly={saroMatched} placeholder="e.g. 200000100002000" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Fund Source</label>
                            {saroMatched
                                ? <input className={inpDisabled} value={fundSources.find(f => String(f.id) === form.fund_source)?.name ?? ''} readOnly />
                                : <select className={inp} value={form.fund_source} onChange={e => set('fund_source', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {fundSources.map(f => (
                                        <option key={f.id} value={String(f.id)}>{f.name}</option>
                                    ))}
                                </select>}
                        </div>
                    </div>

                    {/* Row: Year + Class */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Year</label>
                            <input type="number" className={saroMatched ? inpDisabled : inp} value={form.year} onChange={e => set('year', e.target.value)} readOnly={saroMatched} placeholder="2026" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Class</label>
                            {saroMatched
                                ? <input className={inpDisabled} value={classTypes.find(c => String(c.id) === form.class_type)?.code ?? ''} readOnly />
                                : <select className={inp} value={form.class_type} onChange={e => set('class_type', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {classTypes.map(c => (
                                        <option key={c.id} value={String(c.id)}>{c.code}</option>
                                    ))}
                                </select>}
                        </div>
                    </div>

                    {/* Row: SARO No. (dropdown with auto-fill) + SARO Year */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">
                                SARO No. <span className="text-xs normal-case text-primary/70">(auto-fills fields)</span>
                            </label>
                            <SearchDropdown
                                options={saros.map(s => ({ value: s.saro_no, label: `${s.saro_no}${s.pap ? ` — ${s.pap.substring(0, 40)}` : ''}` }))}
                                value={form.saro_no}
                                onChange={v => set('saro_no', v)}
                                onSelect={handleSaroSelect}
                                placeholder="e.g. 2026-01-0031"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">SARO Year</label>
                            <input type="number" className={inp} value={form.saro_year} onChange={e => set('saro_year', e.target.value)} placeholder="2026" />
                        </div>
                    </div>

                    {/* Row: NTCA Date + NTCA No. */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">NTCA Date <span className="text-destructive">*</span></label>
                            <input type="date" className={inp} value={form.date_of_ntca} onChange={e => set('date_of_ntca', e.target.value)} required />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">NTCA No. <span className="text-destructive">*</span></label>
                            <input className={inp} value={form.ntca_no} onChange={e => set('ntca_no', e.target.value)} required placeholder="e.g. 26-01-011" />
                        </div>
                    </div>

                    {/* Row: NTCA Amount + NCA No. */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">NTCA Amount <span className="text-destructive">*</span></label>
                            <input type="number" step="0.01" className={inp} value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">NCA No.</label>
                            <input className={inp} value={form.nca_no} onChange={e => set('nca_no', e.target.value)} placeholder="e.g. 771" />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Remarks</label>
                        <textarea rows={2} className={inp + ' resize-none'} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Additional notes…" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-gmedium hover:bg-muted transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50">
                            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── View Dialog ──────────────────────────────────────────────────────────────

function ViewDialog({ record, onClose }: { record: NTCARecord; onClose: () => void }) {
    const rows: [string, string][] = [
        ['Particulars', record.particulars || '—'],
        ['Purpose', record.purpose || '—'],
        ['PAP Code', record.pap_code || '—'],
        ['Fund Source', record.fund_source_detail?.name || '—'],
        ['Year', record.year ? String(record.year) : '—'],
        ['Class', record.class_type_detail?.code || '—'],
        ['SARO No.', record.saro_no || '—'],
        ['SARO Year', record.saro_year ? String(record.saro_year) : '—'],
        ['NTCA Date', fmtDate(record.date_of_ntca)],
        ['NTCA No.', record.ntca_no],
        ['NTCA Amount', fmtPHP(record.amount)],
        ['NCA No.', record.nca_no || '—'],
        ['Remarks', record.remarks || '—'],
    ]
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-gbold text-foreground">View NTCA Record</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-2 max-h-[75vh] overflow-y-auto">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex gap-3 py-1.5 border-b border-border/40 last:border-0">
                            <span className="text-xs font-gmedium text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
                            <span className="text-sm text-foreground break-words flex-1">{value}</span>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-border flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-gmedium hover:bg-muted transition">Close</button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Container ───────────────────────────────────────────────────────────

export default function NTCAMainContainer() {
    const [records, setRecords] = useState<NTCARecord[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [fundSources, setFundSources] = useState<FundSource[]>([])
    const [saros, setSaros] = useState<SaroOption[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterFundSource, setFilterFundSource] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [dialog, setDialog] = useState<'add' | 'edit' | 'view' | null>(null)
    const [active, setActive] = useState<NTCARecord | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    const onDragStart = (e: React.MouseEvent) => {
        isDragging.current = true
        dragStartX.current = e.clientX
        scrollStartX.current = tableRef.current?.scrollLeft ?? 0
    }
    const onDragMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !tableRef.current) return
        tableRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current)
    }
    const onDragEnd = () => { isDragging.current = false }

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [nRes, ctRes, fsRes, saroRes] = await Promise.all([
                efasApi.get(`saro/ntcas/?archived=${showArchived}`),
                efasApi.get('saro/class-types/'),
                efasApi.get('saro/fund-sources/'),
                efasApi.get('saro/saros/'),
            ])
            setRecords(nRes.data)
            setClassTypes(ctRes.data)
            setFundSources(fsRes.data)
            // Deduplicate SAROs by saro_no, keeping the first occurrence
            const seen = new Set<string>()
            const unique: SaroOption[] = []
                ; (saroRes.data as SaroOption[]).forEach(s => {
                    if (!seen.has(s.saro_no)) { seen.add(s.saro_no); unique.push(s) }
                })
            setSaros(unique)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [showArchived])

    const handleDelete = async (r: NTCARecord) => {
        if (!window.confirm(`Delete NTCA record "${r.ntca_no}"?`)) return
        await efasApi.delete(`saro/ntcas/${r.id}/`)
        fetchAll()
    }

    const handleArchive = async (r: NTCARecord) => {
        const url = `saro/ntcas/${r.id}/${r.is_archived ? 'unarchive' : 'archive'}/`
        await efasApi.post(url)
        fetchAll()
    }

    const q = search.toLowerCase()
    const filtered = records.filter(r => {
        if (q && !(
            r.ntca_no.toLowerCase().includes(q) ||
            r.particulars.toLowerCase().includes(q) ||
            r.saro_no.toLowerCase().includes(q) ||
            r.pap_code.toLowerCase().includes(q) ||
            r.nca_no.toLowerCase().includes(q)
        )) return false
        if (filterYear && String(r.year) !== filterYear) return false
        if (filterFundSource && String(r.fund_source) !== filterFundSource) return false
        if (filterClass && String(r.class_type) !== filterClass) return false
        return true
    })

    const totalAmount = filtered.reduce((s, r) => s + parseFloat(r.amount || '0'), 0)

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">NTCA Records</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Notice of Transfer of Cash Allocation</p>
                </div>
                <button
                    onClick={() => { setActive(null); setDialog('add') }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-gmedium px-4 py-2 rounded-lg hover:bg-primary/90 transition shrink-0"
                >
                    <Plus size={15} /> Add NTCA
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search NTCA No., PAP, SARO No., NCA No.…"
                        className={inpSm + ' pl-8 pr-8'}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={13} />
                        </button>
                    )}
                </div>
                {/* Year filter */}
                <div className="relative">
                    <select
                        value={filterYear}
                        onChange={e => setFilterYear(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-gmedium cursor-pointer hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">All Years</option>
                        {Array.from(new Set(records.map(r => r.year).filter(Boolean))).sort((a, b) => (b ?? 0) - (a ?? 0)).map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {/* Fund Source filter */}
                <div className="relative">
                    <select
                        value={filterFundSource}
                        onChange={e => setFilterFundSource(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-gmedium cursor-pointer hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-primary max-w-[180px] truncate"
                    >
                        <option value="">All Fund Sources</option>
                        {fundSources.map(f => (
                            <option key={f.id} value={String(f.id)}>{f.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {/* Class filter */}
                <div className="relative">
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground font-gmedium cursor-pointer hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">All Classes</option>
                        {classTypes.map(c => (
                            <option key={c.id} value={String(c.id)}>{c.code}</option>
                        ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <button
                    onClick={() => setShowArchived(v => !v)}
                    className={`flex items-center gap-1.5 text-xs font-gmedium px-3 py-2 rounded-lg border transition ${showArchived ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'border-border hover:bg-muted text-muted-foreground'}`}
                >
                    {showArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div
                    ref={tableRef}
                    className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={onDragStart}
                    onMouseMove={onDragMove}
                    onMouseUp={onDragEnd}
                    onMouseLeave={onDragEnd}
                >
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground w-8">#</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground min-w-[160px]">Particulars</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground min-w-[140px]">Purpose</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground">PAP</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground">Fund Source</th>
                                <th className="px-3 py-3 text-center font-gmedium text-muted-foreground">Year</th>
                                <th className="px-3 py-3 text-center font-gmedium text-muted-foreground">Class</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground">SARO No.</th>
                                <th className="px-3 py-3 text-center font-gmedium text-muted-foreground">SARO Year</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground">NTCA Date</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground">NTCA No.</th>
                                <th className="px-3 py-3 text-right font-gmedium text-muted-foreground">NTCA Amount</th>
                                <th className="px-3 py-3 text-center font-gmedium text-muted-foreground">NCA No.</th>
                                <th className="px-3 py-3 text-left font-gmedium text-muted-foreground min-w-[120px]">Remarks</th>
                                <th className="px-3 py-3 text-center font-gmedium text-muted-foreground w-24 sticky right-0 bg-muted/40 z-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={15} className="py-16 text-center text-muted-foreground">Loading…</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="py-16 text-center text-muted-foreground">
                                        {search ? 'No records match your search.' : 'No NTCA records yet. Click "Add NTCA" to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, idx) => (
                                    <tr key={r.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition ${r.is_archived ? 'opacity-50' : ''}`}>
                                        <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                                        <td className="px-3 py-2.5 font-gmedium text-foreground max-w-[200px]">
                                            <span className="line-clamp-2" title={r.particulars}>{r.particulars || '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground max-w-[200px]">
                                            <span className="line-clamp-2" title={r.purpose}>{r.purpose || '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-foreground whitespace-nowrap">{r.pap_code || '—'}</td>
                                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.fund_source_detail?.name || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-foreground">{r.year ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            {r.class_type_detail ? (
                                                <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-gmedium whitespace-nowrap">
                                                    {r.class_type_detail.code}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.saro_no || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-foreground">{r.saro_year ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{fmtDate(r.date_of_ntca)}</td>
                                        <td className="px-3 py-2.5 font-gmedium text-primary whitespace-nowrap">{r.ntca_no}</td>
                                        <td className="px-3 py-2.5 text-right font-gbold text-foreground whitespace-nowrap">{fmtPHP(r.amount)}</td>
                                        <td className="px-3 py-2.5 text-center text-foreground">{r.nca_no || '—'}</td>
                                        <td className="px-3 py-2.5 text-muted-foreground max-w-[160px]">
                                            <span className="line-clamp-2" title={r.remarks}>{r.remarks || '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 sticky right-0 bg-card z-10 border-l border-border/40">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => { setActive(r); setDialog('view') }}
                                                    className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                                    title="View"
                                                ><Eye size={13} /></button>
                                                <button
                                                    onClick={() => { setActive(r); setDialog('edit') }}
                                                    className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-primary"
                                                    title="Edit"
                                                ><Pencil size={13} /></button>
                                                <button
                                                    onClick={() => handleArchive(r)}
                                                    className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-amber-500"
                                                    title={r.is_archived ? 'Unarchive' : 'Archive'}
                                                >{r.is_archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
                                                <button
                                                    onClick={() => handleDelete(r)}
                                                    className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-destructive"
                                                    title="Delete"
                                                ><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs font-gmedium text-muted-foreground bg-muted/20">
                    <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ''}</span>
                    <span className="text-foreground font-gbold">
                        Total: {totalAmount > 0 ? `₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                </div>
            </div>

            {/* Dialogs */}
            {(dialog === 'add' || dialog === 'edit') && (
                <NTCADialog
                    mode={dialog}
                    record={active ?? undefined}
                    classTypes={classTypes}
                    fundSources={fundSources}
                    saros={saros}
                    onClose={() => { setDialog(null); setActive(null) }}
                    onSaved={fetchAll}
                />
            )}
            {dialog === 'view' && active && (
                <ViewDialog
                    record={active}
                    onClose={() => { setDialog(null); setActive(null) }}
                />
            )}
        </div>
    )
}
