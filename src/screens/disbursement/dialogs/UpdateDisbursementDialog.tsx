import { useState } from 'react'
import { X } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import type { Disbursement } from '../DisbursementMainContainer'

interface Props {
    record: Disbursement
    onClose: () => void
    onSaved: () => void
}

export default function UpdateDisbursementDialog({ record, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        date_received: record.date_received ?? '',
        claimant: record.claimant ?? '',
        dv_number: record.dv_number ?? '',
        particulars: record.particulars ?? '',
        net_amount: record.net_amount ?? '',
        status_of_documents: record.status_of_documents ?? 'complete',
        fund_cluster: record.fund_cluster ?? 'mds_regular',
        status_of_ntca: record.status_of_ntca ?? 'with_ntca',
        date_of_ntca_download: record.date_of_ntca_download ?? '',
        mode_of_payment: record.mode_of_payment ?? 'ada',
        date_paid: record.date_paid ?? '',
        remarks: record.remarks ?? '',
        reasons_responsible: record.reasons_responsible ?? '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload: Record<string, string | null> = { ...form }
            if (!payload.date_of_ntca_download) payload.date_of_ntca_download = null
            if (!payload.date_paid) payload.date_paid = null
            await efasApi.patch(`saro/disbursements/${record.id}/`, payload)
            onSaved()
        } catch (err: any) {
            setError(JSON.stringify(err.response?.data || 'Error saving.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">Edit Disbursement Record</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date Received from ORD" required>
                            <input type="date" value={form.date_received} onChange={e => set('date_received', e.target.value)} required className={inp} />
                        </Field>
                        <Field label="DV Number" required>
                            <input value={form.dv_number} onChange={e => set('dv_number', e.target.value)} required className={inp} />
                        </Field>
                    </div>

                    <Field label="Claimant" required>
                        <input value={form.claimant} onChange={e => set('claimant', e.target.value)} required className={inp} />
                    </Field>

                    <Field label="Particular">
                        <textarea value={form.particulars} onChange={e => set('particulars', e.target.value)} rows={3} className={inp} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Net Amount of DV" required>
                            <MoneyInput value={form.net_amount} onChange={v => set('net_amount', v)} required />
                        </Field>
                        <Field label="Status of Documents">
                            <select value={form.status_of_documents} onChange={e => set('status_of_documents', e.target.value)} className={inp}>
                                <option value="complete">Complete</option>
                                <option value="incomplete">Incomplete</option>
                                <option value="lack_signatures">Lack Signatures</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Fund Cluster">
                            <select value={form.fund_cluster} onChange={e => set('fund_cluster', e.target.value)} className={inp}>
                                <option value="mds_regular">MDS Regular</option>
                                <option value="mds_special">MDS Special</option>
                                <option value="trust">Trust</option>
                            </select>
                        </Field>
                        <Field label="Status of NTCA">
                            <select value={form.status_of_ntca} onChange={e => set('status_of_ntca', e.target.value)} className={inp}>
                                <option value="with_ntca">With NTCA</option>
                                <option value="no_ntca">No NTCA</option>
                                <option value="borrow">Borrow</option>
                                <option value="cash_in_bank">Cash in Bank</option>
                                <option value="common_fund">Common Fund</option>
                                <option value="dost_share">DOST Share</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date of NTCA Download">
                            <input type="date" value={form.date_of_ntca_download} onChange={e => set('date_of_ntca_download', e.target.value)} className={inp} />
                        </Field>
                        <Field label="Mode of Payment">
                            <select value={form.mode_of_payment} onChange={e => set('mode_of_payment', e.target.value)} className={inp}>
                                <option value="ada">ADA</option>
                                <option value="check">Check</option>
                                <option value="over_the_counter">Over the Counter</option>
                            </select>
                        </Field>
                    </div>

                    <Field label="Date Paid (ADA/Check)">
                        <input type="date" value={form.date_paid} onChange={e => set('date_paid', e.target.value)} className={inp} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Remarks">
                            <input value={form.remarks} onChange={e => set('remarks', e.target.value)} className={inp} />
                        </Field>
                        <Field label="Reasons/Responsible">
                            <input value={form.reasons_responsible} onChange={e => set('reasons_responsible', e.target.value)} className={inp} />
                        </Field>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                            {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-gmedium text-foreground">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

function MoneyInput({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '')
        onChange(raw)
    }
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
            <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={handleChange}
                required={required}
                placeholder="0.00"
                className={inp + ' pl-7'}
            />
        </div>
    )
}
