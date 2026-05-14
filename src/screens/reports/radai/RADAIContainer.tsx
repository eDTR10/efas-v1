import {  useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, FileSpreadsheet } from 'lucide-react'
import type { RadaiEntry } from '../types'
import AddRadaiDialog from './AddRadaiDialog'
import EditRadaiDialog from './EditRadaiDialog'
import { generateRadaiReport } from '../reportGenerator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
    catch { return d }
}

function fmtPHP(val: string | number | null) {
    if (val === null || val === undefined || val === '') return '—'
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''))
    if (isNaN(n)) return '—'
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// localStorage persistence (no backend required for reports)
const STORAGE_KEY = 'efas_radai_entries'

function loadEntries(): RadaiEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function saveEntries(entries: RadaiEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

let _nextId = (() => {
    const entries = loadEntries()
    return entries.length ? Math.max(...entries.map(e => e.id)) + 1 : 1
})()

function nextId() { return _nextId++ }

const inpSm = 'rounded-lg border border-border bg-background text-foreground text-xs font-gmedium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary transition'

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RADAIContainer() {
    const [entries, setEntries] = useState<RadaiEntry[]>(loadEntries)
    const [search, setSearch] = useState('')
    const [filterPeriod, setFilterPeriod] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [editTarget, setEditTarget] = useState<RadaiEntry | null>(null)

    const tableRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    const onDragStart = (e: React.MouseEvent) => { isDragging.current = true; dragStartX.current = e.clientX; scrollStartX.current = tableRef.current?.scrollLeft ?? 0 }
    const onDragMove = (e: React.MouseEvent) => { if (!isDragging.current || !tableRef.current) return; tableRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current) }
    const onDragEnd = () => { isDragging.current = false }

    const persist = (updated: RadaiEntry[]) => { setEntries(updated); saveEntries(updated) }

    const handleAdd = (e: RadaiEntry) => {
        persist([...entries, { ...e, id: nextId() }])
        setShowAdd(false)
    }

    const handleEdit = (updated: RadaiEntry) => {
        persist(entries.map(e => e.id === updated.id ? updated : e))
        setEditTarget(null)
    }

    const handleDelete = (id: number) => {
        if (!window.confirm('Delete this RADAI entry?')) return
        persist(entries.filter(e => e.id !== id))
    }

    // unique period options
    const periods = [...new Set(entries.map(e => e.period_covered).filter(Boolean))].sort()

    const q = search.toLowerCase()
    const filtered = entries.filter(e => {
        if (filterPeriod && e.period_covered !== filterPeriod) return false
        if (q && !(
            e.serial_no.toLowerCase().includes(q) ||
            e.dv_payroll_no.toLowerCase().includes(q) ||
            e.payee.toLowerCase().includes(q) ||
            e.nature_of_payment.toLowerCase().includes(q) ||
            e.uacs_object_code.toLowerCase().includes(q)
        )) return false
        return true
    })

    const total = filtered.reduce((s, e) => s + parseFloat(String(e.amount).replace(/,/g, '') || '0'), 0)

    const hasFilter = search || filterPeriod
    const clearFilters = () => { setSearch(''); setFilterPeriod('') }

    const handleGenerate = async () => {
        if (filtered.length === 0) { alert('No entries to generate a report for.'); return }
        await generateRadaiReport(filtered, filterPeriod || filtered[0]?.period_covered || '')
    }

    return (
        <>
            {/* ── Summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryCard label="Total Entries" value={String(filtered.length)} />
                <SummaryCard label="Total Amount" value={`₱${fmtPHP(total)}`} accent="text-green-600 dark:text-green-400" />
                <SummaryCard label="Periods" value={String(periods.length)} />
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input className={inpSm + ' pl-7 w-52'} placeholder="Search serial, DV#, payee…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className={inpSm}>
                        <option value="">All Periods</option>
                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {hasFilter && (
                        <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerate}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-gmedium hover:bg-primary/10 transition"
                    >
                        <FileSpreadsheet size={15} /> Generate Report
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition"
                    >
                        <Plus size={15} /> Add Entry
                    </button>
                </div>
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
                <table className="w-full text-sm min-w-[1100px]">
                    <thead>
                        <tr className="bg-muted/60 text-left">
                            <Th>No.</Th>
                            <Th>Date</Th>
                            <Th>Serial No.</Th>
                            <Th>DV / Payroll No.</Th>
                            <Th>ORS / BURS No.</Th>
                            <Th>RC Code</Th>
                            <Th>Payee</Th>
                            <Th>UACS Object Code</Th>
                            <Th>Nature of Payment</Th>
                            <Th right>Amount</Th>
                            <Th>Period Covered</Th>
                            <Th>Actions</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="text-center py-10 text-muted-foreground text-sm">
                                    {hasFilter ? 'No entries match the current filters.' : 'No RADAI entries yet. Click "Add Entry" to begin.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((e, idx) => (
                                <tr key={e.id} className="border-t border-border hover:bg-muted/30 transition">
                                    <Td>{idx + 1}</Td>
                                    <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                                    <Td className="font-gmedium whitespace-nowrap">{e.serial_no}</Td>
                                    <Td className="whitespace-nowrap">{e.dv_payroll_no}</Td>
                                    <Td className="whitespace-nowrap">{e.ors_burs_no}</Td>
                                    <Td>{e.responsibility_center_code || '—'}</Td>
                                    <Td className="max-w-[160px]">
                                        <span className="line-clamp-2 text-xs" title={e.payee}>{e.payee}</span>
                                    </Td>
                                    <Td className="font-mono text-xs whitespace-nowrap">{e.uacs_object_code}</Td>
                                    <Td className="max-w-[220px]">
                                        <span className="line-clamp-2 text-xs" title={e.nature_of_payment}>{e.nature_of_payment}</span>
                                    </Td>
                                    <Td right className="font-gmedium whitespace-nowrap">{fmtPHP(e.amount)}</Td>
                                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{e.period_covered}</Td>
                                    <Td>
                                        <div className="flex items-center gap-1.5">
                                            <ActionBtn title="Edit" onClick={() => setEditTarget(e)}>
                                                <Pencil size={13} />
                                            </ActionBtn>
                                            <ActionBtn title="Delete" danger onClick={() => handleDelete(e.id)}>
                                                <Trash2 size={13} />
                                            </ActionBtn>
                                        </div>
                                    </Td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {filtered.length > 0 && (
                        <tfoot>
                            <tr className="border-t-2 border-border bg-muted/30">
                                <td colSpan={9} className="px-4 py-3 text-xs font-gsemibold text-right text-muted-foreground uppercase tracking-wide">Total</td>
                                <td className="px-4 py-3 text-sm font-gbold text-right text-foreground whitespace-nowrap">₱{fmtPHP(total)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {showAdd && <AddRadaiDialog onClose={() => setShowAdd(false)} onSave={handleAdd} />}
            {editTarget && <EditRadaiDialog entry={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
        </>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground font-gmedium">{label}</p>
            <p className={`text-lg font-gbold mt-1 ${accent ?? 'text-foreground'}`}>{value}</p>
        </div>
    )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return <th className={`px-4 py-3 text-xs font-gsemibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${right ? 'text-right' : ''}`}>{children}</th>
}

function Td({ children, right, className, title }: { children: React.ReactNode; right?: boolean; className?: string; title?: string }) {
    return <td className={`px-4 py-3 text-sm text-foreground ${right ? 'text-right' : ''} ${className ?? ''}`} title={title}>{children}</td>
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
    return (
        <button
            title={title}
            onClick={onClick}
            className={`p-1.5 rounded transition ${danger ? 'hover:bg-destructive/10 text-destructive' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
        >
            {children}
        </button>
    )
}
