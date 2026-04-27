import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import efasApi from '@/plugin/efasApi'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Eye, Search, X, ExternalLink } from 'lucide-react'
import AddRaodDialog from './dialogs/AddRaodDialog'
import ViewRaodDialog from './dialogs/ViewRaodDialog'
import UpdateRaodDialog from './dialogs/UpdateRaodDialog'
import RaodDetailPanel from './RaodDetailPanel'

export interface ClassType { id: number; code: string; name: string; money_range_min: string | null; money_range_max: string | null }
export interface FundSource { id: number; code: string; name: string; is_sagf: boolean; sagf_type: string | null }
export interface Ntca {
    id: number
    ntca_no: string
    date_of_ntca: string
    amount: string
    saro_no: string
    particulars: string
    purpose: string
    nca_no: string
    remarks: string
    fund_source_detail: FundSource | null
    class_type_detail: ClassType | null
}
export interface PAP { id: number; code: string; name: string; particular: string; fund: number | null; class_type: number | null; fund_detail: FundSource | null; class_type_detail: ClassType | null }
export interface ObjectCode { id: number; code: string; description: string }
export interface SaroGroup {
    saro_no: string
    date_of_saro: string
    pap: string
    pap_code: string
    purpose: string
    year: number | null
    object_description: string
    object_code: string
    amount_of_allotment: string
    fund_source: number | null
    fund_source_detail: FundSource | null
    class_type: number | null
    class_type_detail: ClassType | null
    entries: Saro[]
    total_obligated: number
    unobligated: number
}
export interface Saro {
    id: number
    pap: string
    pap_code: string
    purpose: string
    year: number | null
    date_of_saro: string
    saro_no: string
    amount_of_allotment: string
    remarks: string
    object_description: string
    object_code: string
    date_of_obligation: string | null
    fund_type_description: string
    class_type: number | null
    class_type_detail: ClassType | null
    fund_source: number | null
    fund_source_detail: FundSource | null
    ors_no: string
    name_of_claimant: string
    particulars: string
    obligated_amount: string | null
    date: string | null
    ada_check: string
    cash: string | null
    non_tra: string | null
    balance: string | null
}

