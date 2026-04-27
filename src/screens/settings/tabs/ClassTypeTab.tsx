import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

interface ClassType { id: number; code: string; name: string; money_range_min: string | null; money_range_max: string | null }

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

export default function ClassTypeTab() {
    const [items, setItems] = useState<ClassType[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<ClassType | null>(null)
    const [form, setForm] = useState({ code: '', name: '', money_range_min: '', money_range_max: '' })
    const [saving, setSaving] = useState(false)
    const [codeError, setCodeError] = useState('')

    const fetchItems = async () => {
        setLoading(true)
        try { const r = await efasApi.get('saro/class-types/'); setItems(r.data) }
        finally { setLoading(false) }
    }
    useEffect(() => { fetchItems() }, [])

    const openAdd = () => {
        setForm({ code: '', name: '', money_range_min: '', money_range_max: '' })
        setCodeError('')
        setEditItem(null)
        setShowAdd(true)
    }
    const openEdit = (item: ClassType) => {
        setForm({ code: item.code, name: item.name, money_range_min: item.money_range_min || '', money_range_max: item.money_range_max || '' })
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
            setCodeError(`Class Type code "${form.code}" already exists.`)
            return
        }
        setSaving(true)
        try {
            const payload = {
                code: form.code, name: form.name,
                money_range_min: form.money_range_min || null,
                money_range_max: form.money_range_max || null,
            }
            if (editItem) await efasApi.patch(`saro/class-types/${editItem.id}/`, payload)
            else await efasApi.post('saro/class-types/', payload)
            fetchItems(); setShowAdd(false)
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { code?: string[] } } })?.response?.data
            if (data?.code) setCodeError(data.code[0])
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this class type?')) return
        await efasApi.delete(`saro/class-types/${id}/`); fetchItems()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage Class Types (e.g. 01-PS, 02-MOOE, 06-CO).</p>
                <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition">
                    <Plus size={15} /> Add
                </button>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p> : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No class types yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Range Min</th>
                            <th className="px-4 py-3 text-left">Range Max</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody>{items.map(item => (
                            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                <td className="px-4 py-3 font-gmedium text-foreground">{item.code}</td>
                                <td className="px-4 py-3 text-foreground">{item.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.money_range_min || '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.money_range_max || '—'}</td>
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
                <Modal title={editItem ? 'Edit Class Type' : 'Add Class Type'} onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Code <span className="text-destructive">*</span></label>
                            <input
                                required
                                value={form.code}
                                placeholder="e.g. 01-PS"
                                onChange={e => { setForm(p => ({ ...p, code: e.target.value })); setCodeError('') }}
                                className={`${inp} ${codeError ? 'border-destructive focus:ring-destructive' : ''}`}
                            />
                            {codeError && <p className="text-destructive text-xs">{codeError}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Name <span className="text-destructive">*</span></label>
                            <input required value={form.name} placeholder="e.g. Personnel Services" onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Range Min</label>
                                <input type="number" step="0.01" value={form.money_range_min} onChange={e => setForm(p => ({ ...p, money_range_min: e.target.value }))} className={inp} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Range Max</label>
                                <input type="number" step="0.01" value={form.money_range_max} onChange={e => setForm(p => ({ ...p, money_range_max: e.target.value }))} className={inp} />
                            </div>
                        </div>
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
