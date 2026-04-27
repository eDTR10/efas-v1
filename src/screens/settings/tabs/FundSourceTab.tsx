import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

interface FundSource { id: number; code: string; name: string; is_sagf: boolean; sagf_type: string | null }

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

export default function FundSourceTab() {
    const [items, setItems] = useState<FundSource[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<FundSource | null>(null)
    const [form, setForm] = useState({ code: '', name: '', is_sagf: false, sagf_type: '' })
    const [saving, setSaving] = useState(false)
    const [codeError, setCodeError] = useState('')

    const fetchItems = async () => {
        setLoading(true)
        try { const r = await efasApi.get('saro/fund-sources/'); setItems(r.data) }
        finally { setLoading(false) }
    }
    useEffect(() => { fetchItems() }, [])

    const openAdd = () => {
        setForm({ code: '', name: '', is_sagf: false, sagf_type: '' })
        setCodeError('')
        setEditItem(null)
        setShowAdd(true)
    }
    const openEdit = (item: FundSource) => {
        setForm({ code: item.code, name: item.name, is_sagf: item.is_sagf, sagf_type: item.sagf_type || '' })
        setCodeError('')
        setEditItem(item)
        setShowAdd(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCodeError('')
        const duplicate = items.find(
            i => i.code.trim().toLowerCase() === form.code.trim().toLowerCase() && i.id !== editItem?.id
        )
        if (duplicate) {
            setCodeError(`Fund Source code "${form.code}" already exists.`)
            return
        }
        setSaving(true)
        try {
            const payload = {
                code: form.code, name: form.name, is_sagf: form.is_sagf,
                sagf_type: form.is_sagf ? form.sagf_type : null,
            }
            if (editItem) await efasApi.patch(`saro/fund-sources/${editItem.id}/`, payload)
            else await efasApi.post('saro/fund-sources/', payload)
            fetchItems(); setShowAdd(false)
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { code?: string[] } } })?.response?.data
            if (data?.code) setCodeError(data.code[0])
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this fund source?')) return
        await efasApi.delete(`saro/fund-sources/${id}/`); fetchItems()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage Fund Sources.</p>
                <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition">
                    <Plus size={15} /> Add
                </button>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p> : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No fund sources yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">SAGF?</th>
                            <th className="px-4 py-3 text-left">SAGF Type</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody>{items.map(item => (
                            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                <td className="px-4 py-3 font-gmedium text-foreground">{item.code}</td>
                                <td className="px-4 py-3 text-foreground">{item.name}</td>
                                <td className="px-4 py-3 text-foreground">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-gmedium ${item.is_sagf ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{item.is_sagf ? 'Yes' : 'No'}</span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">{item.sagf_type || '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>

            {showAdd && (
                <Modal title={editItem ? 'Edit Fund Source' : 'Add Fund Source'} onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Code <span className="text-destructive">*</span></label>
                            <input
                                required
                                value={form.code}
                                onChange={e => { setForm(p => ({ ...p, code: e.target.value })); setCodeError('') }}
                                className={`${inp} ${codeError ? 'border-destructive focus:ring-destructive' : ''}`}
                            />
                            {codeError && <p className="text-destructive text-xs">{codeError}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Name <span className="text-destructive">*</span></label>
                            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={form.is_sagf} onChange={e => setForm(p => ({ ...p, is_sagf: e.target.checked, sagf_type: '' }))} className="w-4 h-4 rounded border-input accent-primary" />
                            <span className="text-sm font-gmedium text-foreground">Is SAGF?</span>
                        </label>
                        {form.is_sagf && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">SAGF Type <span className="text-destructive">*</span></label>
                                <select required value={form.sagf_type} onChange={e => setForm(p => ({ ...p, sagf_type: e.target.value }))} className={inp}>
                                    <option value="">— Select —</option>
                                    <option value="continuing">Continuing</option>
                                    <option value="automatic">Automatic</option>
                                </select>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">{saving ? 'Saving...' : (editItem ? 'Update' : 'Add')}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
