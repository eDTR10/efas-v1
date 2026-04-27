import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

interface ObjectCode {
    id: number
    code: string
    description: string
}

export default function ObjectCodeTab() {
    const [items, setItems] = useState<ObjectCode[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<ObjectCode | null>(null)
    const [form, setForm] = useState({ code: '', description: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const res = await efasApi.get('saro/object-codes/')
            setItems(res.data)
        } finally { setLoading(false) }
    }
    useEffect(() => { fetchAll() }, [])

    const openAdd = () => {
        setForm({ code: '', description: '' })
        setEditItem(null)
        setError('')
        setShowAdd(true)
    }
    const openEdit = (item: ObjectCode) => {
        setForm({ code: item.code, description: item.description })
        setEditItem(item)
        setError('')
        setShowAdd(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            if (editItem) {
                await efasApi.patch(`saro/object-codes/${editItem.id}/`, form)
            } else {
                await efasApi.post('saro/object-codes/', form)
            }
            fetchAll()
            setShowAdd(false)
        } catch (err: any) {
            const data = err?.response?.data
            if (data?.code) setError(Array.isArray(data.code) ? data.code[0] : data.code)
            else setError('Failed to save. Please try again.')
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this object code?')) return
        await efasApi.delete(`saro/object-codes/${id}/`)
        fetchAll()
    }

    const filtered = items.filter(item =>
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search code or description..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`${inp} max-w-xs`}
                />
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-gmedium hover:opacity-90 transition"
                >
                    <Plus size={16} /> Add Object Code
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No object codes found.</div>
            ) : (
                <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-2 font-gmedium w-40">Code</th>
                                <th className="text-left px-4 py-2 font-gmedium">Description</th>
                                <th className="text-right px-4 py-2 font-gmedium w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, i) => (
                                <tr key={item.id} className={i % 2 === 0 ? 'bg-card' : 'bg-background'}>
                                    <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                                    <td className="px-4 py-2 text-foreground">{item.description}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAdd && (
                <Modal onClose={() => setShowAdd(false)} title={editItem ? 'Edit Object Code' : 'Add Object Code'}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-gmedium text-muted-foreground mb-1">Code</label>
                            <input
                                value={form.code}
                                onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                                className={inp}
                                placeholder="e.g. 5020301002"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-gmedium text-muted-foreground mb-1">Description</label>
                            <input
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                className={inp}
                                placeholder="e.g. Office Supplies Expenses"
                                required
                            />
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowAdd(false)}
                                className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-gmedium hover:opacity-90 transition disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
