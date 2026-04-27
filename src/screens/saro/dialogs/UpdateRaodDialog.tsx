import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import type { ClassType, FundSource, PAP, Saro, ObjectCode } from '../RaodMainContainer'

interface Props {
    saro: Saro
    classTypes: ClassType[]
    fundSources: FundSource[]
    paps: PAP[]
    objectCodes: ObjectCode[]
    onClose: () => void
    onSaved: () => void
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
const inpDisabled = 'w-full rounded-md bg-muted/50 border border-input px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-none'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">{title}</h3>
            {children}
        </div>
    )
}
function Row({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-gmedium text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
            {children}
        </div>
    )
}

export default function UpdateSaroDialog({ saro, classTypes, fundSources, paps, objectCodes, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        pap: saro.pap,
        pap_code: saro.pap_code,
        purpose: saro.purpose ?? '',
        year: saro.year ? String(saro.year) : '',
        date_of_saro: saro.date_of_saro,
        saro_no: saro.saro_no,
        amount_of_allotment: saro.amount_of_allotment,
        remarks: saro.remarks,
        object_description: saro.object_description,
        object_code: saro.object_code,
        date_of_obligation: saro.date_of_obligation || '',
        fund_type_description: saro.fund_type_description,
        class_type: saro.class_type ? String(saro.class_type) : '',
        fund_source: saro.fund_source ? String(saro.fund_source) : '',
        ors_no: saro.ors_no,
        name_of_claimant: saro.name_of_claimant,
        particulars: saro.particulars,
        obligated_amount: saro.obligated_amount || '',
        date: saro.date || '',
        ada_check: saro.ada_check,
        cash: saro.cash || '',
        non_tra: saro.non_tra || '',
        balance: saro.balance || '',
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
                ; (['class_type', 'fund_source'] as const).forEach(k => {
                    payload[k] = form[k] ? parseInt(form[k] as string) : null
                })
                ; (['obligated_amount', 'cash', 'non_tra', 'balance'] as const).forEach(k => {
                    payload[k] = form[k] ? form[k] : null
                })
                ; (['date_of_obligation', 'date'] as const).forEach(k => {
                    payload[k] = form[k] || null
                })
            payload['year'] = form['year'] ? parseInt(form['year']) : null
            await efasApi.patch(`saro/saros/${saro.id}/`, payload)
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
            <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="font-gbold text-foreground text-lg">Edit SARO — {saro.saro_no}</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
                    {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}

                    <Section title="PAP / SARO Information">
                        <Field label="PAP Code" required>
                            <SearchDropdown
                                options={paps.map(p => ({ value: p.code, label: `${p.code} — ${p.name}` }))}
                                value={form.pap_code}
                                onChange={v => set('pap_code', v)}
                                onSelect={v => {
                                    const found = paps.find(p => p.code === v)
                                    setForm(prev => ({ ...prev, pap_code: v, pap: found ? found.name : prev.pap }))
                                }}
                                placeholder="Search PAP Code..."
                                className={inp}
                                required
                            />
                        </Field>
                        <Field label="PAP Name" required>
                            <input value={form.pap} readOnly disabled required className={inpDisabled} placeholder="Auto-filled from PAP Code" />
                        </Field>
                        <Row>
                            <Field label="Year">
                                <input type="number" value={form.year} onChange={e => set('year', e.target.value)} className={inp} placeholder={String(new Date().getFullYear())} />
                            </Field>
                        </Row>
                        <Field label="Purpose">
                            <input value={form.purpose} onChange={e => set('purpose', e.target.value)} className={inp} placeholder="e.g. Payment of salaries of Job Order Personnel…" />
                        </Field>
                    </Section>

                    <Section title="SARO Details">
                        <Row>
                            <Field label="Date of SARO" required><input type="date" value={form.date_of_saro} onChange={e => set('date_of_saro', e.target.value)} required className={inp} /></Field>
                            <Field label="SARO No." required><input value={form.saro_no} onChange={e => set('saro_no', e.target.value)} required className={inp} /></Field>
                        </Row>
                        <Field label="Amount of Allotment" required><input type="number" step="0.01" value={form.amount_of_allotment} onChange={e => set('amount_of_allotment', e.target.value)} required className={inp} /></Field>
                        <Field label="Remarks"><textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} className={inp} /></Field>
                    </Section>

                    <Section title="Object">
                        <Field label="Object Code">
                            <SearchDropdown
                                options={objectCodes.map(o => ({ value: o.code, label: `${o.code} — ${o.description}` }))}
                                value={form.object_code}
                                onChange={v => set('object_code', v)}
                                onSelect={v => {
                                    const found = objectCodes.find(o => o.code === v)
                                    setForm(prev => ({ ...prev, object_code: v, object_description: found ? found.description : prev.object_description }))
                                }}
                                placeholder="Search Object Code..."
                                className={inp}
                            />
                        </Field>
                        <Field label="Object Description">
                            <input value={form.object_description} readOnly disabled className={inpDisabled} placeholder="Auto-filled from Object Code" />
                        </Field>
                    </Section>

                    <Section title="Obligation">
                        <Row>
                            <Field label="Fund Source">
                                <select
                                    value={form.fund_source}
                                    onChange={e => {
                                        const id = e.target.value
                                        const found = fundSources.find(fs => String(fs.id) === id)
                                        setForm(prev => ({ ...prev, fund_source: id, fund_type_description: found ? found.name : '' }))
                                    }}
                                    className={inp}
                                >
                                    <option value="">— Select —</option>
                                    {fundSources.map(fs => <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Fund Type Description">
                                <input value={form.fund_type_description} readOnly disabled className={inpDisabled} placeholder="Auto-filled from Fund Source" />
                            </Field>
                        </Row>
                        <Row>
                            <Field label="Date of Obligation"><input type="date" value={form.date_of_obligation} onChange={e => set('date_of_obligation', e.target.value)} className={inp} /></Field>
                            <Field label="Class Type">
                                <select value={form.class_type} onChange={e => set('class_type', e.target.value)} className={inp}>
                                    <option value="">— Select —</option>
                                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.code} - {ct.name}</option>)}
                                </select>
                            </Field>
                        </Row>
                    </Section>

                    <Section title="ORS / Claimant">
                        <Row>
                            <Field label="ORS No."><input value={form.ors_no} onChange={e => set('ors_no', e.target.value)} className={inp} /></Field>
                            <Field label="Name of Claimant"><input value={form.name_of_claimant} onChange={e => set('name_of_claimant', e.target.value)} className={inp} /></Field>
                        </Row>
                        <Field label="Particulars"><textarea value={form.particulars} onChange={e => set('particulars', e.target.value)} rows={3} className={inp} /></Field>
                        <Field label="Obligated Amount"><input type="number" step="0.01" value={form.obligated_amount} onChange={e => set('obligated_amount', e.target.value)} className={inp} /></Field>
                    </Section>

                    <Section title="Payment">
                        <Row>
                            <Field label="Date"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} /></Field>
                            <Field label="ADA / Check"><input value={form.ada_check} onChange={e => set('ada_check', e.target.value)} className={inp} /></Field>
                        </Row>
                        <Row>
                            <Field label="Cash"><input type="number" step="0.01" value={form.cash} onChange={e => set('cash', e.target.value)} className={inp} /></Field>
                            <Field label="Non-TRA"><input type="number" step="0.01" value={form.non_tra} onChange={e => set('non_tra', e.target.value)} className={inp} /></Field>
                            <Field label="Balance"><input type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)} className={inp} /></Field>
                        </Row>
                    </Section>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                            {loading ? 'Saving...' : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── SearchDropdown ───────────────────────────────────────────────────────────

interface DropdownOption { value: string; label: string }

function SearchDropdown({
    options, value, onChange, onSelect, placeholder, className, required,
}: {
    options: DropdownOption[]
    value: string
    onChange: (v: string) => void
    onSelect: (v: string) => void
    placeholder?: string
    className?: string
    required?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const filtered = query
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                required={required}
                placeholder={placeholder}
                className={className}
                value={open ? query : value}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
                onFocus={() => { setQuery(''); setOpen(true) }}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-md shadow-xl max-h-56 overflow-y-auto">
                    {filtered.map(o => (
                        <div
                            key={o.value}
                            onMouseDown={e => { e.preventDefault(); onSelect(o.value); setQuery(''); setOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition ${o.value === value ? 'bg-primary/10 text-primary font-gmedium' : 'text-foreground'}`}
                        >
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
