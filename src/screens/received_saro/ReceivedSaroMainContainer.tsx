import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import efasApi from '@/plugin/axios'
import { Plus, Eye, Pencil, Trash2, Search, ClipboardList, ArrowUpDown, X, AlertTriangle, ArrowRightLeft, Check, Archive, ArchiveRestore } from 'lucide-react'
import AddReceivedSaroDialog from './dialogs/AddReceivedSaroDialog'
import type { RealignmentEntry } from '@/screens/realignment/dialogs/AddEditRealignmentDialog'
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
    nca_no: string
    year: number | null
    remarks: string
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

function getBaseAllotmentNo(allotmentNo: string): string {
    return allotmentNo.replace(/([0-9])([A-Z]+)$/, '$1')
}

// ─── Side Panel ──────────────────────────────────────────────────────────────

function SaroDetailPanel({ saro, allSaros, realignments, showArchived, onClose, onEdit, onDelete, onArchiveAction, onRefresh }: {
    saro: ReceivedSARO
    allSaros: ReceivedSARO[]
    realignments: RealignmentEntry[]
    showArchived: boolean
    onClose: () => void
    onEdit: () => void
    onDelete: () => void
    onArchiveAction: (action: 'archive' | 'restore') => void
    onRefresh: () => void
}) {
    const navigate = useNavigate()
    const [panelWidth, setPanelWidth] = useState(700)
    const [tab, setTab] = useState<'details' | 'nca'>('details')
    const [itemSearch, setItemSearch] = useState('')
    const [tagItemId, setTagItemId] = useState<number | null>(null)
    const [tagForm, setTagForm] = useState({ nca_date: '', nta_no: '', nca_amount: '', nca_no: '', year: '', remarks: '' })
    const [tagSaving, setTagSaving] = useState(false)
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

    // Reset state when SARO changes
    useEffect(() => { setItemSearch(''); setTagItemId(null) }, [saro.id])

    // For letter-variant children (e.g. 0031A), inherit allotment from the parent SARO (0031)
    const baseNo = getBaseAllotmentNo(saro.allotment_no)
    const isChildVariant = baseNo !== saro.allotment_no
    const parentSaro = isChildVariant ? allSaros.find(s => s.allotment_no === baseNo) : null

    const totalObligation = saro.items.reduce((s, i) => s + (parseFloat(i.nca_amount) || 0), 0)
    const totalAllot = parseFloat(parentSaro?.total_amount ?? saro.total_amount) || 0
    const balance = totalAllot - totalObligation
    const obligPct = totalAllot > 0 ? Math.min(100, (totalObligation / totalAllot) * 100) : 0

    // Detect field differences across items
    const uniqueObjDescs = new Set(saro.items.map(i => i.object_code_desc).filter(Boolean))
    const uniqueObjCodes = new Set(saro.items.map(i => i.object_code_no).filter(Boolean))
    const uniquePapCodes = new Set(saro.items.map(i => i.pap_code).filter(Boolean))
    const uniqueFundTypes = new Set(saro.items.map(i => i.fund_type).filter(Boolean))

    // Realignment impact for this SARO (matched by saro_no === allotment_no)
    const saroRealignments = realignments.filter(r => r.saro_no === saro.allotment_no)
    const totalTransferTo = saroRealignments.reduce((s, r) => s + (parseFloat(r.transfer_to) || 0), 0)
    const totalTransferFrom = saroRealignments.reduce((s, r) => s + (parseFloat(r.transfer_from) || 0), 0)
    const netRealignment = totalTransferTo - totalTransferFrom
    const hasRealignment = saroRealignments.length > 0
    const hasDeficit = netRealignment < 0

    // Net impact keyed by account_code (= object_code_no of the item)
    const realignByCode = new Map<string, { transferTo: number; transferFrom: number; net: number }>()
    saroRealignments.forEach(r => {
        if (!r.account_code) return
        const e = realignByCode.get(r.account_code) ?? { transferTo: 0, transferFrom: 0, net: 0 }
        e.transferTo += parseFloat(r.transfer_to) || 0
        e.transferFrom += parseFloat(r.transfer_from) || 0
        e.net = e.transferTo - e.transferFrom
        realignByCode.set(r.account_code, e)
    })

    // MAP ref groups for the realignment entries section
    const realignByMapRef = new Map<string, { transferTo: number; transferFrom: number; net: number; count: number }>()
    saroRealignments.forEach(r => {
        const key = r.realignment_ref || '(no ref)'
        const e = realignByMapRef.get(key) ?? { transferTo: 0, transferFrom: 0, net: 0, count: 0 }
        e.transferTo += parseFloat(r.transfer_to) || 0
        e.transferFrom += parseFloat(r.transfer_from) || 0
        e.net = e.transferTo - e.transferFrom
        e.count += 1
        realignByMapRef.set(key, e)
    })

    // Filter items by search
    const visibleItems = itemSearch.trim()
        ? saro.items.filter(item => {
            const q = itemSearch.toLowerCase()
            return (
                item.pap_code.toLowerCase().includes(q) ||
                item.pap_name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.object_code_no.toLowerCase().includes(q) ||
                item.object_code_desc.toLowerCase().includes(q) ||
                item.purpose.toLowerCase().includes(q) ||
                item.nta_no.toLowerCase().includes(q)
            )
        })
        : saro.items

    const statusColor = (pct: number) =>
        pct >= 80
            ? { text: 'text-emerald-400', bg: 'bg-emerald-400/20', bar: 'bg-emerald-400' }
            : pct >= 50
                ? { text: 'text-amber-400', bg: 'bg-amber-400/20', bar: 'bg-amber-400' }
                : { text: 'text-orange-400', bg: 'bg-orange-400/20', bar: 'bg-orange-400' }

    const obligStatus = statusColor(obligPct)

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
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[11px] font-gsemibold tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Received SARO
                                </span>
                                <span className="text-xs text-muted-foreground">{fmtDate(saro.date_of_saro)}</span>
                            </div>
                            {(() => {
                                const uniquePaps = [...new Map(
                                    saro.items.filter(i => i.pap_name).map(i => [i.pap_code, i.pap_name])
                                ).values()]
                                return uniquePaps.length > 0 ? (
                                    <div className="mb-1">
                                        <p className="text-lg font-gbold text-blue-600 dark:text-blue-400 leading-tight truncate" title={uniquePaps[0]}>
                                            {uniquePaps[0]}
                                        </p>
                                        {uniquePaps.length > 1 && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">+{uniquePaps.length - 1} more PAP{uniquePaps.length > 2 ? 's' : ''}</p>
                                        )}
                                    </div>
                                ) : null
                            })()}
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-gbold text-primary">{saro.allotment_no}</span>
                                {saro.class_type && (
                                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-[10px] font-gmedium">{saro.class_type}</span>
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

                    {/* Quick financials */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <p className="text-[10px] font-gsemibold text-blue-500 uppercase tracking-widest mb-1">Allotment</p>
                            <p className="text-xl font-gbold text-foreground leading-tight">
                                ₱{totalAllot.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            {parentSaro
                                ? <p className="text-[10px] text-blue-400 mt-0.5 truncate" title={`From parent: ${parentSaro.allotment_no}`}>from {parentSaro.allotment_no}</p>
                                : <p className="text-[10px] text-muted-foreground mt-0.5">100%</p>
                            }
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-gsemibold text-amber-500 uppercase tracking-widest">Obligation</p>
                                <span className={`text-[10px] font-gbold ${obligStatus.text} ${obligStatus.bg} px-1.5 py-0.5 rounded-full leading-none`}>
                                    {obligPct.toFixed(1)}%
                                </span>
                            </div>
                            <p className="text-xl font-gbold text-foreground leading-tight">
                                ₱{totalObligation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${obligStatus.bar}`} style={{ width: `${obligPct}%` }} />
                            </div>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                            <p className="text-[10px] font-gsemibold text-emerald-500 uppercase tracking-widest mb-1">Balance</p>
                            <p className={`text-xl font-gbold leading-tight ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                                ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Remaining</p>
                        </div>
                    </div>

                    <div className={`mt-2.5 flex items-center justify-between px-3 py-2 rounded-lg border ${balance < 0 ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-500/50 bg-emerald-500/5'}`}>
                        <span className="text-[11px] font-gsemibold text-muted-foreground uppercase tracking-widest">Remaining Balance</span>
                        <span className={`text-base font-gbold ${balance < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                            ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Realignment warning banner */}
                    {hasRealignment && (
                        <div className={`mt-2 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border ${hasDeficit ? 'border-destructive/40 bg-destructive/8' : 'border-emerald-500/40 bg-emerald-500/8'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                                {hasDeficit
                                    ? <AlertTriangle size={14} className="text-destructive shrink-0" />
                                    : <ArrowRightLeft size={14} className="text-emerald-500 shrink-0" />
                                }
                                <div className="min-w-0">
                                    <p className={`text-[11px] font-gbold leading-tight ${hasDeficit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {hasDeficit ? 'Realignment Deficit' : 'Realignment Balanced'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                        +{totalTransferTo.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / −{totalTransferFrom.toLocaleString('en-PH', { minimumFractionDigits: 2 })} · Net: <span className={`font-gbold ${hasDeficit ? 'text-destructive' : 'text-emerald-500'}`}>₱{netRealignment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/efas-v1/realignment')}
                                className={`shrink-0 flex items-center gap-1 text-[10px] font-gbold px-2.5 py-1.5 rounded-lg border transition ${hasDeficit ? 'border-destructive/40 text-destructive hover:bg-destructive/10' : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
                            >
                                <ArrowRightLeft size={11} />
                                {hasDeficit ? 'Balance Now' : 'View'}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Tabs ── */}
                <div className="flex border-b border-border shrink-0 px-1 bg-card">
                    {(['details', 'nca'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setTagItemId(null) }}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-gsemibold border-b-2 transition -mb-px ${
                                tab === t
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t === 'details' ? 'Details' : (
                                <span className="flex items-center gap-1.5">
                                    NCA / NTCA
                                    {saro.items.filter(i => i.nca_date).length > 0 && (
                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-gbold leading-none">
                                            {saro.items.filter(i => i.nca_date).length}
                                        </span>
                                    )}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'details' && (<>
                    {/* SARO Details */}
                    <div className="px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 rounded-full bg-primary shrink-0" />
                            <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">SARO Details</p>
                        </div>
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Allotment No.</p>
                                    <p className="text-xs font-gbold text-primary">{saro.allotment_no}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Date of SARO</p>
                                    <p className="text-xs font-gsemibold text-foreground">{fmtDate(saro.date_of_saro)}</p>
                                </div>
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Date Received</p>
                                    <p className="text-xs font-gsemibold text-foreground">{fmtDate(saro.date_recd_in_email)}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
                                    <p className="text-xs font-gbold text-foreground">₱{fmtNum(saro.total_amount)}</p>
                                </div>
                            </div>
                            <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Class Type</p>
                                    <p className="text-xs font-gsemibold text-foreground">{saro.class_type || '—'}</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <p className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wider mb-1">Validity</p>
                                    <p className="text-xs font-gsemibold text-foreground">{saro.notes_validity || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Realignment Entries */}
                    {hasRealignment && (
                        <div className="px-5 pt-2 pb-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-1 h-4 rounded-full shrink-0 ${hasDeficit ? 'bg-destructive' : 'bg-emerald-500'}`} />
                                <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">Realignment Entries</p>
                                <span className={`text-[10px] font-gbold px-2 py-0.5 rounded-full border ${hasDeficit ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                                    {saroRealignments.length} entr{saroRealignments.length !== 1 ? 'ies' : 'y'}
                                </span>
                            </div>
                            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                                {[...realignByMapRef.entries()].map(([mapRef, data]) => (
                                    <div key={mapRef} className={`px-3.5 py-2.5 ${data.net < 0 ? 'bg-destructive/5' : 'bg-emerald-500/5'}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                {data.net < 0
                                                    ? <AlertTriangle size={11} className="text-destructive" />
                                                    : <ArrowRightLeft size={11} className="text-emerald-500" />
                                                }
                                                <span className="text-[11px] font-gbold text-foreground">{mapRef}</span>
                                                <span className="text-[10px] text-muted-foreground">({data.count} line{data.count !== 1 ? 's' : ''})</span>
                                            </div>
                                            <span className={`text-[11px] font-gbold ${data.net < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                Net: ₱{data.net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                                            <span className="text-emerald-600 dark:text-emerald-400">+₱{data.transferTo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-destructive">−₱{data.transferFrom.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className={`px-3.5 py-2 flex items-center justify-between ${hasDeficit ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                                    <span className="text-[11px] font-gbold text-muted-foreground uppercase tracking-widest">Total Net</span>
                                    <span className={`text-sm font-gbold ${hasDeficit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        ₱{netRealignment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                            {hasDeficit && (
                                <button
                                    onClick={() => navigate('/efas-v1/realignment')}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-gsemibold text-destructive border border-destructive/30 hover:bg-destructive/10 py-2 rounded-lg transition"
                                >
                                    <AlertTriangle size={12} /> Go to Realignment to resolve deficit
                                </button>
                            )}
                        </div>
                    )}

                    {/* Line Items */}
                    <div className="px-5 pt-2 pb-5">
                        {/* Section header */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 rounded-full bg-amber-500/70 shrink-0" />
                            <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">Line Items</p>
                            {saro.items.length > 0 && (
                                <span className="text-[10px] font-gbold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                    {saro.items.length} item{saro.items.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Difference badges — shown when items vary in key fields */}
                        {saro.items.length > 1 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {uniqueObjDescs.size > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        {uniqueObjDescs.size} Object Descs
                                    </span>
                                )}
                                {uniqueObjCodes.size > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        {uniqueObjCodes.size} Object Codes
                                    </span>
                                )}
                                {uniquePapCodes.size > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        {uniquePapCodes.size} PAPs
                                    </span>
                                )}
                                {uniqueFundTypes.size > 1 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-gsemibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        {uniqueFundTypes.size} Fund Types
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Item search — only shown when there are multiple items */}
                        {saro.items.length > 1 && (
                            <div className="relative mb-3">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={itemSearch}
                                    onChange={e => setItemSearch(e.target.value)}
                                    placeholder="Filter by PAP, description, object code…"
                                    className="w-full pl-7 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                                />
                                {itemSearch && (
                                    <button
                                        onClick={() => setItemSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        )}
                        {itemSearch && (
                            <p className="text-[10px] text-muted-foreground mb-2">
                                {visibleItems.length} of {saro.items.length} item{saro.items.length !== 1 ? 's' : ''} shown
                            </p>
                        )}

                        {saro.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border text-center">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <ClipboardList size={18} className="text-muted-foreground" />
                                </div>
                                <p className="text-sm font-gmedium text-muted-foreground">No line items yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">Add items by editing this SARO</p>
                            </div>
                        ) : visibleItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border text-center">
                                <p className="text-sm font-gmedium text-muted-foreground">No items match your filter</p>
                                <button onClick={() => setItemSearch('')} className="text-xs text-primary hover:underline mt-1">Clear filter</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {visibleItems.map((item, i) => {
                                    const ncaAmt = parseFloat(item.nca_amount) || 0
                                    const amt = parseFloat(item.amount) || 0
                                    const bal = parseFloat(item.balance) || 0
                                    const ncaPct = amt > 0 ? Math.min(100, (ncaAmt / amt) * 100) : 0
                                    const itemStatus = statusColor(ncaPct)
                                    const itemRealign = realignByCode.get(item.object_code_no)
                                    const itemHasDeficit = !!itemRealign && itemRealign.net < 0

                                    return (
                                        <div
                                            key={item.id}
                                            className={`rounded-xl border bg-background overflow-hidden hover:shadow-sm transition-all duration-200 ${itemHasDeficit ? 'border-destructive/50 hover:border-destructive' : 'border-border hover:border-primary/30'}`}
                                        >
                                            <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-border/60">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-gbold flex items-center justify-center">
                                                        {i + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className={`text-xs font-gbold truncate ${uniqueObjDescs.size > 1 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                                            {item.object_code_desc || 'No Object Desc'}
                                                        </p>
                                                        {item.object_code_no && (
                                                            <p className={`text-[10px] font-gmedium ${uniqueObjCodes.size > 1 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'}`}>
                                                                {item.object_code_no}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-gbold text-foreground shrink-0 ml-2">
                                                    ₱{fmtNum(item.amount)}
                                                </span>
                                            </div>

                                            <div className="px-3.5 py-3 space-y-2.5">
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground">{item.pap_code && <span className="font-gbold text-primary">{item.pap_code} — </span>}{item.description}</p>
                                                )}

                                                {(item.class_type || item.fund_type) && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {item.class_type && (
                                                            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">
                                                                {item.class_type}
                                                            </span>
                                                        )}
                                                        {item.fund_type && (
                                                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full text-[10px] font-gsemibold">
                                                                {item.fund_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {amt > 0 && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] text-muted-foreground">NCA of item amount</span>
                                                            <span className={`text-[10px] font-gbold ${itemStatus.text}`}>{ncaPct.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${itemStatus.bar}`} style={{ width: `${ncaPct}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="rounded-lg bg-muted/30 border border-border/60 divide-y divide-border/60 overflow-hidden">
                                                    {item.purpose && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Purpose</span>
                                                            <span className="text-[11px] font-gsemibold text-right">{item.purpose}</span>
                                                        </div>
                                                    )}
                                                    {ncaAmt !== 0 && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">NCA Amount</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-emerald-600 dark:text-emerald-400">₱{fmtNum(item.nca_amount)}</span>
                                                        </div>
                                                    )}
                                                    {item.nca_date && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">NCA Date</span>
                                                            <span className="text-[11px] font-gsemibold text-right">{fmtDate(item.nca_date)}</span>
                                                        </div>
                                                    )}
                                                    {item.nta_no && (
                                                        <div className="grid grid-cols-2 px-3 py-1.5">
                                                            <span className="text-[11px] text-muted-foreground">NTA No.</span>
                                                            <span className="text-[11px] font-gsemibold text-right text-primary">{item.nta_no}</span>
                                                        </div>
                                                    )}
                                                    <div className={`grid grid-cols-2 px-3 py-2 ${bal < 0 ? 'bg-destructive/5' : 'bg-emerald-500/5'}`}>
                                                        <span className="text-[11px] font-gsemibold text-muted-foreground">Balance</span>
                                                        <span className={`text-[11px] font-gbold text-right ${bal < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            ₱{fmtNum(item.balance)}
                                                        </span>
                                                    </div>
                                                    {itemRealign && (
                                                        <div className={`px-3 py-2 border-t border-border/60 ${itemHasDeficit ? 'bg-destructive/8' : 'bg-emerald-500/5'}`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1">
                                                                    {itemHasDeficit
                                                                        ? <AlertTriangle size={10} className="text-destructive" />
                                                                        : <ArrowRightLeft size={10} className="text-emerald-500" />
                                                                    }
                                                                    <span className={`text-[10px] font-gbold uppercase tracking-wider ${itemHasDeficit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                        Realignment Net
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[11px] font-gbold ${itemHasDeficit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                    ₱{itemRealign.net.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-3 text-[10px] text-muted-foreground">
                                                                <span className="text-emerald-600 dark:text-emerald-400">+₱{itemRealign.transferTo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                                <span className="text-destructive">−₱{itemRealign.transferFrom.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    </>)}

                    {/* ── NCA / NTCA Tab ── */}
                    {tab === 'nca' && (
                        <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 rounded-full bg-emerald-500/70 shrink-0" />
                                    <p className="text-[11px] font-gbold uppercase tracking-widest text-muted-foreground">NCA / NTCA Records</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {saro.items.filter(i => i.nca_date).length} of {saro.items.length} tagged
                                </span>
                            </div>

                            {saro.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border text-center">
                                    <p className="text-sm font-gmedium text-muted-foreground">No line items to tag</p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">Add line items first via Edit SARO</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {saro.items.map(item => {
                                        const isTagged = !!item.nca_date
                                        const isEditing = tagItemId === item.id
                                        const ncaAmt = parseFloat(item.nca_amount) || 0
                                        return (
                                            <div key={item.id} className="rounded-xl border bg-background overflow-hidden border-border hover:border-primary/30 transition-all">
                                                <div className="flex items-start justify-between gap-2 px-3.5 py-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-gbold text-foreground truncate">
                                                            {item.pap_code && <span className="text-primary">{item.pap_code} — </span>}
                                                            {item.object_code_desc || item.description || 'Line Item'}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">₱{fmtNum(item.amount)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isTagged && !isEditing && (
                                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-gsemibold">
                                                                Tagged
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (isEditing) {
                                                                    setTagItemId(null)
                                                                } else {
                                                                    setTagItemId(item.id)
                                                                    setTagForm({
                                                                        nca_date: item.nca_date || '',
                                                                        nta_no: item.nta_no || '',
                                                                        nca_amount: item.nca_amount || '',
                                                                        nca_no: item.nca_no || '',
                                                                        year: item.year != null ? String(item.year) : '',
                                                                        remarks: item.remarks || '',
                                                                    })
                                                                }
                                                            }}
                                                            className={`flex items-center gap-1 text-[11px] font-gsemibold px-2.5 py-1.5 rounded-lg border transition ${
                                                                isEditing
                                                                    ? 'bg-muted text-foreground border-border hover:bg-muted/80'
                                                                    : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                            }`}
                                                        >
                                                            {isEditing ? <><X size={11} /> Cancel</> : isTagged ? <><Pencil size={11} /> Edit</> : <><Plus size={11} /> Tag NCA</>}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tagged summary (not editing) */}
                                                {isTagged && !isEditing && (
                                                    <div className="border-t border-border/60 divide-y divide-border/40 bg-emerald-500/5">
                                                        {item.nca_date && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">NCA Date</span>
                                                                <span className="text-[10px] font-gsemibold">{fmtDate(item.nca_date)}</span>
                                                            </div>
                                                        )}
                                                        {item.nta_no && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">NTA No.</span>
                                                                <span className="text-[10px] font-gsemibold text-primary">{item.nta_no}</span>
                                                            </div>
                                                        )}
                                                        {ncaAmt > 0 && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">NCA Amount</span>
                                                                <span className="text-[10px] font-gsemibold text-emerald-600 dark:text-emerald-400">₱{fmtNum(item.nca_amount)}</span>
                                                            </div>
                                                        )}
                                                        {item.nca_no && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">NCA No.</span>
                                                                <span className="text-[10px] font-gsemibold">{item.nca_no}</span>
                                                            </div>
                                                        )}
                                                        {item.year != null && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">Year</span>
                                                                <span className="text-[10px] font-gsemibold">{item.year}</span>
                                                            </div>
                                                        )}
                                                        {item.remarks && (
                                                            <div className="flex justify-between px-3.5 py-1.5">
                                                                <span className="text-[10px] text-muted-foreground">Remarks</span>
                                                                <span className="text-[10px] font-gsemibold text-right max-w-[60%]">{item.remarks}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Inline edit form */}
                                                {isEditing && (
                                                    <div className="border-t border-primary/20 bg-primary/5 px-3.5 py-3 flex flex-col gap-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">NCA Date</label>
                                                                <input type="date" value={tagForm.nca_date}
                                                                    onChange={e => setTagForm(f => ({ ...f, nca_date: e.target.value }))}
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">NCA Amount</label>
                                                                <input type="number" value={tagForm.nca_amount}
                                                                    onChange={e => setTagForm(f => ({ ...f, nca_amount: e.target.value }))}
                                                                    placeholder="0.00"
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">NTA No.</label>
                                                                <input type="text" value={tagForm.nta_no}
                                                                    onChange={e => setTagForm(f => ({ ...f, nta_no: e.target.value }))}
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">NCA No.</label>
                                                                <input type="text" value={tagForm.nca_no}
                                                                    onChange={e => setTagForm(f => ({ ...f, nca_no: e.target.value }))}
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">Year</label>
                                                                <input type="number" value={tagForm.year}
                                                                    onChange={e => setTagForm(f => ({ ...f, year: e.target.value }))}
                                                                    placeholder="e.g. 2025"
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-gsemibold text-muted-foreground uppercase tracking-wide block mb-1">Remarks</label>
                                                                <input type="text" value={tagForm.remarks}
                                                                    onChange={e => setTagForm(f => ({ ...f, remarks: e.target.value }))}
                                                                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                setTagSaving(true)
                                                                try {
                                                                    await efasApi.patch(`received-saro/ntca/${item.id}/`, {
                                                                        nca_date: tagForm.nca_date || null,
                                                                        nta_no: tagForm.nta_no,
                                                                        nca_amount: tagForm.nca_amount || '0',
                                                                        nca_no: tagForm.nca_no,
                                                                        year: tagForm.year ? parseInt(tagForm.year) : null,
                                                                        remarks: tagForm.remarks,
                                                                    })
                                                                    setTagItemId(null)
                                                                    onRefresh()
                                                                } finally {
                                                                    setTagSaving(false)
                                                                }
                                                            }}
                                                            disabled={tagSaving}
                                                            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-gsemibold py-2 rounded-lg transition disabled:opacity-60 mt-1"
                                                        >
                                                            <Check size={13} />
                                                            {tagSaving ? 'Saving…' : 'Save NCA'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer Actions ── */}
                <div className="flex gap-2 px-4 py-3 border-t border-border bg-card/80 backdrop-blur shrink-0">
                    {showArchived ? (
                        <button
                            onClick={() => onArchiveAction('restore')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
                        >
                            <ArchiveRestore size={14} /> Restore SARO
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onEdit}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-gsemibold py-2.5 rounded-lg transition-all active:scale-[0.98]"
                            >
                                <Pencil size={14} /> Edit SARO
                            </button>
                            <button
                                onClick={() => onArchiveAction('archive')}
                                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-gsemibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                                title="Archive SARO"
                            >
                                <Archive size={14} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-sm font-gsemibold px-4 py-2.5 rounded-lg transition-all active:scale-[0.98]"
                        title="Delete SARO"
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
    const location = useLocation()
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [realignments, setRealignments] = useState<RealignmentEntry[]>([])
    const [paps, setPaps] = useState<PAPCode[]>([])
    const [fundTypes, setFundTypes] = useState<FundType[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [objectDescriptions, setObjectDescriptions] = useState<ObjectDescription[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState(() => (location.state as any)?.search ?? '')
    const [showAdd, setShowAdd] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [viewTarget, setViewTarget] = useState<ReceivedSARO | null>(null)
    const [editTarget, setEditTarget] = useState<ReceivedSARO | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [selectedSaroIds, setSelectedSaroIds] = useState<Set<number>>(new Set())
    const [sortKey, setSortKey] = useState<'date_recd_in_email' | 'date_of_saro' | 'allotment_no' | 'total_amount'>('date_recd_in_email')
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
    const [papFilter, setPapFilter] = useState('')
    const [filterYear, setFilterYear] = useState('All')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterFund, setFilterFund] = useState('')
    const [panelSaro, setPanelSaro] = useState<ReceivedSARO | null>(null)
    const [crudLoading, setCrudLoading] = useState<string | null>(null)
    const [showArchived, setShowArchived] = useState(false)

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
        setSelectedSaroIds(new Set())
        try {
            const [saroRes, papRes, ftRes, ctRes, odRes, realignRes] = await Promise.all([
                efasApi.get(`received-saro/?archived=${showArchived}`),
                efasApi.get('pap/'),
                efasApi.get('fund-type/'),
                efasApi.get('class-type/'),
                efasApi.get('object-description/'),
                efasApi.get('realignment/'),
            ])
            setSaros(saroRes.data)
            setPaps(papRes.data)
            setFundTypes(ftRes.data)
            setClassTypes(ctRes.data)
            setObjectDescriptions(odRes.data)
            setRealignments(realignRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [showArchived])

    // Sync panel when saros refreshes (e.g. after edit)
    useEffect(() => {
        if (panelSaro) {
            const updated = saros.find(s => s.id === panelSaro.id)
            if (updated) setPanelSaro(updated)
            else setPanelSaro(null)
        }
    }, [saros])

    // Unique sorted PAP names across all SAROs for the filter dropdown
    const allPapNames = [...new Set(
        saros.flatMap(s => s.items.map(i => i.pap_name).filter(Boolean))
    )].sort()

    // Year / quarter helpers
    const availableYears = [...new Set(saros.map(s => s.date_of_saro?.slice(0, 4)).filter((y): y is string => !!y))].sort().reverse()
    const activeFilterYear = filterYear !== 'All' ? parseInt(filterYear) : new Date().getFullYear()
    const QUARTERS = [
        { label: 'Q1', from: `${activeFilterYear}-01-01`, to: `${activeFilterYear}-03-31` },
        { label: 'Q2', from: `${activeFilterYear}-04-01`, to: `${activeFilterYear}-06-30` },
        { label: 'Q3', from: `${activeFilterYear}-07-01`, to: `${activeFilterYear}-09-30` },
        { label: 'Q4', from: `${activeFilterYear}-10-01`, to: `${activeFilterYear}-12-31` },
    ]
    const activeQ = QUARTERS.find(q => q.from === filterDateFrom && q.to === filterDateTo)?.label ?? null
    const hasDateFilter = filterYear !== 'All' || !!filterDateFrom || !!filterDateTo || !!filterFund

    // Filter SAROs — search checks SARO-level fields AND within items
    const filtered: ReceivedSARO[] = saros.filter(saro => {
        const d = saro.date_of_saro ?? ''
        if (filterYear !== 'All' && !d.startsWith(filterYear)) return false
        if (filterDateFrom && d < filterDateFrom) return false
        if (filterDateTo && d > filterDateTo) return false
        if (filterFund && !saro.items.some(i => i.fund_type === filterFund)) return false
        if (papFilter && !saro.items.some(i => i.pap_name === papFilter)) return false
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            saro.allotment_no.toLowerCase().includes(q) ||
            saro.class_type.toLowerCase().includes(q) ||
            saro.notes_validity.toLowerCase().includes(q) ||
            saro.items.some(item =>
                item.pap_code.toLowerCase().includes(q) ||
                item.pap_name.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.nta_no.toLowerCase().includes(q) ||
                item.object_code_desc.toLowerCase().includes(q)
            )
        )
    })

    // Detect letter-variant groups (e.g. 0031 + 0031A…0031G)
    interface GroupInfo { saroIds: Set<number>; totalAmount: number; allotmentNos: string[] }
    const groupMap = new Map<string, GroupInfo>()
    filtered.forEach(saro => {
        const base = getBaseAllotmentNo(saro.allotment_no)
        if (!groupMap.has(base)) groupMap.set(base, { saroIds: new Set(), totalAmount: 0, allotmentNos: [] })
        const g = groupMap.get(base)!
        if (!g.saroIds.has(saro.id)) {
            g.saroIds.add(saro.id)
            g.totalAmount += parseFloat(saro.total_amount) || 0
            if (!g.allotmentNos.includes(saro.allotment_no)) g.allotmentNos.push(saro.allotment_no)
        }
    })
    for (const [key, val] of groupMap.entries()) {
        if (val.saroIds.size <= 1) groupMap.delete(key)
    }

    const sorted = [...filtered].sort((a, b) => {
        if (sortKey === 'allotment_no') {
            const baseA = getBaseAllotmentNo(a.allotment_no)
            const baseB = getBaseAllotmentNo(b.allotment_no)
            const bc = baseA.localeCompare(baseB)
            if (bc !== 0) return sortDir === 'asc' ? bc : -bc
            return sortDir === 'asc' ? a.allotment_no.localeCompare(b.allotment_no) : b.allotment_no.localeCompare(a.allotment_no)
        }
        let av: string | number = (a[sortKey] as string) ?? ''
        let bv: string | number = (b[sortKey] as string) ?? ''
        if (sortKey === 'total_amount') {
            av = parseFloat(av as string) || 0
            bv = parseFloat(bv as string) || 0
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
    })

    // Summary totals from all filtered items
    const allFilteredItems = filtered.flatMap(s => s.items)
    const totalAmount = allFilteredItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    const totalNcaAmount = allFilteredItems.reduce((s, i) => s + (parseFloat(i.nca_amount) || 0), 0)
    const totalBalance = allFilteredItems.reduce((s, i) => s + (parseFloat(i.balance) || 0), 0)

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)
    const saroRankMap = new Map(paginated.map((s, i) => [s.id, i + 1]))

    // Which SAROs have a net realignment deficit (transfer_from > transfer_to)
    const saroDeficitSet = new Set<string>()
    const saroRealignSet = new Set<string>()
    realignments.forEach(r => {
        if (!r.saro_no) return
        saroRealignSet.add(r.saro_no)
    })
    saroRealignSet.forEach(sNo => {
        const entries = realignments.filter(r => r.saro_no === sNo)
        const net = entries.reduce((s, r) => s + (parseFloat(r.transfer_to) || 0) - (parseFloat(r.transfer_from) || 0), 0)
        if (net < 0) saroDeficitSet.add(sNo)
    })

    const allPageIds = paginated.map(s => s.id)
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
            setSelectedSaroIds(prev => { const next = new Set(prev); allPageIds.forEach(id => next.delete(id)); return next })
        } else {
            setSelectedSaroIds(prev => { const next = new Set(prev); allPageIds.forEach(id => next.add(id)); return next })
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

    const handleBulkArchiveAction = async (action: 'archive' | 'restore') => {
        if (selectedSaroIds.size === 0) return
        const label = action === 'archive' ? 'Archive' : 'Restore'
        if (!window.confirm(`${label} ${selectedSaroIds.size} selected SARO record${selectedSaroIds.size !== 1 ? 's' : ''}?`)) return
        setCrudLoading(`${label}ing…`)
        try {
            await efasApi.post('received-saro/bulk-action/', { action, ids: [...selectedSaroIds] })
            fetchAll()
        } finally {
            setCrudLoading(null)
        }
    }

    const handleSingleArchiveAction = async (id: number, action: 'archive' | 'restore') => {
        setCrudLoading(action === 'archive' ? 'Archiving…' : 'Restoring…')
        try {
            await efasApi.post('received-saro/bulk-action/', { action, ids: [id] })
            if (panelSaro?.id === id) setPanelSaro(null)
            fetchAll()
        } finally {
            setCrudLoading(null)
        }
    }

    const renderRows = paginated

    const th = 'px-3 py-2.5 text-left text-sm font-gmedium text-white whitespace-nowrap select-none'
    const td = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'
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
                    <h1 className="text-2xl font-gbold text-foreground flex items-center gap-2">
                        SARO Received
                        {showArchived && <span className="text-sm px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-gmedium border border-amber-500/20 flex items-center gap-1"><Archive size={12} /> Archived</span>}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {saros.length} SARO{saros.length !== 1 ? 's' : ''} &middot; {saros.flatMap(s => s.items).length} line item{saros.flatMap(s => s.items).length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedSaroIds.size > 0 && (
                        <>
                            {showArchived ? (
                                <button onClick={() => handleBulkArchiveAction('restore')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition">
                                    <ArchiveRestore size={15} /> Restore ({selectedSaroIds.size})
                                </button>
                            ) : (
                                <button onClick={() => handleBulkArchiveAction('archive')} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-500/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition">
                                    <Archive size={15} /> Archive ({selectedSaroIds.size})
                                </button>
                            )}
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition">
                                <Trash2 size={15} /> Delete ({selectedSaroIds.size})
                            </button>
                        </>
                    )}
                    {!showArchived && (
                        <>
                            <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-gmedium px-4 py-2 rounded-lg border border-border transition">
                                <ClipboardList size={15} /> Bulk Import
                            </button>
                            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition">
                                <Plus size={15} /> Add SARO
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Date / Year / Quarter / Fund Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
                <span className="text-xs font-gmedium text-muted-foreground whitespace-nowrap">Date:</span>
                <select
                    value={filterYear}
                    onChange={e => { setFilterYear(e.target.value); setFilterDateFrom(''); setFilterDateTo(''); setPage(1) }}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="All">All Years</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {QUARTERS.map(q => (
                    <button
                        key={q.label}
                        onClick={() => { setFilterDateFrom(q.from); setFilterDateTo(q.to); setPage(1) }}
                        className={`h-8 px-2.5 rounded-lg text-xs font-gmedium border transition ${activeQ === q.label ? 'bg-primary text-white border-primary' : 'bg-background text-foreground/80 border-border hover:bg-muted'}`}
                    >
                        {q.label}
                    </button>
                ))}
                <span className="text-xs text-muted-foreground mx-0.5">|</span>
                <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => { setFilterDateFrom(e.target.value); setPage(1) }}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => { setFilterDateTo(e.target.value); setPage(1) }}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground mx-0.5">|</span>
                <select
                    value={filterFund}
                    onChange={e => { setFilterFund(e.target.value); setPage(1) }}
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="">All Fund Types</option>
                    {fundTypes.map(ft => <option key={ft.code} value={ft.code}>{ft.name || ft.code}</option>)}
                </select>
                {hasDateFilter && (
                    <button
                        onClick={() => { setFilterYear('All'); setFilterDateFrom(''); setFilterDateTo(''); setFilterFund(''); setPage(1) }}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-gmedium bg-primary/10 text-primary hover:bg-primary/20 transition"
                    >
                        <X size={11} /> Clear
                    </button>
                )}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                    <button
                        onClick={() => { setShowArchived(false); setSelectedSaroIds(new Set()) }}
                        className={`px-3 py-1.5 text-xs font-gmedium transition ${!showArchived ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => { setShowArchived(true); setSelectedSaroIds(new Set()) }}
                        className={`px-3 py-1.5 text-xs font-gmedium transition flex items-center gap-1 ${showArchived ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                    >
                        <Archive size={11} /> Archived
                    </button>
                </div>
                <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Search SARO, PAP, description, object code…"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                </div>
                <div className="relative">
                    <select
                        value={papFilter}
                        onChange={e => { setPapFilter(e.target.value); setPage(1) }}
                        className={`text-sm rounded-lg border px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary transition bg-background text-foreground ${papFilter ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-border'}`}
                    >
                        <option value="">All PAPs</option>
                        {allPapNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    {papFilter && (
                        <button
                            onClick={() => { setPapFilter(''); setPage(1) }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
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
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-3">
                <div className="rounded-xl border border-border bg-card px-5 py-4 flex flex-col gap-1">
                    <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-gbold text-foreground">{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{filtered.length} SARO{filtered.length !== 1 ? 's' : ''} · {allFilteredItems.length} item{allFilteredItems.length !== 1 ? 's' : ''}</p>
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
                                        <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="rounded cursor-pointer accent-white" />
                                    </th>
                                    <th className={th}>#</th>
                                    <th className={th}>DATE RECD IN EMAIL</th>
                                    <th className={th}>DATE OF SARO</th>
                                    <th className={th}>ALLOTMENT NO.</th>
                                    <th className={`${th} min-w-[180px]`}>PAP NAME</th>
                                    <th className={th}>CLASS TYPE</th>
                                    <th className={th}>NOTES / VALIDITY</th>
                                    <th className={`${th} text-right`}>TOTAL AMOUNT</th>
                                    <th className={th}>ITEMS</th>
                                    <th className={thSticky}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">No records found.</td></tr>
                                ) : renderRows.map((saro, idx) => {
                                    const inGroup = groupMap.has(getBaseAllotmentNo(saro.allotment_no))
                                    return (
                                        <tr
                                            key={saro.id}
                                            onClick={() => setPanelSaro(saro)}
                                            className={`border-b border-border last:border-0 cursor-pointer transition-colors ${inGroup ? 'border-l-2 border-l-primary/30' : ''} ${panelSaro?.id === saro.id
                                                ? 'bg-primary/10'
                                                : idx % 2 === 0 ? 'bg-background hover:bg-muted/30' : 'bg-muted/20 hover:bg-muted/40'
                                                }`}
                                        >
                                            <td className={`${tdCheck} bg-background`} style={{ background: panelSaro?.id === saro.id ? 'color-mix(in srgb, hsl(var(--primary)) 12%, hsl(var(--background)))' : undefined }}>
                                                <input type="checkbox"
                                                    checked={selectedSaroIds.has(saro.id)}
                                                    onChange={() => toggleSelect(saro.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="rounded cursor-pointer" />
                                            </td>
                                            <td className={`${td} text-muted-foreground`}>{saroRankMap.get(saro.id)}</td>
                                            <td className={td}>{fmtDate(saro.date_recd_in_email)}</td>
                                            <td className={td}>{fmtDate(saro.date_of_saro)}</td>
                                            <td className={`${td} font-gmedium text-primary`}>{saro.allotment_no}</td>
                                            <td className={td}>
                                                {(() => {
                                                    const paps = [...new Map(
                                                        saro.items
                                                            .filter(i => i.pap_name)
                                                            .map(i => [i.pap_code, i.pap_name])
                                                    ).values()]
                                                    if (paps.length === 0) return <span className="text-muted-foreground">—</span>
                                                    return (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-gsemibold text-blue-600 dark:text-blue-400 truncate max-w-[170px]" title={paps[0]}>{paps[0]}</span>
                                                            {paps.length > 1 && (
                                                                <span className="text-[10px] text-muted-foreground">+{paps.length - 1} more</span>
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                            </td>
                                            <td className={td}>
                                                {saro.class_type
                                                    ? <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-gmedium">{saro.class_type}</span>
                                                    : '—'}
                                            </td>
                                            <td className={`${td} max-w-[200px] truncate`} title={saro.notes_validity}>{saro.notes_validity || '—'}</td>
                                            <td className={`${td} text-right font-gbold`}>{fmtNum(saro.total_amount)}</td>
                                            <td className={td}>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {saro.items.length > 0
                                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-gbold border border-amber-500/20">
                                                            {saro.items.length} item{saro.items.length !== 1 ? 's' : ''}
                                                        </span>
                                                        : <span className="text-muted-foreground text-xs">—</span>}
                                                    {saroDeficitSet.has(saro.allotment_no) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-gbold border border-destructive/20">
                                                            <AlertTriangle size={9} /> Deficit
                                                        </span>
                                                    )}
                                                    {!saroDeficitSet.has(saro.allotment_no) && saroRealignSet.has(saro.allotment_no) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-gbold border border-emerald-500/20">
                                                            <ArrowRightLeft size={9} /> Realigned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`${tdSticky} bg-background`} style={{ background: panelSaro?.id === saro.id ? 'color-mix(in srgb, hsl(var(--primary)) 12%, hsl(var(--background)))' : undefined }}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {showArchived ? (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleSingleArchiveAction(saro.id, 'restore') }} className="p-1 rounded hover:bg-emerald-500/10 transition text-muted-foreground hover:text-emerald-600" title="Restore"><ArchiveRestore size={13} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(saro.id) }} className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setViewTarget(saro) }} className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground" title="View"><Eye size={13} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditTarget(saro) }} className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-primary" title="Edit"><Pencil size={13} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleSingleArchiveAction(saro.id, 'archive') }} className="p-1 rounded hover:bg-amber-500/10 transition text-muted-foreground hover:text-amber-500" title="Archive"><Archive size={13} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(saro.id) }} className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span>
                                    Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} SARO{filtered.length !== 1 ? 's' : ''}
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
                                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">«</button>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">Prev</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                                        acc.push(p)
                                        return acc
                                    }, [])
                                    .map((p, i) =>
                                        p === '…'
                                            ? <span key={`e-${i}`} className="px-2 text-xs">…</span>
                                            : <button key={p} onClick={() => setPage(p as number)} className={`px-3 py-1 rounded border text-xs font-gmedium transition ${page === p ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}>{p}</button>
                                    )}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">Next</button>
                                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">»</button>
                            </div>
                        </div>
                    )}
                </div>

                {panelSaro && (
                    <SaroDetailPanel
                        saro={panelSaro}
                        allSaros={saros}
                        realignments={realignments}
                        showArchived={showArchived}
                        onClose={() => setPanelSaro(null)}
                        onEdit={() => { setEditTarget(panelSaro); setPanelSaro(null) }}
                        onDelete={() => { handleDelete(panelSaro.id); setPanelSaro(null) }}
                        onArchiveAction={(action) => { handleSingleArchiveAction(panelSaro.id, action); setPanelSaro(null) }}
                        onRefresh={fetchAll}
                    />
                )}
            </div>

            {/* Dialogs */}
            {showBulk && (
                <BulkImportSaroDialog paps={paps} fundTypes={fundTypes} classTypes={classTypes} objectDescriptions={objectDescriptions} onClose={() => setShowBulk(false)} onDone={fetchAll} />
            )}
            {showAdd && (
                <AddReceivedSaroDialog paps={paps} fundTypes={fundTypes} classTypes={classTypes} objectDescriptions={objectDescriptions} onClose={() => setShowAdd(false)} onSaved={fetchAll} />
            )}
            {viewTarget && (
                <ViewReceivedSaroDialog saro={viewTarget} onClose={() => setViewTarget(null)} />
            )}
            {editTarget && (
                <AddReceivedSaroDialog paps={paps} fundTypes={fundTypes} classTypes={classTypes} objectDescriptions={objectDescriptions} initial={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchAll} />
            )}
        </div>
    )
}
