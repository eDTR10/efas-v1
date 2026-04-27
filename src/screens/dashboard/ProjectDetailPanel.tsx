import { useEffect, useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SaroRecord {
    id: number
    saro_no: string
    pap: string
    pap_code: string
    amount_of_allotment: string
    name_of_claimant: string
    date_of_obligation: string | null
    ors_no: string
    obligated_amount: string | null
    cash: string | null
    non_tra: string | null
    particulars: string
    class_type_detail: { code: string; name: string } | null
    fund_source_detail: { code: string; name: string } | null
}

interface Props {
    programName: string
    programCode: string
    raodRecords: SaroRecord[]
    onClose: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function fmtNum(n: number) {
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function pct(num: number, den: number) {
    if (den === 0) return 0
    return Math.min(100, Math.round((num / den) * 100))
}

function ProgressBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
    return (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
        </div>
    )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProjectDetailPanel({ programName, programCode, raodRecords, onClose }: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    // Deduplicate saro_nos for allotment calculation
    const seenSaroNos = new Set<string>()
    let totalAmount = 0
    raodRecords.forEach(r => {
        if (r.saro_no && !seenSaroNos.has(r.saro_no)) {
            seenSaroNos.add(r.saro_no)
            totalAmount += parseFloat(r.amount_of_allotment || '0')
        }
    })
    const totalObligated = raodRecords.reduce((s, r) => s + parseFloat(r.obligated_amount || '0'), 0)

    // Group records by saro_no for breakdown display
    const uniqueSaroNos = Array.from(seenSaroNos)
    const raodBySaro = uniqueSaroNos.map(saroNo => {
        const entries = raodRecords.filter(r => r.saro_no === saroNo)
        const saroAmt = parseFloat(entries[0]?.amount_of_allotment || '0')
        const totalObl = entries.reduce((s, r) => s + parseFloat(r.obligated_amount || '0'), 0)
        return { saroNo, saroAmt, entries, totalObl }
    })

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg leading-tight">{programName}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {programCode && <span className="font-gmedium">{programCode} · </span>}
                            {uniqueSaroNos.length} SARO{uniqueSaroNos.length !== 1 ? 's' : ''} · {raodRecords.length} obligation{raodRecords.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground">
                        <X size={18} />
                    </button>
                </div>

                {raodRecords.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                        <p>No RAOD records for this program yet.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto flex flex-col gap-6 px-6 py-5">

                        {/* ── Summary Cards ─────────────────────────────────── */}
                        <div className="grid grid-cols-3 gap-3">
                            <SummaryCard label="Total SARO Amount" value={fmtNum(totalAmount)} color="text-primary" />
                            <SummaryCard label="Total Obligated" value={fmtNum(totalObligated)} color="text-emerald-600 dark:text-emerald-400" />
                            <SummaryCard label="Unobligated" value={fmtNum(Math.max(0, totalAmount - totalObligated))} color="text-amber-500" />
                        </div>

                        {/* ── Obligation utilization bar ─────────────────────── */}
                        {totalAmount > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5 text-xs">
                                    <span className="text-muted-foreground font-gmedium">Utilization</span>
                                    <span className="font-gbold text-amber-500">
                                        {Math.min(100, Math.round((totalObligated / totalAmount) * 100))}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (totalObligated / totalAmount) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── RAOD Obligations Breakdown ────────────────────── */}
                        {raodBySaro.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-sm font-gsemibold text-foreground whitespace-nowrap">RAOD Obligations</span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    {raodBySaro.map(({ saroNo, saroAmt, entries, totalObl }) => {
                                        const saroPct = saroAmt > 0 ? Math.min(100, (totalObl / saroAmt) * 100) : 0
                                        return (
                                            <div key={saroNo} className="bg-background border border-border rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-gbold text-foreground">{saroNo}</span>
                                                            <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-gmedium">{entries.length} entries</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-muted-foreground">Allotment</div>
                                                        <div className="text-xs font-gbold text-foreground">{fmtNum(saroAmt)}</div>
                                                    </div>
                                                </div>
                                                <div className="px-4 pb-2.5 flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-muted-foreground">Obligated: <span className="text-emerald-600 dark:text-emerald-400 font-gmedium">{fmtNum(totalObl)}</span></span>
                                                        <span className="text-amber-500 font-gbold">{saroPct.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${saroPct}%` }} />
                                                    </div>
                                                </div>
                                                {/* Latest obligation entries */}
                                                <div className="border-t border-border/50">
                                                    {entries.slice(0, 3).map((entry, idx) => (
                                                        <div key={entry.id} className="flex items-center justify-between px-4 py-2 border-b border-border/30 last:border-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">{idx + 1}</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-gmedium text-foreground truncate">{entry.name_of_claimant || '—'}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{entry.date_of_obligation || '—'}{entry.ors_no ? ` · ${entry.ors_no}` : ''}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-gbold text-foreground shrink-0 ml-2">{fmtNum(parseFloat(entry.obligated_amount || '0'))}</span>
                                                        </div>
                                                    ))}
                                                    {entries.length > 3 && (
                                                        <div className="px-4 py-1.5 text-[10px] text-muted-foreground">+{entries.length - 3} more obligation{entries.length - 3 !== 1 ? 's' : ''}</div>
                                                    )}
                                                </div>
                                                <div className="border-t border-border/50 px-4 py-2 flex justify-end">
                                                    <button
                                                        onClick={() => { navigate('/efas-v1/saro', { state: { openSaroNo: saroNo } }); onClose() }}
                                                        className="flex items-center gap-1 text-[10px] text-primary hover:underline font-gmedium"
                                                    >
                                                        View in RAOD <ChevronRight size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Navigate to full RAOD report ─────────────────── */}
                        {uniqueSaroNos.length > 0 && (
                            <button
                                onClick={() => {
                                    navigate('/efas-v1/saro', { state: { openSaroNo: uniqueSaroNos[0] } })
                                    onClose()
                                }}
                                className="self-end flex items-center gap-1.5 text-xs text-primary hover:underline font-gmedium"
                            >
                                View Full Report in RAOD <ChevronRight size={11} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="bg-background border border-border rounded-xl px-4 py-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-gmedium">{label}</span>
            <span className={`text-lg font-gbold ${color}`}>{value}</span>
        </div>
    )
}

function ProgressRow({ label, pct, value, color }: { label: string; pct: number; value: string; color: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-gmedium">{label}</span>
                <span className="font-gbold text-foreground">{pct}% — {value}</span>
            </div>
            <ProgressBar value={pct} color={color} />
        </div>
    )
}
