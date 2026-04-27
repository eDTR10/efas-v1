import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

interface FundSource { id: number; code: string; name: string }
interface NTCA {
    id: number
    ntca_no: string
    date_of_ntca: string
    amount: string
    particulars: string
    fund_source: number | null
    fund_source_detail: FundSource | null
    is_archived: boolean
    created_at: string
}

function fmtPHP(val: string) {
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function NTCATab() {
    const [items, setItems] = useState<NTCA[]>([])
    const [fundSources, setFundSources] = useState<FundSource[]>([])
    const [loading, setLoading] = useState(true)
    const [showArchived, setShowArchived] = useState(false)
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<NTCA | null>(null)
    const [form, setForm] = useState({ ntca_no: '', date_of_ntca: '', amount: '', particulars: '', fund_source: '' })
    const [saving, setSaving] = useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [nRes, fsRes] = await Promise.all([
                efasApi.get(`saro/ntcas/?archived=${showArchived}`),
                efasApi.get('saro/fund-sources/'),
            ])
            setItems(nRes.data)
            setFundSources(fsRes.data)
        } finally { setLoading(false) }
    }
    useEffect(() => { fetchAll() }, [showArchived])

    const openAdd = () => {
        setForm({ ntca_no: '', date_of_ntca: '', amount: '', particulars: '', fund_source: '' })
        setEditItem(null)
        setShowAdd(true)
    }
    const openEdit = (n: NTCA) => {
        setForm({
            ntca_no: n.ntca_no,
            date_of_ntca: n.date_of_ntca,
            amount: n.amount,
            particulars: n.particulars,
            fund_source: n.fund_source ? String(n.fund_source) : '',
        })
        setEditItem(n)
        setShowAdd(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            const payload = { ...form, fund_source: form.fund_source || null }
            if (editItem) await efasApi.patch(`saro/ntcas/${editItem.id}/`, payload)
            else await efasApi.post('saro/ntcas/', payload)
            fetchAll(); setShowAdd(false)
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this NTCA record?')) return
        await efasApi.delete(`saro/ntcas/${id}/`); fetchAll()
    }

    const handleArchive = async (n: NTCA) => {
        const action = n.is_archived ? 'unarchive' : 'archive'
        await efasApi.post(`saro/ntcas/${n.id}/${action}/`); fetchAll()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage NTCA records.</p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowArchived(s => !s)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition font-gmedium ${showArchived ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                        <Archive size={13} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                    <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition">
                        <Plus size={15} /> Add NTCA
                    </button>
                </div>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p>
                ) : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No NTCAs found.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                                <th className="px-4 py-3 text-left whitespace-nowrap">NTCA No.</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Amount</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Fund Source</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Particulars</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(n => (
                                <tr key={n.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                    <td className="px-4 py-3 font-gmedium text-foreground whitespace-nowrap">{n.ntca_no}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{n.date_of_ntca}</td>
                                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{fmtPHP(n.amount)}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{n.fund_source_detail ? n.fund_source_detail.code : '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{n.particulars || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-gmedium ${n.is_archived ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/15 text-emerald-600'}`}>
                                            {n.is_archived ? 'Archived' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            {!n.is_archived && (
                                                <button onClick={() => openEdit(n)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                                            )}
                                            <button onClick={() => handleArchive(n)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-amber-500">
                                                {n.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                            </button>
                                            <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAdd && (
                <Modal title={editItem ? 'Edit NTCA' : 'Add NTCA'} onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">NTCA No. <span className="text-destructive">*</span></label>
                                <input required value={form.ntca_no} onChange={e => setForm(p => ({ ...p, ntca_no: e.target.value }))} className={inp} placeholder="e.g. NTCA-2025-001" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Date of NTCA <span className="text-destructive">*</span></label>
                                <input required type="date" value={form.date_of_ntca} onChange={e => setForm(p => ({ ...p, date_of_ntca: e.target.value }))} className={inp} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Amount <span className="text-destructive">*</span></label>
                                <input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inp} placeholder="0.00" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Fund Source</label>
                                <select value={form.fund_source} onChange={e => setForm(p => ({ ...p, fund_source: e.target.value }))} className={inp}>
                                    <option value="">— None —</option>
                                    {fundSources.map(fs => (
                                        <option key={fs.id} value={fs.id}>{fs.code} — {fs.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Particulars</label>
                            <textarea rows={2} value={form.particulars} onChange={e => setForm(p => ({ ...p, particulars: e.target.value }))} className={inp} placeholder="Optional description..." />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">{saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add NTCA'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
