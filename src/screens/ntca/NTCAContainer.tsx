import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, TrendingDown, TrendingUp, Wallet, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react'
import efasApi from '@/plugin/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuarterData {
    q1: number; q2: number; q3: number; q4: number; total: number
}

interface NTCARow {
    id: number
    pap_name: string
    pap_code: string
    class_type: string
    saro_no: string
    saro_date: string | null
    ntca_received: QuarterData
    disbursements: QuarterData
    balance: QuarterData
}

interface NTCAGroup {
    class_type: string
    mds_category: 'MDS Regular' | 'MDS Special' | 'Other'
    sort_order: number
    subtotal: { ntca_received: QuarterData; disbursements: QuarterData; balance: QuarterData }
    rows: NTCARow[]
}

interface NTCAReport {
    year: number
    summary: { ntca_received: QuarterData; disbursements: QuarterData; balance: QuarterData }
    groups: NTCAGroup[]
    available_class_types: string[]
    mds_regular: string[]
    mds_special: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
    v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtSigned = (v: number) => {
    if (v === 0) return '0.00'
    return v < 0
        ? `(${Math.abs(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : fmt(v)
}

const QUARTER_LABELS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'] as const
const QUARTER_KEYS = ['q1', 'q2', 'q3', 'q4'] as const

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: currentYear - 2019 }, (_, i) => 2020 + i).reverse()

// ─── Static MDS category order ────────────────────────────────────────────────

const MDS_REGULAR_CLASS_TYPES = [
    'Personal Services',
    'Automatic Appropriations (RLIP)',
    'General Management Activities (MOOE)',
    'PNPKI',
    'Cybersecurity',
    'eGov & eLGU',
    'eGOV DGP',
    'IIDB',
    'NIPPSB',
    'ICT-PCFI',
    'ILCDB-SPARK',
    'ILCDB-DWIA',
    'ILCDB-Tech4Ed/DTC',
    'NBP (GovNet)',
    'MISS',
    'Infostructure',
    'DRRM',
]

const MDS_SPECIAL_CLASS_TYPES = ['Free WiFi']

const ALL_STATIC_CLASS_TYPES = new Set([...MDS_REGULAR_CLASS_TYPES, ...MDS_SPECIAL_CLASS_TYPES])

const EMPTY_QUARTER: QuarterData = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 }
const EMPTY_SUBTOTAL = { ntca_received: EMPTY_QUARTER, disbursements: EMPTY_QUARTER, balance: EMPTY_QUARTER }

function sumGroups(groups: NTCAGroup[]): NTCAGroup['subtotal'] {
    const zero = (): QuarterData => ({ q1: 0, q2: 0, q3: 0, q4: 0, total: 0 })
    const acc = { ntca_received: zero(), disbursements: zero(), balance: zero() }
    for (const g of groups) {
        for (const sec of ['ntca_received', 'disbursements', 'balance'] as const) {
            acc[sec].q1 += g.subtotal[sec].q1
            acc[sec].q2 += g.subtotal[sec].q2
            acc[sec].q3 += g.subtotal[sec].q3
            acc[sec].q4 += g.subtotal[sec].q4
            acc[sec].total += g.subtotal[sec].total
        }
    }
    return acc
}

// Keyword rules (order matters — first match wins).
// Used for both group-level "Other" absorption AND row-level PAP-name reclassification.
const KEYWORD_RULES: { keywords: string[]; target: string }[] = [
    { keywords: ['cyber', 'ncert', 'cybersecurity'], target: 'Cybersecurity' },
    { keywords: ['wifi', 'wi-fi', 'free wifi', 'free internet', 'connectivity in public'], target: 'Free WiFi' },
    { keywords: ['rlip', 'retirement'], target: 'Automatic Appropriations (RLIP)' },
    { keywords: ['ict industry and countryside', 'countryside development'], target: 'Personal Services' },
    { keywords: ['govnet', 'nbp', 'national broadband'], target: 'NBP (GovNet)' },
    { keywords: ['mooe', 'general management'], target: 'General Management Activities (MOOE)' },
    { keywords: ['pnpki'], target: 'PNPKI' },
    { keywords: ['egov', 'elgu'], target: 'eGov & eLGU' },
    { keywords: ['drrm'], target: 'DRRM' },
    { keywords: ['infostructure'], target: 'Infostructure' },
    { keywords: ['miss'], target: 'MISS' },
]

// These class types are salary/fixed-appropriation — never reclassify their rows by PAP name
// because "Cybersecurity salary" is still a Personal Services row.
const NO_ROW_RECLASSIFY = new Set(['Personal Services', 'Automatic Appropriations (RLIP)'])

function detectCanonicalType(group: NTCAGroup): string | null {
    const haystack = [
        group.class_type,
        ...group.rows.map(r => r.pap_name),
    ].join(' ').toLowerCase()

    for (const { keywords, target } of KEYWORD_RULES) {
        if (keywords.some(kw => haystack.includes(kw.toLowerCase()))) return target
    }
    return null
}

function recalcSubtotal(rows: NTCARow[]): NTCAGroup['subtotal'] {
    const sumQ = (fn: (r: NTCARow) => QuarterData): QuarterData =>
        rows.reduce(
            (acc, r) => {
                const q = fn(r)
                return { q1: acc.q1 + q.q1, q2: acc.q2 + q.q2, q3: acc.q3 + q.q3, q4: acc.q4 + q.q4, total: acc.total + q.total }
            },
            { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 }
        )
    return {
        ntca_received: sumQ(r => r.ntca_received),
        disbursements: sumQ(r => r.disbursements),
        balance: sumQ(r => r.balance),
    }
}

function buildStaticGroups(
    staticTypes: string[],
    apiGroups: NTCAGroup[],
    mdsCategory: NTCAGroup['mds_category'],
    otherGroups: NTCAGroup[] = []
): NTCAGroup[] {
    // Start from exact API matches
    const byType = new Map(apiGroups.map(g => [g.class_type, g]))

    // Absorb "Other" groups whose PAP names / class_type keyword-match a slot in this list
    for (const g of otherGroups) {
        const canonical = detectCanonicalType(g)
        if (!canonical || !staticTypes.includes(canonical)) continue
        const existing = byType.get(canonical)
        if (existing) {
            const merged = [...existing.rows, ...g.rows]
            byType.set(canonical, { ...existing, rows: merged, subtotal: recalcSubtotal(merged) })
        } else {
            byType.set(canonical, { ...g, class_type: canonical, mds_category: mdsCategory })
        }
    }

    return staticTypes.map((ct, i) =>
        byType.get(ct) ?? { class_type: ct, mds_category: mdsCategory, sort_order: i, subtotal: EMPTY_SUBTOTAL, rows: [] }
    )
}

// Remove rows that share the same pap_code + saro_no within a group — these are
// duplicate database records that would inflate the totals.
function deduplicateGroupRows(groups: NTCAGroup[]): NTCAGroup[] {
    return groups.map(g => {
        const seen = new Set<string>()
        const rows = g.rows.filter(row => {
            const key = `${row.pap_code}|${row.saro_no}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
        if (rows.length === g.rows.length) return g
        return { ...g, rows, subtotal: recalcSubtotal(rows) }
    })
}

