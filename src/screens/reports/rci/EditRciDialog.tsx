import { useState } from 'react'
import { X } from 'lucide-react'
import type { RciEntry } from '../types'

interface Props {
    entry: RciEntry
    onClose: () => void
    onSave: (entry: RciEntry) => void
}

const inp = 'w-full rounded-lg border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition'
const labelCls = 'text-xs font-gmedium text-muted-foreground mb-1'

export default function EditRciDialog({ entry, onClose, onSave }: Props) {
    const [form, setForm] = useState<RciEntry>({ ...entry })
    const [error, setError] = useState('')

    const set = (k: keyof RciEntry, v: string) => setForm(p => ({ ...p, [k]: v }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.date || !form.serial_no || !form.payee || !form.amount) {
            setError('Date, Serial No. (Check), Payee, and Amount are required.')
            return
        }
        onSave(form)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">Edit RCI Entry</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}

                    <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">Report Header</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Period Covered" value={form.period_covered} onChange={v => set('period_covered', v)} />
                        <Field label="Entity Name" value={form.entity_name} onChange={v => set('entity_name', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Fund Cluster" value={form.fund_cluster} onChange={v => set('fund_cluster', v)} />
                        <Field label="Bank Name / Account No." value={form.bank_name_account_no} onChange={v => set('bank_name_account_no', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Report No." value={form.report_no} onChange={v => set('report_no', v)} />
                        <Field label="Sheet No." value={form.sheet_no} onChange={v => set('sheet_no', v)} />
                    </div>

                    <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1 mt-1">Transaction Details</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Date *" value={form.date} onChange={v => set('date', v)} type="date" />
                        <Field label="Serial No. (Check #) *" value={form.serial_no} onChange={v => set('serial_no', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="DV / Payroll No." value={form.dv_payroll_no} onChange={v => set('dv_payroll_no', v)} />
                        <Field label="ORS / BURS No." value={form.ors_burs_no} onChange={v => set('ors_burs_no', v)} />
                    </div>
                    <Field label="Responsibility Center Code" value={form.responsibility_center_code} onChange={v => set('responsibility_center_code', v)} />
                    <Field label="Payee *" value={form.payee} onChange={v => set('payee', v)} />
                    <Field label="UACS Object Code" value={form.uacs_object_code} onChange={v => set('uacs_object_code', v)} />
                    <Field label="Nature of Payment" value={form.nature_of_payment} onChange={v => set('nature_of_payment', v)} textarea />
                    <Field label="Amount *" value={String(form.amount)} onChange={v => set('amount', v)} type="number" step="0.01" />

                    <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1 mt-1">Signatories</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Prepared By (Name)" value={form.prepared_by_name} onChange={v => set('prepared_by_name', v)} />
                        <Field label="Position" value={form.prepared_by_position} onChange={v => set('prepared_by_position', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Certified By (Name)" value={form.certified_by_name} onChange={v => set('certified_by_name', v)} />
                        <Field label="Position / Title" value={form.certified_by_position} onChange={v => set('certified_by_position', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Check Nos. From" value={form.check_nos_from} onChange={v => set('check_nos_from', v)} />
                        <Field label="Check Nos. To" value={form.check_nos_to} onChange={v => set('check_nos_to', v)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-gmedium hover:bg-muted transition">Cancel</button>
                        <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function Field({
    label, value, onChange, placeholder, type = 'text', textarea, step,
}: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean; step?: string
}) {
    return (
        <div className="flex flex-col">
            <label className={labelCls}>{label}</label>
            {textarea
                ? <textarea className={inp + ' resize-none'} rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
                : <input className={inp} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} step={step} />
            }
        </div>
    )
}
