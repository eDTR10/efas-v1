import { useEffect, useRef, useState } from 'react'
import efasApi from '@/plugin/axios'
import { Plus, Eye, Pencil, Trash2, Search, ClipboardList, ArrowUpDown, X } from 'lucide-react'
import AddReceivedSaroDialog from './dialogs/AddReceivedSaroDialog'
import ViewReceivedSaroDialog from './dialogs/ViewReceivedSaroDialog'
import BulkImportSaroDialog from './dialogs/BulkImportSaroDialog'
import LoadingOverlay from './LoadingOverlay'

// ─── Shared Types ────────────────────────────────────────────────────────────

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

export interface ObjectDescription {
    id: number
    code: string
    description: string
}

export interface ReceivedSAROItem {
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

export interface ReceivedSARO {
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

interface FlatRow extends ReceivedSAROItem {
    saro_id: number
    date_recd_in_email: string
    date_of_saro: string
    allotment_no: string
    saro_class_type: string
    notes_validity: string
    total_amount: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const emptyItem = (): FlatRow => ({
    id: -Math.random(), saro_id: 0,
    date_recd_in_email: '', date_of_saro: '', allotment_no: '',
    saro_class_type: '', notes_validity: '', total_amount: '',
    pap: null, pap_code: '', pap_name: '', description: '',
    class_type: '', fund_type: '', object_code_no: '', object_code_desc: '',
    amount: '0', purpose: '', nca_amount: '0', nca_date: null, nta_no: '', balance: '0',
})

// ─── Side Panel ──────────────────────────────────────────────────────────────

function SaroDetailPanel({ saro, onClose, onEdit, onDelete }: {
    saro: ReceivedSARO
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
            setPanelWidth(Math.max(300, Math.min(720, startWidth.current + delta)))
        }
        const onUp = () => { isResizing.current = false }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
    }, [])

    const totalObligation = saro.items.reduce((s, i) => s + (parseFloat(i.nca_amount) || 0), 0)
    const totalAllot = parseFloat(saro.total_amount) || 0
    const balance = totalAllot - totalObligation
    const pct = totalAllot > 0 ? (totalObligation / totalAllot) * 100 : 0

