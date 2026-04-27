import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

interface ClassType { id: number; code: string; name: string }
interface FundSource { id: number; code: string; name: string }
interface PAP { id: number; code: string; name: string; particular: string; fund: number | null; class_type: number | null; fund_detail: FundSource | null; class_type_detail: ClassType | null }

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

export default function PAPTab() {
    const [items, setItems] = useState<PAP[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [fundSources, setFundSources] = useState<FundSource[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editItem, setEditItem] = useState<PAP | null>(null)
    const [form, setForm] = useState({ code: '', name: '', particular: '', fund: '', class_type: '' })
    const [saving, setSaving] = useState(false)
    const [codeError, setCodeError] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [papRes, ctRes, fsRes] = await Promise.all([
                efasApi.get('saro/paps/'),
                efasApi.get('saro/class-types/'),
                efasApi.get('saro/fund-sources/'),
            ])
            setItems(papRes.data); setClassTypes(ctRes.data); setFundSources(fsRes.data)
        } finally { setLoading(false) }
    }
    useEffect(() => { fetchAll() }, [])

    const openAdd = () => {
        setForm({ code: '', name: '', particular: '', fund: '', class_type: '' })
        setCodeError('')
        setEditItem(null)
        setShowAdd(true)
    }
    const openEdit = (item: PAP) => {
        setForm({ code: item.code, name: item.name, particular: item.particular, fund: item.fund ? String(item.fund) : '', class_type: item.class_type ? String(item.class_type) : '' })
        setCodeError('')
        setEditItem(item)
        setShowAdd(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCodeError('')
        // Client-side duplicate check
        const duplicate = items.find(
            i => i.code.trim().toLowerCase() === form.code.trim().toLowerCase() && i.id !== editItem?.id
        )
        if (duplicate) {
            setCodeError(`PAP code "${form.code}" already exists.`)
            return
        }
        setSaving(true)
        try {
            const payload = {
                code: form.code, name: form.name, particular: form.particular,
                fund: form.fund ? parseInt(form.fund) : null,
                class_type: form.class_type ? parseInt(form.class_type) : null,
            }
            if (editItem) await efasApi.patch(`saro/paps/${editItem.id}/`, payload)
            else await efasApi.post('saro/paps/', payload)
            fetchAll(); setShowAdd(false)
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { code?: string[] } } })?.response?.data
            if (data?.code) setCodeError(data.code[0])
        } finally { setSaving(false) }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this PAP?')) return
        await efasApi.delete(`saro/paps/${id}/`); fetchAll()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage PAP (Program / Activity / Project) records.</p>
                <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-3 py-2 rounded-lg transition">
                    <Plus size={15} /> Add PAP
                </button>
            </div>

            <div className="bg-background border border-border rounded-lg overflow-hidden">
                {loading ? <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p> : items.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">No PAPs yet.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase">
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Particular</th>
                            <th className="px-4 py-3 text-left">Fund</th>
                            <th className="px-4 py-3 text-left">Class Type</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody>{items.map(item => (
                            <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                <td className="px-4 py-3 font-gmedium text-foreground">{item.code}</td>
                                <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{item.name}</td>
                                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{item.particular || '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.fund_detail ? `${item.fund_detail.code}` : '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.class_type_detail ? `${item.class_type_detail.code}` : '—'}</td>
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
                <Modal title={editItem ? 'Edit PAP' : 'Add PAP'} onClose={() => setShowAdd(false)}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">PAP Code <span className="text-destructive">*</span></label>
                                <input
                                    required
                                    value={form.code}
                                    onChange={e => { setForm(p => ({ ...p, code: e.target.value })); setCodeError('') }}
                                    className={`${inp} ${codeError ? 'border-destructive focus:ring-destructive' : ''}`}
                                />
                                {codeError && <p className="text-destructive text-xs">{codeError}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">PAP Name <span className="text-destructive">*</span></label>
                                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-gmedium text-foreground">Particular (Description)</label>
                            <textarea rows={3} value={form.particular} onChange={e => setForm(p => ({ ...p, particular: e.target.value }))} className={inp} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Fund <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                <select value={form.fund} onChange={e => setForm(p => ({ ...p, fund: e.target.value }))} className={inp}>
                                    <option value="">— Select —</option>
                                    {fundSources.map(f => <option key={f.id} value={f.id}>{f.code} - {f.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-gmedium text-foreground">Class Type <span className="text-muted-foreground text-xs">(Optional)</span></label>
                                <select value={form.class_type} onChange={e => setForm(p => ({ ...p, class_type: e.target.value }))} className={inp}>
                                    <option value="">— Select —</option>
                                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.code} - {ct.name}</option>)}
                                </select>
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
