import { useEffect, useRef, useState } from 'react'
import efasApi from '@/plugin/efasApi'
import { Plus, Pencil, Archive, Eye, ArchiveRestore, Search, X, ChevronDown } from 'lucide-react'
import AddReceivedSaroDialog from './dialogs/AddReceivedSaroDialog'
import ViewReceivedSaroDialog from './dialogs/ViewReceivedSaroDialog'
import UpdateReceivedSaroDialog from './dialogs/UpdateReceivedSaroDialog'

export interface ReceivedSaro {
    id: number
    saro_no: string
    date_received: string
    amount: string
    particulars: string
    fund_source: number | null
    fund_source_detail: { id: number; code: string; name: string } | null
    is_archived: boolean
    created_at: string
    updated_at: string
}

function formatPHP(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function ReceivedSaroMainContainer() {
    const [records, setRecords] = useState<ReceivedSaro[]>([])
    const [fundSources, setFundSources] = useState<{ id: number; code: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [showArchived, setShowArchived] = useState(false)
    const [search, setSearch] = useState('')
    const [filterFundSource, setFilterFundSource] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [viewTarget, setViewTarget] = useState<ReceivedSaro | null>(null)
    const [editTarget, setEditTarget] = useState<ReceivedSaro | null>(null)
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
            const [recRes, fsRes] = await Promise.all([
                efasApi.get(`saro/received-saros/?archived=${showArchived}`),
                efasApi.get('saro/fund-sources/'),
            ])
            setRecords(recRes.data)
            setFundSources(fsRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [showArchived])

    const handleArchive = async (rec: ReceivedSaro) => {
        const action = rec.is_archived ? 'unarchive' : 'archive'
        const label = rec.is_archived ? 'unarchive' : 'archive'
        if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} Received SARO "${rec.saro_no}"?`)) return
        await efasApi.post(`saro/received-saros/${rec.id}/${action}/`)
        fetchAll()
    }

    const q = search.toLowerCase()
    const filtered = records.filter(r => {
        if (q && !(
            r.saro_no.toLowerCase().includes(q) ||
            r.particulars.toLowerCase().includes(q) ||
            (r.fund_source_detail?.name ?? '').toLowerCase().includes(q)
        )) return false
        if (filterFundSource && String(r.fund_source) !== filterFundSource) return false
        return true
    })

    const inpSm = 'rounded-lg border border-border bg-background text-foreground text-xs font-gmedium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary transition'

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">Received SAROs</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Special Allotment Release Orders received by the office</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search SARO No., particulars…"
                            className={inpSm + ' pl-8 pr-7 min-w-[220px]'}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    {/* Fund Source filter */}
                    <div className="relative">
                        <select
                            value={filterFundSource}
                            onChange={e => setFilterFundSource(e.target.value)}
                            className={inpSm + ' appearance-none pr-7 max-w-[180px]'}
                        >
                            <option value="">All Fund Sources</option>
                            {fundSources.map(f => (
                                <option key={f.id} value={String(f.id)}>{f.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <button
                        onClick={() => setShowArchived(p => !p)}
                        className={`flex items-center gap-2 text-xs font-gmedium px-3 py-1.5 rounded-lg border transition ${showArchived ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                        <Archive size={13} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-gmedium px-4 py-2 rounded-lg transition"
                    >
                        <Plus size={14} /> Add Received SARO
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div
                    ref={tableRef}
                    className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={onDragStart}
                    onMouseMove={onDragMove}
                    onMouseUp={onDragEnd}
                    onMouseLeave={onDragEnd}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">No records found.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase">
                                    <th className="px-4 py-3 text-left whitespace-nowrap">#</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">SARO No.</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Date Received</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Amount</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Fund Source</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[180px]">Particulars</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-muted/40 z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, idx) => (
                                    <tr key={r.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition ${r.is_archived ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                        <td className="px-4 py-3 font-gmedium text-foreground whitespace-nowrap">{r.saro_no}</td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.date_received}</td>
                                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatPHP(r.amount)}</td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.fund_source_detail?.name || '—'}</td>
                                        <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{r.particulars || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-gmedium px-2 py-0.5 rounded-full ${r.is_archived ? 'bg-muted text-muted-foreground' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                                                {r.is_archived ? 'Archived' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 sticky right-0 bg-card z-10 border-l border-border/40">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setViewTarget(r)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground" title="View"><Eye size={15} /></button>
                                                {!r.is_archived && <button onClick={() => setEditTarget(r)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-primary" title="Edit"><Pencil size={15} /></button>}
                                                <button onClick={() => handleArchive(r)} className={`p-1.5 rounded transition ${r.is_archived ? 'hover:bg-green-500/10 text-muted-foreground hover:text-green-500' : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'}`} title={r.is_archived ? 'Unarchive' : 'Archive'}>
                                                    {r.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showAdd && (
                <AddReceivedSaroDialog
                    fundSources={fundSources}
                    onClose={() => setShowAdd(false)}
                    onSaved={fetchAll}
                />
            )}
            {viewTarget && (
                <ViewReceivedSaroDialog record={viewTarget} onClose={() => setViewTarget(null)} />
            )}
            {editTarget && (
                <UpdateReceivedSaroDialog
                    record={editTarget}
                    fundSources={fundSources}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchAll}
                />
            )}
        </div>
    )
}
