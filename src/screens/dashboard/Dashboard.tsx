import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import { FileText, Landmark, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import ProjectDetailPanel from './ProjectDetailPanel'

// ─── Types ─────────────────────────────────────────────────────────────────────

/** A program / project derived from unique PAP names in RAOD data. */
interface Program { name: string; code: string }

interface SaroRecord {
    id: number
    saro_no: string
    pap: string
    pap_code: string
    amount_of_allotment: string
    obligated_amount: string | null
    cash: string | null
    non_tra: string | null
    name_of_claimant: string
    date_of_obligation: string | null
    ors_no: string
    particulars: string
    class_type_detail: { code: string; name: string } | null
    fund_source_detail: { code: string; name: string } | null
}

interface ProgramStat {
    program: Program
    saroNos: string[]
    allotment: number
    obligation: number
    disbursement: number
    ntcaReceived: number
    records: SaroRecord[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtM(v: number) {
    return `₱${(v / 1_000_000).toFixed(2)}M`
}
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

// ─── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
    label, value, sub, icon: Icon, accent,
}: {
    label: string
    value: string
    sub?: string
    icon: React.ElementType
    accent: string
}) {
    return (
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-4 min-w-0">
            <div className={`mt-0.5 h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
                <Icon size={18} className="text-white" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground font-gmedium uppercase tracking-wide truncate">{label}</span>
                <span title={value} className="text-2xl font-gbold text-foreground leading-tight truncate">{value}</span>
                {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
            </div>
        </div>
    )
}

// ─── Section Header ──────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-gsemibold text-foreground whitespace-nowrap">{title}</span>
            <div className="flex-1 h-px bg-border" />
        </div>
    )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
    return (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
    )
}

// ─── SARO Chips ──────────────────────────────────────────────────────────────────

const MAX_CHIPS = 2

function SaroChips({ saroNos }: { saroNos: string[] }) {
    if (saroNos.length === 0) return <span className="text-xs text-muted-foreground italic">No RAOD entries</span>
    const visible = saroNos.slice(0, MAX_CHIPS)
    const overflow = saroNos.length - MAX_CHIPS
    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {visible.map(s => (
                <span
                    key={s}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-gmedium px-2 py-0.5 rounded-full border border-primary/20 whitespace-nowrap"
                >
                    {s}
                </span>
            ))}
            {overflow > 0 && (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] font-gbold border border-border">
                    +{overflow}
                </span>
            )}
        </div>
    )
}

// ─── Collapsible Project Row ─────────────────────────────────────────────────────

function ProjectRow({
    program, saroNos, allotment, obligation, disbursement, ntcaReceived, onOpenPanel,
}: {
    program: Program
    saroNos: string[]
    allotment: number
    obligation: number
    disbursement: number
    ntcaReceived: number
    onOpenPanel: (program: Program) => void
}) {
    const [open, setOpen] = useState(false)
    const obPct = pct(obligation, allotment)
    const disPct = pct(disbursement, allotment)
    const ntcaPct = pct(ntcaReceived, allotment)
    const navigate = useNavigate()

    return (
        <div className="border-b border-border/50 last:border-0">
            <div className="flex items-center gap-3 py-3 px-2 -mx-2">
                <button onClick={() => setOpen(o => !o)} className="text-muted-foreground shrink-0 w-4 hover:text-foreground transition">
                    {open ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                </button>
                <button
                    onClick={() => onOpenPanel(program)}
                    className="flex-1 text-left text-sm font-gmedium text-foreground hover:text-primary transition truncate"
                >
                    {program.name}
                </button>
                <div className="shrink-0">
                    <SaroChips saroNos={saroNos} />
                </div>
                <span className="text-sm font-gbold text-foreground shrink-0 w-40 text-right">
                    {allotment > 0 ? fmtPHP(allotment) : '—'}
                </span>
            </div>

            {open && (
                <div className="mb-3 ml-7 rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 flex flex-col gap-3 bg-muted/20">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Obligation</span>
                                <span className="font-gmedium">{obPct}% · {allotment > 0 ? fmtPHP(obligation) : '—'}</span>
                            </div>
                            <ProgressBar value={obPct} color="bg-violet-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Disbursement</span>
                                <span className="font-gmedium">{disPct}% · {allotment > 0 ? fmtPHP(disbursement) : '—'}</span>
                            </div>
                            <ProgressBar value={disPct} color="bg-amber-500" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">NTCA Received</span>
                                <span className="font-gmedium">{ntcaPct}% · {ntcaReceived > 0 ? fmtPHP(ntcaReceived) : '—'}</span>
                            </div>
                            <ProgressBar value={ntcaPct} color="bg-sky-500" />
                        </div>
                        {saroNos.length > 0 && (
                            <div className="mt-1">
                                <p className="text-xs text-muted-foreground font-gmedium mb-2">SARO Numbers</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {saroNos.map(no => (
                                        <span key={no} className="inline-flex items-center bg-muted text-foreground text-[11px] font-gmedium px-2 py-0.5 rounded-full border border-border">{no}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => onOpenPanel(program)}
                            className="self-end text-xs text-primary hover:underline font-gmedium mt-1"
                        >
                            View program details →
                        </button>
                        <button
                            onClick={() => navigate('/efas-v1/saro', { state: saroNos[0] ? { openSaroNo: saroNos[0] } : {} })}
                            className="self-end text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-gmedium"
                        >
                            View Full Report in RAOD →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
    const [saroRecords, setSaroRecords] = useState<SaroRecord[]>([])
    const [ntcaBySaro, setNtcaBySaro] = useState<Map<string, number>>(new Map())
    const [loading, setLoading] = useState(true)
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
    const [filterProgram, setFilterProgram] = useState<string>('All')

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [saroRes, ntcaRes] = await Promise.all([
                    efasApi.get('saro/saros/'),
                    efasApi.get('saro/ntcas/'),
                ])
                setSaroRecords(saroRes.data)
                // Build saro_no → total NTCA amount map
                const map = new Map<string, number>()
                for (const n of ntcaRes.data as { saro_no: string; amount: string }[]) {
                    if (!n.saro_no) continue
                    map.set(n.saro_no, (map.get(n.saro_no) ?? 0) + parseFloat(n.amount || '0'))
                }
                setNtcaBySaro(map)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // ── Derive programs from unique PAP names in RAOD records ──────────────────
    const programStats: ProgramStat[] = (() => {
        const map = new Map<string, ProgramStat>()
        saroRecords.forEach(r => {
            const key = r.pap || '(No PAP)'
            if (!map.has(key)) {
                map.set(key, {
                    program: { name: key, code: r.pap_code || '' },
                    saroNos: [],
                    allotment: 0,
                    obligation: 0,
                    disbursement: 0,
                    ntcaReceived: 0,
                    records: [],
                })
            }
            const stat = map.get(key)!
            stat.records.push(r)
            // Allotment: deduplicate by saro_no (each SARO no. contributes its amount once)
            if (r.saro_no && !stat.saroNos.includes(r.saro_no)) {
                stat.saroNos.push(r.saro_no)
                stat.allotment += parseN(r.amount_of_allotment)
            }
            stat.obligation += parseN(r.obligated_amount)
            stat.disbursement += parseN(r.cash) + parseN(r.non_tra)
        })
        const result = Array.from(map.values()).filter(s => s.allotment > 0 || s.obligation > 0)
        // Attach NTCA received per PAP (matched by SARO number from Google Sheets)
        result.forEach(stat => {
            stat.ntcaReceived = stat.saroNos.reduce((s, no) => s + (ntcaBySaro.get(no) ?? 0), 0)
        })
        return result
    })()

    // Global PAP filter
    const filteredStats = filterProgram === 'All'
        ? programStats
        : programStats.filter(p => p.program.name === filterProgram)

    // Aggregates scoped to the active filter
    const displayAllotment = filteredStats.reduce((s, p) => s + p.allotment, 0)
    const displayObligation = filteredStats.reduce((s, p) => s + p.obligation, 0)
    const displayDisbursement = filteredStats.reduce((s, p) => s + p.disbursement, 0)
    const displayNtcaReceived = filteredStats.reduce((s, p) => s + p.ntcaReceived, 0)
    const displaySaroNos = new Set(filteredStats.flatMap(p => p.saroNos)).size

    // Pie chart data
    const pieData = [
        { name: 'Allotment', value: displayAllotment, color: '#3B82F6' },
        { name: 'Obligated', value: displayObligation, color: '#10B981' },
        { name: 'Disbursed', value: displayDisbursement, color: '#F59E0B' },
        { name: 'NTCA Received', value: displayNtcaReceived, color: '#06B6D4' },
    ].filter(d => d.value > 0)

    const chartData = [...filteredStats]
        .sort((a, b) => b.allotment - a.allotment)
        .slice(0, 8)
        .map(p => ({
            name: p.program.name,
            Allotment: p.allotment,
            Obligated: p.obligation,
            Disbursed: p.disbursement,
            'NTCA Received': p.ntcaReceived,
        }))

    return (
        <>
            <div className="flex flex-col gap-6">
                {/* Page Title + Global Filter */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-gbold text-foreground">Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Financial overview — DICT Regional Office 10</p>
                    </div>
                    {!loading && programStats.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0 mt-1">
                            <span className="text-xs text-muted-foreground font-gmedium whitespace-nowrap">Filter by PAP:</span>
                            <select
                                value={filterProgram}
                                onChange={e => setFilterProgram(e.target.value)}
                                className="text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground font-gmedium focus:outline-none focus:ring-1 focus:ring-primary max-w-[240px] truncate"
                            >
                                <option value="All">All Programs</option>
                                {programStats.map(p => (
                                    <option key={p.program.name} value={p.program.name}>{p.program.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">Loading dashboard data...</div>
                ) : (
                    <>
                        {/* ── Row 1: Stat Cards ───────────────────────────────── */}
                        <div className="grid grid-cols-5 gap-4 xxslg:grid-cols-3 sm:grid-cols-2">
                            <StatCard label="SARO Numbers" value={String(displaySaroNos)} sub={`${filteredStats.length} program${filteredStats.length !== 1 ? 's' : ''}`} icon={FileText} accent="bg-primary" />
                            <StatCard label="Total Allotment" value={fmtPHP(displayAllotment)} sub="from RAOD records" icon={Landmark} accent="bg-emerald-500" />
                            <StatCard label="Total Obligated" value={fmtPHP(displayObligation)} sub={`${pct(displayObligation, displayAllotment)}% of allotment`} icon={FileText} accent="bg-violet-500" />
                            <StatCard label="NTCA Received" value={fmtPHP(displayNtcaReceived)} sub={`${pct(displayNtcaReceived, displayAllotment)}% of allotment`} icon={Landmark} accent="bg-sky-500" />
                            <StatCard label="Unobligated" value={fmtPHP(Math.max(0, displayAllotment - displayObligation))} sub={`${pct(Math.max(0, displayAllotment - displayObligation), displayAllotment)}% remaining`} icon={Landmark} accent="bg-amber-500" />
                        </div>

                        {/* ── Row 2: Bar Chart + Pie Chart ──────────────────── */}
                        <div className="grid grid-cols-2 gap-4 xslg:grid-cols-1">
                            {/* Left — Bar Chart */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <SectionHeader title={`Allotment, Obligation & Disbursement${filterProgram === 'All' ? ' (Top 8)' : ''}`} />
                                {chartData.length === 0 ? (
                                    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data yet.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={440}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 90 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-35} textAnchor="end" interval={0} />
                                            <YAxis tickFormatter={(v) => `₱${v / 1e6}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                                            <Tooltip
                                                formatter={(val) => fmtPHP(Number(val))}
                                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}
                                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                                cursor={{ fill: 'hsl(var(--muted))' }}
                                            />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
                                            <Bar dataKey="Allotment" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="Obligated" fill="#10B981" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="Disbursed" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="NTCA Received" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Right — Pie Chart */}
                            <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-gsemibold text-foreground whitespace-nowrap">Allotment, Obligation & Disbursement</span>
                                    {filterProgram !== 'All' && (
                                        <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-gmedium truncate max-w-[180px]" title={filterProgram}>
                                            {filterProgram}
                                        </span>
                                    )}
                                </div>
                                {pieData.length === 0 ? (
                                    <div className="flex items-center justify-center flex-1 h-40 text-muted-foreground text-sm">No data yet.</div>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height={320}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={130}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val) => fmtPHP(Number(val))}
                                                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}
                                                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 grid grid-cols-3 gap-3">
                                            {pieData.map(d => (
                                                <div key={d.name} className="flex flex-col items-center gap-1 bg-muted/30 rounded-lg p-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                                                    <span className="text-xs text-muted-foreground font-gmedium">{d.name}</span>
                                                    <span className="text-xs font-gbold text-foreground text-center">{fmtPHP(d.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Row 3: Programs / RAOD Breakdown Table ──────────── */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <SectionHeader title="Programs / PAPs — RAOD Breakdown" />

                            <div className="flex items-center gap-3 px-2 pb-2 border-b border-border text-xs text-muted-foreground font-gmedium uppercase tracking-wide">
                                <span className="w-4 shrink-0" />
                                <span className="flex-1">Program / PAP</span>
                                <span className="shrink-0 text-right pr-2">SAROs</span>
                                <span className="w-28 text-right">Allotment</span>
                            </div>

                            {filteredStats.length === 0 ? (
                                <p className="text-center py-10 text-muted-foreground text-sm">No RAOD records yet. Add records in the RAOD screen.</p>
                            ) : (
                                filteredStats.map(({ program, saroNos, allotment, obligation, disbursement, ntcaReceived }) => (
                                    <ProjectRow
                                        key={program.name}
                                        program={program}
                                        saroNos={saroNos}
                                        allotment={allotment}
                                        obligation={obligation}
                                        disbursement={disbursement}
                                        ntcaReceived={ntcaReceived}
                                        onOpenPanel={setSelectedProgram}
                                    />
                                ))
                            )}

                            <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs font-gmedium text-foreground">
                                <span className="text-muted-foreground">{filteredStats.length} program{filteredStats.length !== 1 ? 's' : ''} · {displaySaroNos} SARO numbers</span>
                                <span>{displayAllotment > 0 ? fmtM(displayAllotment) : '—'}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Program Detail Side Panel ─────────────────────────────────── */}
            {selectedProgram && (() => {
                const stat = programStats.find(s => s.program.name === selectedProgram.name)
                return stat ? (
                    <ProjectDetailPanel
                        programName={stat.program.name}
                        programCode={stat.program.code}
                        raodRecords={stat.records}
                        onClose={() => setSelectedProgram(null)}
                    />
                ) : null
            })()}
        </>
    )
}



