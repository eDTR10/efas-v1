import { useState } from 'react'
import { X } from 'lucide-react'
import type { RadaiEntry } from '../types'

interface Props {
    onClose: () => void
    onSave: (entry: RadaiEntry) => void
}

const EMPTY: Omit<RadaiEntry, 'id'> = {
    date: '',
    serial_no: '',
    dv_payroll_no: '',
    ors_burs_no: '',
    responsibility_center_code: '',
    payee: '',
    uacs_object_code: '',
    nature_of_payment: '',
    amount: '',
    period_covered: '',
    entity_name: 'Department of Information and Communications Technology- Region 10',
    fund_cluster: 'Regular Agency Specific Fund',
    bank_name_account_no: 'Landbank, Capistrano/2015 9027-71',
    report_no: '',
    sheet_no: '',
    prepared_by_name: 'FARHANA D. COMADUG',
    prepared_by_position: 'Cashiering Staff',
    certified_by_name: 'NORHATA D. DOMIANGCA',
    certified_by_position: 'CASHIER-II',
    ada_nos_from: '',
    ada_nos_to: '',
}

const inp = 'w-full rounded-lg border border-border bg-background text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition'
const label = 'text-xs font-gmedium text-muted-foreground mb-1'

export default function AddRadaiDialog({ onClose, onSave }: Props) {
    const [form, setForm] = useState<Omit<RadaiEntry, 'id'>>(EMPTY)
    const [error, setError] = useState('')

    const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.date || !form.serial_no || !form.payee || !form.amount) {
            setError('Date, Serial No., Payee, and Amount are required.')
            return
        }
        onSave({ ...form, id: 0 })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">Add RADAI Entry</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}

                    {/* Row group: header meta */}
                    <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">Report Header</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Period Covered *" value={form.period_covered} onChange={v => set('period_covered', v)} placeholder="e.g. October 1-31, 2025" />
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

                    {/* Row group: transaction */}
                    <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1 mt-1">Transaction Details</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Date *" value={form.date} onChange={v => set('date', v)} type="date" />
                        <Field label="Serial No. *" value={form.serial_no} onChange={v => set('serial_no', v)} placeholder="e.g. 101-10-193-2025" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="DV / Payroll No." value={form.dv_payroll_no} onChange={v => set('dv_payroll_no', v)} placeholder="e.g. 2025-10-1847" />
                        <Field label="ORS / BURS No." value={form.ors_burs_no} onChange={v => set('ors_burs_no', v)} placeholder="e.g. 01-01101101-2025-10-1279" />
                    </div>
                    <Field label="Responsibility Center Code" value={form.responsibility_center_code} onChange={v => set('responsibility_center_code', v)} />
                    <Field label="Payee *" value={form.payee} onChange={v => set('payee', v)} placeholder="e.g. ABAO, EDISON ET.AL" />
                    <Field label="UACS Object Code" value={form.uacs_object_code} onChange={v => set('uacs_object_code', v)} placeholder="e.g. 5-01-02-110-04" />
                    <Field label="Nature of Payment" value={form.nature_of_payment} onChange={v => set('nature_of_payment', v)} textarea placeholder="Describe the nature of payment…" />
                    <Field label="Amount *" value={form.amount} onChange={v => set('amount', v)} placeholder="e.g. 399629.69" type="number" step="0.01" />

                    {/* Row group: footer / certification */}
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
                        <Field label="ADA Nos. From" value={form.ada_nos_from} onChange={v => set('ada_nos_from', v)} placeholder="e.g. 101-10-193-2025" />
                        <Field label="ADA Nos. To" value={form.ada_nos_to} onChange={v => set('ada_nos_to', v)} placeholder="e.g. 101-10-217-2025" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-gmedium hover:bg-muted transition">Cancel</button>
                        <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-gmedium hover:bg-primary/90 transition">Save Entry</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function Field({
    label: lbl, value, onChange, placeholder, type = 'text', textarea, step,
}: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean; step?: string
}) {
    const cls = inp
    return (
        <div className="flex flex-col">
            <label className={label}>{lbl}</label>
            {textarea
                ? <textarea className={cls + ' resize-none'} rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
                : <input className={cls} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} step={step} />
            }
        </div>
    )
}