function formatPHP(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function RaodMainContainer() {
    const [saros, setSaros] = useState<Saro[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [fundSources, setFundSources] = useState<FundSource[]>([])
    const [paps, setPaps] = useState<PAP[]>([])
    const [objectCodes, setObjectCodes] = useState<ObjectCode[]>([])
    const [receivedSaroNos, setReceivedSaroNos] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [addObligationTarget, setAddObligationTarget] = useState<SaroGroup | null>(null)
    const [viewTarget, setViewTarget] = useState<Saro | null>(null)
    const [editTarget, setEditTarget] = useState<Saro | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const [detailGroup, setDetailGroup] = useState<SaroGroup | null>(null)
    const [detailNtcas, setDetailNtcas] = useState<Ntca[]>([])

    const location = useLocation()

    // ── Search & filter state ─────────────────────────────────────────────────
    const [search, setSearch] = useState('')
    const [filterFundSource, setFilterFundSource] = useState('')
    const [filterClassType, setFilterClassType] = useState('')
    const [filterSaroNo, setFilterSaroNo] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [saroRes, ctRes, fsRes, papRes, recRes, ocRes] = await Promise.all([
                efasApi.get('saro/saros/'),
                efasApi.get('saro/class-types/'),
                efasApi.get('saro/fund-sources/'),
                efasApi.get('saro/paps/'),
                efasApi.get('saro/received-saros/'),
                efasApi.get('saro/object-codes/'),
            ])
            setSaros(saroRes.data)
            setClassTypes(ctRes.data)
            setFundSources(fsRes.data)
            setPaps(papRes.data)
            setReceivedSaroNos((recRes.data as { saro_no: string }[]).map(r => r.saro_no))
            setObjectCodes(ocRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this RAOD record?')) return
        await efasApi.delete(`saro/saros/${id}/`)
        fetchAll()
    }

    // ── Group saros by saro_no ────────────────────────────────────────────────
    const groups = useMemo<SaroGroup[]>(() => {
        const map = new Map<string, SaroGroup>()
        saros.forEach(s => {
            const key = s.saro_no || `__id_${s.id}`
            if (!map.has(key)) {
                map.set(key, {
                    saro_no: s.saro_no,
                    date_of_saro: s.date_of_saro,
                    pap: s.pap,
                    pap_code: s.pap_code,
                    purpose: s.purpose,
                    year: s.year,
                    object_description: s.object_description,
                    object_code: s.object_code,
                    amount_of_allotment: s.amount_of_allotment,
                    fund_source: s.fund_source,
                    fund_source_detail: s.fund_source_detail,
                    class_type: s.class_type,
                    class_type_detail: s.class_type_detail,
                    entries: [],
                    total_obligated: 0,
                    unobligated: 0,
                })
            }
            const g = map.get(key)!
            g.entries.push(s)
            g.total_obligated += parseFloat(s.obligated_amount || '0')
        })
        map.forEach(g => {
            g.unobligated = parseFloat(g.amount_of_allotment || '0') - g.total_obligated
        })
        return Array.from(map.values())
    }, [saros])

    // Fetch NTCAs for the selected SARO
    useEffect(() => {
        if (!detailGroup?.saro_no) { setDetailNtcas([]); return }
        efasApi.get(`saro/ntcas/?saro_no=${encodeURIComponent(detailGroup.saro_no)}`)
            .then(r => setDetailNtcas(r.data))
            .catch(() => setDetailNtcas([]))
    }, [detailGroup?.saro_no])

    // Auto-open detail panel from navigation state (e.g. from Dashboard "View Full Report")
    useEffect(() => {
        const openSaroNo = (location.state as { openSaroNo?: string } | null)?.openSaroNo
        if (openSaroNo && groups.length > 0) {
            const g = groups.find(gr => gr.saro_no === openSaroNo)
            if (g) setDetailGroup(g)
        }
    }, [location.state, groups])

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    // ── Filtered groups ───────────────────────────────────────────────────────
    const q = search.toLowerCase()
    const filteredGroups = groups.filter(g => {
        const matchSearch = !q ||
            [g.saro_no, g.pap, g.pap_code, g.object_code, g.object_description]
                .some(v => (v ?? '').toLowerCase().includes(q)) ||
            g.entries.some(e => [e.ors_no, e.name_of_claimant, e.particulars]
                .some(v => (v ?? '').toLowerCase().includes(q)))
        const matchFundSource = !filterFundSource || String(g.fund_source) === filterFundSource
        const matchClassType = !filterClassType || String(g.class_type) === filterClassType
        const matchSaroNo = !filterSaroNo || g.saro_no === filterSaroNo
        return matchSearch && matchFundSource && matchClassType && matchSaroNo
    })

    const hasFilters = search || filterFundSource || filterClassType || filterSaroNo
    const clearFilters = () => { setSearch(''); setFilterFundSource(''); setFilterClassType(''); setFilterSaroNo('') }

    const sel = 'rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
    const actBtn = 'p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground'

    return (
        <div className={`flex gap-4 items-start ${detailGroup ? '' : ''}`}>
            {/* ── Main content ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-gbold text-foreground">RAOD</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Registry of Allotments, Obligations and Disbursements</p>
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                    >
                        <Plus size={16} /> Add RAOD
                    </button>
                </div>

                {/* ── Search & Filters ─────────────────────────────────────────── */}
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-end gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search SARO No., PAP, ORS No., Claimant..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-md bg-background border border-input pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                        />
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-muted-foreground font-gmedium uppercase tracking-wide">SARO No.</span>
                            <select value={filterSaroNo} onChange={e => setFilterSaroNo(e.target.value)} className={sel}>
                                <option value="">All</option>
                                {[...new Set(saros.map(s => s.saro_no).filter(Boolean))].sort().map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-muted-foreground font-gmedium uppercase tracking-wide">Fund Source</span>
                            <select value={filterFundSource} onChange={e => setFilterFundSource(e.target.value)} className={sel}>
                                <option value="">All</option>
                                {fundSources.map(fs => <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-muted-foreground font-gmedium uppercase tracking-wide">Class Type</span>
                            <select value={filterClassType} onChange={e => setFilterClassType(e.target.value)} className={sel}>
                                <option value="">All</option>
                                {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.code} - {ct.name}</option>)}
                            </select>
                        </div>
                        {hasFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition border border-border">
                                <X size={13} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Main Grouped Table ───────────────────────────────────────── */}
                <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                            {saros.length === 0 ? 'No RAOD records found.' : 'No records match your search.'}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase">
                                    <th className="px-2 py-3 w-8"></th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Allotment No.</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Program</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Description</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Obj. Code</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Obligated</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Unobligated</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGroups.map((g) => {
                                    const key = g.saro_no || `__id_${g.entries[0]?.id}`
                                    const isExpanded = expandedGroups.has(key)
                                    const amount = parseFloat(g.amount_of_allotment || '0')
                                    const pct = amount > 0 ? Math.min(100, (g.total_obligated / amount) * 100) : 0

                                    return (
                                        <>
                                            <tr
                                                key={key}
                                                className="border-b border-border hover:bg-muted/20 transition cursor-pointer"
                                                onClick={() => toggleGroup(key)}
                                            >
                                                <td className="px-2 py-3 text-center text-muted-foreground">
                                                    {isExpanded
                                                        ? <ChevronDown size={14} />
                                                        : <ChevronRight size={14} />}
                                                </td>
                                                <td className="px-4 py-3 font-gmedium text-foreground whitespace-nowrap">{g.saro_no || '—'}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{g.date_of_saro}</td>
                                                <td className="px-4 py-3 text-foreground whitespace-nowrap max-w-[140px] truncate">{g.pap_code}</td>
                                                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{g.object_description || g.pap || '—'}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{g.object_code || '—'}</td>
                                                <td className="px-4 py-3 text-right font-gmedium text-foreground whitespace-nowrap">{formatPHP(g.amount_of_allotment)}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-gmedium">{formatPHP(String(g.total_obligated))}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <span className={g.unobligated >= 0 ? 'text-amber-500 dark:text-amber-400' : 'text-destructive'}>
                                                        {formatPHP(String(g.unobligated))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setAddObligationTarget(g)}
                                                            title="Add Obligation"
                                                            className="p-1.5 rounded hover:bg-primary/10 transition text-muted-foreground hover:text-primary"
                                                        ><Plus size={14} /></button>
                                                        <button onClick={() => setEditTarget(g.entries[0])} title="Edit SARO" className={actBtn}><Pencil size={14} /></button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm(`Delete all ${g.entries.length} record(s) under SARO ${g.saro_no}?`)) return
                                                                await Promise.all(g.entries.map(e => efasApi.delete(`saro/saros/${e.id}/`)))
                                                                fetchAll()
                                                            }}
                                                            title="Delete SARO group"
                                                            className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"
                                                        ><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Obligations Breakdown ──────────────────── */}
                                            {isExpanded && (
                                                <tr key={`${key}-exp`}>
                                                    <td colSpan={10} className="bg-muted/10 border-b border-border px-6 py-5">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-gbold text-foreground uppercase tracking-wide">Obligations Breakdown</span>
                                                                <span className="text-[11px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-gmedium">{g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Total Obligated</div>
                                                                    <div className="text-sm font-gbold text-emerald-600 dark:text-emerald-400">{formatPHP(String(g.total_obligated))}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Remaining</div>
                                                                    <div className={`text-sm font-gbold ${g.unobligated >= 0 ? 'text-amber-500' : 'text-destructive'}`}>{formatPHP(String(g.unobligated))}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Utilization bar */}
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] text-muted-foreground">Utilization</span>
                                                                <span className="text-[10px] text-amber-500 font-gbold">{pct.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Obligations sub-table */}
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-muted-foreground uppercase border-b border-border tracking-wide">
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">#</th>
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">Claimant</th>
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">Date</th>
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">ORS No.</th>
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">Class / Fund</th>
                                                                    <th className="pb-2 pr-4 text-right font-gmedium">Obligated</th>
                                                                    <th className="pb-2 pr-4 text-right font-gmedium">Remaining Balance</th>
                                                                    <th className="pb-2 pr-4 text-left font-gmedium">Particulars</th>
                                                                    <th className="pb-2 text-left"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {/* Initial Allotment row */}
                                                                <tr className="border-b border-border/40">
                                                                    <td className="py-2 pr-4 text-muted-foreground">—</td>
                                                                    <td className="py-2 pr-4 font-gmedium text-muted-foreground uppercase tracking-wide" colSpan={4}>Initial Allotment</td>
                                                                    <td className="py-2 pr-4 text-right text-muted-foreground">—</td>
                                                                    <td className="py-2 pr-4 text-right text-emerald-600 dark:text-emerald-400 font-gmedium">{formatPHP(g.amount_of_allotment)}</td>
                                                                    <td className="py-2 pr-4" />
                                                                    <td />
                                                                </tr>
                                                                {/* Obligation entries with running balance */}
                                                                {(() => {
                                                                    let running = parseFloat(g.amount_of_allotment || '0')
                                                                    return g.entries.map((entry, idx) => {
                                                                        const obAmt = parseFloat(entry.obligated_amount || '0')
                                                                        running -= obAmt
                                                                        return (
                                                                            <tr key={entry.id} className="border-b border-border/40 hover:bg-muted/30 transition">
                                                                                <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                                                                                <td className="py-2 pr-4 text-foreground whitespace-nowrap max-w-[160px] truncate">{entry.name_of_claimant || '—'}</td>
                                                                                <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{entry.date_of_obligation || '—'}</td>
                                                                                <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{entry.ors_no || '—'}</td>
                                                                                <td className="py-2 pr-4">
                                                                                    {(entry.class_type_detail || entry.fund_source_detail)
                                                                                        ? <span className="bg-muted/80 rounded px-1.5 py-0.5 font-gmedium">{[entry.class_type_detail?.code, entry.fund_source_detail?.code].filter(Boolean).join(' / ')}</span>
                                                                                        : <span className="text-muted-foreground">—</span>}
                                                                                </td>
                                                                                <td className="py-2 pr-4 text-right text-foreground font-gmedium">{formatPHP(entry.obligated_amount)}</td>
                                                                                <td className="py-2 pr-4 text-right font-gmedium">
                                                                                    <span className={running >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>{formatPHP(String(running))}</span>
                                                                                </td>
                                                                                <td className="py-2 pr-4 text-muted-foreground max-w-[220px] truncate">{entry.particulars || '—'}</td>
                                                                                <td className="py-2">
                                                                                    <div className="flex items-center gap-1">
                                                                                        <button onClick={() => setViewTarget(entry)} className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Eye size={12} /></button>
                                                                                        <button onClick={() => setEditTarget(entry)} className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                                                                                        <button onClick={() => handleDelete(entry.id)} className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })
                                                                })()}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="border-t border-border">
                                                                    <td colSpan={5} className="pt-2 pr-4 text-muted-foreground uppercase font-gbold tracking-wide">Totals</td>
                                                                    <td className="pt-2 pr-4 text-right font-gbold text-foreground">{formatPHP(String(g.total_obligated))}</td>
                                                                    <td className="pt-2 pr-4 text-right font-gbold">
                                                                        <span className={g.unobligated >= 0 ? 'text-amber-500' : 'text-destructive'}>{formatPHP(String(g.unobligated))}</span>
                                                                    </td>
                                                                    <td /><td />
                                                                </tr>
                                                            </tfoot>
                                                        </table>

                                                        {/* View Full Report button */}
                                                        <div className="flex justify-end mt-3 pt-3 border-t border-border/40">
                                                            <button
                                                                onClick={() => { setDetailGroup(g); setExpandedGroups(prev => { const n = new Set(prev); n.delete(key); return n }) }}
                                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-gmedium"
                                                            >
                                                                View Full Report <ExternalLink size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {showAdd && (
                    <AddRaodDialog
                        classTypes={classTypes}
                        fundSources={fundSources}
                        paps={paps}
                        saros={saros}
                        objectCodes={objectCodes}
                        receivedSaroNos={receivedSaroNos}
                        onClose={() => setShowAdd(false)}
                        onSaved={fetchAll}
                    />
                )}
                {addObligationTarget && (
                    <AddRaodDialog
                        classTypes={classTypes}
                        fundSources={fundSources}
                        paps={paps}
                        saros={saros}
                        objectCodes={objectCodes}
                        receivedSaroNos={receivedSaroNos}
                        saroGroup={addObligationTarget}
                        onClose={() => setAddObligationTarget(null)}
                        onSaved={fetchAll}
                    />
                )}
                {viewTarget && (
                    <ViewRaodDialog saro={viewTarget} onClose={() => setViewTarget(null)} />
                )}
                {editTarget && (
                    <UpdateRaodDialog
                        saro={editTarget}
                        classTypes={classTypes}
                        fundSources={fundSources}
                        paps={paps}
                        objectCodes={objectCodes}
                        onClose={() => setEditTarget(null)}
                        onSaved={() => { fetchAll(); setDetailGroup(prev => prev ? groups.find(g => g.saro_no === prev.saro_no) ?? null : null) }}
                    />
                )}
            </div>  {/* end main content */}

            {/* ── Side Detail Panel ────────────────────────────────────────── */}
            {detailGroup && (
                <div className="w-[440px] shrink-0 sticky top-0 self-start rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
                    style={{ height: 'calc(100vh - 5.5rem)' }}
                >
                    <RaodDetailPanel
                        group={groups.find(g => g.saro_no === detailGroup.saro_no) ?? detailGroup}
                        ntcas={detailNtcas}
                        onClose={() => setDetailGroup(null)}
                        onView={setViewTarget}
                        onEdit={setEditTarget}
                        onDelete={async (id) => {
                            if (!window.confirm('Delete this obligation entry?')) return
                            await efasApi.delete(`saro/saros/${id}/`)
                            fetchAll()
                        }}
                        onAddObligation={() => setAddObligationTarget(detailGroup)}
                    />
                </div>
            )}
        </div>
    )
}
