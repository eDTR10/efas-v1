import { useEffect, useState } from 'react'
import efasApi from '@/plugin/efasApi'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'

function StubPage({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-gbold text-foreground">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
            <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center text-muted-foreground text-sm">
                This section is under development.
            </div>
        </div>
    )
}

export function NTCAPage() {
    return <StubPage title="NTCA" description="Notice of Transfer of Cash Allocation management." />
}

export function DisbursementPage() {
    return <StubPage title="Disbursement" description="Disbursement vouchers and payment records." />
}

export function SettingsPage() {
    return <StubPage title="Settings" description="System configuration and user preferences." />
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

interface AuditLogEntry {
    id: number
    action: 'CREATE' | 'UPDATE' | 'DELETE'
    model_name: string
    object_id: string
    object_repr: string
    changes: Record<string, unknown>
    performed_by: number | null
    performed_by_name: string
    timestamp: string
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function ChangesCell({ changes }: { changes: Record<string, unknown> }) {
    const [open, setOpen] = useState(false)
    if (!changes || Object.keys(changes).length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>
    }
    const keys = Object.keys(changes)
    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {keys.length} field{keys.length !== 1 ? 's' : ''}
            </button>
            {open && (
                <div className="mt-1 space-y-1">
                    {keys.map(k => {
                        const val = changes[k] as { before?: unknown; after?: unknown } | undefined
                        if (val && typeof val === 'object' && 'before' in val) {
                            return (
                                <div key={k} className="text-xs">
                                    <span className="font-gmedium text-foreground">{k}: </span>
                                    <span className="line-through text-red-500">{String(val.before ?? '')}</span>
                                    {' → '}
                                    <span className="text-green-600 dark:text-green-400">{String(val.after ?? '')}</span>
                                </div>
                            )
                        }
                        return (
                            <div key={k} className="text-xs">
                                <span className="font-gmedium">{k}:</span> {JSON.stringify(val)}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export function AuditTrailPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterAction, setFilterAction] = useState<string>('ALL')

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params: Record<string, string> = {}
            if (search) params.search = search
            const res = await efasApi.get('saro/audit-logs/', { params })
            setLogs(res.data.results ?? res.data)
        } catch {
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const filtered = logs.filter(l =>
        filterAction === 'ALL' || l.action === filterAction
    )

    const fmt = (ts: string) =>
        new Date(ts).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">Audit Trail</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">All system activity — creates, updates, and deletes.</p>
                </div>
                <Button size="sm" variant="outline" onClick={fetchLogs} className="gap-1.5">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search model, object, user..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                        className="pl-8 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {(['ALL', 'CREATE', 'UPDATE', 'DELETE'] as const).map(a => (
                        <button
                            key={a}
                            onClick={() => setFilterAction(a)}
                            className={`px-3 py-1 rounded-full text-xs font-gmedium border transition-colors ${filterAction === a
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-muted-foreground border-border hover:border-primary'
                                }`}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Timestamp</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Action</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Model</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Object</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Changes</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Performed By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                                        No audit log entries found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(log => (
                                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-gregular">
                                            {fmt(log.timestamp)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-gmedium ${ACTION_COLORS[log.action]}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-gmedium text-foreground">
                                            {log.model_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-foreground max-w-[200px] truncate" title={log.object_repr}>
                                            {log.object_repr}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ChangesCell changes={log.changes} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {log.performed_by_name}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

