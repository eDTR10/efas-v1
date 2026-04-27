import { useState } from 'react'
import { X } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import type { ReceivedSaro } from '../ReceivedSaroMainContainer'

interface FundSource { id: number; code: string; name: string }

interface Props {
    record: ReceivedSaro
    fundSources: FundSource[]
    onClose: () => void
    onSaved: () => void
}

export default function UpdateReceivedSaroDialog({ record, fundSources, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        saro_no: record.saro_no,
        date_received: record.date_received,
        amount: record.amount,
        particulars: record.particulars,
        fund_source: record.fund_source ? String(record.fund_source) : '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload: Record<string, string | number | null> = { ...form }
            payload.fund_source = form.fund_source ? parseInt(form.fund_source) : null
            await efasApi.patch(`saro/received-saros/${record.id}/`, payload)
            onSaved()
            onClose()
        } catch (err: any) {
            setError(JSON.stringify(err.response?.data || 'Error saving.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-gbold text-foreground text-lg">Edit Received SARO</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                    {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}

                    <Field label="SARO No." required>
                        <input value={form.saro_no} onChange={e => set('saro_no', e.target.value)} required className={inp} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date Received" required>
                            <input type="date" value={form.date_received} onChange={e => set('date_received', e.target.value)} required className={inp} />
                        </Field>
                        <Field label="Amount" required>
                            <MoneyInput value={form.amount} onChange={v => set('amount', v)} required />
                        </Field>
                    </div>
                    <Field label="Fund Source">
                        <select value={form.fund_source} onChange={e => set('fund_source', e.target.value)} className={inp}>
                            <option value="">— Select —</option>
                            {fundSources.map(fs => <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Particulars">
                        <textarea value={form.particulars} onChange={e => set('particulars', e.target.value)} rows={3} className={inp} />
                    </Field>

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                            {loading ? 'Saving...' : 'Save Changes'}
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
            <label className="text-sm font-gmedium text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
            {children}
        </div>
    )
}

import { useState as useS } from 'react'
function MoneyInput({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
    const [focused, setFocused] = useS(false)
    const formatted = (() => {
        const n = parseFloat(value)
        return !isNaN(n) ? n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    })()
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">₱</span>
            <input
                type="text"
                inputMode="decimal"
                required={required}
                value={focused ? value : formatted}
                onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="0.00"
                className={`${inp} pl-7`}
            />
        </div>
    )
}