// Scan each row's PAP name and move it to the correct canonical group when the
// keyword match disagrees with its current class_type.  Rows in salary/fixed
// groups are excluded so "Salary for Cybersecurity staff" stays in PS.
function reclassifyRowsByPapName(groups: NTCAGroup[]): NTCAGroup[] {
    const validTargets = new Set(groups.map(g => g.class_type))
    const buckets = new Map<string, NTCARow[]>(groups.map(g => [g.class_type, []]))

    for (const group of groups) {
        for (const row of group.rows) {
            let target = group.class_type

            if (!NO_ROW_RECLASSIFY.has(group.class_type)) {
                const haystack = row.pap_name.toLowerCase()
                for (const rule of KEYWORD_RULES) {
                    if (validTargets.has(rule.target) && rule.keywords.some(kw => haystack.includes(kw))) {
                        target = rule.target
                        break
                    }
                }
            }

            buckets.get(target)!.push(row)
        }
    }

    return groups.map(g => {
        const rows = buckets.get(g.class_type) ?? []
        return { ...g, rows, subtotal: rows.length > 0 ? recalcSubtotal(rows) : EMPTY_SUBTOTAL }
    })
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
    label,
    total,
    quarters,
    colorClass,
    icon: Icon,
}: {
    label: string
    total: number
    quarters: QuarterData
    colorClass: string
    icon: React.ElementType
}) {
    return (
        <div className={`rounded-xl border border-border bg-card p-4 flex flex-col gap-3 ${colorClass}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">{label}</span>
                <Icon size={16} className="text-muted-foreground" />
            </div>
            <p className={`text-xl font-gbold ${total < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {fmtSigned(total)}
            </p>
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/60">
                {QUARTER_KEYS.map((k, i) => (
                    <div key={k} className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground">Q{i + 1}</span>
                        <span className={`text-xs font-gmedium ${quarters[k] < 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {fmtSigned(quarters[k])}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Amount Cell ──────────────────────────────────────────────────────────────

function AmtCell({ value, bold = false, isTotal = false }: { value: number; bold?: boolean; isTotal?: boolean }) {
    const isNeg = value < 0
    return (
        <td
            className={`px-3 py-2 text-right tabular-nums text-sm whitespace-nowrap
                ${bold ? 'font-gbold' : 'font-gmedium'}
                ${isNeg ? 'text-destructive' : isTotal ? 'text-foreground' : 'text-foreground/80'}
                ${isTotal ? 'bg-muted/40' : ''}
            `}
        >
            {value === 0 ? '0.00' : fmtSigned(value)}
        </td>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NTCAContainer() {
    const [report, setReport] = useState<NTCAReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState(currentYear)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [classTypeFilter, setClassTypeFilter] = useState('')
    const [filterSaro, setFilterSaro] = useState('')
    const [activeTab, setActiveTab] = useState<'regular' | 'special' | 'other'>('regular')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Drag-to-scroll state
    const tableWrapRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    useEffect(() => {
        fetchData()
    }, [year, debouncedSearch, classTypeFilter])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [search])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ year: String(year) })
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (classTypeFilter) params.set('class_type', classTypeFilter)
            const res = await efasApi.get(`ntca-report/?${params}`)
            setReport(res.data)
        } catch {
            // silent
        } finally {
            setLoading(false)
        }
    }

    // Drag-to-scroll handlers
    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true
        dragStartX.current = e.clientX
        scrollStartX.current = tableWrapRef.current?.scrollLeft ?? 0
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
    }
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current || !tableWrapRef.current) return
            tableWrapRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current)
        }
        const onUp = () => {
            isDragging.current = false
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

    const groups = report?.groups ?? []
    const availableClassTypes = report?.available_class_types ?? []

    // Candidate "Other" groups = API groups not already in a static category
    const rawOtherGroups = groups.filter(g => !ALL_STATIC_CLASS_TYPES.has(g.class_type))

    // Pass 1 — group-level: build static sections, absorbing "Other" groups via keyword detection
    const rawRegular = buildStaticGroups(MDS_REGULAR_CLASS_TYPES, groups.filter(g => g.mds_category === 'MDS Regular'), 'MDS Regular', rawOtherGroups)
    const rawSpecial = buildStaticGroups(MDS_SPECIAL_CLASS_TYPES, groups.filter(g => g.mds_category === 'MDS Special'), 'MDS Special', rawOtherGroups)

    // Pass 2 — row-level: scan PAP names and move rows that landed in the wrong canonical group
    const reclassified = reclassifyRowsByPapName([...rawRegular, ...rawSpecial])

    // Pass 3 — deduplication: drop rows with duplicate pap_code + saro_no within the same group
    const deduped = deduplicateGroupRows(reclassified)
    const mdsRegularGroups = deduped.slice(0, MDS_REGULAR_CLASS_TYPES.length)
    const mdsSpecialGroups = deduped.slice(MDS_REGULAR_CLASS_TYPES.length)

    // Only keep "Other" groups that weren't absorbed in either pass
    const otherGroups = rawOtherGroups.filter(g => detectCanonicalType(g) === null)

    // Collect available SARO numbers from all groups for the SARO filter dropdown
    const availableSaros = [...new Set(
        [...mdsRegularGroups, ...mdsSpecialGroups, ...otherGroups]
            .flatMap(g => g.rows.map(r => r.saro_no))
            .filter(Boolean)
    )].sort()

    // Apply SARO filter: narrow group rows and recompute subtotals so summary cards stay accurate
    const applyGroupSaroFilter = (gs: NTCAGroup[]): NTCAGroup[] => {
        if (!filterSaro) return gs
        return gs.map(g => {
            const rows = g.rows.filter(r => r.saro_no === filterSaro)
            return { ...g, rows, subtotal: recalcSubtotal(rows) }
        })
    }
    const displayRegular = applyGroupSaroFilter(mdsRegularGroups)
    const displaySpecial = applyGroupSaroFilter(mdsSpecialGroups)
    const displayOther = applyGroupSaroFilter(otherGroups)

    // Compute summary from the DISPLAYED groups (post-reclassify + dedup + SARO filter) so cards
    // always match the table totals, regardless of what the backend summary says.
    const mdsRegularSubtotal = sumGroups(displayRegular)
    const mdsSpecialSubtotal = sumGroups(displaySpecial)
    const otherSubtotal = sumGroups(displayOther)
    const computedSummary = sumGroups([...displayRegular, ...displaySpecial, ...displayOther])

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-gbold text-foreground">NTCA Report</h1>
                <p className="text-sm text-muted-foreground">
                    Notice of Transfer of Cash Allocation — quarterly breakdown of received NCAs, disbursements, and balance.
                </p>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                <SummaryCard
                    label="Total NTCA Received"
                    total={computedSummary.ntca_received.total}
                    quarters={computedSummary.ntca_received}
                    colorClass=""
                    icon={Wallet}
                />
                <SummaryCard
                    label="Total Disbursements"
                    total={computedSummary.disbursements.total}
                    quarters={computedSummary.disbursements}
                    colorClass=""
                    icon={TrendingDown}
                />
                <SummaryCard
                    label="Total NTCA Balance"
                    total={computedSummary.balance.total}
                    quarters={computedSummary.balance}
                    colorClass=""
                    icon={TrendingUp}
                />
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Year */}
                <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {/* Class type filter */}
                <select
                    value={classTypeFilter}
                    onChange={e => setClassTypeFilter(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <option value="">All Class Types</option>
                    {availableClassTypes.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                    ))}
                </select>

                {/* SARO filter */}
                <div className="relative">
                    <select
                        value={filterSaro}
                        onChange={e => setFilterSaro(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-background pl-3 pr-7 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                    >
                        <option value="">All SAROs</option>
                        {availableSaros.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    {filterSaro && (
                        <button
                            onClick={() => setFilterSaro('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search PAP, SARO number…"
                        className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="h-9 flex items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 border-b border-border">
                {(['regular', 'special', 'other'] as const)
                    .filter(t => t !== 'other' || displayOther.length > 0)
                    .map(tab => {
                        const label = tab === 'regular' ? 'MDS Regular' : tab === 'special' ? 'MDS Special' : 'Other'
                        const count = tab === 'regular'
                            ? displayRegular.reduce((s, g) => s + g.rows.length, 0)
                            : tab === 'special'
                                ? displaySpecial.reduce((s, g) => s + g.rows.length, 0)
                                : displayOther.reduce((s, g) => s + g.rows.length, 0)
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-gmedium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {label}
                                {count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-gbold ${activeTab === tab ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
            </div>

            {/* ── Table ── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                        <RefreshCw size={16} className="animate-spin mr-2" />
                        Loading NTCA report…
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                        No NTCA data found for {year}.
                    </div>
                ) : (
                    <div
                        ref={tableWrapRef}
                        onMouseDown={onMouseDown}
                        className="overflow-x-auto cursor-grab active:cursor-grabbing"
                        style={{ maxHeight: 'calc(100vh - 340px)' }}
                    >
                        <table className="w-full border-collapse text-sm" style={{ minWidth: 1400 }}>
                            {/* ── Column Header ── */}
                            <thead className="sticky top-0 z-20">
                                {/* Row 1: section group labels */}
                                <tr className="bg-primary text-white">
                                    <th colSpan={4} className="bg-primary border-b border-white/20 px-3 py-2 text-left text-sm font-gmedium" />
                                    <th colSpan={5} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium">
                                        NTCA RECEIVED
                                    </th>
                                    <th colSpan={5} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium">
                                        DISBURSEMENTS
                                    </th>
                                    <th colSpan={5} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium">
                                        NTCA BALANCE
                                    </th>
                                </tr>
                                {/* Row 2: individual column labels */}
                                <tr className="bg-primary text-white">
                                    {/* Fixed cols — z-30 so they stack above both thead z-20 and sticky body cells z-[1] */}
                                    <th className="sticky left-0 z-30 bg-primary border border-white/20 px-3 py-2 text-left text-sm font-gmedium whitespace-nowrap min-w-[200px]">PAP</th>
                                    <th className="sticky z-30 bg-primary border border-white/20 px-3 py-2 text-left text-sm font-gmedium whitespace-nowrap min-w-[160px]" style={{ left: 200 }}>PAP CODE</th>
                                    <th className="bg-primary border border-white/20 px-3 py-2 text-left text-sm font-gmedium whitespace-nowrap min-w-[100px]">CLASS TYPE</th>
                                    <th className="bg-primary border border-white/20 px-3 py-2 text-left text-sm font-gmedium whitespace-nowrap min-w-[140px]">SARO NO.</th>
                                    {/* NTCA Received */}
                                    {QUARTER_LABELS.map(q => (
                                        <th key={`ntca-${q}`} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium whitespace-nowrap min-w-[120px]">{q}</th>
                                    ))}
                                    <th className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gbold whitespace-nowrap min-w-[130px]">TOTAL</th>
                                    {/* Disbursements */}
                                    {QUARTER_LABELS.map(q => (
                                        <th key={`disb-${q}`} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium whitespace-nowrap min-w-[120px]">{q}</th>
                                    ))}
                                    <th className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gbold whitespace-nowrap min-w-[130px]">TOTAL</th>
                                    {/* NTCA Balance */}
                                    {QUARTER_LABELS.map(q => (
                                        <th key={`bal-${q}`} className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gmedium whitespace-nowrap min-w-[120px]">{q}</th>
                                    ))}
                                    <th className="bg-primary border border-white/20 px-3 py-2 text-center text-sm font-gbold whitespace-nowrap min-w-[130px]">TOTAL</th>
                                </tr>
                            </thead>

                            <tbody>
                                {/* ── Grand Total Row ── */}
                                {!loading && (
                                    <GrandTotalRow summary={computedSummary} />
                                )}

                                {/* ── Active tab content ── */}
                                {activeTab === 'regular' && (
                                    <MdsCategorySection label="MDS Regular" groups={displayRegular} subtotal={mdsRegularSubtotal} />
                                )}
                                {activeTab === 'special' && (
                                    <MdsCategorySection label="MDS Special" groups={displaySpecial} subtotal={mdsSpecialSubtotal} />
                                )}
                                {activeTab === 'other' && displayOther.length > 0 && (
                                    <MdsCategorySection label="Other" groups={displayOther} subtotal={otherSubtotal} />
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── MDS Category Section (accordion) ────────────────────────────────────────

function MdsCategorySection({ label, groups, subtotal }: {
    label: string
    groups: NTCAGroup[]
    subtotal: NTCAGroup['subtotal']
}) {
    const [expanded, setExpanded] = useState(false)
    const totalRecords = groups.reduce((sum, g) => sum + g.rows.length, 0)

    return (
        <>
            {/* Section header — shows its own subtotal in every column, always visible */}
            <tr
                className="border-y-2 border-primary/40 cursor-pointer select-none hover:bg-primary/15 transition-colors"
                style={{ background: 'color-mix(in srgb, hsl(var(--primary)) 18%, hsl(var(--card)))' }}
                onClick={() => setExpanded(prev => !prev)}
            >
                <td
                    colSpan={4}
                    className="sticky left-0 z-[1] px-3 py-2 text-sm font-gbold text-primary uppercase tracking-widest whitespace-nowrap"
                    style={{ background: 'color-mix(in srgb, hsl(var(--primary)) 18%, hsl(var(--card)))' }}
                >
                    <div className="flex items-center gap-2">
                        <ChevronDown
                            size={13}
                            className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                        {label}
                        {totalRecords > 0 && (
                            <span className="text-[11px] normal-case tracking-normal text-primary/50 font-gmedium">
                                ({totalRecords} records)
                            </span>
                        )}
                    </div>
                </td>
                {QUARTER_KEYS.map(k => <AmtCell key={`nt-${k}`} value={subtotal.ntca_received[k]} bold />)}
                <AmtCell value={subtotal.ntca_received.total} bold isTotal />
                {QUARTER_KEYS.map(k => <AmtCell key={`dis-${k}`} value={subtotal.disbursements[k]} bold />)}
                <AmtCell value={subtotal.disbursements.total} bold isTotal />
                {QUARTER_KEYS.map(k => <AmtCell key={`bal-${k}`} value={subtotal.balance[k]} bold />)}
                <AmtCell value={subtotal.balance.total} bold isTotal />
            </tr>
            {expanded && groups.map(g => <GroupRows key={g.class_type} group={g} />)}
        </>
    )
}

// ─── Grand Total Row ──────────────────────────────────────────────────────────

function GrandTotalRow({ summary }: { summary: NTCAReport['summary'] }) {
    return (
        <tr className="bg-muted/60 border-b-2 border-primary/30">
            {/* <td colSpan={4} className="sticky left-0 z-[1] bg-muted px-3 py-2 text-sm font-gbold text-foreground whitespace-nowrap">
                Total
            </td>
            {QUARTER_KEYS.map(k => <AmtCell key={`nt-${k}`} value={summary.ntca_received[k]} bold />)}
            <AmtCell value={summary.ntca_received.total} bold isTotal />
            {QUARTER_KEYS.map(k => <AmtCell key={`dis-${k}`} value={summary.disbursements[k]} bold />)}
            <AmtCell value={summary.disbursements.total} bold isTotal />
            {QUARTER_KEYS.map(k => <AmtCell key={`bal-${k}`} value={summary.balance[k]} bold />)}
            <AmtCell value={summary.balance.total} bold isTotal /> */}
        </tr>
    )
}

// ─── Group (class_type section) ───────────────────────────────────────────────

function GroupRows({ group }: { group: NTCAGroup }) {
    const { class_type, subtotal, rows } = group
    const [expanded, setExpanded] = useState(false)

    return (
        <>
            {/* Section header — click to toggle */}
            <tr
                className="bg-primary/10 border-y border-primary/20 cursor-pointer select-none hover:bg-primary/15 transition-colors"
                onClick={() => setExpanded(prev => !prev)}
            >
                <td colSpan={4} className="sticky left-0 z-[1] bg-muted px-3 py-2 text-sm font-gbold text-primary whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <ChevronDown
                            size={14}
                            className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                        {class_type}
                        <span className="text-xs font-gmedium text-primary/50">({rows.length})</span>
                    </div>
                </td>
                {QUARTER_KEYS.map(k => <AmtCell key={`nt-${k}`} value={subtotal.ntca_received[k]} bold />)}
                <AmtCell value={subtotal.ntca_received.total} bold isTotal />
                {QUARTER_KEYS.map(k => <AmtCell key={`dis-${k}`} value={subtotal.disbursements[k]} bold />)}
                <AmtCell value={subtotal.disbursements.total} bold isTotal />
                {QUARTER_KEYS.map(k => <AmtCell key={`bal-${k}`} value={subtotal.balance[k]} bold />)}
                <AmtCell value={subtotal.balance.total} bold isTotal />
            </tr>

            {/* Data rows */}
            {expanded && rows.map((row, idx) => (
                <DataRow key={row.id} row={row} striped={idx % 2 === 1} />
            ))}
        </>
    )
}

// ─── Data Row ─────────────────────────────────────────────────────────────────

function DataRow({ row, striped }: { row: NTCARow; striped: boolean }) {
    const navigate = useNavigate()
    const saroYear = row.saro_no ? parseInt(row.saro_no.split('-')[0], 10) : null
    const isCurrentYear = saroYear === currentYear

    return (
        <tr className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${striped ? 'bg-muted/10' : ''}`}>
            {/* PAP Name */}
            <td className="sticky left-0 z-[1] bg-card px-3 py-2 text-sm text-foreground/90 max-w-[200px] truncate border-r border-border/30"
                style={{ minWidth: 200 }}
                title={row.pap_name}
            >
                {row.pap_name || '—'}
            </td>
            {/* PAP Code */}
            <td className="sticky z-[1] bg-card px-3 py-2 text-sm font-gmedium text-foreground/80 whitespace-nowrap border-r border-border/30"
                style={{ left: 200, minWidth: 160 }}
            >
                {row.pap_code || '—'}
            </td>
            {/* Class Type */}
            <td className="px-3 py-2 text-sm text-foreground/70 whitespace-nowrap">
                {row.class_type}
            </td>
            {/* SARO No. — highlight if current year, with RAOD navigate button */}
            <td className="px-3 py-2 text-sm whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded font-gmedium ${isCurrentYear ? 'bg-orange-400/20 text-orange-600 dark:text-orange-400' : 'text-foreground/80'}`}>
                        {row.saro_no}
                    </span>
                    {row.saro_no && (
                        <button
                            onClick={e => {
                                e.stopPropagation()
                                navigate('/efas-v1/raod', { state: { openSaroNo: row.saro_no } })
                            }}
                            title={`Open in RAOD: ${row.saro_no}`}
                            className="p-0.5 rounded hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ExternalLink size={11} />
                        </button>
                    )}
                </div>
            </td>
            {/* NTCA Received */}
            {QUARTER_KEYS.map(k => <AmtCell key={`nt-${k}`} value={row.ntca_received[k]} />)}
            <AmtCell value={row.ntca_received.total} isTotal />
            {/* Disbursements */}
            {QUARTER_KEYS.map(k => <AmtCell key={`dis-${k}`} value={row.disbursements[k]} />)}
            <AmtCell value={row.disbursements.total} isTotal />
            {/* Balance */}
            {QUARTER_KEYS.map(k => <AmtCell key={`bal-${k}`} value={row.balance[k]} />)}
            <AmtCell value={row.balance.total} isTotal />
        </tr>
    )
}
