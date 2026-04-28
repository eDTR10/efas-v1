import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import AddDisbursementDialog from './dialogs/AddDisbursementDialog'
import ViewDisbursementDialog from './dialogs/ViewDisbursementDialog'
import UpdateDisbursementDialog from './dialogs/UpdateDisbursementDialog'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Disbursement {
    id: number
    date_received: string
    claimant: string
    dv_number: string
    particulars: string
    net_amount: string
    status_of_documents: 'complete' | 'incomplete' | 'lack_signatures'
    fund_cluster: 'mds_regular' | 'mds_special' | 'trust'
    status_of_ntca: 'with_ntca' | 'no_ntca' | 'borrow' | 'cash_in_bank' | 'common_fund' | 'dost_share'
    date_of_ntca_download: string | null
    mode_of_payment: 'ada' | 'check' | 'over_the_counter'
    date_paid: string | null
    remarks: string
    reasons_responsible: string
    created_at: string
    updated_at: string
}

// ─── Label maps ────────────────────────────────────────────────────────────────

export const STATUS_DOC_LABELS: Record<Disbursement['status_of_documents'], string> = {
    complete: 'Complete',
    incomplete: 'Incomplete',
    lack_signatures: 'Lack Signatures',
}

export const FUND_CLUSTER_LABELS: Record<Disbursement['fund_cluster'], string> = {
    mds_regular: 'MDS Regular',
    mds_special: 'MDS Special',
    trust: 'Trust',
}

export const STATUS_NTCA_LABELS: Record<Disbursement['status_of_ntca'], string> = {
    with_ntca: 'With NTCA',
    no_ntca: 'No NTCA',
    borrow: 'Borrow',
    cash_in_bank: 'Cash in Bank',
    common_fund: 'Common Fund',
    dost_share: 'DOST Share',
}

export const MODE_PAYMENT_LABELS: Record<Disbursement['mode_of_payment'], string> = {
    ada: 'ADA',
    check: 'Check',
    over_the_counter: 'Over the Counter',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtPHP(val: string | number | null) {
    if (val === null || val === undefined || val === '') return '—'
    const n = typeof val === 'number' ? val : parseFloat(val as string)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }) }
    catch { return d }
}

