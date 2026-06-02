import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import efasApi from '@/plugin/axios'
import type { ReceivedSARO } from '@/screens/received_saro/ReceivedSaroMainContainer'

export interface RealignmentEntry {
    id: number
    month: string           // "YYYY-MM"
    fund: string
    class_type: string
    pap_name: string
    saro_no: string         // allotment_no of source SARO
    realignment_ref: string // MAP number
    account_code: string
    account_title: string
    transfer_to: string     // decimal string or ""
    transfer_from: string   // decimal string or ""
}

interface Props {
    entry?: RealignmentEntry
    saros: ReceivedSARO[]
    onClose: () => void
    onSaved: () => void
}

const inp = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-muted-foreground'
const lbl = 'block text-xs font-gmedium text-muted-foreground mb-1'

export default function AddEditRealignmentDialog({ entry, saros, onClose, onSaved }: Props) {
    const isEdit = !!entry

    const [month, setMonth] = useState(entry?.month ?? '')
    const [saroId, setSaroId] = useState('')
    const [fund, setFund] = useState(entry?.fund ?? '')
    const [classType, setClassType] = useState(entry?.class_type ?? '')
    const [papName, setPapName] = useState(entry?.pap_name ?? '')
    const [saroNo, setSaroNo] = useState(entry?.saro_no ?? '')
    const [realignRef, setRealignRef] = useState(entry?.realignment_ref ?? '')
    const [accountCode, setAccountCode] = useState(entry?.account_code ?? '')
    const [accountTitle, setAccountTitle] = useState(entry?.account_title ?? '')
    const [transferType, setTransferType] = useState<'to' | 'from'>(
        entry ? (parseFloat(entry.transfer_to || '0') > 0 ? 'to' : 'from') : 'to'
    )
    const [amount, setAmount] = useState(
        entry ? (parseFloat(entry.transfer_to || '0') > 0 ? entry.transfer_to : entry.transfer_from) : ''
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // When editing, try to find the matching SARO id
    useEffect(() => {
        if (entry?.saro_no) {
            const match = saros.find(s => s.allotment_no === entry.saro_no)
            if (match) setSaroId(String(match.id))
        }
    }, [])

    const selectedSaro = saros.find(s => s.id === parseInt(saroId))
    const saroItems = selectedSaro?.items ?? []

    const handleSaroChange = (id: string) => {
        setSaroId(id)
        const saro = saros.find(s => s.id === parseInt(id))
        if (!saro) return
        setSaroNo(saro.allotment_no)
        // Auto-fill fund and class from the SARO's first item or SARO level
        const firstItem = saro.items[0]
        if (firstItem) {
            setFund(firstItem.fund_type || '')
            setClassType(firstItem.class_type || saro.class_type || '')
        } else {
            setClassType(saro.class_type || '')
        }
    }

    const handleItemSelect = (itemId: string) => {
        const item = saroItems.find(i => String(i.id) === itemId)
        if (!item) return
        setAccountCode(item.object_code_no)
        setAccountTitle(item.object_code_desc)
        setPapName(item.pap_code || item.description || '')
        setFund(item.fund_type || fund)
        setClassType(item.class_type || classType)
    }

    const handleSubmit = async () => {
        if (!month || !saroNo || !realignRef || !accountCode || !amount) {
            setError('Please fill in all required fields.')
            return
        }
        const amtNum = parseFloat(amount.replace(/,/g, '')) || 0
        if (amtNum <= 0) { setError('Amount must be greater than zero.'); return }

        const payload = {
            month,
            fund,
            class_type: classType,
            pap_name: papName,
            saro_no: saroNo,
            realignment_ref: realignRef,
            account_code: accountCode,
            account_title: accountTitle,
            transfer_to: transferType === 'to' ? String(amtNum) : '0',
            transfer_from: transferType === 'from' ? String(amtNum) : '0',
        }

        setSaving(true)
        setError(null)
        try {
            if (isEdit) {
                await efasApi.put(`realignment/${entry!.id}/`, payload)
            } else {
                await efasApi.post('realignment/', payload)
            }
            onSaved()
            onClose()
        } catch {
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Title */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">
                        {isEdit ? 'Edit Realignment Entry' : 'Add Realignment Entry'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

                    {/* Row 1: Month + MAP Reference */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Month <span className="text-destructive">*</span></label>
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Realignment Reference (MAP No.) <span className="text-destructive">*</span></label>
                            <input value={realignRef} onChange={e => setRealignRef(e.target.value)}
                                placeholder="e.g. 2026-02-0001" className={inp} />
                        </div>
                    </div>

                    {/* SUBARO selector */}
                    <div>
                        <label className={lbl}>SUBARO — Select Source SARO <span className="text-destructive">*</span></label>
                        <select value={saroId} onChange={e => handleSaroChange(e.target.value)} className={inp}>
                            <option value="">— Select SARO —</option>
                            {saros.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.allotment_no} {s.class_type ? `(${s.class_type})` : ''}
                                </option>
                            ))}
                        </select>
                        {!saroId && saroNo && (
                            <p className="text-xs text-muted-foreground mt-1">Manual: {saroNo}</p>
                        )}
                    </div>

                    {/* Auto-filled: Fund + Class */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Fund</label>
                            <input value={fund} onChange={e => setFund(e.target.value)}
                                placeholder="e.g. Regular / Continuing" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Class</label>
                            <input value={classType} onChange={e => setClassType(e.target.value)}
                                placeholder="e.g. MOOE / PS" className={inp} />
                        </div>
                    </div>

                    {/* PAP Name */}
                    <div>
                        <label className={lbl}>PAP Name</label>
                        <input value={papName} onChange={e => setPapName(e.target.value)}
                            placeholder="PAP code or program name" className={inp} />
                    </div>

                    {/* Item selector — pick from SARO items to auto-fill account */}
                    {saroItems.length > 0 && (
                        <div>
                            <label className={lbl}>Pick Account from SARO Items (auto-fills Account Code & Title)</label>
                            <select onChange={e => handleItemSelect(e.target.value)} defaultValue="" className={inp}>
                                <option value="">— Select item to auto-fill —</option>
                                {saroItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.object_code_no} — {item.object_code_desc || item.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Account Code + Account Title */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>Account Code (Object Code) <span className="text-destructive">*</span></label>
                            <input value={accountCode} onChange={e => setAccountCode(e.target.value)}
                                placeholder="e.g. 5020102000" className={inp} />
                        </div>
                        <div>
                            <label className={lbl}>Account Title (Object Description)</label>
                            <input value={accountTitle} onChange={e => setAccountTitle(e.target.value)}
                                placeholder="e.g. Traveling Expenses - Local" className={inp} />
                        </div>
                    </div>

                    {/* Transfer Type + Amount */}
                    <div className="flex flex-col gap-2">
                        <label className={lbl}>Transfer Direction <span className="text-destructive">*</span></label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setTransferType('to')}
                                className={`flex-1 py-2 rounded-lg text-sm font-gmedium border transition ${transferType === 'to'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                            >
                                Transfer To (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransferType('from')}
                                className={`flex-1 py-2 rounded-lg text-sm font-gmedium border transition ${transferType === 'from'
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                            >
                                Transfer From (-)
                            </button>
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="Enter amount (no negative sign needed)"
                            className={inp}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition font-gmedium">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Entry'}
                    </button>
                </div>
            </div>
        </div>
    )
}
