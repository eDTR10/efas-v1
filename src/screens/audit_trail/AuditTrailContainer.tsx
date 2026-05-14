import { useEffect, useState, useCallback } from 'react'
import {
    ClipboardList, RefreshCw, Search, ChevronLeft, ChevronRight,
    Trash2, Eye, ShieldCheck, ShieldAlert, ShieldX, LogIn, LogOut,
    Upload, Filter, X,
} from 'lucide-react'
import efasApi from '@/plugin/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
    id: number
    timestamp: string
    user: number | null
    user_email: string | null
    user_full_name: string | null
    action: string
    resource: string
    object_id: string
    object_repr: string
    details: Record<string, unknown>
    ip_address: string | null
}

interface StatsData {
    by_action: { action: string; count: number }[]
    by_resource: { resource: string; count: number }[]
    recent: AuditLog[]
}

interface ListResponse {
    count: number
    page: number
    page_size: number
    results: AuditLog[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    CREATE: { label: 'Create', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', Icon: ShieldCheck },
    UPDATE: { label: 'Update', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', Icon: ShieldAlert },
    DELETE: { label: 'Delete', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', Icon: ShieldX },
    VIEW: { label: 'View', color: 'text-muted-foreground', bg: 'bg-muted/60', Icon: Eye },
    LOGIN: { label: 'Login', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', Icon: LogIn },
    LOGOUT: { label: 'Logout', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', Icon: LogOut },
    IMPORT: { label: 'Import', color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', Icon: Upload },
}

function ActionBadge({ action }: { action: string }) {
    const m = ACTION_META[action] ?? { label: action, color: 'text-foreground', bg: 'bg-muted', Icon: ClipboardList }
    const Icon = m.Icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-gmedium ${m.bg} ${m.color}`}>
            <Icon size={11} />{m.label}
        </span>
    )
}

function fmtTs(ts: string) {
    const d = new Date(ts)
    return d.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditTrailContainer() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)

    // Filters
    const [search, setSearch] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [filterResource, setFilterResource] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    // Detail panel
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

    // Clear confirm
    const [clearConfirm, setClearConfirm] = useState(false)
    const [clearing, setClearing] = useState(false)

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string | number> = { page, page_size: pageSize }
            if (search) params.search = search
            if (filterAction) params.action = filterAction
            if (filterResource) params.resource = filterResource
            if (dateFrom) params.date_from = dateFrom
            if (dateTo) params.date_to = dateTo
            const res = await efasApi.get<ListResponse>('audit-trail/', { params })
            setLogs(res.data.results)
            setTotal(res.data.count)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, search, filterAction, filterResource, dateFrom, dateTo])

    const fetchStats = async () => {
        try {
            const res = await efasApi.get<StatsData>('audit-trail/stats/')
            setStats(res.data)
        } catch { /* ignore */ }
    }

    useEffect(() => { fetchLogs(); fetchStats() }, [fetchLogs])

    // ── Reset page when filters change ─────────────────────────────────────────
    useEffect(() => { setPage(1) }, [search, filterAction, filterResource, dateFrom, dateTo])

    // ── Clear all ──────────────────────────────────────────────────────────────

    const handleClear = async () => {
        setClearing(true)
        try {
            await efasApi.delete('audit-trail/clear/')
            setClearConfirm(false)
            fetchLogs()
            fetchStats()
        } finally {
            setClearing(false)
        }
    }

    // ── Computed ───────────────────────────────────────────────────────────────

    const totalPages = Math.ceil(total / pageSize) || 1
    const allActions = Object.keys(ACTION_META)
    const allResources = stats ? stats.by_resource.map(r => r.resource) : []

    const activeFilters = [filterAction, filterResource, dateFrom, dateTo].filter(Boolean).length

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <ClipboardList size={22} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-gbold text-foreground leading-tight">Audit Trail</h1>
                        <p className="text-sm text-muted-foreground">System activity log — all CRUD events</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { fetchLogs(); fetchStats() }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button onClick={() => setClearConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 transition font-gmedium"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.by_action.slice(0, 4).map(a => {
                        const m = ACTION_META[a.action] ?? { label: a.action, bg: 'bg-muted', color: 'text-foreground', Icon: ClipboardList }
                        const Icon = m.Icon
                        return (
                            <div key={a.action} className={`rounded-xl border border-border px-4 py-3 flex items-center gap-3 ${m.bg}`}>
                                <Icon size={20} className={m.color} />
                                <div>
                                    <p className={`text-xs font-gmedium uppercase tracking-wide ${m.color}`}>{m.label}</p>
                                    <p className="text-2xl font-gbold text-foreground">{a.count.toLocaleString()}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search user, resource, object…"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Filter toggle */}
                <button
                    onClick={() => setShowFilters(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition font-gmedium ${showFilters || activeFilters > 0
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                >
                    <Filter size={14} /> Filters {activeFilters > 0 && `(${activeFilters})`}
                </button>

                {/* Page size */}
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="text-sm rounded-lg border border-border bg-background text-foreground px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition"
                >
                    {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} per page</option>)}
                </select>

                <span className="text-sm text-muted-foreground ml-auto">
                    {total.toLocaleString()} log{total !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 border border-border rounded-xl p-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Action</label>
                        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                            className="text-sm rounded-lg border border-border bg-background text-foreground px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition">
                            <option value="">All actions</option>
                            {allActions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Resource</label>
                        <select value={filterResource} onChange={e => setFilterResource(e.target.value)}
                            className="text-sm rounded-lg border border-border bg-background text-foreground px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition">
                            <option value="">All resources</option>
                            {allResources.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="text-sm rounded-lg border border-border bg-background text-foreground px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="text-sm rounded-lg border border-border bg-background text-foreground px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition" />
                    </div>
                    {activeFilters > 0 && (
                        <button onClick={() => { setFilterAction(''); setFilterResource(''); setDateFrom(''); setDateTo('') }}
                            className="col-span-full text-xs text-destructive hover:underline text-left">
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Table + Detail panel */}
            <div className="flex gap-4 items-start">
                {/* Table */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="min-w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-primary text-white">
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">#</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">Timestamp</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">User</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">Action</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">Resource</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">Object</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">IP Address</th>
                                    <th className="px-4 py-3 text-left text-sm font-gmedium whitespace-nowrap">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
                                ) : logs.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-muted-foreground">No audit logs found.</td></tr>
                                ) : logs.map((log, idx) => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/30 ${selectedLog?.id === log.id ? 'bg-primary/10' : idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                            }`}
                                    >
                                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">{fmtTs(log.timestamp)}</td>
                                        <td className="px-4 py-2.5 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-gmedium text-foreground truncate max-w-[160px]">{log.user_full_name || '—'}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[160px]">{log.user_email || 'anonymous'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm"><ActionBadge action={log.action} /></td>
                                        <td className="px-4 py-2.5 text-sm">
                                            <span className="bg-muted px-2 py-0.5 rounded text-xs font-gmedium text-foreground">{log.resource}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-gmedium text-foreground truncate max-w-[180px]">{log.object_repr || '—'}</span>
                                                {log.object_id && <span className="text-xs text-muted-foreground">#{log.object_id}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{log.ip_address || '—'}</td>
                                        <td className="px-4 py-2.5 text-sm">
                                            {Object.keys(log.details).length > 0
                                                ? <span className="text-xs text-muted-foreground italic">{Object.keys(log.details).length} field{Object.keys(log.details).length !== 1 ? 's' : ''}</span>
                                                : <span className="text-muted-foreground/40">—</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && total > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total.toLocaleString()} logs
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(1)} disabled={page === 1}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">«</button>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="px-3 text-xs">Page {page} of {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40">
                                    <ChevronRight size={14} />
                                </button>
                                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-border hover:bg-muted transition disabled:opacity-40 text-xs font-gmedium">»</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                {selectedLog && (
                    <div className="w-80 shrink-0 border border-border rounded-xl bg-card flex flex-col overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
                            <p className="text-sm font-gbold text-foreground">Log Details</p>
                            <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground transition">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto max-h-[70vh] text-sm">
                            {/* Action + Timestamp */}
                            <div className="flex items-center justify-between gap-2">
                                <ActionBadge action={selectedLog.action} />
                                <span className="text-xs text-muted-foreground font-mono">{fmtTs(selectedLog.timestamp)}</span>
                            </div>

                            {/* User */}
                            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">User</p>
                                    <p className="font-gsemibold text-foreground">{selectedLog.user_full_name || 'Anonymous'}</p>
                                    {selectedLog.user_email && <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>}
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">IP Address</p>
                                    <p className="font-mono text-xs text-foreground">{selectedLog.ip_address || '—'}</p>
                                </div>
                            </div>

                            {/* Resource + Object */}
                            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Resource</p>
                                    <span className="bg-muted px-2 py-0.5 rounded text-xs font-gmedium text-foreground">{selectedLog.resource}</span>
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Object ID</p>
                                    <p className="font-mono text-xs text-foreground">#{selectedLog.object_id || '—'}</p>
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Object</p>
                                    <p className="font-gsemibold text-foreground break-all">{selectedLog.object_repr || '—'}</p>
                                </div>
                            </div>

                            {/* Details JSON */}
                            {Object.keys(selectedLog.details).length > 0 && (
                                <div>
                                    <p className="text-[10px] font-gmedium text-muted-foreground uppercase tracking-wide mb-2">Details</p>
                                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                                        {Object.entries(selectedLog.details).map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-2 py-0.5 text-xs">
                                                <span className="text-muted-foreground shrink-0">{k}</span>
                                                <span className="font-mono text-foreground text-right break-all">
                                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Log ID */}
                            <p className="text-[10px] text-muted-foreground/50 text-right">Log ID: {selectedLog.id}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Clear confirmation modal */}
            {clearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Trash2 size={22} className="text-destructive shrink-0" />
                            <div>
                                <p className="font-gbold text-foreground">Clear all audit logs?</p>
                                <p className="text-sm text-muted-foreground">This action cannot be undone. All {total.toLocaleString()} log{total !== 1 ? 's' : ''} will be permanently deleted.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setClearConfirm(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                                Cancel
                            </button>
                            <button onClick={handleClear} disabled={clearing}
                                className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition disabled:opacity-60 font-gmedium">
                                {clearing ? 'Clearing…' : 'Yes, Clear All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
