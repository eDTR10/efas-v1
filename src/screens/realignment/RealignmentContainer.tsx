import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, ArrowRightLeft, Upload, Archive, ArchiveRestore } from 'lucide-react'
import efasApi from '@/plugin/axios'
import type { ReceivedSARO } from '@/screens/received_saro/ReceivedSaroMainContainer'
import AddEditRealignmentDialog, { type RealignmentEntry } from './dialogs/AddEditRealignmentDialog'
import BulkImportRealignmentDialog from './dialogs/BulkImportRealignmentDialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmt = (v: string | number) => {
    const n = parseFloat(String(v))
    if (!v || isNaN(n) || n === 0) return ''
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const parseN = (v: string) => parseFloat(v) || 0

function fmtMonth(ym: string) {
    if (!ym) return '—'
    const [y, m] = ym.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[parseInt(m) - 1] ?? m} ${y}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RealignmentContainer() {
    const [entries, setEntries] = useState<RealignmentEntry[]>([])
    const [saros, setSaros] = useState<ReceivedSARO[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [monthFilter, setMonthFilter] = useState('')
    const [showDialog, setShowDialog] = useState(false)
    const [editEntry, setEditEntry] = useState<RealignmentEntry | undefined>()
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [showBulkImport, setShowBulkImport] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [showArchived, setShowArchived] = useState(false)
    const [bulkLoading, setBulkLoading] = useState(false)

    useEffect(() => { fetchAll() }, [showArchived])

    const fetchAll = async () => {
        setLoading(true)
        setSelectedIds(new Set())
        try {
            const [rRes, sRes] = await Promise.all([
                efasApi.get(`realignment/?archived=${showArchived}`),
                efasApi.get('received-saro/'),
            ])
            setEntries(rRes.data)
            setSaros(sRes.data)
        } catch { /* silent */ } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await efasApi.delete(`realignment/${id}/`)
            fetchAll()
        } catch { /* silent */ } finally {
            setDeleteId(null)
        }
    }

    const handleBulkAction = async (action: 'archive' | 'restore' | 'delete') => {
        if (selectedIds.size === 0) return
        const label = action === 'archive' ? 'archive' : action === 'restore' ? 'restore' : 'permanently delete'
        if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedIds.size} selected entr${selectedIds.size !== 1 ? 'ies' : 'y'}?`)) return
        setBulkLoading(true)
        try {
            await efasApi.post('realignment/bulk-action/', { action, ids: [...selectedIds] })
            fetchAll()
        } catch { /* silent */ } finally {
            setBulkLoading(false)
        }
    }

    const toggleSelect = (id: number) => setSelectedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })

    // ── Filtering ─────────────────────────────────────────────────────────────

    const filtered = entries.filter(e => {
        const q = search.toLowerCase().trim()
        const matchSearch = !q ||
            e.saro_no.toLowerCase().includes(q) ||
            e.realignment_ref.toLowerCase().includes(q) ||
            e.account_code.toLowerCase().includes(q) ||
            e.account_title.toLowerCase().includes(q) ||
            e.pap_name.toLowerCase().includes(q) ||
            e.fund.toLowerCase().includes(q)
        const matchMonth = !monthFilter || e.month === monthFilter
        return matchSearch && matchMonth
    })

    // ── Group by realignment_ref ──────────────────────────────────────────────

    const groupOrder: string[] = []
    const groups = new Map<string, RealignmentEntry[]>()
    for (const e of filtered) {
        if (!groups.has(e.realignment_ref)) {
            groupOrder.push(e.realignment_ref)
            groups.set(e.realignment_ref, [])
        }
        groups.get(e.realignment_ref)!.push(e)
    }

    // ── Overall totals ────────────────────────────────────────────────────────

    const totalTo = filtered.reduce((s, e) => s + parseN(e.transfer_to), 0)
    const totalFrom = filtered.reduce((s, e) => s + parseN(e.transfer_from), 0)
    const isBalanced = Math.abs(totalTo - totalFrom) < 0.01

    // ── Unique months for filter ──────────────────────────────────────────────

    const months = [...new Set(entries.map(e => e.month))].sort().reverse()

    const allFiltered = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))
    const someSelected = selectedIds.size > 0

    const th = 'px-3 py-2.5 text-left text-sm font-gmedium text-white whitespace-nowrap'
    const td = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'

    return (
        <div className="flex flex-col h-full bg-background">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="font-gbold text-foreground text-xl flex items-center gap-2">
                            <ArrowRightLeft size={20} className="text-primary" />
                            Realignment
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Fund transfer records — enter positive values only
                        </p>
                    </div>
                    {!showArchived && (
                        <div className="flex gap-2 shrink-0">
                            {someSelected && (
                                <>
                                    <button
                                        onClick={() => handleBulkAction('archive')}
                                        disabled={bulkLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-gmedium rounded-lg hover:bg-amber-500/90 transition disabled:opacity-50"
                                    >
                                        <Archive size={15} /> Archive ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={() => setDeleteId(-1)}
                                        disabled={bulkLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-white text-sm font-gmedium rounded-lg hover:bg-destructive/90 transition disabled:opacity-50"
                                    >
                                        <Trash2 size={15} /> Delete ({selectedIds.size})
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setShowBulkImport(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-gmedium rounded-lg border border-border hover:bg-muted/80 transition"
                            >
                                <Upload size={15} /> Import CSV
                            </button>
                            <button
                                onClick={() => { setEditEntry(undefined); setShowDialog(true) }}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-gmedium rounded-lg hover:bg-primary/90 transition"
                            >
                                <Plus size={15} /> Add Entry
                            </button>
                        </div>
                    )}
                    {showArchived && someSelected && (
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => handleBulkAction('restore')}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-gmedium rounded-lg hover:bg-emerald-600/90 transition disabled:opacity-50"
                            >
                                <ArchiveRestore size={15} /> Restore ({selectedIds.size})
                            </button>
                            <button
                                onClick={() => setDeleteId(-1)}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-destructive text-white text-sm font-gmedium rounded-lg hover:bg-destructive/90 transition disabled:opacity-50"
                            >
                                <Trash2 size={15} /> Delete ({selectedIds.size})
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary cards — only show in active mode */}
                {!showArchived && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-gbold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Total Transfer To (+)</p>
                            <p className="text-lg font-gbold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                ₱{totalTo.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-gbold text-red-700 dark:text-red-400 uppercase tracking-widest">Total Transfer From (-)</p>
                            <p className="text-lg font-gbold text-red-700 dark:text-red-400 mt-0.5">
                                ₱{totalFrom.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className={`border rounded-xl px-4 py-3 ${isBalanced ? 'bg-primary/10 border-primary/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                            <p className={`text-[10px] font-gbold uppercase tracking-widest ${isBalanced ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}`}>Balance</p>
                            <p className={`text-lg font-gbold mt-0.5 ${isBalanced ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}`}>
                                {isBalanced ? 'Balanced ✓' : `₱${Math.abs(totalTo - totalFrom).toLocaleString('en-PH', { minimumFractionDigits: 2 })} off`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Active / Archived tabs + Filters */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {/* Tab toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                        <button
                            onClick={() => { setShowArchived(false); setSelectedIds(new Set()) }}
                            className={`px-3 py-1.5 text-xs font-gmedium transition ${!showArchived ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => { setShowArchived(true); setSelectedIds(new Set()) }}
                            className={`px-3 py-1.5 text-xs font-gmedium transition flex items-center gap-1 ${showArchived ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            <Archive size={11} /> Archived
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-xs">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search SARO, MAP ref, account…"
                            className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <select
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="text-sm bg-background border border-input rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary transition"
                    >
                        <option value="">All Months</option>
                        {months.map(m => (
                            <option key={m} value={m}>{fmtMonth(m)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                        {showArchived
                            ? <><Archive size={32} className="opacity-20" /><p className="text-sm">No archived entries.</p></>
                            : <><ArrowRightLeft size={32} className="opacity-20" /><p className="text-sm">No realignment entries found.</p>
                                <button onClick={() => { setEditEntry(undefined); setShowDialog(true) }} className="text-xs text-primary underline underline-offset-2">Add the first entry</button></>
                        }
                    </div>
                ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr className={showArchived ? 'bg-amber-600' : 'bg-primary'}>
                                    <th className="px-3 py-2.5 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allFiltered}
                                            onChange={() => {
                                                if (allFiltered) setSelectedIds(new Set())
                                                else setSelectedIds(new Set(filtered.map(e => e.id)))
                                            }}
                                            className="rounded cursor-pointer accent-white"
                                        />
                                    </th>
                                    <th className={th}>Month</th>
                                    <th className={th}>Fund</th>
                                    <th className={th}>Class</th>
                                    <th className={th}>PAP Name</th>
                                    <th className={th}>SUBARO No.</th>
                                    <th className={th}>Realignment Ref (MAP No.)</th>
                                    <th className={th}>Account Code</th>
                                    <th className={`${th} min-w-[180px]`}>Account Title</th>
                                    <th className={`${th} text-right`}>Transfer To (+)</th>
                                    <th className={`${th} text-right`}>Transfer From (-)</th>
                                    <th className={`${th} w-20`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupOrder.map(ref => {
                                    const rows = groups.get(ref)!
                                    const grpTo = rows.reduce((s, e) => s + parseN(e.transfer_to), 0)
                                    const grpFrom = rows.reduce((s, e) => s + parseN(e.transfer_from), 0)
                                    const grpBalanced = Math.abs(grpTo - grpFrom) < 0.01

                                    return rows.map((entry, rowIdx) => (
                                        <tr
                                            key={entry.id}
                                            className={`border-b border-border last:border-0 ${selectedIds.has(entry.id) ? 'bg-primary/10' : rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-primary/5 transition-colors group`}
                                        >
                                            <td className="px-3 py-2.5 text-center w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(entry.id)}
                                                    onChange={() => toggleSelect(entry.id)}
                                                    className="rounded cursor-pointer accent-primary"
                                                />
                                            </td>
                                            <td className={td}>{fmtMonth(entry.month)}</td>
                                            <td className={td}>
                                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-gsemibold">
                                                    {entry.fund || '—'}
                                                </span>
                                            </td>
                                            <td className={td}>
                                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-gsemibold">
                                                    {entry.class_type || '—'}
                                                </span>
                                            </td>
                                            <td className={`${td} max-w-[160px] truncate font-gmedium text-primary`} title={entry.pap_name}>
                                                {entry.pap_name || '—'}
                                            </td>
                                            <td className={`${td} font-gmedium`}>{entry.saro_no}</td>
                                            <td className={td}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-gmedium">{entry.realignment_ref}</span>
                                                    {rowIdx === rows.length - 1 && (
                                                        <span className={`text-[9px] px-1 py-0.5 rounded font-gbold ${grpBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                            {grpBalanced ? 'BAL' : 'UNBAL'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`${td} font-gmedium text-primary`}>{entry.account_code}</td>
                                            <td className={`${td} max-w-[200px] truncate`} title={entry.account_title}>
                                                {entry.account_title || '—'}
                                            </td>
                                            <td className={`${td} text-right font-gmedium`}>
                                                {parseN(entry.transfer_to) > 0
                                                    ? <span className="text-emerald-600 dark:text-emerald-400">{fmtAmt(entry.transfer_to)}</span>
                                                    : <span className="text-muted-foreground/40">—</span>}
                                            </td>
                                            <td className={`${td} text-right font-gmedium`}>
                                                {parseN(entry.transfer_from) > 0
                                                    ? <span className="text-red-600 dark:text-red-400">{fmtAmt(entry.transfer_from)}</span>
                                                    : <span className="text-muted-foreground/40">—</span>}
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {showArchived ? (
                                                        <button
                                                            onClick={async () => {
                                                                setBulkLoading(true)
                                                                try { await efasApi.post('realignment/bulk-action/', { action: 'restore', ids: [entry.id] }); fetchAll() }
                                                                catch { /* silent */ } finally { setBulkLoading(false) }
                                                            }}
                                                            className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition"
                                                            title="Restore"
                                                        >
                                                            <ArchiveRestore size={12} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => { setEditEntry(entry); setShowDialog(true) }}
                                                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                                                                title="Edit"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setBulkLoading(true)
                                                                    try { await efasApi.post('realignment/bulk-action/', { action: 'archive', ids: [entry.id] }); fetchAll() }
                                                                    catch { /* silent */ } finally { setBulkLoading(false) }
                                                                }}
                                                                className="p-1 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition"
                                                                title="Archive"
                                                            >
                                                                <Archive size={12} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteId(entry.id)}
                                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                })}

                                {/* Grand totals row */}
                                {!showArchived && (
                                    <tr className="bg-muted/50 border-t-2 border-border">
                                        <td />
                                        <td colSpan={8} className="px-3 py-2 text-xs font-gbold text-foreground uppercase tracking-wide">
                                            Total ({filtered.length} {filtered.length === 1 ? 'entry' : 'entries'})
                                        </td>
                                        <td className="px-3 py-2 text-right font-gbold text-sm text-emerald-600 dark:text-emerald-400">
                                            {totalTo > 0 ? fmtAmt(String(totalTo)) : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-gbold text-sm text-red-600 dark:text-red-400">
                                            {totalFrom > 0 ? fmtAmt(String(totalFrom)) : '—'}
                                        </td>
                                        <td />
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
                        <h3 className="font-gbold text-foreground">
                            {deleteId === -1 ? `Delete ${selectedIds.size} Entr${selectedIds.size !== 1 ? 'ies' : 'y'}?` : 'Delete Entry?'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {deleteId === -1
                                ? `${selectedIds.size} realignment entr${selectedIds.size !== 1 ? 'ies' : 'y'} will be permanently removed.`
                                : 'This realignment entry will be permanently removed.'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteId(null)}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteId === -1) {
                                        handleBulkAction('delete').then(() => setDeleteId(null))
                                    } else {
                                        handleDelete(deleteId)
                                    }
                                }}
                                className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition font-gmedium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import */}
            {showBulkImport && (
                <BulkImportRealignmentDialog
                    onClose={() => setShowBulkImport(false)}
                    onDone={fetchAll}
                />
            )}

            {/* Add / Edit dialog */}
            {showDialog && (
                <AddEditRealignmentDialog
                    entry={editEntry}
                    saros={saros}
                    onClose={() => setShowDialog(false)}
                    onSaved={fetchAll}
                />
            )}
        </div>
    )
}
