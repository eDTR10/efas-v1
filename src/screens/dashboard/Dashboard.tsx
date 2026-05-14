import { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { FileText, Search, TrendingUp, Layers, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import efasApi from '@/plugin/axios'
import ProjectDetailPanel from './ProjectDetailPanel'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReceivedSAROItem {
    id: number
    pap: number | null
    pap_code: string
    pap_name: string
    description: string
    class_type: string
    fund_type: string
    object_code_no: string
    object_code_desc: string
    amount: string
    purpose: string
    nca_amount: string
    nca_date: string | null
    nta_no: string
    balance: string
}

interface ReceivedSARO {
    id: number
    date_recd_in_email: string
    date_of_saro: string
    allotment_no: string
    class_type: string
    notes_validity: string
    total_amount: string
    items: ReceivedSAROItem[]
    created_at: string
    updated_at: string
}

interface RAODEntry {
    id: number
    obligated_amount: string
    total_disbursed: string
    balance: string
    class_type: string
    fund_type_description: string
    name_of_claimant: string
    ors_no: string
    date_of_obligation: string | null
    particulars: string
    cash: string
    non_tra: string
}

interface RAODRecord {
    id: number
    pap_name: string
    pap_code: string
    saro_no: string
    amount_of_allotment: string
    entries: RAODEntry[]
}

/** Derived per-PAP aggregate */
interface PAPStat {
    name: string
    code: string
    allotment: number
    obligation: number   // sum of nca_amount
    balance: number
    itemCount: number
    saroNos: string[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtPHP(v: number) {
    return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
function pct(num: number, den: number) {
    return den === 0 ? 0 : Math.round((num / den) * 100)
}
function parseN(v: string | null) {
    if (!v) return 0
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
}

// ─── Realtime Badge ─────────────────────────────────────────────────────────────

function RealtimeBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-gbold text-green-500 uppercase tracking-[0.15em]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Realtime
        </span>
    )
}

// ─── Financial Overview Card ────────────────────────────────────────────────────

function FinancialCard({
    title, rows, accentClass, onClick,
}: {
    title: string
    rows: { label: string; value: string; highlight?: boolean; color?: string; sub?: string; barPct?: number }[]
    accentClass: string  // e.g. 'border-t-blue-500'
    onClick?: () => void
}) {
    return (
        <div
            className={`bg-card border border-border border-t-2 ${accentClass} rounded-xl flex flex-col min-w-0 overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="px-5 pt-4 pb-2 flex items-start justify-between shrink-0">
                <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em] leading-tight">{title}</p>
                <RealtimeBadge />
            </div>
            <div className="px-5 pb-4 flex flex-col">
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`${row.highlight ? 'pt-2 mt-2 border-t border-border/50' : 'py-0.5'}`}
                    >
                        <div className="flex items-baseline justify-between">
                            <span className={`text-[10px] font-gbold uppercase tracking-wide ${row.highlight ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                                {row.label}
                            </span>
                            <div className="text-right">
                                <span className={`font-gbold tabular-nums ${row.highlight ? 'text-xl' : 'text-sm'} ${row.color ?? 'text-foreground'}`}>
                                    {row.value}
                                </span>
                                {row.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{row.sub}</p>}
                            </div>
                        </div>
                        {row.barPct !== undefined && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${row.barPct >= 80 ? 'bg-green-500' : row.barPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min(100, Math.max(0, row.barPct))}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-gbold w-8 text-right tabular-nums ${row.barPct >= 80 ? 'text-green-500' : row.barPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>
                                    {row.barPct.toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, sub, icon: Icon = TrendingUp, badge }: {
    title: string
    sub?: string
    icon?: React.ElementType
    badge?: React.ReactNode
}) {
    return (
        <div className="flex items-start justify-between mb-1">
            <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={15} className="text-primary" />
                </div>
                <div>
                    <p className="text-sm font-gbold text-foreground uppercase tracking-wide">{title}</p>
                    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
                </div>
            </div>
            {badge}
        </div>
    )
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
    page: number
    total: number
    pageSize: number
    onChange: (p: number) => void
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)
    return (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground">
                {total === 0 ? 'No results' : `${start}–${end} of ${total}`}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page <= 1}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronLeft size={13} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                        if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push('…')
                        acc.push(p)
                        return acc
                    }, [])
                    .map((p, i) =>
                        p === '…'
                            ? <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-muted-foreground">…</span>
                            : <button
                                key={p}
                                onClick={() => onChange(p as number)}
                                className={`h-7 min-w-[28px] px-1.5 rounded-md text-[11px] font-gbold border transition ${page === p
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                    }`}
                            >{p}</button>
                    )
                }
                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page >= totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronRight size={13} />
                </button>
            </div>
        </div>
    )
}

// ─── Financial Status Overview ────────────────────────────────────────────────

function FinancialStatusOverview({ stats }: { stats: PAPStat[] }) {
    const data = [...stats]
        .sort((a, b) => b.allotment - a.allotment)
        .slice(0, 8)
        .map(s => ({
            name: s.name.length > 32 ? s.name.slice(0, 30) + '…' : s.name,
            Allotment: s.allotment,
            Obligation: s.obligation,
        }))

    if (data.length === 0) return (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No data yet.</div>
    )

    return (
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 68)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 80, left: 10, bottom: 0 }} barSize={9} barGap={3}>
                <XAxis
                    type="number"
                    tickFormatter={v => `₱${(v / 1e6).toFixed(0)}M`}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} tickLine={false}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} tickLine={false}
                />
                <Tooltip
                    formatter={(val, name) => [fmtPHP(Number(val)), name]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                />
                <Bar dataKey="Allotment" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Obligation" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// ─── Program Performance ──────────────────────────────────────────────────────

const PAP_PAGE_SIZE = 5

function ProgramPerformanceCard({ stats, onSelectPap }: { stats: PAPStat[]; onSelectPap: (s: PAPStat) => void }) {
    const [search, setSearch] = useState('')
    const [utilFilter, setUtilFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All')
    const [page, setPage] = useState(1)

    const filtered = [...stats]
        .sort((a, b) => b.allotment - a.allotment)
        .filter(s => {
            const q = search.toLowerCase()
            const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
            const u = pct(s.obligation, s.allotment)
            const matchUtil = utilFilter === 'All' ||
                (utilFilter === 'High' && u >= 80) ||
                (utilFilter === 'Medium' && u >= 50 && u < 80) ||
                (utilFilter === 'Low' && u < 50)
            return matchSearch && matchUtil
        })

    const pageItems = filtered.slice((page - 1) * PAP_PAGE_SIZE, page * PAP_PAGE_SIZE)

    // Reset to page 1 when filters change
    const handleSearch = (v: string) => { setSearch(v); setPage(1) }
    const handleUtil = (v: typeof utilFilter) => { setUtilFilter(v); setPage(1) }

    return (
        <>
            <SectionHeader
                title="Program / PAP Performance"
                sub="Ranked by allotment — NCA utilization efficiency"
                icon={Layers}
            />
            {/* Search + Filter */}
            <div className="flex gap-2 mt-4 mb-3">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search PAP name or code…"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                </div>
                <select
                    value={utilFilter}
                    onChange={e => handleUtil(e.target.value as typeof utilFilter)}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                >
                    <option value="All">All Utilization</option>
                    <option value="High">High (≥80%)</option>
                    <option value="Medium">Medium (50–79%)</option>
                    <option value="Low">Low (&lt;50%)</option>
                </select>
            </div>
            {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No results found.</div>
            ) : (
                <>
                    <div className="flex flex-col gap-3 overflow-y-auto">
                        {pageItems.map((stat, i) => {
                            const globalRank = (page - 1) * PAP_PAGE_SIZE + i + 1
                            const utilPct = pct(stat.obligation, stat.allotment)
                            return (
                                <div
                                    key={stat.name}
                                    className="border border-border rounded-xl px-4 py-3 bg-background cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                                    onClick={() => onSelectPap(stat)}
                                >
                                    <div className="flex items-start gap-3 mb-2.5">
                                        <span className="shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-gbold flex items-center justify-center mt-0.5">
                                            {globalRank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-gbold text-foreground truncate leading-snug">{stat.name}</p>
                                                <ExternalLink size={11} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Allotment</span>
                                                <span className="text-[11px] font-gbold text-foreground">{fmtPHP(stat.allotment)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-9">
                                        <div className="flex items-center justify-between text-[10px] mb-1">
                                            <span className="text-muted-foreground uppercase tracking-wide">NCA Utilization</span>
                                            <span className={`font-gbold ${utilPct >= 80 ? 'text-green-500' : utilPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>
                                                {utilPct}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${utilPct >= 80 ? 'bg-green-500' : utilPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'}`}
                                                style={{ width: `${Math.min(utilPct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Pagination page={page} total={filtered.length} pageSize={PAP_PAGE_SIZE} onChange={setPage} />
                </>
            )}
        </>
    )
}

// ─── Active SARO Tracking ─────────────────────────────────────────────────────

const SARO_PAGE_SIZE = 10

function ActiveTrackingCard({ saros }: { saros: ReceivedSARO[] }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'All' | 'NCA Issued' | 'Received'>('All')
    const [classFilter, setClassFilter] = useState('All')
    const [page, setPage] = useState(1)

    // Collect unique class types from these saros
    const classOptions = [...new Set(
        saros.flatMap(s => [s.class_type, ...s.items.map(i => i.class_type)]).filter(Boolean)
    )].sort()

    // Flatten to items for display
    const allRows = saros.flatMap(s =>
        s.items.length > 0
            ? s.items.map(item => ({ saro: s, item }))
            : [{ saro: s, item: null as ReceivedSAROItem | null }]
    )

    const filtered = allRows.filter(({ saro, item }) => {
        const q = search.toLowerCase().trim()
        const matchSearch = !q ||
            saro.allotment_no.toLowerCase().includes(q) ||
            (item?.pap_code ?? '').toLowerCase().includes(q) ||
            (item?.description ?? '').toLowerCase().includes(q) ||
            (item?.nta_no ?? '').toLowerCase().includes(q)

        const hasNca = item ? parseN(item.nca_amount) > 0 : false
        const matchStatus = statusFilter === 'All' ||
            (statusFilter === 'NCA Issued' && hasNca) ||
            (statusFilter === 'Received' && !hasNca)

        const rowClass = item?.class_type || saro.class_type || ''
        const matchClass = classFilter === 'All' || rowClass === classFilter

        return matchSearch && matchStatus && matchClass
    })

    const pageRows = filtered.slice((page - 1) * SARO_PAGE_SIZE, page * SARO_PAGE_SIZE)

    const handleSearch = (v: string) => { setSearch(v); setPage(1) }
    const handleStatus = (v: typeof statusFilter) => { setStatusFilter(v); setPage(1) }
    const handleClass = (v: string) => { setClassFilter(v); setPage(1) }

    return (
        <>
            <div className="flex items-start justify-between">
                <SectionHeader
                    title="Received SARO Tracking"
                    sub="Full line-item registry for all received SAROs"
                    icon={FileText}
                />
                <RealtimeBadge />
            </div>
            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2 mt-4 mb-3">
                <div className="relative flex-1 min-w-[160px]">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search allotment no., PAP, description…"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => handleStatus(e.target.value as typeof statusFilter)}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                >
                    <option value="All">All Status</option>
                    <option value="NCA Issued">NCA Issued</option>
                    <option value="Received">Received</option>
                </select>
                {classOptions.length > 0 && (
                    <select
                        value={classFilter}
                        onChange={e => handleClass(e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                    >
                        <option value="All">All Classes</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">#</th>
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">Class</th>
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">Allotment No. / PAP</th>
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">Status</th>
                            <th className="text-right px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Amount (₱)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No records found.</td></tr>
                        ) : pageRows.map(({ saro, item }, i) => {
                            const globalIdx = (page - 1) * SARO_PAGE_SIZE + i + 1
                            return (
                                <tr key={`${saro.id}-${item?.id ?? 'empty'}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-2 py-2.5 text-muted-foreground font-gbold text-[11px]">#{String(globalIdx).padStart(2, '0')}</td>
                                    <td className="px-2 py-2.5">
                                        {(item?.class_type || saro.class_type)
                                            ? <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded text-[10px] font-gsemibold">{item?.class_type || saro.class_type}</span>
                                            : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-2 py-2.5 max-w-[260px]">
                                        <p className="font-gbold text-primary truncate text-xs">{saro.allotment_no}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{item?.pap_code ? `${item.pap_code} · ${item.description || '—'}` : (item?.description || 'No items')}</p>
                                    </td>
                                    <td className="px-2 py-2.5">
                                        {item && parseN(item.nca_amount) > 0
                                            ? <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">NCA ISSUED</span>
                                            : <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">RECEIVED</span>}
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-gbold text-foreground text-xs tabular-nums">
                                        {fmtPHP(parseN(item?.amount ?? saro.total_amount))}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} total={filtered.length} pageSize={SARO_PAGE_SIZE} onChange={setPage} />
        </>
    )
}

// ─── RAOD Financial Overview ──────────────────────────────────────────────────

function PctBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    )
}

function RAODOverview({ raods, onNavigateRaod }: { raods: RAODRecord[]; onNavigateRaod: (saroNo: string) => void }) {
    const totalAllotment = raods.reduce((s, r) => s + (parseN(r.amount_of_allotment)), 0)
    const allEntries = raods.flatMap(r => r.entries)
    const totalObligated = allEntries.reduce((s, e) => s + parseN(e.obligated_amount), 0)
    const totalDisbursed = allEntries.reduce((s, e) => s + parseN(e.total_disbursed), 0)
    const totalBalance = allEntries.reduce((s, e) => s + parseN(e.balance), 0)
    const obligatedPct = totalAllotment > 0 ? (totalObligated / totalAllotment) * 100 : 0
    const disbursedPct = totalObligated > 0 ? (totalDisbursed / totalObligated) * 100 : 0
    const uniqueSaros = new Set(raods.map(r => r.saro_no)).size

    return (
        <div className="flex flex-col gap-5">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 xxslg:grid-cols-2 sm:grid-cols-1">
                {/* Allotment */}
                <div className="bg-card border border-border border-t-2 border-t-blue-500 rounded-xl px-5 py-4 flex flex-col gap-2">
                    <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Allotment</p>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalAllotment)}</p>
                    <p className="text-[11px] text-muted-foreground">{raods.length} RAOD{raods.length !== 1 ? 's' : ''} · {uniqueSaros} SARO{uniqueSaros !== 1 ? 's' : ''}</p>
                </div>
                {/* Obligated */}
                <div className="bg-card border border-border border-t-2 border-t-orange-500 rounded-xl px-5 py-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Obligated</p>
                        <span className={`text-xs font-gbold ${obligatedPct >= 80 ? 'text-green-500' : obligatedPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>
                            {obligatedPct.toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalObligated)}</p>
                    <PctBar value={obligatedPct} color={obligatedPct >= 80 ? 'bg-green-500' : obligatedPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'} />
                    <p className="text-[10px] text-muted-foreground">of allotment</p>
                </div>
                {/* Disbursed */}
                <div className="bg-card border border-border border-t-2 border-t-green-500 rounded-xl px-5 py-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Disbursed</p>
                        <span className={`text-xs font-gbold ${disbursedPct >= 80 ? 'text-green-500' : disbursedPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>
                            {disbursedPct.toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalDisbursed)}</p>
                    <PctBar value={disbursedPct} color={disbursedPct >= 80 ? 'bg-green-500' : disbursedPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'} />
                    <p className="text-[10px] text-muted-foreground">of obligated</p>
                </div>
                {/* Balance */}
                <div className="bg-card border border-border border-t-2 border-t-violet-500 rounded-xl px-5 py-4 flex flex-col gap-2">
                    <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Remaining Balance</p>
                    <p className={`text-2xl font-gbold tabular-nums ${totalBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {fmtPHP(Math.abs(totalBalance))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Obligated − Disbursed</p>
                </div>
            </div>

            {/* Per-RAOD breakdown table */}
            {raods.length > 0 && (
                <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">PAP / SARO</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Allotment</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Obligated</th>
                                <th className="px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest min-w-[120px]">Oblig %</th>
                                <th className="text-right px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Disbursed</th>
                                <th className="px-3 py-2.5 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest min-w-[120px]">Disb %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {raods.slice(0, 10).map(r => {
                                const allot = parseN(r.amount_of_allotment)
                                const oblig = r.entries.reduce((s, e) => s + parseN(e.obligated_amount), 0)
                                const disb = r.entries.reduce((s, e) => s + parseN(e.total_disbursed), 0)
                                const op = allot > 0 ? (oblig / allot) * 100 : 0
                                const dp = oblig > 0 ? (disb / oblig) * 100 : 0
                                return (
                                    <tr
                                        key={r.id}
                                        className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer group"
                                        onClick={() => onNavigateRaod(r.saro_no)}
                                    >
                                        <td className="px-3 py-2.5 max-w-[240px]">
                                            <div className="flex items-center gap-1.5">
                                                <div className="min-w-0">
                                                    <p className="font-gbold text-foreground truncate group-hover:text-primary transition-colors">{r.pap_name || '—'}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{r.saro_no}</p>
                                                </div>
                                                <ExternalLink size={11} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors ml-1" />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-gbold tabular-nums text-foreground whitespace-nowrap">{fmtPHP(allot)}</td>
                                        <td className="px-3 py-2.5 text-right font-gbold tabular-nums text-foreground whitespace-nowrap">{fmtPHP(oblig)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full ${op >= 80 ? 'bg-green-500' : op >= 50 ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, op)}%` }} />
                                                </div>
                                                <span className={`text-[10px] font-gbold w-9 text-right ${op >= 80 ? 'text-green-500' : op >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>{op.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-gbold tabular-nums text-foreground whitespace-nowrap">{fmtPHP(disb)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full ${dp >= 80 ? 'bg-green-500' : dp >= 50 ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, dp)}%` }} />
                                                </div>
                                                <span className={`text-[10px] font-gbold w-9 text-right ${dp >= 80 ? 'text-green-500' : dp >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>{dp.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {raods.length > 10 && (
                        <p className="text-[11px] text-muted-foreground text-center py-2 border-t border-border">
                            Showing top 10 of {raods.length} RAODs —{' '}
                            <button
                                onClick={() => onNavigateRaod('')}
                                className="text-primary hover:underline font-gmedium"
                            >view all in RAOD</button>
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate()
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [raods, setRaods] = useState<RAODRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [filterClass, setFilterClass] = useState<string>('All')
    const [filterPap, setFilterPap] = useState<string>('All')
    const [selectedPapStat, setSelectedPapStat] = useState<PAPStat | null>(null)

    useEffect(() => {
        Promise.allSettled([
            efasApi.get('received-saro/'),
            efasApi.get('raod/'),
        ]).then(([saroRes, raodRes]) => {
            if (saroRes.status === 'fulfilled') setSaros(saroRes.value.data)
            if (raodRes.status === 'fulfilled') setRaods(raodRes.value.data)
        }).finally(() => setLoading(false))
    }, [])

    // ── All items flattened ────────────────────────────────────────────────────
    const allItems = saros.flatMap(s => s.items)

    // ── Filter by class type ───────────────────────────────────────────────────
    const classSaros = filterClass === 'All'
        ? saros
        : saros.filter(s => s.class_type === filterClass || s.items.some(i => i.class_type === filterClass))

    // ── Class type options ─────────────────────────────────────────────────────
    const classTypes = [...new Set([
        ...saros.map(s => s.class_type).filter(Boolean),
        ...allItems.map(i => i.class_type).filter(Boolean),
    ])].sort()

    // ── PAP / Project options for dropdown (from class-filtered saros) ─────────
    const papOptions = [...new Map(
        classSaros.flatMap(s => s.items)
            .filter(i => i.pap_code)
            .map(i => [i.pap_code, { code: i.pap_code, name: i.pap_name || i.pap_code }])
    ).values()].sort((a, b) => a.name.localeCompare(b.name))

    // ── Filter by PAP / Project ────────────────────────────────────────────────
    const filteredSaros = filterPap === 'All'
        ? classSaros
        : classSaros.filter(s => s.items.some(i => i.pap_code === filterPap))

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalAllotment = filteredSaros.reduce((s, r) => s + parseN(r.total_amount), 0)
    const totalObligation = filteredSaros.flatMap(s => s.items).reduce((s, i) => s + parseN(i.nca_amount), 0)
    const totalBalance = totalAllotment - totalObligation
    const totalAmount = filteredSaros.flatMap(s => s.items).reduce((s, i) => s + parseN(i.amount), 0)

    // ── Class-type breakdown for cards ────────────────────────────────────────
    const classSums = new Map<string, { allotment: number; obligation: number }>()
    filteredSaros.forEach(s => {
        const ct = s.class_type || 'Other'
        const existing = classSums.get(ct) ?? { allotment: 0, obligation: 0 }
        existing.allotment += parseN(s.total_amount)
        existing.obligation += s.items.reduce((sum, i) => sum + parseN(i.nca_amount), 0)
        classSums.set(ct, existing)
    })
    const classRows = Array.from(classSums.entries())
        .filter(([, v]) => v.allotment > 0)
        .sort((a, b) => b[1].allotment - a[1].allotment)
        .slice(0, 3)

    // ── PAP stats for charts ──────────────────────────────────────────────────
    const papMap = new Map<string, PAPStat>()
    filteredSaros.forEach(s => {
        s.items.forEach(item => {
            const key = item.pap_code || item.description || '(No PAP)'
            if (!papMap.has(key)) {
                papMap.set(key, {
                    name: item.pap_name || item.description || key,
                    code: item.pap_code,
                    allotment: 0,
                    obligation: 0,
                    balance: 0,
                    itemCount: 0,
                    saroNos: [],
                })
            }
            const stat = papMap.get(key)!
            stat.allotment += parseN(item.amount)
            stat.obligation += parseN(item.nca_amount)
            stat.balance += parseN(item.balance)
            stat.itemCount++
            if (!stat.saroNos.includes(s.allotment_no)) stat.saroNos.push(s.allotment_no)
        })
    })
    const papStats = Array.from(papMap.values()).filter(p => p.allotment > 0 || p.obligation > 0)

    // ── RAOD records for detail panel ─────────────────────────────────────────
    const raodRecordsForPanel = selectedPapStat
        ? raods
            .filter(r => r.pap_code === selectedPapStat.code)
            .flatMap(r => r.entries.map(e => ({
                id: e.id,
                saro_no: r.saro_no,
                pap: r.pap_code,
                pap_code: r.pap_code,
                amount_of_allotment: r.amount_of_allotment,
                name_of_claimant: e.name_of_claimant,
                date_of_obligation: e.date_of_obligation,
                ors_no: e.ors_no,
                obligated_amount: e.obligated_amount,
                cash: e.cash,
                non_tra: e.non_tra,
                particulars: e.particulars,
                class_type_detail: null as null,
                fund_source_detail: null as null,
            })))
        : []

    const navigateToRaod = (saroNo: string) => {
        navigate('/efas-v1/raod', { state: saroNo ? { openSaroNo: saroNo } : undefined })
    }

    return (
        <>
            {selectedPapStat && (
                <ProjectDetailPanel
                    programName={selectedPapStat.name}
                    programCode={selectedPapStat.code}
                    raodRecords={raodRecordsForPanel}
                    onClose={() => setSelectedPapStat(null)}
                />
            )}
            <div className="flex flex-col gap-5">
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-gbold text-foreground">Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Financial overview — DICT Regional Office 10
                        </p>
                    </div>
                    {!loading && (classTypes.length > 0 || papOptions.length > 0) && (
                        <div className="flex items-center gap-3 flex-wrap shrink-0 mt-1">
                            {classTypes.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-gmedium whitespace-nowrap">Class:</span>
                                    <select
                                        value={filterClass}
                                        onChange={e => { setFilterClass(e.target.value); setFilterPap('All') }}
                                        className="text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground font-gmedium focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="All">All Classes</option>
                                        {classTypes.map(ct => (
                                            <option key={ct} value={ct}>{ct}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {papOptions.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-gmedium whitespace-nowrap">Project:</span>
                                    <select
                                        value={filterPap}
                                        onChange={e => setFilterPap(e.target.value)}
                                        className="text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground font-gmedium focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px] truncate"
                                    >
                                        <option value="All">All Projects</option>
                                        {papOptions.map(p => (
                                            <option key={p.code} value={p.code}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">Loading dashboard data…</div>
                ) : (
                    <>
                        {/* ── Row 1: 4 Financial Cards ── */}
                        <div className="grid grid-cols-4 gap-4 xxslg:grid-cols-2 sm:grid-cols-1">
                            {/* Card 1 — Allotment */}
                            <FinancialCard
                                title="Received SARO (Allotment)"
                                accentClass="border-t-blue-500"
                                rows={[
                                    ...classRows.map(([code, v]) => ({
                                        label: code,
                                        value: fmtPHP(v.allotment),
                                    })),
                                    {
                                        label: 'Consolidated',
                                        value: fmtPHP(totalAllotment),
                                        highlight: true,
                                    },
                                ]}
                            />
                            {/* Card 2 — Obligation (NCA) */}
                            <FinancialCard
                                title="NCA Issued (Obligation)"
                                accentClass="border-t-cyan-500"
                                rows={[
                                    ...classRows.map(([code, v]) => ({
                                        label: code,
                                        value: fmtPHP(v.obligation),
                                        barPct: pct(v.obligation, v.allotment),
                                    })),
                                    {
                                        label: 'Consolidated',
                                        value: fmtPHP(totalObligation),
                                        highlight: true,
                                        color: 'text-cyan-500',
                                        sub: `${pct(totalObligation, totalAllotment)}% of allotment`,
                                        barPct: pct(totalObligation, totalAllotment),
                                    },
                                ]}
                            />
                            {/* Card 3 — Available Balance */}
                            <FinancialCard
                                title="Available Balance"
                                accentClass="border-t-green-500"
                                rows={[
                                    {
                                        label: 'Total Allotment',
                                        value: fmtPHP(totalAllotment),
                                    },
                                    {
                                        label: 'Less: NCA Issued',
                                        value: fmtPHP(totalObligation),
                                        barPct: pct(totalObligation, totalAllotment),
                                    },
                                    {
                                        label: 'Balance',
                                        value: fmtPHP(Math.max(0, totalBalance)),
                                        highlight: true,
                                        color: totalBalance < 0 ? 'text-destructive' : 'text-green-500',
                                        barPct: pct(Math.max(0, totalBalance), totalAllotment),
                                    },
                                    {
                                        label: 'Total Line-Item Amount',
                                        value: fmtPHP(totalAmount),
                                        color: 'text-muted-foreground',
                                    },
                                ]}
                            />
                            {/* Card 4 — SARO Status */}
                            <FinancialCard
                                title="SARO Status"
                                accentClass="border-t-violet-500"
                                rows={[
                                    {
                                        label: 'Total SAROs',
                                        value: String(filteredSaros.length),
                                    },
                                    {
                                        label: 'Total Line Items',
                                        value: String(filteredSaros.flatMap(s => s.items).length),
                                    },
                                    {
                                        label: 'PAP / Programs',
                                        value: String(papStats.length),
                                    },
                                    {
                                        label: 'Unobligated',
                                        value: fmtPHP(Math.max(0, totalBalance)),
                                        highlight: true,
                                        color: totalBalance < 0 ? 'text-destructive' : 'text-amber-500',
                                        barPct: pct(Math.max(0, totalBalance), totalAllotment),
                                    },
                                ]}
                            />
                        </div>



                        {/* ── Row 2: PAP Performance + Tracking Table ── */}
                        <div className="grid grid-cols-2 gap-4 xslg:grid-cols-1">
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <ProgramPerformanceCard stats={papStats} onSelectPap={setSelectedPapStat} />
                            </div>
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <ActiveTrackingCard saros={filteredSaros} />
                            </div>
                        </div>

                        {/* ── Row 3: Financial Status Overview (Horizontal Bars) ── */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-start justify-between mb-5">
                                <SectionHeader
                                    title="Financial Status Overview"
                                    sub="Item allotment vs NCA obligation by PAP — top 8"
                                    icon={TrendingUp}
                                />
                                <RealtimeBadge />
                            </div>
                            <div className="flex items-center gap-4 mb-4 text-[11px]">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Allotment</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />NCA (Obligation)</span>
                            </div>
                            <FinancialStatusOverview stats={papStats} />
                        </div>

                        {/* ── Row 4: RAOD Obligation & Disbursement ── */}
                        {raods.length > 0 && (
                            <div className="bg-card border border-border rounded-xl p-5">
                                <div className="flex items-start justify-between mb-5">
                                    <SectionHeader
                                        title="Obligation & Disbursement"
                                        sub="Based on RAOD — allotment, obligation and disbursement percentages"
                                        icon={TrendingUp}
                                    />
                                    <RealtimeBadge />
                                </div>
                                <RAODOverview raods={raods} onNavigateRaod={navigateToRaod} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}

