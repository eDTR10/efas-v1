import { useRef, useState } from 'react'
import { X, Plus, Trash2, GripVertical } from 'lucide-react'
import efasApi from '@/plugin/axios'
import type { PAPCode, ReceivedSARO, FundType, ClassType, ObjectDescription } from '../ReceivedSaroMainContainer'
import LoadingOverlay from '../LoadingOverlay'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderForm {
    date_recd_in_email: string
    date_of_saro: string
    allotment_no: string
    class_type: string
    notes_validity: string
    total_amount: string
}

interface ItemForm {
    pap: number | ''
    pap_code: string
    description: string
    class_type: string
    fund_type: string
    object_code_no: string
    object_code_desc: string
    amount: string
    purpose: string
    nca_amount: string
    nca_date: string
    nta_no: string
}

interface Props {
    paps: PAPCode[]
    fundTypes: FundType[]
    classTypes: ClassType[]
    objectDescriptions: ObjectDescription[]
    initial?: ReceivedSARO | null
    onClose: () => void
    onSaved: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyHeader = (): HeaderForm => ({
    date_recd_in_email: '', date_of_saro: '', allotment_no: '',
    class_type: '', notes_validity: '', total_amount: '',
})

const emptyItem = (): ItemForm => ({
    pap: '', pap_code: '', description: '', class_type: '',
    fund_type: '', object_code_no: '', object_code_desc: '',
    amount: '', purpose: '', nca_amount: '', nca_date: '', nta_no: '',
})

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'
// const rowInp = 'w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition'

// Strip thousand-separators so Django accepts values like "553,147.20"
const stripNum = (v: string) => v.replace(/,/g, '') || '0'

// ─── Component ───────────────────────────────────────────────────────────────

export default function AddReceivedSaroDialog({ paps, fundTypes, classTypes, objectDescriptions, initial, onClose, onSaved }: Props) {
    const isEdit = !!initial

    const [header, setHeader] = useState<HeaderForm>(
        initial
            ? {
                date_recd_in_email: initial.date_recd_in_email,
                date_of_saro: initial.date_of_saro,
                allotment_no: initial.allotment_no,
                class_type: initial.class_type,
                notes_validity: initial.notes_validity,
                total_amount: initial.total_amount,
            }
            : emptyHeader()
    )

    const [items, setItems] = useState<ItemForm[]>(
        initial && initial.items.length > 0
            ? initial.items.map(it => ({
                pap: it.pap ?? '',
                pap_code: it.pap_code,
                description: it.description,
                class_type: it.class_type,
                fund_type: it.fund_type,
                object_code_no: it.object_code_no,
                object_code_desc: it.object_code_desc,
                amount: it.amount,
                purpose: it.purpose,
                nca_amount: it.nca_amount,
                nca_date: it.nca_date ?? '',
                nta_no: it.nta_no,
            }))
            : [emptyItem()]
    )

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── Drag-to-reorder ──────────────────────────────────────────────────────
    const dragIdx = useRef<number | null>(null)
    const dragOverIdx = useRef<number | null>(null)

    const onDragStart = (idx: number) => { dragIdx.current = idx }
    const onDragEnter = (idx: number) => { dragOverIdx.current = idx }
    const onDragEnd = () => {
        const from = dragIdx.current
        const to = dragOverIdx.current
        if (from === null || to === null || from === to) return
        setItems(prev => {
            const next = [...prev]
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
        dragIdx.current = null
        dragOverIdx.current = null
    }

    // ── Handlers ────────────────────────────────────────────────────────────

    const setH = (k: keyof HeaderForm, v: string) =>
        setHeader(p => ({ ...p, [k]: v }))

    const setItem = (idx: number, k: keyof ItemForm, v: string | number) =>
        setItems(p => p.map((it, i) => i === idx ? { ...it, [k]: v } : it))

    const onHeaderClassTypeChange = (value: string) => {
        setH('class_type', value)
        setItems(p => p.map(it => ({ ...it, class_type: value })))
    }

    const onPAPChange = (idx: number, papId: string) => {
        const found = paps.find(p => String(p.id) === papId)
        setItems(prev => prev.map((it, i) => {
            if (i !== idx) return it
            return {
                ...it,
                pap: papId === '' ? '' : Number(papId),
                pap_code: found?.pap_code ?? '',
                // pre-fill description with pap name only if currently empty
                description: it.description === '' && found ? found.pap_name : it.description,
            }
        }))
    }

    const onObjectCodeChange = (idx: number, code: string) => {
        const found = objectDescriptions.find(o => o.code === code)
        setItems(prev => prev.map((it, i) =>
            i !== idx ? it : {
                ...it,
                object_code_no: found?.code ?? code,
                object_code_desc: found?.description ?? it.object_code_desc,
            }
        ))
    }

    const addRow = () => setItems(p => [...p, emptyItem()])
    const removeRow = (idx: number) => setItems(p => p.filter((_, i) => i !== idx))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload = {
                ...header,
                total_amount: stripNum(header.total_amount),
                items: items.map(it => ({
                    pap: it.pap === '' ? null : it.pap,
                    description: it.description,
                    class_type: it.class_type,
                    fund_type: it.fund_type,
                    object_code_no: it.object_code_no,
                    object_code_desc: it.object_code_desc,
                    amount: stripNum(it.amount),
                    purpose: it.purpose,
                    nca_amount: stripNum(it.nca_amount),
                    nca_date: it.nca_date || null,
                    nta_no: it.nta_no,
                })),
            }
            if (isEdit) {
                await efasApi.put(`received-saro/${initial!.id}/`, payload)
            } else {
                await efasApi.post('received-saro/', payload)
            }
            onSaved()
            onClose()
        } catch (err: unknown) {
            const e = err as { response?: { data?: unknown } }
            setError(JSON.stringify(e.response?.data ?? 'Error saving.'))
        } finally {
            setLoading(false)
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            {loading && (
                <LoadingOverlay
                    message={isEdit ? 'Updating SARO…' : 'Saving SARO…'}
                    sub="Please wait. Your record is being saved."
                />
            )}
            <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Title bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">
                        {isEdit ? 'Edit' : 'Add'} Received SARO
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col gap-6 px-6 py-5">

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">
                            {error}
                        </div>
                    )}

                    {/* ── SARO Header ── */}
                    <section>
                        <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground mb-3">
                            SARO Information
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Field label="Date Received in Email" required>
                                <input type="date" required value={header.date_recd_in_email}
                                    onChange={e => setH('date_recd_in_email', e.target.value)} className={inp} />
                            </Field>
                            <Field label="Date of SARO" required>
                                <input type="date" required value={header.date_of_saro}
                                    onChange={e => setH('date_of_saro', e.target.value)} className={inp} />
                            </Field>
                            <Field label="Allotment No." required>
                                <input required value={header.allotment_no}
                                    onChange={e => setH('allotment_no', e.target.value)}
                                    placeholder="e.g. R10-2026-01-0031" className={inp} />
                            </Field>
                            <Field label="Class Type">
                                <select value={header.class_type}
                                    onChange={e => onHeaderClassTypeChange(e.target.value)}
                                    className={inp}>
                                    <option value="">— Select —</option>
                                    {classTypes.map(ct => (
                                        <option key={ct.id} value={ct.code}>{ct.code} — {ct.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Total Amount">
                                <input inputMode="decimal" value={header.total_amount}
                                    onChange={e => setH('total_amount', e.target.value)}
                                    placeholder="0.00" className={inp} />
                            </Field>
                            <Field label="Notes / Validity">
                                <input value={header.notes_validity}
                                    onChange={e => setH('notes_validity', e.target.value)}
                                    placeholder="Optional notes" className={inp} />
                            </Field>
                        </div>
                    </section>

                    {/* ── Line Items ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground">
                                Line Items ({items.length})
                            </p>
                            <button type="button" onClick={addRow}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition font-gmedium">
                                <Plus size={12} /> Add Item
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {items.map((it, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={() => onDragStart(idx)}
                                    onDragEnter={() => onDragEnter(idx)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    className="border border-border rounded-lg p-4 bg-muted/10 flex flex-col gap-4 transition-opacity"
                                >
                                    {/* Card header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <GripVertical size={14} className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                                            <span className="text-xs font-gmedium text-muted-foreground">Item {idx + 1}</span>
                                        </div>
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => removeRow(idx)}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Row 1: PAP Name + PAP Code + Description */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <Field label="PAP Name">
                                            <select value={it.pap} onChange={e => onPAPChange(idx, e.target.value)} className={inp}>
                                                <option value="">— None —</option>
                                                {paps.map(p => (
                                                    <option key={p.id} value={p.id}>{p.pap_name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="PAP Code">
                                            <input readOnly value={it.pap_code} placeholder="Auto-filled"
                                                className={`${inp} bg-muted/50 cursor-default text-muted-foreground`} />
                                        </Field>
                                        <Field label="Description">
                                            <input value={it.description}
                                                onChange={e => setItem(idx, 'description', e.target.value)}
                                                placeholder="Description" className={inp} />
                                        </Field>
                                    </div>

                                    {/* Row 2: Class Type + Fund Type + Obj Code No. + Obj Code Desc */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <Field label="Class Type">
                                            <select value={it.class_type}
                                                onChange={e => setItem(idx, 'class_type', e.target.value)}
                                                className={inp}>
                                                <option value="">— Select —</option>
                                                {classTypes.map(ct => (
                                                    <option key={ct.id} value={ct.code}>{ct.code} — {ct.name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Fund Type">
                                            <select value={it.fund_type}
                                                onChange={e => setItem(idx, 'fund_type', e.target.value)}
                                                className={inp}>
                                                <option value="">— Select —</option>
                                                {fundTypes.map(ft => (
                                                    <option key={ft.id} value={ft.code}>{ft.code} — {ft.name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Obj. Code">
                                            <select value={it.object_code_no}
                                                onChange={e => onObjectCodeChange(idx, e.target.value)}
                                                className={inp}>
                                                <option value="">— Select —</option>
                                                {objectDescriptions.map(od => (
                                                    <option key={od.id} value={od.code}>{od.code} — {od.description}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Obj. Code Desc">
                                            <input readOnly value={it.object_code_desc}
                                                placeholder="Auto-filled"
                                                className={`${inp} bg-muted/50 cursor-default text-muted-foreground`} />
                                        </Field>
                                    </div>

                                    {/* Row 3: Amount + Purpose */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Amount">
                                            <input inputMode="decimal" value={it.amount}
                                                onChange={e => setItem(idx, 'amount', e.target.value)}
                                                placeholder="0.00" className={inp} />
                                        </Field>
                                        <Field label="Purpose">
                                            <input value={it.purpose}
                                                onChange={e => setItem(idx, 'purpose', e.target.value)}
                                                className={inp} />
                                        </Field>
                                    </div>

                                    {/* Row 4: NCA fields (highlighted) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                        <p className="col-span-full text-xs font-gmedium text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">
                                            NCA Details
                                        </p>
                                        <Field label="NCA Amount">
                                            <input inputMode="decimal" value={it.nca_amount}
                                                onChange={e => setItem(idx, 'nca_amount', e.target.value)}
                                                placeholder="0.00" className={inp} />
                                        </Field>
                                        <Field label="NCA Date">
                                            <input type="date" value={it.nca_date}
                                                onChange={e => setItem(idx, 'nca_date', e.target.value)}
                                                className={inp} />
                                        </Field>
                                        <Field label="NTA No.">
                                            <input value={it.nta_no}
                                                onChange={e => setItem(idx, 'nta_no', e.target.value)}
                                                className={inp} />
                                        </Field>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Footer buttons ── */}
                    <div className="flex justify-end gap-3 pt-1 shrink-0">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 font-gmedium">
                            {loading ? 'Saving…' : isEdit ? 'Update SARO' : 'Save SARO'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

