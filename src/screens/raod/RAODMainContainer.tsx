import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import efasApi from '@/plugin/axios'
import { Plus, Eye, Pencil, Trash2, Search, ClipboardList, ArrowUpDown, X, ChevronRight } from 'lucide-react'
import AddRaodDialog from './dialogs/AddRaodDialog'
import BulkImportRaodDialog from './dialogs/BulkImportRaodDialog'
import LoadingOverlay from '../received_saro/LoadingOverlay'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface PAPCode {
    id: number
    pap_code: string
    pap_name: string
}

export interface FundType {
    id: number
    code: string
    name: string
}

export interface ClassType {
    id: number
    code: string
    name: string
}

export interface ReceivedSARO {
    id: number
    allotment_no: string
    date_of_saro: string
    total_amount: string
    class_type: string
    notes_validity: string
    items: { pap: number | null; pap_code: string; pap_name: string; class_type: string; object_code_no: string; object_code_desc: string; purpose: string; fund_type: string }[]
}

export interface RAODEntry {
    id: number
    date_of_obligation: string | null
    fund_type_description: string
    class_type: string
    fund_source: string
    ors_no: string
    ors: string
    name_of_claimant: string
    particulars: string
    obligated_amount: string
    disbursement_date: string | null
    ada_check: string
    cash: string
    non_tra: string
    total_disbursed: string
    balance: string
}

