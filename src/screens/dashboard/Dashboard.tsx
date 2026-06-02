import { useEffect, useState } from 'react'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { FileText, Search, TrendingUp, Layers, ChevronLeft, ChevronRight, ExternalLink, Activity, X, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import efasApi from '@/plugin/axios'

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

interface FundTypeDef { id: number; code: string; name: string }

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
    nca_date: string
    nta_no: string
    nca_amount: string
    nca_no: string
    remarks: string
}

/** Derived per-PAP aggregate */
interface PAPStat {
    name: string
    code: string
    allotment: number
    obligation: number   // sum of nca_amount
    disbursed: number    // sum of total_disbursed from RAOD
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
    title, rows, collapsibleRows = [], accentClass, onClick,
}: {
    title: string
    rows: { label: string; value: string; highlight?: boolean; color?: string; sub?: string; barPct?: number }[]
    collapsibleRows?: { label: string; value: string; barPct?: number }[]
    accentClass: string
    onClick?: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const mainRows = rows.filter(r => !r.highlight)
    const highlightRows = rows.filter(r => r.highlight)
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
                {mainRows.map((row, i) => (
                    <div key={i} className="py-0.5">
                        <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-gbold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                            <div className="text-right">
                                <span className={`font-gbold tabular-nums text-sm ${row.color ?? 'text-foreground'}`}>{row.value}</span>
                                {row.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{row.sub}</p>}
                            </div>
                        </div>
                        {row.barPct !== undefined && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${row.barPct >= 80 ? 'bg-green-500' : row.barPct >= 50 ? 'bg-amber-500' : ''}`}
                                        style={{ width: `${Math.min(100, Math.max(0, row.barPct))}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-gbold w-8 text-right tabular-nums ${row.barPct >= 80 ? 'text-green-500' : row.barPct >= 50 ? 'text-amber-500' : ''}`}>
                                    {Math.min(100, row.barPct).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                ))}

                {/* +N others chip */}
                {collapsibleRows.length > 0 && (
                    <>
                        {expanded && collapsibleRows.map((row, i) => (
                            <div key={`extra-${i}`} className="py-0.5">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[10px] font-gbold uppercase tracking-wide text-muted-foreground">{row.label}</span>
                                    <span className="font-gbold tabular-nums text-sm text-foreground">{row.value}</span>
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
                                            {Math.min(100, row.barPct).toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                            className="mt-1.5 self-start inline-flex items-center gap-1 text-[10px] font-gbold px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition"
                        >
                            {expanded
                                ? 'Show less'
                                : `+${collapsibleRows.length} other${collapsibleRows.length !== 1 ? 's' : ''}`}
                        </button>
                    </>
                )}

                {/* Consolidated / highlight rows always at bottom */}
                {highlightRows.map((row, i) => (
                    <div key={`hl-${i}`} className="pt-2 mt-2 border-t border-border/50">
                        <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-gbold uppercase tracking-wide text-foreground/70">{row.label}</span>
                            <div className="text-right">
                                <span className={`font-gbold tabular-nums text-xl ${row.color ?? 'text-foreground'}`}>{row.value}</span>
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
                                    {Math.min(100, row.barPct).toFixed(0)}%
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

// ─── Financial Pie Chart ──────────────────────────────────────────────────────

const CHART_COLORS = [
    'hsl(var(--chart-2))',  // Disbursed  — emerald-toned
    'hsl(var(--chart-3))',  // Obligated  — amber-toned
    'hsl(var(--chart-1))',  // Available  — primary blue
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieSliceLabel(props: any) {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
    if (!percent || percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            fontWeight="700"
            style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
        >
            {`${(percent * 100).toFixed(1)}%`}
        </text>
    )
}

function FinancialPieChart({
    totalAllotment,
    totalObligation,
    totalDisbursed,
}: {
    totalAllotment: number
    totalObligation: number
    totalDisbursed: number
}) {
    const disbursed = Math.max(0, Math.min(totalDisbursed, totalAllotment))
    const obligatedRemaining = Math.max(0, totalObligation - disbursed)
    const available = Math.max(0, totalAllotment - totalObligation)

    const slices = [
        { name: 'Disbursed', value: disbursed,           color: CHART_COLORS[0], textColor: 'text-emerald-500' },
        { name: 'Obligated', value: obligatedRemaining,  color: CHART_COLORS[1], textColor: 'text-amber-500' },
        { name: 'Available', value: available,           color: CHART_COLORS[2], textColor: 'text-primary' },
    ]
    const chartData = slices.filter(s => s.value > 0)

    if (totalAllotment === 0) {
        return <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No data yet.</div>
    }

    const obligPct = (totalObligation / totalAllotment) * 100
    const disbPct  = (disbursed / totalAllotment) * 100

    return (
        <div className="flex flex-col gap-4 flex-1">
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={PieSliceLabel}
                        labelLine={false}
                    >
                        {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={1.5} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(val, name) => [fmtPHP(Number(val)), name]}
                        contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                            color: 'hsl(var(--foreground))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-col gap-0.5">
                {slices.map(s => (
                    <div key={s.name} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-xs text-muted-foreground">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-gbold ${s.textColor}`}>
                                {((s.value / totalAllotment) * 100).toFixed(1)}%
                            </span>
                            <span className="text-xs font-gbold text-foreground tabular-nums w-36 text-right">{fmtPHP(s.value)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3 Progress Bars: SARO / NTCA / Disbursement */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
                {([
                    { label: 'SARO',         value: totalAllotment, pct: 100,                  color: CHART_COLORS[2], textColor: 'text-primary' },
                    { label: 'NTCA',         value: totalObligation, pct: Math.min(100, obligPct), color: obligPct >= 80 ? CHART_COLORS[0] : obligPct >= 50 ? CHART_COLORS[1] : 'hsl(var(--chart-5))', textColor: obligPct >= 80 ? 'text-emerald-500' : obligPct >= 50 ? 'text-amber-500' : 'text-orange-500' },
                    { label: 'Disbursement', value: disbursed,       pct: Math.min(100, disbPct),  color: disbPct >= 80  ? CHART_COLORS[0] : disbPct >= 50  ? CHART_COLORS[1] : 'hsl(var(--chart-5))', textColor: disbPct >= 80  ? 'text-emerald-500' : disbPct >= 50  ? 'text-amber-500' : 'text-orange-500' },
                ] as const).map(({ label, value, pct: p, color, textColor }) => (
                    <div key={label}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-gsemibold text-muted-foreground uppercase tracking-widest">{label}</span>
                            <div className="flex items-center gap-2">
                                <span className="tabular-nums text-foreground">{fmtPHP(value)}</span>
                                <span className={`font-gbold w-12 text-right tabular-nums ${textColor}`}>{p.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="relative w-full h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${p}%`, background: color }}
                            />
                        </div>
                    </div>
                ))}
                <p className="text-[10px] text-muted-foreground">All percentages relative to SARO allotment</p>
            </div>

            {/* Total allotment strip */}
            <div className="rounded-xl bg-muted/30 border border-border/60 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-gsemibold uppercase tracking-widest text-muted-foreground">Total Allotment</span>
                <span className="text-base font-gbold text-foreground tabular-nums">{fmtPHP(totalAllotment)}</span>
            </div>
        </div>
    )
}

// ─── Program Performance ──────────────────────────────────────────────────────

const PAP_PAGE_SIZE = 5

function ProgramPerformanceCard({ stats, onSelectPap, totalAllotment }: { stats: PAPStat[]; onSelectPap: (s: PAPStat) => void; totalAllotment: number }) {
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
                            const saroPct = totalAllotment > 0 ? (stat.allotment / totalAllotment) * 100 : 0
                            const ntcaPct = stat.allotment > 0 ? Math.min(100, (stat.obligation / stat.allotment) * 100) : 0
                            const disbPct = stat.allotment > 0 ? Math.min(100, (stat.disbursed / stat.allotment) * 100) : 0
                            const bars = [
                                { label: 'SARO', value: fmtPHP(stat.allotment), pct: saroPct, textColor: 'text-blue-500', barColor: 'bg-blue-500' },
                                { label: 'NTCA', value: fmtPHP(stat.obligation), pct: ntcaPct, textColor: ntcaPct >= 80 ? 'text-green-500' : ntcaPct >= 50 ? 'text-amber-500' : 'text-orange-500', barColor: ntcaPct >= 80 ? 'bg-green-500' : ntcaPct >= 50 ? 'bg-amber-500' : 'bg-orange-500' },
                                { label: 'Disbursement', value: fmtPHP(stat.disbursed), pct: disbPct, textColor: disbPct >= 80 ? 'text-green-500' : disbPct >= 50 ? 'text-amber-500' : 'text-orange-500', barColor: disbPct >= 80 ? 'bg-green-500' : disbPct >= 50 ? 'bg-amber-500' : 'bg-orange-500' },
                            ]
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
                                            {stat.code && <p className="text-[10px] text-muted-foreground mt-0.5">{stat.code}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 pl-9">
                                        {bars.map(({ label, value, pct: p, textColor, barColor }) => (
                                            <div key={label}>
                                                <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                    <span className="text-muted-foreground uppercase tracking-wide font-gsemibold">{label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-muted-foreground tabular-nums">{value}</span>
                                                        <span className={`font-gbold w-9 text-right tabular-nums ${textColor}`}>{p.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${p}%` }} />
                                                </div>
                                            </div>
                                        ))}
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

function ActiveTrackingCard({ saros, onNavigate }: { saros: ReceivedSARO[]; onNavigate: (saroNo?: string) => void }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'All' | 'NCA Issued' | 'Received'>('All')
    const [classFilter, setClassFilter] = useState('All')
    const [page, setPage] = useState(1)

    // Collect unique class types from these saros
    const classOptions = [...new Set(
        saros.flatMap(s => [s.class_type, ...s.items.map(i => i.class_type)]).filter(Boolean)
    )].sort()

    const filtered = saros.filter(saro => {
        const q = search.toLowerCase().trim()
        const matchSearch = !q ||
            saro.allotment_no.toLowerCase().includes(q) ||
            saro.items.some(item =>
                item.pap_code.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.nta_no.toLowerCase().includes(q)
            )

        const hasNca = saro.items.some(item => parseN(item.nca_amount) > 0)
        const matchStatus = statusFilter === 'All' ||
            (statusFilter === 'NCA Issued' && hasNca) ||
            (statusFilter === 'Received' && !hasNca)

        const matchClass = classFilter === 'All' || saro.class_type === classFilter

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
                <div className="flex items-center gap-3 shrink-0">
                    <RealtimeBadge />
                    <button
                        onClick={() => onNavigate()}
                        className="text-[11px] font-gbold text-primary hover:underline flex items-center gap-1"
                    >
                        View All <ExternalLink size={11} />
                    </button>
                </div>
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
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">Allotment No.</th>
                            <th className="text-left px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">NCA Status</th>
                            <th className="text-right px-2 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Total (₱)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No records found.</td></tr>
                        ) : pageRows.map((saro, i) => {
                            const ncaCount = saro.items.filter(item => parseN(item.nca_amount) > 0).length
                            const totalItems = saro.items.length
                            const globalIdx = (page - 1) * SARO_PAGE_SIZE + i + 1
                            return (
                                <tr key={saro.id} className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => onNavigate(saro.allotment_no)}>
                                    <td className="px-2 py-2.5 text-muted-foreground font-gbold text-[11px]">#{String(globalIdx).padStart(2, '0')}</td>
                                    <td className="px-2 py-2.5">
                                        {saro.class_type
                                            ? <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded text-[10px] font-gsemibold">{saro.class_type}</span>
                                            : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-2 py-2.5 max-w-[260px]">
                                        <div className="flex items-center gap-1">
                                        <p className="font-gbold text-primary truncate text-xs group-hover:underline">{saro.allotment_no}</p>
                                        <ExternalLink size={10} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        {totalItems > 0 && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{totalItems} line item{totalItems !== 1 ? 's' : ''}</p>
                                        )}
                                    </td>
                                    <td className="px-2 py-2.5">
                                        {totalItems === 0 ? (
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">RECEIVED</span>
                                        ) : ncaCount === totalItems ? (
                                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">ALL NCA ISSUED</span>
                                        ) : ncaCount > 0 ? (
                                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">{ncaCount}/{totalItems} NCA</span>
                                        ) : (
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold whitespace-nowrap">RECEIVED</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-gbold text-foreground text-xs tabular-nums">
                                        {fmtPHP(parseN(saro.total_amount))}
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

function RAODOverview({ raods, onNavigateRaod, onNavigateAll }: { raods: RAODRecord[]; onNavigateRaod: (saroNo: string) => void; onNavigateAll: () => void }) {
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
                <div onClick={onNavigateAll} className="bg-card border border-border border-t-2 border-t-blue-500 rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-blue-400 transition group">
                    <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Allotment</p>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalAllotment)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center justify-between">{raods.length} RAOD{raods.length !== 1 ? 's' : ''} · {uniqueSaros} SARO{uniqueSaros !== 1 ? 's' : ''} <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary transition-colors" /></p>
                </div>
                {/* Obligated */}
                <div onClick={onNavigateAll} className="bg-card border border-border border-t-2 border-t-orange-500 rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-orange-400 transition group">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Obligated</p>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-gbold ${obligatedPct >= 80 ? 'text-green-500' : obligatedPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>{obligatedPct.toFixed(1)}%</span>
                            <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalObligated)}</p>
                    <PctBar value={obligatedPct} color={obligatedPct >= 80 ? 'bg-green-500' : obligatedPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'} />
                    <p className="text-[10px] text-muted-foreground">of allotment</p>
                </div>
                {/* Disbursed */}
                <div onClick={onNavigateAll} className="bg-card border border-border border-t-2 border-t-green-500 rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-green-400 transition group">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-gbold text-muted-foreground uppercase tracking-[0.15em]">Total Disbursed</p>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-gbold ${disbursedPct >= 80 ? 'text-green-500' : disbursedPct >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>{disbursedPct.toFixed(1)}%</span>
                            <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    <p className="text-2xl font-gbold text-foreground tabular-nums">{fmtPHP(totalDisbursed)}</p>
                    <PctBar value={disbursedPct} color={disbursedPct >= 80 ? 'bg-green-500' : disbursedPct >= 50 ? 'bg-amber-500' : 'bg-orange-500'} />
                    <p className="text-[10px] text-muted-foreground">of obligated</p>
                </div>
                {/* Balance */}
                <div onClick={onNavigateAll} className="bg-card border border-border border-t-2 border-t-violet-500 rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer hover:shadow-md hover:border-violet-400 transition group">
                    <p className="text-[11px] font-gbold text-muted-foreground flex items-center justify-between uppercase tracking-[0.15em]">Remaining Balance <ExternalLink size={11} className="text-muted-foreground group-hover:text-primary transition-colors" /></p>
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

// ─── Recent NTCA Feed ────────────────────────────────────────────────────────────

function RecentNTCAFeed({ items, onNavigate }: { items: NTCAItem[]; onNavigate: () => void }) {
    const [search, setSearch] = useState('')
    const [yearFilter, setYearFilter] = useState('All')
    const [classFilter, setClassFilter] = useState('All')

    const years = [...new Set(
        items.map(i => i.nca_date?.slice(0, 4)).filter((y): y is string => !!y)
    )].sort().reverse()

    const classTypes = [...new Set(items.map(i => i.class_type).filter(Boolean))].sort()

    const filtered = items.filter(item => {
        const q = search.toLowerCase().trim()
        const matchSearch = !q ||
            (item.particulars || '').toLowerCase().includes(q) ||
            item.saro_no.toLowerCase().includes(q) ||
            item.pap_code.toLowerCase().includes(q) ||
            item.nta_no.toLowerCase().includes(q) ||
            item.nca_no.toLowerCase().includes(q)
        const matchYear = yearFilter === 'All' || item.nca_date?.startsWith(yearFilter)
        const matchClass = classFilter === 'All' || item.class_type === classFilter
        return matchSearch && matchYear && matchClass
    })

    const recent = [...filtered].sort((a, b) => b.id - a.id).slice(0, 15)

    return (
        <div className="flex flex-col gap-3">
            {/* Search + Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[160px]">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search particulars, SARO, NTA/NCA no…"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                </div>
                {years.length > 0 && (
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                    >
                        <option value="All">All Years</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}
                {classTypes.length > 0 && (
                    <select
                        value={classFilter}
                        onChange={e => setClassFilter(e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                    >
                        <option value="All">All Classes</option>
                        {classTypes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                )}
            </div>

            {recent.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    {search || yearFilter !== 'All' || classFilter !== 'All'
                        ? 'No records match your filters.'
                        : 'No NTCA records yet.'}
                </div>
            ) : (
                <>
                    <p className="text-[11px] text-muted-foreground">
                        Showing {recent.length} of {filtered.length} record{filtered.length !== 1 ? 's' : ''} (latest first)
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">NCA Date</th>
                                    <th className="text-left px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">SARO No.</th>
                                    <th className="text-left px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest">Particulars</th>
                                    <th className="text-left px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">NTA No.</th>
                                    <th className="text-left px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">NCA No.</th>
                                    <th className="text-right px-3 py-2 text-[10px] font-gbold text-muted-foreground uppercase tracking-widest whitespace-nowrap">NTCA Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map((item, idx) => (
                                    <tr key={item.id} className={`border-b border-border/40 last:border-0 transition-colors cursor-pointer group hover:bg-primary/5 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`} onClick={onNavigate}>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.nca_date}</td>
                                        <td className="px-3 py-2.5 font-gbold text-primary whitespace-nowrap group-hover:underline">{item.saro_no}</td>
                                        <td className="px-3 py-2.5 max-w-[200px]">
                                            <p className="truncate text-foreground">{item.particulars || '—'}</p>
                                            {item.pap_code && <p className="text-[10px] text-muted-foreground">{item.pap_code}</p>}
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.nta_no || '—'}</td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.nca_no || '—'}</td>
                                        <td className="px-3 py-2.5 text-right font-gbold text-cyan-500 tabular-nums whitespace-nowrap">
                                            {fmtPHP(parseN(item.nca_amount))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────────

const DASH_CURRENT_YEAR = new Date().getFullYear()
const DASH_YEAR_OPTIONS = Array.from({ length: DASH_CURRENT_YEAR - 2019 }, (_, i) => 2020 + i).reverse()

export default function Dashboard() {
    const navigate = useNavigate()
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [raods, setRaods] = useState<RAODRecord[]>([])
    const [fundTypeList, setFundTypeList] = useState<FundTypeDef[]>([])
    const [ntcaTotalAmount, setNtcaTotalAmount] = useState(0)
    const [ntcaCount, setNtcaCount] = useState(0)
    const [ntcaItems, setNtcaItems] = useState<NTCAItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filterFund, setFilterFund] = useState<string>('All')
    const [filterPap, setFilterPap] = useState<string>('All')
    const [filterYear, setFilterYear] = useState('All')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterSaro, setFilterSaro] = useState('All')

    useEffect(() => {
        Promise.allSettled([
            efasApi.get('received-saro/'),
            efasApi.get('raod/'),
            efasApi.get('fund-type/'),
            efasApi.get('received-saro/ntca/'),
        ]).then(([saroRes, raodRes, ftRes, ntcaRes]) => {
            if (saroRes.status === 'fulfilled') setSaros(saroRes.value.data)
            if (raodRes.status === 'fulfilled') setRaods(raodRes.value.data)
            if (ftRes.status === 'fulfilled') setFundTypeList(ftRes.value.data)
            if (ntcaRes.status === 'fulfilled') {
                setNtcaTotalAmount(ntcaRes.value.data.total_amount ?? 0)
                setNtcaCount(ntcaRes.value.data.count ?? 0)
                setNtcaItems(ntcaRes.value.data.results ?? [])
            }
        }).finally(() => setLoading(false))
    }, [])

    // ── Quarter presets ───────────────────────────────────────────────────────
    const activeYear = filterYear !== 'All' ? parseInt(filterYear) : DASH_CURRENT_YEAR
    const QUARTERS = [
        { label: 'Q1', from: `${activeYear}-01-01`, to: `${activeYear}-03-31` },
        { label: 'Q2', from: `${activeYear}-04-01`, to: `${activeYear}-06-30` },
        { label: 'Q3', from: `${activeYear}-07-01`, to: `${activeYear}-09-30` },
        { label: 'Q4', from: `${activeYear}-10-01`, to: `${activeYear}-12-31` },
    ]
    const activeQ = QUARTERS.find(q => q.from === filterDateFrom && q.to === filterDateTo)?.label ?? null

    // ── Year options from SARO dates ──────────────────────────────────────────
    const availableYears = [...new Set(
        saros.map(s => s.date_of_saro?.slice(0, 4)).filter((y): y is string => !!y)
    )].sort().reverse()

    // ── SARO options ──────────────────────────────────────────────────────────
    const saroOptions = [...new Set(saros.map(s => s.allotment_no).filter(Boolean))].sort()

    // ── All items flattened ────────────────────────────────────────────────────
    const allItems = saros.flatMap(s => s.items)

    // ── Apply date/year/SARO filters first ────────────────────────────────────
    const dateSaros = saros.filter(s => {
        const d = s.date_of_saro ?? ''
        if (filterYear !== 'All' && !d.startsWith(filterYear)) return false
        if (filterDateFrom && d < filterDateFrom) return false
        if (filterDateTo && d > filterDateTo) return false
        if (filterSaro !== 'All' && s.allotment_no !== filterSaro) return false
        return true
    })

    // ── Code → name lookup from API fund-type list ──────────────────────────────
    // ── Fund type options ─────────────────────────────────────────────────────
    // Use the API list when loaded; fall back to data-derived names (no raw numeric codes)
    const fundTypes: FundTypeDef[] = fundTypeList.length > 0
        ? fundTypeList
        : [...new Set(allItems.map(i => i.fund_type).filter(ft => Boolean(ft) && !/^\d+$/.test(ft.trim())))]
            .sort().map(ft => ({ id: 0, code: ft, name: ft }))

    // ── Filter by fund type (filterFund stores the code) ────────────────────────
    const fundSaros = filterFund === 'All'
        ? dateSaros
        : dateSaros.filter(s => s.items.some(i => i.fund_type === filterFund))

    // ── PAP / Project options for dropdown (from fund-filtered saros) ──────────
    const papOptions = [...new Map(
        fundSaros.flatMap(s => s.items)
            .filter(i => i.pap_code)
            .map(i => [i.pap_code, { code: i.pap_code, name: i.pap_name || i.pap_code }])
    ).values()].sort((a, b) => a.name.localeCompare(b.name))

    // ── Filter by PAP / Project ────────────────────────────────────────────────
    const filteredSaros = filterPap === 'All'
        ? fundSaros
        : fundSaros.filter(s => s.items.some(i => i.pap_code === filterPap))

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalAllotment = filteredSaros.reduce((s, r) => s + parseN(r.total_amount), 0)
    const totalAmount = filteredSaros.flatMap(s => s.items).reduce((s, i) => s + parseN(i.amount), 0)
    // Filter items by nca_date so obligation totals align with the selected date range,
    // not the SARO issuance date (nca_amount on a SARO item accumulates over its lifetime).
    const obligationItems = filteredSaros.flatMap(s => s.items).filter(i => {
        if (filterYear !== 'All' && !i.nca_date?.startsWith(filterYear)) return false
        if (filterDateFrom && i.nca_date && i.nca_date < filterDateFrom) return false
        if (filterDateTo && i.nca_date && i.nca_date > filterDateTo) return false
        return true
    })
    const obligationItemIds = new Set(obligationItems.map(i => i.id))
    const totalObligation = obligationItems.reduce((s, i) => s + parseN(i.nca_amount), 0)
    const totalBalance = totalAllotment - totalObligation

    // Filter RAOD by active PAP + SARO filters
    const filteredRaods = raods.filter(r => {
        if (filterPap !== 'All' && r.pap_code !== filterPap && (r.pap_name || '').trim() !== filterPap) return false
        if (filterSaro !== 'All' && r.saro_no !== filterSaro) return false
        return true
    })
    // Filter RAOD entries by date_of_obligation to respect the active date range.
    const filteredRaodEntries = filteredRaods.flatMap(r => r.entries).filter(e => {
        if (filterYear !== 'All' && e.date_of_obligation && !e.date_of_obligation.startsWith(filterYear)) return false
        if (filterDateFrom && e.date_of_obligation && e.date_of_obligation < filterDateFrom) return false
        if (filterDateTo && e.date_of_obligation && e.date_of_obligation > filterDateTo) return false
        return true
    })
    const totalDisbursed = filteredRaodEntries.reduce((s, e) => s + parseN(e.total_disbursed), 0)

    // Filter NTCA items by fund + PAP + year + date range + SARO
    const isDefaultFilters = filterFund === 'All' && filterPap === 'All' && filterYear === 'All' && !filterDateFrom && !filterDateTo && filterSaro === 'All'
    const filteredNtcaItems = ntcaItems.filter(i => {
        if (filterFund !== 'All' && i.fund_type !== filterFund) return false
        if (filterPap !== 'All' && i.pap_code !== filterPap) return false
        if (filterYear !== 'All' && !i.nca_date?.startsWith(filterYear)) return false
        if (filterDateFrom && i.nca_date && i.nca_date < filterDateFrom) return false
        if (filterDateTo && i.nca_date && i.nca_date > filterDateTo) return false
        if (filterSaro !== 'All' && i.saro_no !== filterSaro) return false
        return true
    })
    const filteredNtcaTotal = isDefaultFilters ? ntcaTotalAmount : filteredNtcaItems.reduce((s, i) => s + parseN(i.nca_amount), 0)
    const filteredNtcaCount = isDefaultFilters ? ntcaCount : filteredNtcaItems.length

    // ── Fund-type breakdown for cards ─────────────────────────────────────────
    const fundSums = new Map<string, { allotment: number; obligation: number }>()
    filteredSaros.forEach(s => {
        if (s.items.length > 0) {
            s.items.forEach(item => {
                const ft = item.fund_type || 'Other'
                const existing = fundSums.get(ft) ?? { allotment: 0, obligation: 0 }
                existing.allotment += parseN(item.amount)
                if (obligationItemIds.has(item.id)) existing.obligation += parseN(item.nca_amount)
                fundSums.set(ft, existing)
            })
        } else {
            const ft = 'Other'
            const existing = fundSums.get(ft) ?? { allotment: 0, obligation: 0 }
            existing.allotment += parseN(s.total_amount)
            fundSums.set(ft, existing)
        }
    })
    // Show Current → Continuing in cards (case-insensitive keyword match)
    // e.g. 'CURRENT', 'Current', 'CONTINUING FUNDS', 'Continuing Funds' all match
    const fundEntries = Array.from(fundSums.entries()).filter(([, v]) => v.allotment > 0)
    const findFund = (keyword: string) =>
        fundEntries.find(([ft]) => ft.toLowerCase().includes(keyword.toLowerCase()))
    const fundRows: [string, { allotment: number; obligation: number }][] = (() => {
        const current = findFund('current')
        const continuing = findFund('continu')
        const fixed = [current, continuing].filter((e): e is [string, { allotment: number; obligation: number }] => !!e && e[1].allotment > 0)
        if (fixed.length > 0) return fixed
        return fundEntries.sort((a, b) => b[1].allotment - a[1].allotment).slice(0, 3)
    })()

    const pinnedKeys = new Set(fundRows.map(([n]) => n))
    const fundExtraRows = fundEntries
        .filter(([n]) => !pinnedKeys.has(n))
        .sort((a, b) => b[1].allotment - a[1].allotment)

    // ── PAP stats for charts — grouped by pap_name to eliminate duplicates ───
    const papMap = new Map<string, PAPStat>()
    filteredSaros.forEach(s => {
        s.items.forEach(item => {
            const name = (item.pap_name || item.description || item.pap_code || '(No PAP)').trim()
            const code = (item.pap_code || '').trim()
            if (!papMap.has(name)) {
                papMap.set(name, { name, code, allotment: 0, obligation: 0, disbursed: 0, balance: 0, itemCount: 0, saroNos: [] })
            }
            const stat = papMap.get(name)!
            // Prefer an alphabetic code over a raw numeric ID
            if (!stat.code || (/^\d+$/.test(stat.code) && code && !/^\d+$/.test(code))) stat.code = code
            stat.allotment += parseN(item.amount)
            if (obligationItemIds.has(item.id)) stat.obligation += parseN(item.nca_amount)
            stat.balance += parseN(item.balance)
            stat.itemCount++
            if (!stat.saroNos.includes(s.allotment_no)) stat.saroNos.push(s.allotment_no)
        })
    })
    // Cross-reference RAOD disbursement per PAP — match by name then code
    filteredRaods.forEach(r => {
        const byName = (r.pap_name || '').trim()
        const byCode = (r.pap_code || '').trim()
        const stat = (byName && papMap.get(byName)) || (byCode && papMap.get(byCode)) || null
        if (stat) r.entries.filter(e => {
            if (filterYear !== 'All' && e.date_of_obligation && !e.date_of_obligation.startsWith(filterYear)) return false
            if (filterDateFrom && e.date_of_obligation && e.date_of_obligation < filterDateFrom) return false
            if (filterDateTo && e.date_of_obligation && e.date_of_obligation > filterDateTo) return false
            return true
        }).forEach(e => { stat.disbursed += parseN(e.total_disbursed) })
    })

    const papStats = Array.from(papMap.values()).filter(p => p.allotment > 0 || p.obligation > 0)

    const navigateToPapInRaod = (stat: PAPStat) => {
        navigate('/efas-v1/raod', { state: { search: stat.name } })
    }

    const navigateToRaod = (saroNo: string) => {
        navigate('/efas-v1/raod', { state: saroNo ? { openSaroNo: saroNo } : undefined })
    }
    const navigateToSaro = (saroNo?: string) => {
        navigate('/efas-v1/received-saro', { state: saroNo ? { search: saroNo } : undefined })
    }
    const navigateToNtca = () => {
        navigate('/efas-v1/received-ntca')
    }

    return (
        <>
            <div className="flex flex-col gap-5">
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-gbold text-foreground">Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Financial overview — DICT Regional Office 10
                        </p>
                    </div>
                    {loading && <RefreshCw size={16} className="animate-spin text-muted-foreground mt-1.5" />}
                </div>

                {/* ── Filter Bar ── */}
                {!loading && (
                    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/60">
                        {/* Row 1: Year, Quarter presets, Date range, SARO */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-gmedium text-muted-foreground whitespace-nowrap">Date:</span>
                            {/* Year */}
                            <select
                                value={filterYear}
                                onChange={e => { setFilterYear(e.target.value); setFilterDateFrom(''); setFilterDateTo('') }}
                                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="All">All Years</option>
                                {(availableYears.length > 0 ? availableYears : DASH_YEAR_OPTIONS.map(String)).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            {/* Q1–Q4 presets */}
                            {QUARTERS.map(q => (
                                <button
                                    key={q.label}
                                    onClick={() => { setFilterDateFrom(q.from); setFilterDateTo(q.to) }}
                                    className={`h-8 px-2.5 rounded-lg text-xs font-gmedium border transition ${
                                        activeQ === q.label
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-background text-foreground/80 border-border hover:bg-muted'
                                    }`}
                                >
                                    {q.label}
                                </button>
                            ))}
                            <span className="text-xs text-muted-foreground mx-0.5">|</span>
                            <input
                                type="date"
                                value={filterDateFrom}
                                onChange={e => setFilterDateFrom(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-xs text-muted-foreground">–</span>
                            <input
                                type="date"
                                value={filterDateTo}
                                onChange={e => setFilterDateTo(e.target.value)}
                                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {/* SARO filter */}
                            {saroOptions.length > 0 && (
                                <>
                                    <span className="text-xs text-muted-foreground mx-0.5">|</span>
                                    <span className="text-xs font-gmedium text-muted-foreground whitespace-nowrap">SARO:</span>
                                    <select
                                        value={filterSaro}
                                        onChange={e => setFilterSaro(e.target.value)}
                                        className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[200px]"
                                    >
                                        <option value="All">All SAROs</option>
                                        {saroOptions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                        {/* Row 2: Fund Type, Project, Clear */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-gmedium text-muted-foreground whitespace-nowrap">Filter:</span>
                            {fundTypes.length > 0 && (
                                <select
                                    value={filterFund}
                                    onChange={e => { setFilterFund(e.target.value); setFilterPap('All') }}
                                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="All">All Fund Types</option>
                                    {fundTypes.map(ft => (
                                        <option key={ft.code} value={ft.code}>{ft.name}</option>
                                    ))}
                                </select>
                            )}
                            {papOptions.length > 0 && (
                                <select
                                    value={filterPap}
                                    onChange={e => setFilterPap(e.target.value)}
                                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[240px]"
                                >
                                    <option value="All">All Projects</option>
                                    {papOptions.map(p => (
                                        <option key={p.code} value={p.code}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                            {/* Clear all filters */}
                            {(filterYear !== 'All' || filterDateFrom || filterDateTo || filterSaro !== 'All' || filterFund !== 'All' || filterPap !== 'All') && (
                                <button
                                    onClick={() => {
                                        setFilterYear('All')
                                        setFilterDateFrom('')
                                        setFilterDateTo('')
                                        setFilterSaro('All')
                                        setFilterFund('All')
                                        setFilterPap('All')
                                    }}
                                    className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition ml-auto"
                                >
                                    <X size={11} /> Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">Loading dashboard data…</div>
                ) : (
                    <>
                        {/* ── Row 1: Financial Cards ── */}
                        <div className="grid grid-cols-5 gap-4 xxslg:grid-cols-2 sm:grid-cols-1">
                            {/* Card 1 — Allotment */}
                            <FinancialCard
                                title="Received SARO (Allotment)"
                                accentClass="border-t-blue-500"
                                onClick={() => navigateToSaro()}
                                rows={[
                                    ...fundRows.map(([ft, v]) => ({
                                        label: ft,
                                        value: fmtPHP(v.allotment),
                                    })),
                                    {
                                        label: 'Consolidated',
                                        value: fmtPHP(totalAllotment),
                                        highlight: true,
                                    },
                                ]}
                                collapsibleRows={fundExtraRows.map(([ft, v]) => ({
                                    label: ft,
                                    value: fmtPHP(v.allotment),
                                }))}
                            />
                            {/* Card 2 — Obligation (NCA) */}
                            <FinancialCard
                                title="NCA Issued (Obligation)"
                                accentClass="border-t-cyan-500"
                                onClick={() => navigateToNtca()}
                                rows={[
                                    ...fundRows.map(([ft, v]) => ({
                                        label: ft,
                                        value: fmtPHP(v.obligation),
                                        barPct: pct(v.obligation, v.allotment),
                                    })),
                                    {
                                        label: 'Consolidated',
                                        value: fmtPHP(totalObligation),
                                        highlight: true,
                                        color: 'text-cyan-500',
                                        sub: `${Math.min(100, pct(totalObligation, totalAllotment))}% of allotment`,
                                        barPct: pct(totalObligation, totalAllotment),
                                    },
                                ]}
                                collapsibleRows={fundExtraRows.map(([ft, v]) => ({
                                    label: ft,
                                    value: fmtPHP(v.obligation),
                                    barPct: pct(v.obligation, v.allotment),
                                }))}
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
                                onClick={() => navigateToSaro()}
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
                            {/* Card 5 — Received NTCA */}
                            <FinancialCard
                                title="Received NTCA"
                                accentClass="border-t-teal-500"
                                onClick={() => navigateToNtca()}
                                rows={[
                                    {
                                        label: 'NTCA Records',
                                        value: String(filteredNtcaCount),
                                    },
                                    {
                                        label: 'vs NCA Issued',
                                        value: `${pct(filteredNtcaTotal, totalObligation)}%`,
                                        barPct: Math.min(100, pct(filteredNtcaTotal, totalObligation)),
                                    },
                                    {
                                        label: 'Total NTCA Amount',
                                        value: fmtPHP(filteredNtcaTotal),
                                        highlight: true,
                                        color: 'text-teal-500',
                                    },
                                ]}
                            />
                        </div>



                        {/* ── Row 2: PAP Performance + Pie Chart ── */}
                        <div className="grid grid-cols-2 gap-4 xslg:grid-cols-1">
                            {/* Left: Program / PAP Performance */}
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <ProgramPerformanceCard stats={papStats} onSelectPap={navigateToPapInRaod} totalAllotment={totalAllotment} />
                            </div>

                            {/* Right: Financial Pie Chart */}
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
                                <div className="flex items-start justify-between">
                                    <SectionHeader
                                        title="Financial Overview"
                                        sub="Allotment, obligation and disbursement breakdown"
                                        icon={TrendingUp}
                                    />
                                    <RealtimeBadge />
                                </div>
                                <FinancialPieChart
                                    totalAllotment={totalAllotment}
                                    totalObligation={totalObligation}
                                    totalDisbursed={totalDisbursed}
                                />
                            </div>
                        </div>

                        {/* ── Row 3: SARO Tracking + NTCA Activity ── */}
                        <div className="grid grid-cols-2 gap-4 xslg:grid-cols-1">
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <ActiveTrackingCard saros={filteredSaros} onNavigate={navigateToSaro} />
                            </div>
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <div className="flex items-start justify-between mb-5">
                                    <SectionHeader
                                        title="Recent NTCA Activity"
                                        sub="Latest 15 Received NTCA records by entry order"
                                        icon={Activity}
                                    />
                                    <div className="flex items-center gap-3 shrink-0">
                                        <RealtimeBadge />
                                        <button
                                            onClick={navigateToNtca}
                                            className="text-[11px] font-gbold text-primary hover:underline flex items-center gap-1"
                                        >
                                            View All <ExternalLink size={11} />
                                        </button>
                                    </div>
                                </div>
                                <RecentNTCAFeed items={filteredNtcaItems} onNavigate={navigateToNtca} />
                            </div>
                        </div>

                        {/* ── Obligation & Disbursement ── */}
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
                                <RAODOverview raods={filteredRaods} onNavigateRaod={navigateToRaod} onNavigateAll={() => navigateToRaod('')} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}