    return (
        <div className="shrink-0 sticky top-4 max-h-[calc(100vh-8rem)] flex" style={{ width: panelWidth }}>
            {/* Resize handle */}
            <div
                className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors rounded-l-xl"
                onMouseDown={e => {
                    isResizing.current = true
                    startX.current = e.clientX
                    startWidth.current = panelWidth
                    e.preventDefault()
                }}
            />
            <div className="flex-1 border border-border rounded-r-xl rounded-tl rounded-bl bg-card flex flex-col overflow-hidden min-w-0">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-gbold text-foreground truncate leading-tight">{saro.allotment_no}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 text-[11px] font-gsemibold">
                                ● Received
                            </span>
                            <span className="text-sm text-muted-foreground">₱{parseFloat(saro.total_amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="ml-3 mt-0.5 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition">
                        <X size={16} />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Financial Summary card ── */}
                    <div className="mx-4 mt-4 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%)' }}>
                        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-gbold text-white/90 uppercase tracking-widest">Financial Summary</p>
                                <p className="text-[11px] text-white/50 mt-0.5">Allotment vs Obligation Monitoring</p>
                            </div>
                            {pct > 0 && (
                                <span className="text-[11px] font-gbold text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                                    ↑ {pct.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-px bg-white/10 mt-2">
                            <div className="bg-white/5 px-3 py-3">
                                <p className="text-[10px] font-gbold text-white/50 uppercase tracking-widest mb-1.5">Allotment</p>
                                <p className="text-sm font-gbold text-white leading-tight">₱{totalAllot.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-white/40 mt-1">Total SARO Amount</p>
                            </div>
                            <div className="bg-white/5 px-3 py-3">
                                <p className="text-[10px] font-gbold text-white/50 uppercase tracking-widest mb-1.5">Obligation</p>
                                <p className="text-sm font-gbold text-white leading-tight">₱{totalObligation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-white/40 mt-1">{saro.items.filter(i => parseFloat(i.nca_amount) > 0).length} item{saro.items.filter(i => parseFloat(i.nca_amount) > 0).length !== 1 ? 's' : ''} w/ NCA</p>
                            </div>
                            <div className="bg-white/5 px-3 py-3">
                                <p className={`text-[10px] font-gbold uppercase tracking-widest mb-1.5 ${balance < 0 ? 'text-red-300' : 'text-green-300'}`}>Balance</p>
                                <p className={`text-sm font-gbold leading-tight ${balance < 0 ? 'text-red-300' : 'text-green-300'}`}>₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-white/40 mt-1">Remaining available</p>
                            </div>
                        </div>
                        {/* progress bar */}
                        <div className="px-4 py-3">
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-400 transition-all duration-500"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── SARO Details grid ── */}
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground mb-3">SARO Details</p>
                        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                            <div className="grid grid-cols-3 divide-x divide-border">
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Allotment No.</p>
                                    <p className="text-xs font-gsemibold text-foreground">{saro.allotment_no}</p>
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Amount</p>
                                    <p className="text-xs font-gsemibold text-foreground">₱{parseFloat(saro.total_amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Class Type</p>
                                    <p className="text-xs font-gsemibold text-foreground">{saro.class_type || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Date Received</p>
                                    <p className="text-xs font-gsemibold text-foreground">{fmtDate(saro.date_recd_in_email)}</p>
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Date of SARO</p>
                                    <p className="text-xs font-gsemibold text-foreground">{fmtDate(saro.date_of_saro)}</p>
                                </div>
                            </div>
                            <div className="px-3 py-2.5">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Validity</p>
                                <p className="text-xs font-gsemibold text-foreground">{saro.notes_validity || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Line Items ── */}
                    <div className="px-4 pt-3 pb-4">
                        <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground mb-3">
                            Line Items ({saro.items.length})
                        </p>
                        {saro.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No line items.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {saro.items.map(item => (
                                    <div key={item.id} className="border border-border rounded-xl px-3.5 py-3 bg-background">
                                        {/* PAP code + amount */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className="text-xs font-gbold text-primary">{item.pap_code || '—'}</span>
                                            <span className="text-sm font-gbold text-foreground shrink-0">₱{parseFloat(item.amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {/* Description */}
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description || '—'}</p>
                                        {/* Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                            {item.class_type && (
                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">{item.class_type}</span>
                                            )}
                                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">{item.fund_type || '—'}</span>
                                        </div>
                                        {/* Object code */}
                                        {item.object_code_no && (
                                            <div className="flex items-baseline gap-2 mb-1.5">
                                                <span className="text-[11px] font-gbold text-foreground shrink-0">{item.object_code_no}</span>
                                                {item.object_code_desc && <span className="text-[11px] text-muted-foreground truncate">{item.object_code_desc}</span>}
                                            </div>
                                        )}
                                        {/* Purpose */}
                                        {item.purpose && (
                                            <p className="text-[11px] text-muted-foreground italic line-clamp-3 mb-2">{item.purpose}</p>
                                        )}
                                        {/* NCA / NTA / Balance grid */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] pt-2 border-t border-border/60">
                                            {parseFloat(item.nca_amount) !== 0 && (
                                                <>
                                                    <span className="text-muted-foreground">NCA Amount</span>
                                                    <span className="text-right font-gsemibold text-green-600 dark:text-green-400">₱{parseFloat(item.nca_amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                </>
                                            )}
                                            {item.nca_date && (
                                                <>
                                                    <span className="text-muted-foreground">NCA Date</span>
                                                    <span className="text-right font-gsemibold text-foreground">{fmtDate(item.nca_date)}</span>
                                                </>
                                            )}
                                            {item.nta_no && (
                                                <>
                                                    <span className="text-muted-foreground">NTA No.</span>
                                                    <span className="text-right font-gsemibold text-primary">{item.nta_no}</span>
                                                </>
                                            )}
                                            <span className="text-muted-foreground">Balance</span>
                                            <span className={`text-right font-gsemibold ${parseFloat(item.balance) < 0 ? 'text-destructive' : 'text-foreground'}`}>₱{parseFloat(item.balance || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer Actions ── */}
                <div className="flex gap-2 px-4 py-3 border-t border-border bg-card shrink-0">
                    <button
                        onClick={onEdit}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2 rounded-lg transition"
                    >
                        <Pencil size={14} /> Edit SARO
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-gsemibold px-3 py-2 rounded-lg transition"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReceivedSaroMainContainer() {
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [paps, setPaps] = useState<PAPCode[]>([])
    const [fundTypes, setFundTypes] = useState<FundType[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [objectDescriptions, setObjectDescriptions] = useState<ObjectDescription[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [viewTarget, setViewTarget] = useState<ReceivedSARO | null>(null)
    const [editTarget, setEditTarget] = useState<ReceivedSARO | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [selectedSaroIds, setSelectedSaroIds] = useState<Set<number>>(new Set())
    const [sortKey, setSortKey] = useState<'date_recd_in_email' | 'date_of_saro' | 'allotment_no' | 'total_amount' | 'amount'>('date_recd_in_email')
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
    const [panelSaro, setPanelSaro] = useState<ReceivedSARO | null>(null)
    const [filterDesc, setFilterDesc] = useState('')
    const [crudLoading, setCrudLoading] = useState<string | null>(null)

    // Drag-to-scroll
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

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [saroRes, papRes, ftRes, ctRes, odRes] = await Promise.all([
                efasApi.get('received-saro/'),
                efasApi.get('pap/'),
                efasApi.get('fund-type/'),
                efasApi.get('class-type/'),
                efasApi.get('object-description/'),
            ])
            setSaros(saroRes.data)
            setPaps(papRes.data)
            setFundTypes(ftRes.data)
            setClassTypes(ctRes.data)
            setObjectDescriptions(odRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    // Flatten SARO + items into rows for the spreadsheet table
    const flatRows: FlatRow[] = saros.flatMap(saro => {
        if (saro.items.length === 0) {
            return [{ ...emptyItem(), saro_id: saro.id, id: -saro.id, date_recd_in_email: saro.date_recd_in_email, date_of_saro: saro.date_of_saro, allotment_no: saro.allotment_no, saro_class_type: saro.class_type, notes_validity: saro.notes_validity, total_amount: saro.total_amount }]
        }
        return saro.items.map(item => ({
            ...item,
            saro_id: saro.id,
            date_recd_in_email: saro.date_recd_in_email,
            date_of_saro: saro.date_of_saro,
            allotment_no: saro.allotment_no,
            saro_class_type: saro.class_type,
            notes_validity: saro.notes_validity,
            total_amount: saro.total_amount,
        }))
    })

    const filtered = flatRows
        .filter(row => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return (
                row.allotment_no.toLowerCase().includes(q) ||
                row.pap_code.toLowerCase().includes(q) ||
                row.pap_name.toLowerCase().includes(q) ||
                row.description.toLowerCase().includes(q) ||
                row.nta_no.toLowerCase().includes(q)
            )
        })
        .filter(row => {
            if (!filterDesc) return true
            return row.description === filterDesc
        })

    const sorted = [...filtered].sort((a, b) => {
        let av: string | number = a[sortKey] ?? ''
        let bv: string | number = b[sortKey] ?? ''
        if (sortKey === 'total_amount' || sortKey === 'amount') {
            av = parseFloat(av as string) || 0
            bv = parseFloat(bv as string) || 0
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
    })

    // Totals from ALL filtered rows (not just current page)
    const totalAmount = filtered.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const totalNcaAmount = filtered.reduce((s, r) => s + (parseFloat(r.nca_amount) || 0), 0)
    const totalBalance = filtered.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0)

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)
    const allPageIds = paginated.map(r => r.saro_id)
    const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selectedSaroIds.has(id))

    const handleDelete = async (saroId: number) => {
        if (!window.confirm('Delete this SARO record and all its line items?')) return
        setCrudLoading('Deleting SARO…')
        try {
            await efasApi.delete(`received-saro/${saroId}/`)
            fetchAll()
        } finally {
            setCrudLoading(null)
        }
    }

    const toggleSelect = (saroId: number) =>
        setSelectedSaroIds(prev => {
            const next = new Set(prev)
            next.has(saroId) ? next.delete(saroId) : next.add(saroId)
            return next
        })

    const toggleSelectAll = () => {
        if (allPageSelected) {
            setSelectedSaroIds(prev => {
                const next = new Set(prev)
                allPageIds.forEach(id => next.delete(id))
                return next
            })
        } else {
            setSelectedSaroIds(prev => {
                const next = new Set(prev)
                allPageIds.forEach(id => next.add(id))
                return next
            })
        }
    }

    const handleBulkDelete = async () => {
        if (selectedSaroIds.size === 0) return
        if (!window.confirm(`Delete ${selectedSaroIds.size} selected SARO record(s) and all their line items?`)) return
        setCrudLoading(`Deleting ${selectedSaroIds.size} SARO record${selectedSaroIds.size !== 1 ? 's' : ''}…`)
        try {
            await Promise.all([...selectedSaroIds].map(id => efasApi.delete(`received-saro/${id}/`)))
            setSelectedSaroIds(new Set())
            fetchAll()
        } finally {
            setCrudLoading(null)
        }
    }

    const getSaro = (saroId: number) => saros.find(s => s.id === saroId) ?? null

    const th = 'px-3 py-2.5 text-left text-xs font-gmedium text-white whitespace-nowrap select-none'
    const td = 'px-3 py-2 text-xs text-foreground whitespace-nowrap'
    const thCheck = 'px-3 py-2.5 sticky left-0 bg-primary z-20 border-r border-white/20 w-10 text-center'
    const tdCheck = 'px-3 py-2 sticky left-0 z-20 border-r border-border text-center'
    const thSticky = `${th} sticky right-0 bg-primary z-20 border-l border-white/20`
    const tdSticky = `${td} sticky right-0 z-20 text-center border-l border-border`

    return (
        <div className="flex flex-col gap-4">
            {crudLoading && <LoadingOverlay message={crudLoading} sub="Please wait. Your request is being processed." />}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">SARO Received</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {saros.length} SARO{saros.length !== 1 ? 's' : ''} &middot; {flatRows.length} line item{flatRows.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedSaroIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                        >
                            <Trash2 size={15} /> Delete Selected ({selectedSaroIds.size})
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
                        <Plus size={15} /> Add SARO
                    </button>
                </div>
            </div>

            {/* Search + Sort */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search SARO, PAP, NTA…"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                </div>
                <select
                    value={filterDesc}
                    onChange={e => { setFilterDesc(e.target.value); setPage(1) }}
                    className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition"
                >
                    <option value="">All Descriptions</option>
                    {[...new Set(flatRows.map(r => r.description).filter(Boolean))].sort().map(desc => (
                        <option key={desc} value={desc}>{desc}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                    <ArrowUpDown size={14} className="text-muted-foreground" />
                    <select
                        value={`${sortKey}:${sortDir}`}
                        onChange={e => {
                            const [k, d] = e.target.value.split(':') as [typeof sortKey, typeof sortDir]
                            setSortKey(k); setSortDir(d); setPage(1)
                        }}
                        className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition"
                    >
                        <option value="date_recd_in_email:desc">Date Received ↓</option>
                        <option value="date_recd_in_email:asc">Date Received ↑</option>
                        <option value="date_of_saro:desc">Date of SARO ↓</option>
                        <option value="date_of_saro:asc">Date of SARO ↑</option>
                        <option value="allotment_no:asc">Allotment No. A→Z</option>
                        <option value="allotment_no:desc">Allotment No. Z→A</option>
                        <option value="total_amount:desc">Total Amount ↓</option>
                        <option value="total_amount:asc">Total Amount ↑</option>
                        <option value="amount:desc">Item Amount ↓</option>
                        <option value="amount:asc">Item Amount ↑</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-3">
                <div className="rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-gbold text-foreground">{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{filtered.length} line item{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-green-600 dark:text-green-400">Total NCA Amount</p>
                    <p className="text-xl font-gbold text-foreground">{totalNcaAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{saros.length} SARO{saros.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-blue-600 dark:text-blue-400">Total Balance</p>
                    <p className="text-xl font-gbold text-foreground">{totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Amount − NCA</p>
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
                                <tr className="bg-primary">
                                    <th className={thCheck}>
                                        <input type="checkbox"
                                            checked={allPageSelected}
                                            onChange={toggleSelectAll}
                                            className="rounded cursor-pointer accent-white" />
                                    </th>
                                    <th className={th}>#</th>
                                    <th className={th}>DATE RECD IN EMAIL</th>
                                    <th className={th}>DATE OF SARO</th>
                                    <th className={th}>ALLOTMENT NO.</th>
                                    <th className={th}>CLASS</th>
                                    <th className={th}>NOTES / VALIDITY</th>
                                    <th className={`${th} text-right`}>TOTAL AMOUNT</th>
                                    <th className={th}>PAP CODE</th>
                                    <th className={th}>DESCRIPTION</th>
                                    <th className={th}>CLASS TYPE</th>
                                    <th className={th}>FUND TYPE</th>
                                    <th className={th}>OBJECT CODE NO.</th>
                                    <th className={th}>OBJECT CODE DESC</th>
                                    <th className={`${th} text-right`}>AMOUNT</th>
                                    <th className={th}>PURPOSE</th>
                                    <th className={`${th} bg-green-700 text-right`}>NCA AMOUNT</th>
                                    <th className={`${th} bg-green-700`}>NCA DATE</th>
                                    <th className={`${th} bg-green-700`}>NTA NO.</th>
                                    <th className={`${th} bg-green-700 text-right`}>BALANCE</th>
                                    <th className={thSticky}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={20} className="text-center py-12 text-muted-foreground text-sm">Loading…</td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={20} className="text-center py-12 text-muted-foreground text-sm">No records found.</td>
                                    </tr>
                                ) : paginated.map((row, idx) => (
                                    <tr
                                        key={`${row.saro_id}-${row.id}`}
                                        onClick={() => { const s = getSaro(row.saro_id); if (s) setPanelSaro(s) }}
                                        className={`border-b border-border last:border-0 cursor-pointer transition-colors ${panelSaro?.id === row.saro_id
                                            ? 'bg-primary/10'
                                            : idx % 2 === 0 ? 'bg-background hover:bg-muted/30' : 'bg-muted/20 hover:bg-muted/40'
                                            }`}
                                    >
                                        <td className={`${tdCheck} ${idx % 2 === 0 ? 'bg-background' : 'bg-muted'}`} style={{ background: panelSaro?.id === row.saro_id ? 'color-mix(in srgb, hsl(var(--primary)) 12%, hsl(var(--background)))' : undefined }} >
                                            <input type="checkbox"
                                                checked={selectedSaroIds.has(row.saro_id)}
                                                onChange={() => toggleSelect(row.saro_id)}
                                                onClick={e => e.stopPropagation()}
                                                className="rounded cursor-pointer" />
                                        </td>
                                        <td className={td}>{idx + 1}</td>
                                        <td className={td}>{fmtDate(row.date_recd_in_email)}</td>
                                        <td className={td}>{fmtDate(row.date_of_saro)}</td>
                                        <td className={`${td} font-gmedium text-primary`}>{row.allotment_no}</td>
                                        <td className={td}>{row.saro_class_type || '—'}</td>
                                        <td className={`${td} max-w-[160px] truncate`} title={row.notes_validity}>{row.notes_validity || '—'}</td>
                                        <td className={`${td} text-right`}>{fmtNum(row.total_amount)}</td>
                                        <td className={`${td} font-gmedium`}>{row.pap_code || '—'}</td>
                                        <td className={`${td} max-w-[200px] truncate`} title={row.description}>{row.description || '—'}</td>
                                        <td className={td}>
                                            {row.class_type
                                                ? <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-gmedium">{row.class_type}</span>
                                                : '—'}
                                        </td>
                                        <td className={td}>
                                            {row.fund_type
                                                ? <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-gmedium">{row.fund_type}</span>
                                                : '—'}
                                        </td>
                                        <td className={`${td}`}>{row.object_code_no || '—'}</td>
                                        <td className={`${td} max-w-[160px] truncate`} title={row.object_code_desc}>{row.object_code_desc || '—'}</td>
                                        <td className={`${td} text-right`}>{fmtNum(row.amount)}</td>
                                        <td className={`${td} max-w-[160px] truncate`} title={row.purpose}>{row.purpose || '—'}</td>
                                        <td className={`${td} text-right bg-green-50 dark:bg-green-950/20`}>{fmtNum(row.nca_amount)}</td>
                                        <td className={`${td} bg-green-50 dark:bg-green-950/20`}>{fmtDate(row.nca_date)}</td>
                                        <td className={`${td} font-gmedium text-primary bg-green-50 dark:bg-green-950/20`}>{row.nta_no || '—'}</td>
                                        <td className={`${td} text-right font-gmedium bg-green-50 dark:bg-green-950/20`}>{fmtNum(row.balance)}</td>
                                        <td className={`${tdSticky} ${idx % 2 === 0 ? 'bg-background' : 'bg-muted'}`} style={{ background: panelSaro?.id === row.saro_id ? 'color-mix(in srgb, hsl(var(--primary)) 12%, hsl(var(--background)))' : undefined }}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); const s = getSaro(row.saro_id); if (s) setViewTarget(s) }}
                                                    className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                                    title="View"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); const s = getSaro(row.saro_id); if (s) setEditTarget(s) }}
                                                    className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(row.saro_id) }}
                                                    className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span>
                                    Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} row{filtered.length !== 1 ? 's' : ''}
                                </span>
                                <select
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                                    className="text-xs rounded border border-border bg-background text-foreground px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary transition"
                                >
                                    {[10, 20, 50, 100].map(n => (
                                        <option key={n} value={n}>{n} per page</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium"
                                >
                                    Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                        acc.push(p)
                                        return acc
                                    }, [])
                                    .map((p, i) =>
                                        p === '…'
                                            ? <span key={`ellipsis-${i}`} className="px-2 text-xs">…</span>
                                            : <button
                                                key={p}
                                                onClick={() => setPage(p as number)}
                                                className={`px-3 py-1 rounded border text-xs font-gmedium transition ${page === p ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
                                            >
                                                {p}
                                            </button>
                                    )
                                }
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium"
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>{/* end inner flex-col */}
                {panelSaro && (
                    <SaroDetailPanel
                        saro={panelSaro}
                        onClose={() => setPanelSaro(null)}
                        onEdit={() => { setEditTarget(panelSaro); setPanelSaro(null) }}
                        onDelete={() => { handleDelete(panelSaro.id); setPanelSaro(null) }}
                    />
                )}
            </div>{/* end flex row */}

            {/* Dialogs */}
            {showBulk && (
                <BulkImportSaroDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    objectDescriptions={objectDescriptions}
                    onClose={() => setShowBulk(false)}
                    onDone={fetchAll}
                />
            )}
            {showAdd && (
                <AddReceivedSaroDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    objectDescriptions={objectDescriptions}
                    onClose={() => setShowAdd(false)}
                    onSaved={fetchAll}
                />
            )}
            {viewTarget && (
                <ViewReceivedSaroDialog saro={viewTarget} onClose={() => setViewTarget(null)} />
            )}
            {editTarget && (
                <AddReceivedSaroDialog
                    paps={paps}
                    fundTypes={fundTypes}
                    classTypes={classTypes}
                    objectDescriptions={objectDescriptions}
                    initial={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchAll}
                />
            )}
        </div>
    )
}
