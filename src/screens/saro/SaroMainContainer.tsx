import { useEffect, useState } from 'react'
import efasApi from '@/plugin/efasApi'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import AddSaroDialog from './dialogs/AddRaodDialog'
import ViewSaroDialog from './dialogs/ViewRaodDialog'
import UpdateSaroDialog from './dialogs/UpdateRaodDialog'
import type { PAP, ObjectCode } from './RaodMainContainer'

export interface ClassType { id: number; code: string; name: string; money_range_min: string | null; money_range_max: string | null }
export interface FundSource { id: number; code: string; name: string; is_sagf: boolean; sagf_type: string | null }
export interface Saro {
    id: number
    pap: string
    pap_code: string
    purpose: string
    year: number | null
    date_of_saro: string
    saro_no: string
    amount_of_allotment: string
    remarks: string
    object_description: string
    object_code: string
    date_of_obligation: string | null
    fund_type_description: string
    class_type: number | null
    class_type_detail: ClassType | null
    fund_source: number | null
    fund_source_detail: FundSource | null
    ors_no: string
    name_of_claimant: string
    particulars: string
    obligated_amount: string | null
    date: string | null
    ada_check: string
    cash: string | null
    non_tra: string | null
    balance: string | null
}

function formatPHP(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function SaroMainContainer() {
    const [saros, setSaros] = useState<Saro[]>([])
    const [classTypes, setClassTypes] = useState<ClassType[]>([])
    const [fundSources, setFundSources] = useState<FundSource[]>([])
    const [paps, setPaps] = useState<PAP[]>([])
    const [objectCodes, setObjectCodes] = useState<ObjectCode[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [viewTarget, setViewTarget] = useState<Saro | null>(null)
    const [editTarget, setEditTarget] = useState<Saro | null>(null)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [saroRes, ctRes, fsRes, papRes, ocRes] = await Promise.all([
                efasApi.get('saro/saros/'),
                efasApi.get('saro/class-types/'),
                efasApi.get('saro/fund-sources/'),
                efasApi.get('saro/paps/'),
                efasApi.get('saro/object-codes/'),
            ])
            setSaros(saroRes.data)
            setClassTypes(ctRes.data)
            setFundSources(fsRes.data)
            setPaps(papRes.data)
            setObjectCodes(ocRes.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this SARO record?')) return
        await efasApi.delete(`saro/saros/${id}/`)
        fetchAll()
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-gbold text-foreground">SARO</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Special Allotment Release Orders</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-gmedium px-4 py-2 rounded-lg transition"
                >
                    <Plus size={16} /> Add SARO
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading...</div>
                ) : saros.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">No SARO records found.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase">
                                <th className="px-4 py-3 text-left whitespace-nowrap">SARO No.</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Date of SARO</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">PAP</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">PAP Code</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Amount of Allotment</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Class Type</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Fund Source</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Balance</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {saros.map((s) => (
                                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                                    <td className="px-4 py-3 font-gmedium text-foreground whitespace-nowrap">{s.saro_no}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.date_of_saro}</td>
                                    <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{s.pap}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.pap_code}</td>
                                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatPHP(s.amount_of_allotment)}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.class_type_detail ? `${s.class_type_detail.code} - ${s.class_type_detail.name}` : '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.fund_source_detail ? `${s.fund_source_detail.code}` : '—'}</td>
                                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatPHP(s.balance)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setViewTarget(s)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Eye size={15} /></button>
                                            <button onClick={() => setEditTarget(s)} className="p-1.5 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"><Pencil size={15} /></button>
                                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAdd && (
                <AddSaroDialog
                    classTypes={classTypes}
                    fundSources={fundSources}
                    paps={paps}
                    saros={saros}
                    objectCodes={objectCodes}
                    receivedSaroNos={[]}
                    onClose={() => setShowAdd(false)}
                    onSaved={fetchAll}
                />
            )}
            {viewTarget && (
                <ViewSaroDialog saro={viewTarget} onClose={() => setViewTarget(null)} />
            )}
            {editTarget && (
                <UpdateSaroDialog
                    saro={editTarget}
                    classTypes={classTypes}
                    fundSources={fundSources}
                    paps={paps}
                    objectCodes={objectCodes}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchAll}
                />
            )}
        </div>
    )
}