export interface RAOD {
    id: number
    pap: number | null
    pap_code: string
    pap_name: string
    date_of_saro: string
    saro_no: string
    amount_of_allotment: string
    remarks: string
    object_description: string
    object_code: string
    entries: RAODEntry[]
    created_at: string
    updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(val: string | null | undefined) {
    if (!val) return '—'
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null | undefined) {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

function RaodDetailPanel({ raod, onClose, onEdit, onDelete }: {
    raod: RAOD
    onClose: () => void
    onEdit: () => void
    onDelete: () => void
}) {
    const [panelWidth, setPanelWidth] = useState(700)
    const isResizing = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(700)

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isResizing.current) return
            const delta = startX.current - e.clientX
            setPanelWidth(Math.max(320, Math.min(780, startWidth.current + delta)))
        }
        const onUp = () => { isResizing.current = false }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
    }, [])

    const totalObligated = raod.entries.reduce((s, e) => s + (parseFloat(e.obligated_amount) || 0), 0)
    const totalDisbursed = raod.entries.reduce((s, e) => s + (parseFloat(e.total_disbursed) || 0), 0)
    const totalAllot = parseFloat(raod.amount_of_allotment) || 0
    const balance = totalAllot - totalDisbursed
    const obligPct = totalAllot > 0 ? Math.min(100, (totalObligated / totalAllot) * 100) : 0
    const disbPct = totalAllot > 0 ? Math.min(100, (totalDisbursed / totalAllot) * 100) : 0

    const statusColor = (pct: number) =>
        pct >= 80
            ? { text: 'text-emerald-400', bg: 'bg-emerald-400/20', bar: 'bg-emerald-400' }
            : pct >= 50
                ? { text: 'text-amber-400', bg: 'bg-amber-400/20', bar: 'bg-amber-400' }
                : { text: 'text-orange-400', bg: 'bg-orange-400/20', bar: 'bg-orange-400' }

    const obligStatus = statusColor(obligPct)
    const disbStatus = statusColor(disbPct)

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

            <div className="flex-1 border border-border rounded-lg  bg-card flex flex-col overflow-hidden min-w-0 shadow-lg">

                {/* ── Header ── */}
                <div className="px-5 pt-4 pb-4 border-b border-border shrink-0 bg-card">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-gsemibold tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    RAOD
                                </span>
                                <span className="text-xs text-muted-foreground">{fmtDate(raod.date_of_saro)}</span>
                            </div>
                            <p className="text-lg font-gbold text-foreground leading-tight truncate">{raod.saro_no}</p>
                            {raod.pap_name && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate" title={raod.pap_name}>{raod.pap_name}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-0.5 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition shrink-0"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Quick financials row */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {/* Allotment */}
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <p className="text-[10px] font-gsemibold text-blue-500 uppercase tracking-widest mb-1">Allotment</p>
                            <p className="text-xl font-gbold text-foreground leading-tight">
                                ₱{totalAllot.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">100%</p>
                        </div>
                        {/* Obligated */}
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-gsemibold text-amber-500 uppercase tracking-widest">Obligated</p>
                                <span className={`text-[10px] font-gbold ${obligStatus.text} ${obligStatus.bg} px-1.5 py-0.5 rounded-full leading-none`}>
                                    {obligPct.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xl font-gbold text-foreground leading-tight">
                                ₱{totalObligated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${obligStatus.bar}`} style={{ width: `${obligPct}%` }} />
                            </div>
                        </div>
                        {/* Disbursed */}
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-gsemibold text-emerald-500 uppercase tracking-widest">Disbursed</p>
                                <span className={`text-[10px] font-gbold ${disbStatus.text} ${disbStatus.bg} px-1.5 py-0.5 rounded-full leading-none`}>
                                    {disbPct.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xl font-gbold text-foreground leading-tight">
                                ₱{totalDisbursed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${disbStatus.bar}`} style={{ width: `${disbPct}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Balance strip */}
                    <div className={`mt-2.5 flex items-center justify-between px-3 py-2 rounded-lg border ${balance < 0 ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-500/50 bg-emerald-500/5'}`}>
                        <span className="text-[11px] font-gsemibold text-muted-foreground uppercase tracking-widest">Remaining Balance</span>
                        <span className={`text-base font-gbold ${balance < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* RAOD Details */}
                    <div className="px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 rounded-full bg-primary shrink-0" />
                            <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">RAOD Details</p>
                        </div>

                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">SARO No.</p>
                                    <p className="text-xs font-gbold text-primary">{raod.saro_no}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Date of SARO</p>
                                    <p className="text-xs font-gsemibold text-foreground">{fmtDate(raod.date_of_saro)}</p>
                                </div>
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">PAP Code</p>
                                    <p className="text-xs font-gbold text-primary">{raod.pap_code || '—'}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Amount of Allotment</p>
                                    <p className="text-xs font-gbold text-foreground">₱{fmtNum(raod.amount_of_allotment)}</p>
                                </div>
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Object Code</p>
                                    <p className="text-xs font-gsemibold text-foreground">{raod.object_code || '—'}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Object Description</p>
                                    <p className="text-xs font-gsemibold text-foreground">{raod.object_description || '—'}</p>
                                </div>
                            </div>
                            {raod.remarks && (
                                <div className="border-t border-border px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Remarks</p>
                                    <p className="text-xs text-foreground leading-relaxed">{raod.remarks}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Entries */}
                    <div className="px-5 pt-2 pb-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-4 rounded-full bg-amber-500/70 shrink-0" />
                                <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">Entries</p>
                            </div>
                            {raod.entries.length > 0 && (
                                <span className="text-[10px] font-gbold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                    {raod.entries.length} entr{raod.entries.length !== 1 ? 'ies' : 'y'}
                                </span>
                            )}
                        </div>

                        {raod.entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border text-center">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <ClipboardList size={18} className="text-muted-foreground" />
                                </div>
                                <p className="text-sm font-gmedium text-muted-foreground">No entries yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">Add entries by editing this RAOD</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {raod.entries.map((entry, i) => {
                                    const obAmt = parseFloat(entry.obligated_amount) || 0
                                    const bal = parseFloat(entry.balance) || 0
                                    const disbAmt = parseFloat(entry.total_disbursed) || 0
                                    const entryDisbPct = obAmt > 0 ? Math.min(100, (disbAmt / obAmt) * 100) : 0
                                    const entryStatus = statusColor(entryDisbPct)

                                    return (
                                        <div
                                            key={entry.id}
                                            className="rounded-xl border border-border bg-background overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                                        >
                                            {/* Entry header */}
                                            <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-border/60">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-gbold flex items-center justify-center">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-xs font-gbold text-muted-foreground truncate">
                                                        {entry.ors || (entry.ors_no ? `ORS ${entry.ors_no}` : 'No ORS ref.')}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-gbold text-foreground shrink-0 ml-2">
                                                    ₱{fmtNum(entry.obligated_amount)}
                                                </span>
                                            </div>

                                            <div className="px-3.5 py-3 space-y-2.5">
                                                {/* Claimant */}
                                                {entry.name_of_claimant && (
                                                    <p className="text-xs font-gmedium text-foreground">{entry.name_of_claimant}</p>
                                                )}
                                                {/* Particulars */}
                                                {entry.particulars && (
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{entry.particulars}</p>
                                                )}

                                                {/* Tags */}
                                                {(entry.class_type || entry.fund_source || entry.fund_type_description) && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {entry.class_type && (
                                                            <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">
                                                                {entry.class_type}
                                                            </span>
                                                        )}
                                                        {entry.fund_source && (
                                                            <span className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">
                                                                {entry.fund_source}
                                                            </span>
                                                        )}
                                                        {entry.fund_type_description && (
                                                            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-gsemibold">
                                                                {entry.fund_type_description}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Disbursement progress bar */}
                                                {obAmt > 0 && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] text-muted-foreground">Disbursed of obligated</span>
                                                            <span className={`text-[10px] font-gbold ${entryStatus.text}`}>
                                                                {entryDisbPct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${entryStatus.bar}`}
                                                                style={{ width: `${entryDisbPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Data grid */}
                                                <div className="rounded-lg bg-muted/30 border border-border/60 divide-y divide-border/60 overflow-hidden">
                                                    {entry.date_of_obligation && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Date of Obligation</span>
                                                            <span className="text-[11px] font-gsemibold text-right">{fmtDate(entry.date_of_obligation)}</span>
                                                        </div>
                                                    )}
                                                    {entry.ors_no && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">ORS No.</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-primary">{entry.ors_no}</span>
                                                        </div>
                                                    )}
                                                    {!!entry.ada_check?.trim() && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">ADA / Check</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-emerald-600 dark:text-emerald-400">{entry.ada_check}</span>
                                                        </div>
                                                    )}
                                                    {parseFloat(entry.cash) !== 0 && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Cash</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-emerald-600 dark:text-emerald-400">₱{fmtNum(entry.cash)}</span>
                                                        </div>
                                                    )}
                                                    {parseFloat(entry.non_tra) !== 0 && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Non-TRA</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-emerald-600 dark:text-emerald-400">₱{fmtNum(entry.non_tra)}</span>
                                                        </div>
                                                    )}
                                                    {entry.disbursement_date && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Disbursement Date</span>
                                                            <span className="text-[11px] font-gsemibold text-right">{fmtDate(entry.disbursement_date)}</span>
                                                        </div>
                                                    )}
                                                    {/* Balance — always shown */}
                                                    <div className={`grid grid-cols-2 px-3 py-2 ${bal < 0 ? 'bg-destructive/5' : 'bg-emerald-500/5'}`}>
                                                        <span className="text-[11px] font-gsemibold text-muted-foreground">Balance</span>
                                                        <span className={`text-[11px] font-gbold text-right ${bal < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            ₱{fmtNum(entry.balance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer Actions ── */}
                <div className="flex gap-2 px-4 py-3 border-t border-border bg-card/80 backdrop-blur shrink-0">
                    <button
                        onClick={onEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
                    >
                        <Pencil size={14} /> Edit RAOD
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-sm font-gsemibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                        title="Delete RAOD"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RAODMainContainer() {
    const location = useLocation()
    const [raods, setRaods] = useState<RAOD[]>([])
    const [paps, setPaps] = useState<PAPCode[]>([])
    const [receivedSaros, setReceivedSaros] = useState<ReceivedSARO[]>([])
    const [fundTypes, setFundTypes] = useState<FundType[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterPap, setFilterPap] = useState('All')
    const [filterSaro, setFilterSaro] = useState('All')
    const [showAdd, setShowAdd] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [editTarget, setEditTarget] = useState<RAOD | null>(null)
    const [panelRaod, setPanelRaod] = useState<RAOD | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [sortKey, setSortKey] = useState<'date_of_saro' | 'saro_no' | 'amount_of_allotment' | 'obligated_amount'>('date_of_saro')
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
    const [crudLoading, setCrudLoading] = useState<string | null>(null)
    const [expandedRaodIds, setExpandedRaodIds] = useState<Set<number>>(new Set())

    const toggleExpand = (id: number) => setExpandedRaodIds(prev => {
        const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })

    // Drag-to-scroll
    const tableRef = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)
    const dragMoved = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true
        dragMoved.current = false
        dragStartX.current = e.clientX
        scrollStartX.current = tableRef.current?.scrollLeft ?? 0
    }
    const onMouseMove = (e: React.MouseEvent) => {
        if (!dragging.current || !tableRef.current) return
        const delta = e.clientX - dragStartX.current
        if (Math.abs(delta) > 4) dragMoved.current = true
        tableRef.current.scrollLeft = scrollStartX.current - delta
    }
    const onMouseUp = () => { dragging.current = false }

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [raodRes, papRes, saroRes, ftRes, ctRes] = await Promise.allSettled([
                efasApi.get('raod/'),
                efasApi.get('pap/'),
                efasApi.get('received-saro/'),
                efasApi.get('fund-type/'),
                efasApi.get('class-type/'),
            ])
            if (raodRes.status === 'fulfilled') setRaods(raodRes.value.data)
            if (papRes.status === 'fulfilled') setPaps(papRes.value.data)
            if (saroRes.status === 'fulfilled') setReceivedSaros(saroRes.value.data)
            if (ftRes.status === 'fulfilled') setFundTypes(ftRes.value.data)
            if (ctRes.status === 'fulfilled') setClassTypes(ctRes.value.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    // Auto-open panel when navigated from dashboard
    const autoOpenedRef = useRef(false)
    useEffect(() => {
        const state = location.state as { openSaroNo?: string } | null
        if (!state?.openSaroNo || raods.length === 0 || autoOpenedRef.current) return
        const match = raods.find(r => r.saro_no === state.openSaroNo)
        if (match) {
            autoOpenedRef.current = true
            setPanelRaod(match)
            setExpandedRaodIds(prev => new Set([...prev, match.id]))
            window.history.replaceState({}, '')
        }
    }, [raods, location.state])

    const totalEntryCount = raods.reduce((s, r) => s + r.entries.length, 0)

    const papOptions = Array.from(new Map(raods.map(r => [r.pap_code, r.pap_name])).entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
    const saroOptions = Array.from(new Set(raods.map(r => r.saro_no))).sort()

    const filteredRaods = raods.filter(raod => {
        if (filterPap !== 'All' && raod.pap_code !== filterPap) return false
        if (filterSaro !== 'All' && raod.saro_no !== filterSaro) return false
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            raod.saro_no.toLowerCase().includes(q) ||
            raod.pap_code.toLowerCase().includes(q) ||
            raod.pap_name.toLowerCase().includes(q) ||
            raod.entries.some(e =>
                e.ors_no.toLowerCase().includes(q) ||
                e.name_of_claimant.toLowerCase().includes(q) ||
                e.particulars.toLowerCase().includes(q)
            )
        )
    })

    const sortedRaods = [...filteredRaods].sort((a, b) => {
        let av: string | number = ''
        let bv: string | number = ''
        if (sortKey === 'date_of_saro') { av = a.date_of_saro; bv = b.date_of_saro }
        else if (sortKey === 'saro_no') { av = a.saro_no; bv = b.saro_no }
        else if (sortKey === 'amount_of_allotment') {
            av = parseFloat(a.amount_of_allotment) || 0
            bv = parseFloat(b.amount_of_allotment) || 0
        } else if (sortKey === 'obligated_amount') {
            av = a.entries.reduce((s, e) => s + (parseFloat(e.obligated_amount) || 0), 0)
            bv = b.entries.reduce((s, e) => s + (parseFloat(e.obligated_amount) || 0), 0)
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
    })

    const sumAllotment = filteredRaods.reduce((s, r) => s + (parseFloat(r.amount_of_allotment) || 0), 0)
    const allFilteredEntries = filteredRaods.flatMap(r => r.entries)
    const sumObligated = allFilteredEntries.reduce((s, e) => s + (parseFloat(e.obligated_amount) || 0), 0)
    const sumDisbursed = allFilteredEntries.reduce((s, e) => s + (parseFloat(e.total_disbursed) || 0), 0)
    const sumBalance = allFilteredEntries.reduce((s, e) => s + (parseFloat(e.balance) || 0), 0)
    const obligatedPct = sumAllotment > 0 ? Math.min(100, (sumObligated / sumAllotment) * 100) : 0
    const disbursedPct = sumObligated > 0 ? Math.min(100, (sumDisbursed / sumObligated) * 100) : 0

    const totalPages = Math.max(1, Math.ceil(filteredRaods.length / pageSize))
    const paginatedRaods = sortedRaods.slice((page - 1) * pageSize, page * pageSize)
    const allPageIds = paginatedRaods.map(r => r.id)
    const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id))

    const handleDelete = async (raodId: number) => {
        if (!window.confirm('Delete this RAOD record and all its entries?')) return
        setCrudLoading('Deleting RAOD…')
        try {
            await efasApi.delete(`raod/${raodId}/`)
            if (panelRaod?.id === raodId) setPanelRaod(null)
            fetchAll()
        } finally { setCrudLoading(null) }
    }

    const toggleSelect = (id: number) =>
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

    const toggleSelectAll = () => {
        if (allPageSelected) {
            setSelectedIds(prev => { const next = new Set(prev); allPageIds.forEach(id => next.delete(id)); return next })
        } else {
            setSelectedIds(prev => { const next = new Set(prev); allPageIds.forEach(id => next.add(id)); return next })
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!window.confirm(`Delete ${selectedIds.size} RAOD record(s) and all their entries?`)) return
        setCrudLoading(`Deleting ${selectedIds.size} RAOD record${selectedIds.size !== 1 ? 's' : ''}…`)
        try {
            await Promise.all([...selectedIds].map(id => efasApi.delete(`raod/${id}/`)))
            setSelectedIds(new Set())
            fetchAll()
        } finally { setCrudLoading(null) }
    }

    const isEmptyEntry = (e: RAODEntry) =>
        !e.ors_no?.trim() && (!e.obligated_amount || parseFloat(e.obligated_amount) === 0)

    const emptyEntryCount = raods.reduce((s, r) => s + r.entries.filter(isEmptyEntry).length, 0)

    const handleCleanupEmptyEntries = async () => {
        const affected = raods.filter(r => r.entries.some(isEmptyEntry))
        if (affected.length === 0) return
        if (!window.confirm(`Remove ${emptyEntryCount} empty entr${emptyEntryCount !== 1 ? 'ies' : 'y'} from ${affected.length} RAOD${affected.length !== 1 ? 's' : ''}?`)) return
        setCrudLoading('Removing empty entries…')
        try {
            await Promise.all(affected.map(raod => {
                const keepEntries = raod.entries
                    .filter(e => !isEmptyEntry(e))
                    .map(e => ({
                        date_of_obligation: e.date_of_obligation || null,
                        fund_type_description: e.fund_type_description,
                        class_type: e.class_type,
                        fund_source: e.fund_source,
                        ors_no: e.ors_no,
                        name_of_claimant: e.name_of_claimant,
                        particulars: e.particulars,
                        obligated_amount: e.obligated_amount,
                        disbursement_date: e.disbursement_date || null,
                        ada_check: e.ada_check,
                        cash: e.cash,
                        non_tra: e.non_tra,
                    }))
                return efasApi.patch(`raod/${raod.id}/`, { entries: keepEntries })
            }))
            fetchAll()
        } finally { setCrudLoading(null) }
    }

    const th = 'px-3 py-3 text-left text-sm font-gmedium text-white whitespace-nowrap select-none'
    const td = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'
    const thCheck = 'px-3 py-3 sticky left-0 bg-primary z-20 border-r border-white/20 w-10 text-center'
    const tdCheck = 'px-3 py-2.5 sticky left-0 z-20 border-r border-border text-center'
    const thSticky = `${th} sticky right-0 bg-primary z-20 border-l border-white/20`
    const tdSticky = `${td} sticky right-0 z-20 text-center border-l border-border`

    return (
        <div className="flex flex-col gap-4">
            {crudLoading && <LoadingOverlay message={crudLoading} sub="Please wait. Your request is being processed." />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">RAOD</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {raods.length} RAOD{raods.length !== 1 ? 's' : ''} &middot; {totalEntryCount} entr{totalEntryCount !== 1 ? 'ies' : 'y'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {emptyEntryCount > 0 && (
                        <button
                            onClick={handleCleanupEmptyEntries}
                            className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-gmedium px-4 py-2 rounded-lg border border-destructive/30 transition"
                            title={`${emptyEntryCount} empty entr${emptyEntryCount !== 1 ? 'ies' : 'y'} found`}
                        >
                            <X size={14} /> Clean up {emptyEntryCount} empty entr{emptyEntryCount !== 1 ? 'ies' : 'y'}
                        </button>
                    )}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                        >
                            <Trash2 size={15} /> Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => setShowBulk(true)}
                        className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-gmedium px-4 py-2 rounded-lg border border-border transition"
                    >
                        <ClipboardList size={15} /> Bulk Import
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                    >
                        <Plus size={15} /> Add RAOD
                    </button>
                </div>
            </div>

            {/* Search + Sort + Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search SARO No., PAP, ORS, Claimant…"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                </div>

                {/* PAP filter */}
                <div className="relative">
                    <select
                        value={filterPap}
                        onChange={e => { setFilterPap(e.target.value); setPage(1) }}
                        className="text-sm rounded-lg border border-border bg-background text-foreground pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition appearance-none"
                    >
                        <option value="All">All PAPs</option>
                        {papOptions.map(([code, name]) => (
                            <option key={code} value={code}>{code}{name ? ` — ${name}` : ''}</option>
                        ))}
                    </select>
                    <ChevronRight size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground" />
                </div>

                {/* SARO filter */}
                <div className="relative">
                    <select
                        value={filterSaro}
                        onChange={e => { setFilterSaro(e.target.value); setPage(1) }}
                        className="text-sm rounded-lg border border-border bg-background text-foreground pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition appearance-none"
                    >
                        <option value="All">All SAROs</option>
                        {saroOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <ChevronRight size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground" />
                </div>

                {/* Clear filters badge */}
                {(filterPap !== 'All' || filterSaro !== 'All') && (
                    <button
                        onClick={() => { setFilterPap('All'); setFilterSaro('All'); setPage(1) }}
                        className="inline-flex items-center gap-1.5 text-xs font-gmedium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                    >
                        <X size={11} /> Clear filters
                    </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    <ArrowUpDown size={14} className="text-muted-foreground" />
                    <select
                        value={`${sortKey}:${sortDir}`}
                        onChange={e => {
                            const [k, d] = e.target.value.split(':') as [typeof sortKey, typeof sortDir]
                            setSortKey(k); setSortDir(d); setPage(1)
                        }}
                        className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition"
                    >
                        <option value="date_of_saro:desc">Date of SARO ↓</option>
                        <option value="date_of_saro:asc">Date of SARO ↑</option>
                        <option value="saro_no:asc">SARO No. A→Z</option>
                        <option value="saro_no:desc">SARO No. Z→A</option>
                        <option value="amount_of_allotment:desc">Allotment ↓</option>
                        <option value="amount_of_allotment:asc">Allotment ↑</option>
                        <option value="obligated_amount:desc">Obligated ↓</option>
                        <option value="obligated_amount:asc">Obligated ↑</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground">Total Allotment</p>
                    <p className="text-xl font-gbold text-foreground">{sumAllotment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{raods.length} RAOD{raods.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-5 py-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-gmedium uppercase tracking-widest text-orange-600 dark:text-orange-400">Total Obligated</p>
                        <span className="text-xs font-gbold text-orange-500">{obligatedPct.toFixed(1)}%</span>
                    </div>
                    <p className="text-xl font-gbold text-foreground">{sumObligated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${obligatedPct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{allFilteredEntries.length} entr{allFilteredEntries.length !== 1 ? 'ies' : 'y'} · of allotment</p>
                </div>
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-gmedium uppercase tracking-widest text-green-600 dark:text-green-400">Total Disbursed</p>
                        <span className="text-xs font-gbold text-green-500">{disbursedPct.toFixed(1)}%</span>
                    </div>
                    <p className="text-xl font-gbold text-foreground">{sumDisbursed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${disbursedPct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">of obligated</p>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-blue-600 dark:text-blue-400">Total Balance</p>
                    <p className="text-xl font-gbold text-foreground">{sumBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Obligated − Disbursed</p>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className="flex flex-col gap-4 flex-1 min-w-0">

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
                                <tr className="bg-blue-600">
                                    <th className={thCheck}>
                                        <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll}
                                            className="rounded cursor-pointer accent-white" />
                                    </th>
                                    <th className={th}>#</th>
                                    <th className={th}>PAP</th>
                                    <th className={th}>PAP CODE</th>
                                    <th className={th}>DATE OF SARO</th>
                                    <th className={th}>SARO NO.</th>
                                    <th className={`${th} text-right`}>AMT OF ALLOTMENT</th>
                                    <th className={th}>REMARKS</th>
                                    <th className={th}>OBJECT DESC</th>
                                    <th className={th}>OBJECT CODE</th>
                                    <th className={`${th} bg-amber-700`}>DATE OF OBLIG.</th>
                                    <th className={`${th} bg-amber-700`}>FUND TYPE DESC</th>
                                    <th className={`${th} bg-amber-700`}>CLASS TYPE</th>
                                    <th className={`${th} bg-amber-700`}>FUND SOURCE</th>
                                    <th className={`${th} bg-amber-700`}>ORS NO.</th>
                                    <th className={`${th} bg-amber-700`}>ORS</th>
                                    <th className={`${th} bg-amber-700`}>NAME OF CLAIMANT</th>
                                    <th className={`${th} bg-amber-700`}>PARTICULARS</th>
                                    <th className={`${th} bg-amber-700 text-right`}>OBLIGATED AMT</th>
                                    <th className={`${th} bg-green-700`}>DATE</th>
                                    <th className={`${th} bg-green-700 text-right`}>ADA/CHECK</th>
                                    <th className={`${th} bg-green-700 text-right`}>CASH</th>
                                    <th className={`${th} bg-green-700 text-right`}>NON TRA</th>
                                    <th className={`${th} bg-green-700 text-right`}>BALANCE</th>
                                    <th className={thSticky}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={25} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
                                ) : filteredRaods.length === 0 ? (
                                    <tr><td colSpan={25} className="text-center py-12 text-muted-foreground text-sm">No records found.</td></tr>
                                ) : paginatedRaods.map((raod, idx) => {
                                    const isExpanded = expandedRaodIds.has(raod.id)
                                    const isSelected = panelRaod?.id === raod.id
                                    const raodObligated = raod.entries.reduce((s, e) => s + (parseFloat(e.obligated_amount) || 0), 0)
                                    const raodDisbursed = raod.entries.reduce((s, e) => s + (parseFloat(e.total_disbursed) || 0), 0)
                                    const raodBalance = raodObligated - raodDisbursed
                                    const entryCount = raod.entries.length
                                    const rowBg = isSelected ? 'bg-primary/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                    const stickyBg = isSelected
                                        ? 'color-mix(in srgb, hsl(var(--primary)) 12%, hsl(var(--background)))'
                                        : undefined
                                    return (
                                        <>
                                            {/* ── RAOD group header row ── */}
                                            <tr
                                                key={`raod-${raod.id}`}
                                                className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/30 ${rowBg}`}
                                                onClick={() => { if (!dragMoved.current) setPanelRaod(raod) }}
                                            >
                                                <td className={`${tdCheck} ${isSelected ? '' : idx % 2 === 0 ? 'bg-background' : 'bg-muted'}`} style={{ background: stickyBg }}>
                                                    <input type="checkbox" checked={selectedIds.has(raod.id)}
                                                        onChange={() => toggleSelect(raod.id)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="rounded cursor-pointer" />
                                                </td>
                                                <td className={td}>{(page - 1) * pageSize + idx + 1}</td>
                                                <td className={`${td} font-gmedium`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <ChevronRight size={14} className={`transition-transform duration-200 shrink-0 text-muted-foreground ${isExpanded ? 'rotate-90' : ''}`} />
                                                        <span className="truncate max-w-[140px]" title={raod.pap_name}>{raod.pap_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className={`${td} font-gmedium text-primary`}>{raod.pap_code || '—'}</td>
                                                <td className={td}>{fmtDate(raod.date_of_saro)}</td>
                                                <td className={`${td} font-gmedium text-primary`}>{raod.saro_no}</td>
                                                <td className={`${td} text-right`}>{fmtNum(raod.amount_of_allotment)}</td>
                                                <td className={`${td} max-w-[140px] truncate`} title={raod.remarks}>{raod.remarks || '—'}</td>
                                                <td className={`${td} max-w-[160px] truncate`} title={raod.object_description}>{raod.object_description || '—'}</td>
                                                <td className={td}>{raod.object_code || '—'}</td>
                                                {/* Amber aggregate cols */}
                                                <td
                                                    className={`${td} bg-amber-50 dark:bg-amber-950/20`}
                                                    colSpan={8}
                                                    onClick={e => { e.stopPropagation(); if (!dragMoved.current) toggleExpand(raod.id) }}
                                                >
                                                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-xs font-gbold cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors select-none">
                                                        <ChevronRight size={11} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        {entryCount} entr{entryCount !== 1 ? 'ies' : 'y'}
                                                    </span>
                                                </td>
                                                <td className={`${td} bg-amber-50 dark:bg-amber-950/20 text-right font-gbold`}>{fmtNum(raodObligated.toString())}</td>
                                                {/* Green aggregate cols */}
                                                <td className={`${td} bg-green-50 dark:bg-green-950/20`} colSpan={4}>—</td>
                                                <td className={`${td} bg-green-50 dark:bg-green-950/20 text-right font-gbold ${raodBalance < 0 ? 'text-destructive' : ''}`}>{fmtNum(raodBalance.toString())}</td>
                                                <td className={`${tdSticky} ${isSelected ? '' : idx % 2 === 0 ? 'bg-background' : 'bg-muted'}`} style={{ background: stickyBg }}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={e => { e.stopPropagation(); setPanelRaod(raod) }}
                                                            className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground" title="View"
                                                        ><Eye size={15} /></button>
                                                        <button onClick={e => { e.stopPropagation(); setEditTarget(raod) }}
                                                            className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-primary" title="Edit"
                                                        ><Pencil size={15} /></button>
                                                        <button onClick={e => { e.stopPropagation(); handleDelete(raod.id) }}
                                                            className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive" title="Delete"
                                                        ><Trash2 size={15} /></button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Expanded entry sub-rows ── */}
                                            {isExpanded && raod.entries.map((entry, ei) => (
                                                <tr key={`entry-${entry.id}`} className="border-b border-border/50 bg-muted/5 hover:bg-muted/20 transition-colors">
                                                    <td className={`${tdCheck} bg-muted/10`}></td>
                                                    <td className={`${td} text-muted-foreground`}>{ei + 1}</td>
                                                    <td className={td} colSpan={8}>
                                                        <span className="ml-5 text-[10px] text-muted-foreground/50">↳</span>
                                                    </td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10`}>{fmtDate(entry.date_of_obligation)}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 max-w-[140px] truncate`} title={entry.fund_type_description}>{entry.fund_type_description || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10`}>
                                                        {entry.class_type
                                                            ? <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-gmedium">{entry.class_type}</span>
                                                            : '—'}
                                                    </td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10`}>{entry.fund_source || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 font-gmedium`}>{entry.ors_no || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 font-gmedium text-primary`} title={entry.ors}>{entry.ors || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 max-w-[160px] truncate`} title={entry.name_of_claimant}>{entry.name_of_claimant || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 max-w-[160px] truncate`} title={entry.particulars}>{entry.particulars || '—'}</td>
                                                    <td className={`${td} bg-amber-50/60 dark:bg-amber-950/10 text-right font-gmedium`}>{fmtNum(entry.obligated_amount)}</td>
                                                    <td className={`${td} bg-green-50/60 dark:bg-green-950/10`}>{fmtDate(entry.disbursement_date)}</td>
                                                    <td className={`${td} bg-green-50/60 dark:bg-green-950/10 text-left`}>{entry.ada_check || '—'}</td>
                                                    <td className={`${td} bg-green-50/60 dark:bg-green-950/10 text-right`}>{fmtNum(entry.cash)}</td>
                                                    <td className={`${td} bg-green-50/60 dark:bg-green-950/10 text-right`}>{fmtNum(entry.non_tra)}</td>
                                                    <td className={`${td} bg-green-50/60 dark:bg-green-950/10 text-right font-gmedium ${parseFloat(entry.balance) < 0 ? 'text-destructive' : ''}`}>{fmtNum(entry.balance)}</td>
                                                    <td className={`${tdSticky} bg-background`}></td>
                                                </tr>
                                            ))}
                                        </>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && filteredRaods.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span>
                                    Showing {Math.min((page - 1) * pageSize + 1, filteredRaods.length)}–{Math.min(page * pageSize, filteredRaods.length)} of {filteredRaods.length} RAOD{filteredRaods.length !== 1 ? 's' : ''}
                                </span>
                                <select
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                                    className="text-xs rounded border border-border bg-background text-foreground px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary transition"
                                >
                                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(1)} disabled={page === 1}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">«</button>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">‹</button>
                                <span className="px-2 text-xs">Page {page} of {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">›</button>
                                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">»</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Panel */}
                {panelRaod && (
                    <RaodDetailPanel
                        raod={panelRaod}
                        onClose={() => setPanelRaod(null)}
                        onEdit={() => { setEditTarget(panelRaod); setPanelRaod(null) }}
                        onDelete={() => { handleDelete(panelRaod.id); setPanelRaod(null) }}
                    />
                )}
            </div>

            {/* Dialogs */}
            {showAdd && (
                <AddRaodDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    receivedSaros={receivedSaros}
                    onClose={() => setShowAdd(false)}
                    onSaved={() => { fetchAll(); setShowAdd(false) }}
                />
            )}
            {editTarget && (
                <AddRaodDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    receivedSaros={receivedSaros}
                    initial={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={() => { fetchAll(); setEditTarget(null) }}
                />
            )}
            {showBulk && (
                <BulkImportRaodDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    receivedSaros={receivedSaros}
                    onClose={() => setShowBulk(false)}
                    onDone={() => fetchAll()}
                />
            )}
        </div>
    )
}