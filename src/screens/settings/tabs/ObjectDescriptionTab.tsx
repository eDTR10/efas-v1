import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import efasApi from '@/plugin/axios'
import { Modal } from './PAPTab'

interface ObjectDescription {
    id: number
    code: string
    description: string
    created_at: string
}

interface BulkRow {
    code: string
    description: string
    status: 'pending' | 'success' | 'error'
    error?: string
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
const rowInp = 'w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

// ─── Bulk Import ─────────────────────────────────────────────────────────────

function BulkImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [rawText, setRawText] = useState('')
    const [rows, setRows] = useState<BulkRow[]>([])
    const [parsed, setParsed] = useState(false)
    const [importing, setImporting] = useState(false)
    const [done, setDone] = useState(false)

    const parseRows = () => {
        const lines = rawText.trim().split('\n').filter(l => l.trim())
        const result: BulkRow[] = []
        for (const line of lines) {
            const cols = line.includes('\t') ? line.split('\t') : line.split(',')
            const code = (cols[0] ?? '').trim()
            const description = (cols[1] ?? '').trim()
            if (!code && !description) continue
            if (code.toLowerCase() === 'code') continue
            result.push({ code, description, status: 'pending' })
        }
        setRows(result)
        setParsed(true)
    }

    const updateRow = (idx: number, field: 'code' | 'description', val: string) => {
        setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val, status: 'pending', error: undefined } : r))
    }

    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'success') continue
            try {
                await efasApi.post('object-description/', { code: updated[i].code.trim(), description: updated[i].description.trim() })
                updated[i] = { ...updated[i], status: 'success', error: undefined }
            } catch (err: unknown) {
                const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
                const msg = data?.code?.[0] ?? data?.description?.[0] ?? data?.detail?.[0] ?? 'Failed'
                updated[i] = { ...updated[i], status: 'error', error: msg }
            }
            setRows([...updated])
        }
        setImporting(false)
        setDone(true)
        onDone()
    }

    const successCount = rows.filter(r => r.status === 'success').length
    const errorCount = rows.filter(r => r.status === 'error').length
    const pendingCount = rows.filter(r => r.status === 'pending').length

    return (
        <Modal title="Bulk Import Object Descriptions" onClose={onClose} maxWidth="max-w-2xl">
            {!parsed ? (
                <div className="flex flex-col gap-4">
                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">How to paste:</strong> Copy two columns from Excel or Google Sheets —
                        column 1 = <strong>Code</strong>, column 2 = <strong>Description</strong>.
                        The header row will be skipped automatically.
                    </div>
                    <textarea
                        autoFocus
                        rows={10}
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder={"Code\tDescription\n5020101000\tTravelling Expenses – Local\n5020201000\tTraining Expenses"}
                        className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">Cancel</button>
                        <button type="button" disabled={!rawText.trim()} onClick={parseRows}
                            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 font-gmedium">
                            Preview ({rawText.trim().split('\n').filter(l => l.trim()).length} rows)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {done && (
                        <div className="flex gap-4 text-sm bg-muted/30 rounded-lg px-4 py-2.5 border border-border">
                            <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 size={14} /> {successCount} saved</span>
                            {errorCount > 0 && <span className="flex items-center gap-1.5 text-destructive"><AlertCircle size={14} /> {errorCount} failed</span>}
                            {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
                        </div>
                    )}
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase">
                                    <th className="px-3 py-2 text-left w-8">#</th>
                                    <th className="px-3 py-2 text-left">Code</th>
                                    <th className="px-3 py-2 text-left">Description</th>
                                    <th className="px-3 py-2 text-left w-24">Status</th>
                                    <th className="px-3 py-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx} className={`border-b border-border last:border-0 ${row.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' : row.status === 'error' ? 'bg-destructive/5' : ''}`}>
                                        <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                                        <td className="px-3 py-1.5"><input value={row.code} onChange={e => updateRow(idx, 'code', e.target.value)} disabled={row.status === 'success' || importing} className={`${rowInp} w-28`} /></td>
                                        <td className="px-3 py-1.5">
                                            <input value={row.description} onChange={e => updateRow(idx, 'description', e.target.value)} disabled={row.status === 'success' || importing} className={`${rowInp} w-56`} />
                                            {row.error && <p className="text-destructive text-xs mt-0.5">{row.error}</p>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {row.status === 'success' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> Saved</span>}
                                            {row.status === 'error' && <span className="flex items-center gap-1 text-destructive"><AlertCircle size={12} /> Error</span>}
                                            {row.status === 'pending' && importing && <Loader2 size={12} className="animate-spin text-primary" />}
                                            {row.status === 'pending' && !importing && <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {row.status !== 'success' && !importing && (
                                                <button onClick={() => removeRow(idx)} className="p-1 text-muted-foreground hover:text-destructive rounded transition"><Trash2 size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center">
                        <button type="button" onClick={() => { setParsed(false); setDone(false) }} disabled={importing}
                            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition disabled:opacity-50">
                            ← Back to paste
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">{done ? 'Close' : 'Cancel'}</button>
                            {pendingCount > 0 && (
                                <button type="button" onClick={handleImport} disabled={importing || rows.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 font-gmedium">
                                    {importing && <Loader2 size={14} className="animate-spin" />}
                                    {importing ? 'Importing...' : `Import ${pendingCount} row${pendingCount !== 1 ? 's' : ''}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ObjectDescriptionTab() {
    const [items, setItems] = useState<ObjectDescription[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [editing, setEditing] = useState<ObjectDescription | null>(null)
    const [form, setForm] = useState({ code: '', description: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const res = await efasApi.get('object-description/')
            setItems(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const openAdd = () => { setEditing(null); setForm({ code: '', description: '' }); setError(''); setShowModal(true) }
    const openEdit = (item: ObjectDescription) => { setEditing(item); setForm({ code: item.code, description: item.description }); setError(''); setShowModal(true) }

    const handleSave = async () => {
        if (!form.code.trim() || !form.description.trim()) { setError('All fields are required.'); return }
        setSaving(true); setError('')
        try {
            if (editing) {
                await efasApi.put(`object-description/${editing.id}/`, form)
            } else {
                await efasApi.post('object-description/', form)
            }
            setShowModal(false)
            load()
        } catch (e: any) {
            setError(e?.response?.data?.code?.[0] || e?.response?.data?.detail || 'Failed to save.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this record?')) return
        await efasApi.delete(`object-description/${id}/`)
        load()
    }

    const filtered = items.filter(i =>
        i.code.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <input
                    className={inp + ' max-w-xs'}
                    placeholder="Search code or description…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                    <button onClick={() => setShowBulk(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-gmedium hover:bg-muted transition">
                        <ClipboardList size={16} /> Bulk Import
                    </button>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-gmedium hover:bg-primary/90 transition">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-gmedium">
                        <tr>
                            <th className="text-left px-4 py-3">#</th>
                            <th className="text-left px-4 py-3">Code</th>
                            <th className="text-left px-4 py-3">Description</th>
                            <th className="text-right px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No records found.</td></tr>
                        ) : filtered.map((item, idx) => (
                            <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition">
                                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                <td className="px-4 py-3 font-gmedium">{item.code}</td>
                                <td className="px-4 py-3">{item.description}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showBulk && <BulkImportModal onClose={() => setShowBulk(false)} onDone={load} />}

            {showModal && (
                <Modal title={editing ? 'Edit Object Description' : 'Add Object Description'} onClose={() => setShowModal(false)}>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Code</label>
                            <input className={inp} placeholder="e.g. 5020101000" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-gmedium text-muted-foreground uppercase tracking-wide">Description</label>
                            <input className={inp} placeholder="e.g. Travelling Expenses – Local" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-gmedium hover:bg-primary/90 transition disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
