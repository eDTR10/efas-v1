import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'

interface Project { id: number; name: string; date_added: string }

export default function ProjectsTab() {
    const [items, setItems] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<Project | null>(null)
    const [form, setForm] = useState({ name: '' })
    const [saving, setSaving] = useState(false)

    const fetch = async () => {
        setLoading(true)
        try { const r = await efasApi.get('saro/projects/'); setItems(r.data) }
        finally { setLoading(false) }
    }
    useEffect(() => { fetch() }, [])

    const openAdd = () => { setForm({ name: '' }); setEditItem(null); setShowAdd(true) }
    const openEdit = (p: Project) => { setForm({ name: p.name }); setEditItem(p); setShowAdd(true) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true)
        try {
            if (editItem) await efasApi.patch(`saro/projects/${editItem.id}/`, form)
            else await efasApi.post('saro/projects/', form)
            fetch(); setShowAdd(false)
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this project?')) return
        await efasApi.delete(`saro/projects/${id}/`); fetch()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage Projects / Programs.</p>
                <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition">
                    <Plus size={15} /> Add Project
                </button>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p> : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No projects yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                            <th className="px-4 py-3 text-left">Project / Program Name</th>
                            <th className="px-4 py-3 text-left">Date Added</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody>{items.map(p => (
                            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                <td className="px-4 py-3 font-gmedium text-foreground">{p.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{p.date_added}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>

            {showAdd && (
                <Modal title={editItem ? 'Edit Project' : 'Add Project'} onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Project / Program Name <span className="text-destructive">*</span></label>
                            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
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

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="font-gbold text-foreground">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted transition text-muted-foreground">✕</button>
                </div>
                <div className="px-5 py-4">{children}</div>
            </div>
        </div>
    )
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