const STATUS_DOC_COLORS: Record<Disbursement['status_of_documents'], string> = {
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    incomplete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    lack_signatures: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_NTCA_COLORS: Record<Disbursement['status_of_ntca'], string> = {
    with_ntca: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    no_ntca: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    borrow: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    cash_in_bank: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    common_fund: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    dost_share: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
}

const FUND_CLUSTER_COLORS: Record<Disbursement['fund_cluster'], string> = {
    mds_regular: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    mds_special: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    trust: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
}

const inpSm = 'rounded-lg border border-border bg-background text-foreground text-xs font-gmedium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary transition'

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DisbursementMainContainer() {
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('efas_user') || '{}') } catch { return {} }
    })()
    const canCRUD = currentUser?.is_staff || currentUser?.role === 'cashier' || currentUser?.role === 'admin'

    const [records, setRecords] = useState<Disbursement[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [viewTarget, setViewTarget] = useState<Disbursement | null>(null)
    const [editTarget, setEditTarget] = useState<Disbursement | null>(null)

    // Filters
    const [search, setSearch] = useState('')
    const [filterStatusDoc, setFilterStatusDoc] = useState('')
    const [filterFundCluster, setFilterFundCluster] = useState('')
    const [filterStatusNtca, setFilterStatusNtca] = useState('')
    const [filterModePayment, setFilterModePayment] = useState('')

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
            const res = await efasApi.get('saro/disbursements/')
            setRecords(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const handleDelete = async (rec: Disbursement) => {
        if (!window.confirm(`Delete disbursement record "${rec.dv_number}"?`)) return
        await efasApi.delete(`saro/disbursements/${rec.id}/`)
        fetchAll()
    }

    // ── Filtering ──────────────────────────────────────────────────────────────
    const q = search.toLowerCase()
    const filtered = records.filter(r => {
        if (q && !(
            r.dv_number.toLowerCase().includes(q) ||
            r.claimant.toLowerCase().includes(q) ||
            r.particulars.toLowerCase().includes(q) ||
            r.remarks.toLowerCase().includes(q)
        )) return false
        if (filterStatusDoc && r.status_of_documents !== filterStatusDoc) return false
        if (filterFundCluster && r.fund_cluster !== filterFundCluster) return false
        if (filterStatusNtca && r.status_of_ntca !== filterStatusNtca) return false
        if (filterModePayment && r.mode_of_payment !== filterModePayment) return false
        return true
    })

    const totalNetAmount = filtered.reduce((s, r) => s + parseFloat(r.net_amount || '0'), 0)

    const hasFilter = search || filterStatusDoc || filterFundCluster || filterStatusNtca || filterModePayment
    const clearFilters = () => {
        setSearch('')
        setFilterStatusDoc('')
        setFilterFundCluster('')
        setFilterStatusNtca('')
        setFilterModePayment('')
    }

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">Disbursement</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Cashier-facing disbursement voucher tracker</p>
                </div>
                {canCRUD && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition"
                    >
                        <Plus size={15} /> Add Record
                    </button>
                )}
            </div>

            {/* ── Summary card ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Total Records" value={String(filtered.length)} />
                <SummaryCard label="Total Net Amount" value={fmtPHP(totalNetAmount)} accent="text-green-600 dark:text-green-400" />
                <SummaryCard
                    label="Complete"
                    value={String(filtered.filter(r => r.status_of_documents === 'complete').length)}
                    accent="text-green-600 dark:text-green-400"
                />
                <SummaryCard
                    label="Incomplete / Lack Sig."
                    value={String(filtered.filter(r => r.status_of_documents !== 'complete').length)}
                    accent="text-yellow-600 dark:text-yellow-400"
                />
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        className={inpSm + ' pl-7 w-56'}
                        placeholder="Search DV#, claimant, particular…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select value={filterStatusDoc} onChange={e => setFilterStatusDoc(e.target.value)} className={inpSm}>
                    <option value="">All Status (Docs)</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="lack_signatures">Lack Signatures</option>
                </select>
                <select value={filterFundCluster} onChange={e => setFilterFundCluster(e.target.value)} className={inpSm}>
                    <option value="">All Fund Clusters</option>
                    <option value="mds_regular">MDS Regular</option>
                    <option value="mds_special">MDS Special</option>
                    <option value="trust">Trust</option>
                </select>
                <select value={filterStatusNtca} onChange={e => setFilterStatusNtca(e.target.value)} className={inpSm}>
                    <option value="">All NTCA Status</option>
                    <option value="with_ntca">With NTCA</option>
                    <option value="no_ntca">No NTCA</option>
                    <option value="borrow">Borrow</option>
                    <option value="cash_in_bank">Cash in Bank</option>
                    <option value="common_fund">Common Fund</option>
                    <option value="dost_share">DOST Share</option>
                </select>
                <select value={filterModePayment} onChange={e => setFilterModePayment(e.target.value)} className={inpSm}>
                    <option value="">All Modes of Payment</option>
                    <option value="ada">ADA</option>
                    <option value="check">Check</option>
                    <option value="over_the_counter">Over the Counter</option>
                </select>
                {hasFilter && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            <div
                ref={tableRef}
                className="overflow-x-auto rounded-xl border border-border bg-card cursor-grab active:cursor-grabbing select-none"
                onMouseDown={onDragStart}
                onMouseMove={onDragMove}
                onMouseUp={onDragEnd}
                onMouseLeave={onDragEnd}
            >
                <table className="w-full text-sm min-w-[1400px]">
                    <thead>
                        <tr className="bg-muted/60 text-left">
                            <Th>No.</Th>
                            <Th>Date Received</Th>
                            <Th>Claimant</Th>
                            <Th>DV Number</Th>
                            <Th>Particular</Th>
                            <Th right>Net Amount of DV</Th>
                            <Th>Status of Docs</Th>
                            <Th>Fund Cluster</Th>
                            <Th>Status of NTCA</Th>
                            <Th>NTCA Download</Th>
                            <Th>Mode of Payment</Th>
                            <Th>Date Paid</Th>
                            <Th>Remarks</Th>
                            <Th>Reasons/Responsible</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={15} className="text-center py-10 text-muted-foreground text-sm">Loading…</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="text-center py-10 text-muted-foreground text-sm">
                                    {hasFilter ? 'No records match the current filters.' : 'No disbursement records yet.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((rec, idx) => (
                                <tr key={rec.id} className="border-t border-border hover:bg-muted/30 transition">
                                    <Td>{idx + 1}</Td>
                                    <Td>{fmtDate(rec.date_received)}</Td>
                                    <Td className="max-w-[160px] truncate" title={rec.claimant}>{rec.claimant}</Td>
                                    <Td className="font-gmedium whitespace-nowrap">{rec.dv_number}</Td>
                                    <Td className="max-w-[200px]">
                                        <span className="line-clamp-2 text-xs leading-relaxed" title={rec.particulars}>
                                            {rec.particulars || '—'}
                                        </span>
                                    </Td>
                                    <Td right className="font-gmedium whitespace-nowrap">{fmtPHP(rec.net_amount)}</Td>
                                    <Td>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-gmedium ${STATUS_DOC_COLORS[rec.status_of_documents]}`}>
                                            {STATUS_DOC_LABELS[rec.status_of_documents]}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-gmedium ${FUND_CLUSTER_COLORS[rec.fund_cluster]}`}>
                                            {FUND_CLUSTER_LABELS[rec.fund_cluster]}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-gmedium ${STATUS_NTCA_COLORS[rec.status_of_ntca]}`}>
                                            {STATUS_NTCA_LABELS[rec.status_of_ntca]}
                                        </span>
                                    </Td>
                                    <Td className="whitespace-nowrap">{fmtDate(rec.date_of_ntca_download)}</Td>
                                    <Td>
                                        <span className="font-gmedium">{MODE_PAYMENT_LABELS[rec.mode_of_payment]}</span>
                                    </Td>
                                    <Td className="whitespace-nowrap">{fmtDate(rec.date_paid)}</Td>
                                    <Td className="max-w-[140px]">
                                        <span className="line-clamp-2 text-xs" title={rec.remarks}>{rec.remarks || '—'}</span>
                                    </Td>
                                    <Td className="max-w-[140px]">
                                        <span className="line-clamp-2 text-xs" title={rec.reasons_responsible}>{rec.reasons_responsible || '—'}</span>
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-1.5">
                                            <ActionBtn title="View" onClick={() => setViewTarget(rec)}>
                                                <Eye size={13} />
                                            </ActionBtn>
                                            {canCRUD && (
                                                <>
                                                    <ActionBtn title="Edit" onClick={() => setEditTarget(rec)}>
                                                        <Pencil size={13} />
                                                    </ActionBtn>
                                                    <ActionBtn title="Delete" danger onClick={() => handleDelete(rec)}>
                                                        <Trash2 size={13} />
                                                    </ActionBtn>
                                                </>
                                            )}
                                        </div>
                                    </Td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Dialogs ── */}
            {showAdd && (
                <AddDisbursementDialog
                    onClose={() => setShowAdd(false)}
                    onSaved={() => { fetchAll(); setShowAdd(false) }}
                />
            )}
            {viewTarget && (
                <ViewDisbursementDialog
                    record={viewTarget}
                    onClose={() => setViewTarget(null)}
                />
            )}
            {editTarget && (
                <UpdateDisbursementDialog
                    record={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={() => { fetchAll(); setEditTarget(null) }}
                />
            )}
        </div>
    )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-gmedium">{label}</p>
            <p className={`text-lg font-gbold mt-1 ${accent ?? 'text-foreground'}`}>{value}</p>
        </div>
    )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={`px-4 py-3 text-xs font-gsemibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${right ? 'text-right' : ''}`}>
            {children}
        </th>
    )
}

function Td({ children, right, className, title }: { children: React.ReactNode; right?: boolean; className?: string; title?: string }) {
    return (
        <td className={`px-4 py-3 text-sm text-foreground align-top ${right ? 'text-right' : ''} ${className ?? ''}`} title={title}>
            {children}
        </td>
    )
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition ${danger
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            {children}
        </button>
    )
}
