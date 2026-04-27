import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

interface Project { id: number; name: string }
interface ReceivedSaro { id: number; saro_no: string; date_received: string; amount: string }
interface Tagging { id: number; project: number; received_saro: number; project_detail: Project; received_saro_detail: ReceivedSaro }

export default function SaroTaggingTab() {
    const [projects, setProjects] = useState<Project[]>([])
    const [saros, setSaros] = useState<ReceivedSaro[]>([])
    const [taggings, setTaggings] = useState<Tagging[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedProject, setSelectedProject] = useState<number | null>(null)
    const [showAssign, setShowAssign] = useState(false)
    const [selectedSaros, setSelectedSaros] = useState<number[]>([])
    const [saving, setSaving] = useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [pRes, sRes, tRes] = await Promise.all([
                efasApi.get('saro/projects/'),
                efasApi.get('saro/received-saros/'),
                efasApi.get('saro/saro-taggings/'),
            ])
            setProjects(pRes.data); setSaros(sRes.data); setTaggings(tRes.data)
        } finally { setLoading(false) }
    }
    useEffect(() => { fetchAll() }, [])

    const taggedSaroIdsForProject = (projectId: number) =>
        taggings.filter(t => t.project === projectId).map(t => t.received_saro)

    const openAssign = (projectId: number) => {
        setSelectedProject(projectId)
        setSelectedSaros(taggedSaroIdsForProject(projectId))
        setShowAssign(true)
    }

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProject) return
        setSaving(true)
        try {
            // Remove taggings not in selectedSaros
            const existing = taggedSaroIdsForProject(selectedProject)
            const toRemove = existing.filter(id => !selectedSaros.includes(id))
            const toAdd = selectedSaros.filter(id => !existing.includes(id))

            await Promise.all([
                ...toRemove.map(saroId =>
                    efasApi.delete('saro/saro-taggings/remove/', { data: { project: selectedProject, saro: saroId } })
                ),
                ...toAdd.length ? [efasApi.post('saro/saro-taggings/assign/', { project: selectedProject, saros: toAdd })] : [],
            ])
            fetchAll(); setShowAssign(false)
        } finally { setSaving(false) }
    }

    const toggleSaro = (id: number) =>
        setSelectedSaros(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Assign SAROs to Projects / Programs.</p>

            {loading ? <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p> : projects.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">No projects found. Add projects first.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {projects.map(project => {
                        const tagged = taggings.filter(t => t.project === project.id)
                        return (
                            <div key={project.id} className="bg-background border border-border rounded-lg p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-gmedium text-foreground text-sm">{project.name}</p>
                                        <p className="text-xs text-muted-foreground">{tagged.length} SARO(s) assigned</p>
                                    </div>
                                    <button onClick={() => openAssign(project.id)} className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary font-gmedium px-3 py-1.5 rounded-lg transition">
                                        <Plus size={13} /> Manage SAROs
                                    </button>
                                </div>
                                {tagged.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tagged.map(t => (
                                            <div key={t.id} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1 text-xs text-foreground">
                                                <span>{t.received_saro_detail?.saro_no}</span>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('Remove this SARO tagging?')) return
                                                        await efasApi.delete('saro/saro-taggings/remove/', { data: { project: project.id, saro: t.received_saro } })
                                                        fetchAll()
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive transition ml-0.5"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {showAssign && selectedProject && (
                <Modal title={`Assign SAROs — ${projects.find(p => p.id === selectedProject)?.name}`} onClose={() => setShowAssign(false)}>
                    <form onSubmit={handleAssign} className="flex flex-col gap-4">
                        {saros.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No SAROs available. Add SAROs in the Received SARO screen first.</p>
                        ) : (
                            <div className="max-h-72 overflow-y-auto flex flex-col gap-1 border border-border rounded-md p-2">
                                {saros.map(s => (
                                    <label key={s.id} className={`flex items-start gap-2.5 cursor-pointer px-2 py-2 rounded select-none transition ${selectedSaros.includes(s.id) ? 'bg-primary/8 border border-primary/20' : 'hover:bg-muted/40 border border-transparent'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSaros.includes(s.id)}
                                            onChange={() => toggleSaro(s.id)}
                                            className="w-4 h-4 accent-primary mt-0.5 shrink-0"
                                        />
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-sm font-gmedium text-foreground">{s.saro_no}</span>
                                            <span className="text-xs text-muted-foreground">{s.date_received} · ₱{parseFloat(s.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
