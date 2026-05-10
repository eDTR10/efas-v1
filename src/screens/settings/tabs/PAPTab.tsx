import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ClipboardList, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import efasApi from '@/plugin/axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PAP {
    id: number
    pap_code: string
    pap_name: string
    created_at: string
}

interface BulkRow {
    pap_code: string
    pap_name: string
    status: 'pending' | 'success' | 'error'
    error?: string
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
const rowInp = 'w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`bg-card border border-border rounded-xl w-full ${maxWidth} shadow-2xl max-h-[90vh] flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h3 className="font-gbold text-foreground text-base">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={16} />
                    </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto">{children}</div>
            </div>
        </div>
    )
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────

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
            // Support tab-separated (Excel/Sheets) and comma-separated
            const cols = line.includes('\t') ? line.split('\t') : line.split(',')
            const pap_code = (cols[0] ?? '').trim()
            const pap_name = (cols[1] ?? '').trim()
            if (!pap_code && !pap_name) continue
            // Skip header row
            if (pap_code.toLowerCase() === 'pap code' || pap_code.toLowerCase() === 'pap_code') continue
            result.push({ pap_code, pap_name, status: 'pending' })
        }
        setRows(result)
        setParsed(true)
    }

    const updateRow = (idx: number, field: 'pap_code' | 'pap_name', val: string) => {
        setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val, status: 'pending', error: undefined } : r))
    }

    const removeRow = (idx: number) => setRows(p => p.filter((_, i) => i !== idx))

    const handleImport = async () => {
        setImporting(true)
        const updated = [...rows]
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'success') continue
            try {
                await efasApi.post('pap/', {
                    pap_code: updated[i].pap_code.trim(),
                    pap_name: updated[i].pap_name.trim(),
                })
                updated[i] = { ...updated[i], status: 'success', error: undefined }
            } catch (err: unknown) {
                const data = (err as { response?: { data?: { pap_code?: string[]; pap_name?: string[]; detail?: string; non_field_errors?: string[] } } })?.response?.data
                const msg = data?.pap_code?.[0] ?? data?.pap_name?.[0] ?? data?.detail ?? data?.non_field_errors?.[0] ?? 'Failed'
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
        <Modal title="Bulk Import PAP" onClose={onClose} maxWidth="max-w-2xl">
            {!parsed ? (
                <div className="flex flex-col gap-4">
                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">How to paste:</strong> Copy two columns from Excel or Google Sheets —
                        column 1 = <strong>PAP Code</strong>, column 2 = <strong>PAP Name</strong>.
                        The header row will be skipped automatically.
                    </div>
                    <textarea
                        autoFocus
                        rows={10}
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder={"PAP Code\tPAP Name\nPAP-001\tPersonal Services\nPAP-002\tMOOE"}
                        className="w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!rawText.trim()}
                            onClick={parseRows}
                            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50 font-gmedium"
                        >
                            Preview ({rawText.trim().split('\n').filter(l => l.trim()).length} rows)
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Summary bar */}
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
                                    <th className="px-3 py-2 text-left">PAP Code</th>
                                    <th className="px-3 py-2 text-left">PAP Name</th>
                                    <th className="px-3 py-2 text-left w-24">Status</th>
                                    <th className="px-3 py-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx} className={`border-b border-border last:border-0 ${row.status === 'success' ? 'bg-green-50 dark:bg-green-950/20' :
                                        row.status === 'error' ? 'bg-destructive/5' : ''
                                        }`}>
                                        <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                                        <td className="px-3 py-1.5">
                                            <input
                                                value={row.pap_code}
                                                onChange={e => updateRow(idx, 'pap_code', e.target.value)}
                                                disabled={row.status === 'success' || importing}
                                                className={`${rowInp} w-28`}
                                            />
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <input
                                                value={row.pap_name}
                                                onChange={e => updateRow(idx, 'pap_name', e.target.value)}
                                                disabled={row.status === 'success' || importing}
                                                className={`${rowInp} w-56`}
                                            />
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
                                                <button onClick={() => removeRow(idx)}
                                                    className="p-1 text-muted-foreground hover:text-destructive rounded transition">
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center">
                        <button type="button" onClick={() => { setParsed(false); setDone(false) }}
                            disabled={importing}
                            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition disabled:opacity-50">
                            ← Back to paste
                        </button>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                {done ? 'Close' : 'Cancel'}
                            </button>
                            {pendingCount > 0 && (
                                <button type="button" onClick={handleImport} disabled={importing || rows.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 font-gmedium">
                                    {importing && <Loader2 size={14} className="animate-spin" />}
                                    {importing ? `Importing...` : `Import ${pendingCount} row${pendingCount !== 1 ? 's' : ''}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PAPTab() {
    const [items, setItems] = useState<PAP[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [editItem, setEditItem] = useState<PAP | null>(null)
    const [form, setForm] = useState({ pap_code: '', pap_name: '' })
    const [saving, setSaving] = useState(false)
    const [codeError, setCodeError] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const res = await efasApi.get('pap/')
            setItems(res.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const openAdd = () => {
        setForm({ pap_code: '', pap_name: '' })
        setCodeError('')
        setEditItem(null)
        setShowModal(true)
    }

    const openEdit = (item: PAP) => {
        setForm({ pap_code: item.pap_code, pap_name: item.pap_name })
        setCodeError('')
        setEditItem(item)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCodeError('')
        setSaving(true)
        try {
            const payload = {
                pap_code: form.pap_code.trim(),
                pap_name: form.pap_name.trim(),
            }
            if (editItem) {
                await efasApi.patch(`pap/${editItem.id}/`, payload)
            } else {
                await efasApi.post('pap/', payload)
            }
            fetchAll()
            setShowModal(false)
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { pap_code?: string[] } } })?.response?.data
            if (data?.pap_code) setCodeError(data.pap_code[0])
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this PAP?')) return
        await efasApi.delete(`pap/${id}/`)
        fetchAll()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Manage PAP (Program / Activity / Project) codes.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBulk(true)}
                        className="flex items-center gap-2 border border-border hover:bg-muted text-foreground text-sm font-gmedium px-3 py-2 rounded-lg transition"
                    >
                        <ClipboardList size={15} /> Bulk Import
                    </button>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition"
                    >
                        <Plus size={15} /> Add PAP
                    </button>
                </div>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p>
                ) : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No PAP codes yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                                <th className="px-4 py-3 text-left">PAP Code</th>
                                <th className="px-4 py-3 text-left">PAP Name</th>
                                <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                    <td className="px-4 py-3 font-gmedium text-foreground">{item.pap_code}</td>
                                    <td className="px-4 py-3 text-foreground">{item.pap_name}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showBulk && (
                <BulkImportModal onClose={() => setShowBulk(false)} onDone={fetchAll} />
            )}

            {showModal && (
                <Modal title={editItem ? 'Edit PAP' : 'Add PAP'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">
                                PAP Code <span className="text-destructive">*</span>
                            </label>
                            <input
                                required
                                value={form.pap_code}
                                onChange={e => { setForm(p => ({ ...p, pap_code: e.target.value })); setCodeError('') }}
                                placeholder="e.g. PAP-001"
                                className={`${inp} ${codeError ? 'border-destructive focus:ring-destructive' : ''}`}
                            />
                            {codeError && <p className="text-destructive text-xs">{codeError}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">
                                PAP Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                required
                                value={form.pap_name}
                                onChange={e => setForm(p => ({ ...p, pap_name: e.target.value }))}
                                placeholder="Program / Activity / Project name"
                                className={inp}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving}
                                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                                {saving ? 'Saving...' : editItem ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
