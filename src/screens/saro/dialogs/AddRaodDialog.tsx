import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import efasApi from '@/plugin/efasApi'
import type { ClassType, FundSource, PAP, Saro, ObjectCode, SaroGroup } from '../RaodMainContainer'

interface Props {
    classTypes: ClassType[]
    fundSources: FundSource[]
    paps: PAP[]
    saros: Saro[]
    objectCodes: ObjectCode[]
    receivedSaroNos: string[]
    saroGroup?: SaroGroup   // if provided → "Add Obligation" mode (SARO fields pre-filled & locked)
    onClose: () => void
    onSaved: () => void
}

const emptyForm = {
    _pap_id: '',   // UI-only: tracks the selected PAP record; not sent to backend
    pap: '', pap_code: '', purpose: '', year: String(new Date().getFullYear()),
    date_of_saro: '', saro_no: '',
    amount_of_allotment: '', remarks: '', object_description: '',
    object_code: '', date_of_obligation: '', fund_type_description: '',
    class_type: '', fund_source: '', ors_no: '', name_of_claimant: '',
    particulars: '', obligated_amount: '', date: '', ada_check: '',
    cash: '', non_tra: '', balance: '',
}

export default function AddSaroDialog({ classTypes, fundSources, paps, saros, objectCodes, receivedSaroNos, saroGroup, onClose, onSaved }: Props) {
    const [form, setForm] = useState(() => {
        if (saroGroup) {
            return {
                ...emptyForm,
                pap: saroGroup.pap,
                pap_code: saroGroup.pap_code,
                purpose: saroGroup.purpose,
                year: saroGroup.year ? String(saroGroup.year) : String(new Date().getFullYear()),
                date_of_saro: saroGroup.date_of_saro,
                saro_no: saroGroup.saro_no,
                amount_of_allotment: saroGroup.amount_of_allotment,
                object_code: saroGroup.object_code,
                object_description: saroGroup.object_description,
                fund_source: saroGroup.fund_source ? String(saroGroup.fund_source) : '',
                fund_type_description: saroGroup.fund_source_detail?.name ?? '',
                class_type: saroGroup.class_type ? String(saroGroup.class_type) : '',
            }
        }
        return emptyForm
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

    const uniqueSaroNos = [...new Set([
        ...receivedSaroNos,
        ...saros.map(s => s.saro_no).filter(Boolean),
    ])]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload: Record<string, string | number | null> = { ...form }
            // strip the UI-only PAP id
            delete payload['_pap_id']
                ; (['class_type', 'fund_source'] as const).forEach(k => {
                    payload[k] = form[k] ? parseInt(form[k]) : null
                })
                ; (['amount_of_allotment', 'obligated_amount', 'cash', 'non_tra', 'balance'] as const).forEach(k => {
                    payload[k] = form[k] ? form[k] : null
                })
                ; (['date_of_obligation', 'date'] as const).forEach(k => {
                    payload[k] = form[k] || null
                })
            payload['year'] = form['year'] ? parseInt(form['year']) : null
            await efasApi.post('saro/saros/', payload)
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
                    <h2 className="font-gbold text-foreground text-lg">
                        {saroGroup ? `Add Obligation — ${saroGroup.saro_no}` : 'Add SARO Record'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
                    {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}

                    <Section title="PAP / SARO Information">
                        <Field label="PAP Name" required>
                            {saroGroup
                                ? <input value={form.pap} readOnly disabled className={inpDisabled} />
                                : <SearchDropdown
                                    options={paps.map(p => ({
                                        value: String(p.id),
                                        label: `${p.name}  [${p.fund_detail?.code ?? '—'} / ${p.class_type_detail?.code ?? '—'}]`,
                                    }))}
                                    value={form.pap}
                                    onChange={v => {
                                        setForm(prev => ({ ...prev, _pap_id: '', pap: v, pap_code: '' }))
                                    }}
                                    onSelect={id => {
                                        const found = paps.find(p => String(p.id) === id)
                                        if (!found) return
                                        const fsId = found.fund ? String(found.fund) : ''
                                        const ctId = found.class_type ? String(found.class_type) : ''
                                        const fsName = found.fund_detail?.name ?? ''
                                        setForm(prev => ({
                                            ...prev,
                                            _pap_id: id,
                                            pap: found.name,
                                            pap_code: found.code,
                                            fund_source: fsId,
                                            fund_type_description: fsName,
                                            class_type: ctId,
                                        }))
                                    }}
                                    placeholder="Search PAP / program name…"
                                    className={inp}
                                    required
                                />}
                        </Field>
                        <Row>
                            <Field label="PAP Code">
                                <input
                                    value={form.pap_code}
                                    readOnly
                                    disabled
                                    className={inpDisabled}
                                    placeholder="Auto-filled from PAP selection"
                                />
                            </Field>
                            <Field label="Year">
                                <input type="number" value={form.year} onChange={e => set('year', e.target.value)} className={saroGroup ? inpDisabled : inp} readOnly={!!saroGroup} disabled={!!saroGroup} placeholder={String(new Date().getFullYear())} />
                            </Field>
                        </Row>
                        <Field label="Purpose">
                            <input value={form.purpose} onChange={e => set('purpose', e.target.value)} className={saroGroup ? inpDisabled : inp} readOnly={!!saroGroup} disabled={!!saroGroup} placeholder="e.g. Payment of salaries of Job Order Personnel…" />
                        </Field>
                    </Section>

                    <Section title="SARO Details">
                        <Row>
                            <Field label="Date of SARO" required>
                                <input type="date" value={form.date_of_saro} onChange={e => set('date_of_saro', e.target.value)} required disabled={!!saroGroup} className={saroGroup ? inpDisabled : inp} />
                            </Field>
                            <Field label="SARO No." required>
                                {saroGroup
                                    ? <input value={form.saro_no} readOnly disabled className={inpDisabled} />
                                    : <SearchDropdown
                                        options={uniqueSaroNos.map(v => ({ value: v, label: v }))}
                                        value={form.saro_no}
                                        onChange={v => set('saro_no', v)}
                                        onSelect={v => set('saro_no', v)}
                                        placeholder="2026-01-0031"
                                        className={inp}
                                        required
                                    />}
                            </Field>
                        </Row>
                        <Field label="Amount of Allotment" required>
                            {saroGroup
                                ? <input value={form.amount_of_allotment} readOnly disabled className={inpDisabled} />
                                : <MoneyInput value={form.amount_of_allotment} onChange={v => set('amount_of_allotment', v)} required />}
                        </Field>
                        <Field label="Remarks"><textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} className={inp} /></Field>
                    </Section>

                    <Section title="Object">
                        <Field label="Object Code">
                            {saroGroup
                                ? <input value={form.object_code} readOnly disabled className={inpDisabled} />
                                : <SearchDropdown
                                    options={objectCodes.map(o => ({ value: o.code, label: `${o.code} — ${o.description}` }))}
                                    value={form.object_code}
                                    onChange={v => set('object_code', v)}
                                    onSelect={v => {
                                        const found = objectCodes.find(o => o.code === v)
                                        setForm(prev => ({ ...prev, object_code: v, object_description: found ? found.description : prev.object_description }))
                                    }}
                                    placeholder="Search Object Code..."
                                    className={inp}
                                />}
                        </Field>
                        <Field label="Object Description">
                            <input value={form.object_description} readOnly disabled className={inpDisabled} placeholder="Auto-filled from Object Code" />
                        </Field>
                    </Section>

                    <Section title="Obligation">
                        <Row>
                            <Field label="Fund Source">
                                {(saroGroup || form._pap_id)
                                    ? <input value={form.fund_type_description} readOnly disabled className={inpDisabled} />
                                    : <select
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
                                    </select>}
                            </Field>
                            <Field label="Fund Type Description">
                                <input value={form.fund_type_description} readOnly disabled className={inpDisabled} placeholder="Auto-filled" />
                            </Field>
                        </Row>
                        <Row>
                            <Field label="Date of Obligation">
                                <input type="date" value={form.date_of_obligation} onChange={e => set('date_of_obligation', e.target.value)} className={inp} />
                            </Field>
                            <Field label="Class Type">
                                {(saroGroup || form._pap_id)
                                    ? <input
                                        value={classTypes.find(ct => String(ct.id) === form.class_type)
                                            ? `${classTypes.find(ct => String(ct.id) === form.class_type)!.code} - ${classTypes.find(ct => String(ct.id) === form.class_type)!.name}`
                                            : form.class_type}
                                        readOnly
                                        disabled
                                        className={inpDisabled}
                                    />
                                    : <select value={form.class_type} onChange={e => set('class_type', e.target.value)} className={inp}>
                                        <option value="">— Select —</option>
                                        {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.code} - {ct.name}</option>)}
                                    </select>}
                            </Field>
                        </Row>
                    </Section>

                    <Section title="ORS / Claimant">
                        <Row>
                            <Field label="ORS No."><input value={form.ors_no} onChange={e => set('ors_no', e.target.value)} className={inp} /></Field>
                            <Field label="Name of Claimant"><input value={form.name_of_claimant} onChange={e => set('name_of_claimant', e.target.value)} className={inp} /></Field>
                        </Row>
                        <Field label="Particulars"><textarea value={form.particulars} onChange={e => set('particulars', e.target.value)} rows={3} className={inp} /></Field>
                        <Field label="Obligated Amount">
                            <MoneyInput value={form.obligated_amount} onChange={v => set('obligated_amount', v)} />
                        </Field>
                    </Section>

                    <Section title="Payment">
                        <Row>
                            <Field label="Date"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} /></Field>
                            <Field label="ADA / Check"><input value={form.ada_check} onChange={e => set('ada_check', e.target.value)} className={inp} /></Field>
                        </Row>
                        <Row>
                            <Field label="Cash">
                                <MoneyInput value={form.cash} onChange={v => set('cash', v)} />
                            </Field>
                            <Field label="Non-TRA">
                                <MoneyInput value={form.non_tra} onChange={v => set('non_tra', v)} />
                            </Field>
                            <Field label="Balance">
                                <MoneyInput value={form.balance} onChange={v => set('balance', v)} />
                            </Field>
                        </Row>
                    </Section>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60">
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
const inpDisabled = 'w-full rounded-md bg-muted/50 border border-input px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-none'

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

// ─── MoneyInput ───────────────────────────────────────────────────────────────

function formatCommas(raw: string): string {
    const n = parseFloat(raw)
    if (isNaN(n)) return raw
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MoneyInput({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
    const [focused, setFocused] = useState(false)
    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">₱</span>
            <input
                type="text"
                inputMode="decimal"
                required={required}
                value={focused ? value : (value ? formatCommas(value) : '')}
                onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="0.00"
                className={`${inp} pl-7`}
            />
        </div>
    )
}

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
