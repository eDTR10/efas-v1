import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import { Modal } from './ProjectsTab'

interface ReceivedSaro { id: number; saro_no: string; date_received: string; amount: string }
interface NTCA {
    id: number
    ntca_no: string
    date_of_ntca: string
    amount: string
    saro_no: string
    fund_source_detail: { id: number; code: string; name: string } | null
}
interface Tagging { id: number; received_saro: number; ntca: number; ntca_detail: NTCA }

function fmtPHP(val: string) {
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function NtcaTaggingTab() {
    const [saros, setSaros] = useState<ReceivedSaro[]>([])
    const [ntcas, setNtcas] = useState<NTCA[]>([])
    const [taggings, setTaggings] = useState<Tagging[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSaro, setSelectedSaro] = useState<number | null>(null)
    const [showAssign, setShowAssign] = useState(false)
    const [selectedNtcas, setSelectedNtcas] = useState<number[]>([])
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [ntcaSearch, setNtcaSearch] = useState('')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [sRes, nRes, tRes] = await Promise.all([
                efasApi.get('saro/received-saros/'),
                efasApi.get('saro/ntcas/'),
                efasApi.get('saro/ntca-taggings/'),
            ])
            setSaros(sRes.data)
            setNtcas(nRes.data)
            setTaggings(tRes.data)
        } finally { setLoading(false) }
    }
    useEffect(() => { fetchAll() }, [])

    const taggedNtcaIdsForSaro = (saroId: number) =>
        taggings.filter(t => t.received_saro === saroId).map(t => t.ntca)

    const openAssign = (saroId: number) => {
        setSelectedSaro(saroId)
        setSelectedNtcas(taggedNtcaIdsForSaro(saroId))
        setNtcaSearch('')
        setShowAssign(true)
    }

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSaro) return
        setSaving(true)
        try {
            const existing = taggedNtcaIdsForSaro(selectedSaro)
            const toRemove = existing.filter(id => !selectedNtcas.includes(id))
            const toAdd = selectedNtcas.filter(id => !existing.includes(id))
            await Promise.all([
                ...toRemove.map(ntcaId =>
                    efasApi.delete('saro/ntca-taggings/remove/', { data: { received_saro: selectedSaro, ntca: ntcaId } })
                ),
                ...(toAdd.length ? [efasApi.post('saro/ntca-taggings/assign/', { received_saro: selectedSaro, ntcas: toAdd })] : []),
            ])
            fetchAll(); setShowAssign(false)
        } finally { setSaving(false) }
    }

    const toggleNtca = (id: number) =>
        setSelectedNtcas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

    const filteredSaros = saros.filter(s =>
        s.saro_no.toLowerCase().includes(search.toLowerCase())
    )

    // For the dialog: tagged NTCAs at top, then remaining filtered by search
    const taggedNtcas = ntcas.filter(n => selectedNtcas.includes(n.id))
    const q = ntcaSearch.toLowerCase()
    const untaggedNtcas = ntcas.filter(n =>
        !selectedNtcas.includes(n.id) &&
        (!q || n.ntca_no.toLowerCase().includes(q) || n.saro_no.toLowerCase().includes(q) || (n.fund_source_detail?.code ?? '').toLowerCase().includes(q))
    )
    const dialogNtcas = ntcaSearch
        ? ntcas.filter(n => n.ntca_no.toLowerCase().includes(q) || n.saro_no.toLowerCase().includes(q) || (n.fund_source_detail?.code ?? '').toLowerCase().includes(q))
        : [...taggedNtcas, ...untaggedNtcas]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground shrink-0">Assign NTCAs to SAROs.</p>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search SARO No..."
                    className="w-64 rounded-md bg-background border border-input px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                />
            </div>

            {loading ? (
                <p className="text-center py-10 text-muted-foreground text-sm">Loading...</p>
            ) : saros.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">No SAROs found. Add SAROs in the RAOD screen first.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredSaros.map(saro => {
                        const tagged = taggings.filter(t => t.received_saro === saro.id)
                        return (
                            <div key={saro.id} className="bg-background border border-border rounded-lg p-4 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="font-gbold text-foreground text-sm">{saro.saro_no}</p>
                                        <p className="text-xs text-muted-foreground">{saro.date_received} · {fmtPHP(saro.amount)}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{tagged.length} NTCA(s) assigned</p>
                                    </div>
                                    <button
                                        onClick={() => openAssign(saro.id)}
                                        className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary font-gmedium px-3 py-1.5 rounded-lg transition shrink-0"
                                    >
                                        <Plus size={13} /> Manage NTCAs
                                    </button>
                                </div>
                                {tagged.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {tagged.map(t => (
                                            <div key={t.id} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1 text-xs text-foreground">
                                                <span className="font-gmedium">{t.ntca_detail?.ntca_no}</span>
                                                {t.ntca_detail && (
                                                    <span className="text-muted-foreground">· {fmtPHP(t.ntca_detail.amount)}</span>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('Remove this NTCA tagging?')) return
                                                        await efasApi.delete('saro/ntca-taggings/remove/', { data: { received_saro: saro.id, ntca: t.ntca } })
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

            {showAssign && selectedSaro && (
                <Modal
                    title={`Manage NTCAs — ${saros.find(s => s.id === selectedSaro)?.saro_no}`}
                    onClose={() => setShowAssign(false)}
                >
                    <form onSubmit={handleAssign} className="flex flex-col gap-3">
                        {/* Search bar */}
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                value={ntcaSearch}
                                onChange={e => setNtcaSearch(e.target.value)}
                                placeholder="Search NTCA no., SARO no., fund source..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                            />
                        </div>

                        {ntcas.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No NTCAs available. Add NTCAs in the NTCA tab first.
                            </p>
                        ) : dialogNtcas.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No NTCAs match your search.</p>
                        ) : (
                            <div className="max-h-80 overflow-y-auto flex flex-col gap-1 border border-border rounded-md p-2">
                                {/* Section header when not searching */}
                                {!ntcaSearch && taggedNtcas.length > 0 && (
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 pt-0.5 font-gmedium">
                                        Tagged ({taggedNtcas.length})
                                    </p>
                                )}
                                {dialogNtcas.map((n, idx) => {
                                    const isTagged = selectedNtcas.includes(n.id)
                                    // Show "All" section header after tagged section
                                    const showAllHeader = !ntcaSearch && idx === taggedNtcas.length && untaggedNtcas.length > 0
                                    return (
                                        <div key={n.id}>
                                            {showAllHeader && (
                                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 pt-2 font-gmedium border-t border-border/50 mt-1">
                                                    All NTCAs ({untaggedNtcas.length})
                                                </p>
                                            )}
                                            <label
                                                className={`flex items-start gap-2.5 cursor-pointer px-2 py-2 rounded select-none transition ${isTagged
                                                    ? 'bg-primary/10 border border-primary/20'
                                                    : 'hover:bg-muted/40 border border-transparent'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isTagged}
                                                    onChange={() => toggleNtca(n.id)}
                                                    className="w-4 h-4 accent-primary mt-0.5 shrink-0"
                                                />
                                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                    <span className="text-sm font-gmedium text-foreground">{n.ntca_no}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {n.date_of_ntca} · {fmtPHP(n.amount)}
                                                        {n.fund_source_detail ? ` · ${n.fund_source_detail.code}` : ''}
                                                        {n.saro_no ? ` · SARO: ${n.saro_no}` : ''}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {selectedNtcas.length} NTCA(s) selected
                        </p>

                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAssign(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
