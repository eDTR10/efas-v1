import { useEffect, useRef, useState } from 'react'
import { X, Plus, Trash2, GripVertical, Search, ChevronDown } from 'lucide-react'
import efasApi from '@/plugin/axios'
import type { PAPCode, RAOD, ReceivedSARO, FundType, ClassType } from '../RAODMainContainer'
import LoadingOverlay from '../../received_saro/LoadingOverlay'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeaderForm {
    pap: number | ''
    pap_code: string
    date_of_saro: string
    saro_no: string
    amount_of_allotment: string
    remarks: string
    object_description: string
    object_code: string
}

interface EntryForm {
    date_of_obligation: string
    fund_type_description: string
    class_type: string
    fund_source: string
    ors_no: string
    name_of_claimant: string
    particulars: string
    obligated_amount: string
    disbursement_date: string
    ada_check: string
    cash: string
    non_tra: string
}

interface Props {
    paps: PAPCode[]
    fundTypes: FundType[]
    classTypes: ClassType[]
    receivedSaros: ReceivedSARO[]
    initial?: RAOD | null
    onClose: () => void
    onSaved: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyHeader = (): HeaderForm => ({
    pap: '', pap_code: '', date_of_saro: '', saro_no: '',
    amount_of_allotment: '', remarks: '', object_description: '', object_code: '',
})

const emptyEntry = (): EntryForm => ({
    date_of_obligation: '', fund_type_description: '', class_type: '', fund_source: '',
    ors_no: '', name_of_claimant: '', particulars: '',
    obligated_amount: '', disbursement_date: '', ada_check: '', cash: '', non_tra: '',
})

const stripNum = (v: string) => v.replace(/,/g, '') || '0'

const inp = 'w-full rounded-md bg-background border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition'

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddRaodDialog({ paps, fundTypes, classTypes, receivedSaros, initial, onClose, onSaved }: Props) {
    const isEdit = !!initial

    const [header, setHeader] = useState<HeaderForm>(
        initial
            ? {
                pap: initial.pap ?? '',
                pap_code: initial.pap_code,
                date_of_saro: initial.date_of_saro,
                saro_no: initial.saro_no,
                amount_of_allotment: initial.amount_of_allotment,
                remarks: initial.remarks,
                object_description: initial.object_description,
                object_code: initial.object_code,
            }
            : emptyHeader()
    )

    const [entries, setEntries] = useState<EntryForm[]>(
        initial && initial.entries.length > 0
            ? initial.entries.map(e => ({
                date_of_obligation: e.date_of_obligation ?? '',
                fund_type_description: e.fund_type_description,
                class_type: e.class_type,
                fund_source: e.fund_source,
                ors_no: e.ors_no,
                name_of_claimant: e.name_of_claimant,
                particulars: e.particulars,
                obligated_amount: e.obligated_amount,
                disbursement_date: e.disbursement_date ?? '',
                ada_check: e.ada_check,
                cash: e.cash,
                non_tra: e.non_tra,
            }))
            : [emptyEntry()]
    )

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── SARO searchable dropdown ───────────────────────────────────────────────
    const [saroQuery, setSaroQuery] = useState('')
    const [saroOpen, setSaroOpen] = useState(false)
    const [selectedSaro, setSelectedSaro] = useState<ReceivedSARO | null>(null)
    const saroRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (saroRef.current && !saroRef.current.contains(e.target as Node)) {
                setSaroOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const saroLabel = (s: ReceivedSARO) =>
        `[${s.items[0]?.pap_name ? `${s.items[0].pap_name} ` : ''}${s.allotment_no}] ₱${parseFloat(s.total_amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}${s.items[0]?.purpose ? ` - ${s.items[0].purpose}` : ''}`

    const filteredSaros = saroQuery.trim()
        ? receivedSaros.filter(s => saroLabel(s).toLowerCase().includes(saroQuery.toLowerCase()))
        : receivedSaros

    const onSelectSaro = (saro: ReceivedSARO) => {
        setSelectedSaro(saro)
        setSaroQuery('')
        setSaroOpen(false)
        const firstItem = saro.items[0]
        const papId = firstItem?.pap ?? null
        const papRecord = papId ? paps.find(p => p.id === papId) : null

        setHeader(prev => ({
            ...prev,
            pap: papId ?? prev.pap,
            pap_code: papRecord?.pap_code ?? firstItem?.pap_code ?? prev.pap_code,
            date_of_saro: saro.date_of_saro,
            saro_no: saro.allotment_no,
            amount_of_allotment: saro.total_amount,
            object_description: firstItem?.object_code_desc ?? prev.object_description,
            object_code: firstItem?.object_code_no ?? prev.object_code,
        }))

        // Fuzzy-match SARO class_type → ClassType code
        // SARO may store "2 MOOE", "1 PS" etc.; ClassType codes are "01","02","06" with names "PS","MOOE","CAPITAL OUTLAY"
        const rawClass = (firstItem?.class_type || saro.class_type || '').toLowerCase()
        const matchedClassType = classTypes.find(ct =>
            rawClass.includes(ct.name.toLowerCase()) || rawClass === ct.code
        )

        // Fuzzy-match SARO fund_type → FundType code
        // SARO may store "CURRENT","CONTINUING FUNDS","RLIP"; FundType names are "Current Approp","Continuing Approp","Automatic Approp -RLIP"
        const rawFund = (firstItem?.fund_type || '').toLowerCase()
        const matchedFundType = rawFund ? fundTypes.find(ft => {
            const words = ft.name.toLowerCase().split(/[\s\-]+/)
            return ft.name.toLowerCase().includes(rawFund) ||
                words.some(w => w.length > 3 && rawFund.includes(w))
        }) : undefined

        setEntries(prev => prev.map(e => ({
            ...e,
            class_type: matchedClassType?.code ?? e.class_type,
            fund_source: matchedFundType?.code ?? e.fund_source,
            fund_type_description: matchedFundType?.name ?? e.fund_type_description,
        })))
    }

    // ── Drag-to-reorder ───────────────────────────────────────────────────────
    const dragIdx = useRef<number | null>(null)
    const dragOverIdx = useRef<number | null>(null)
    const onDragStart = (i: number) => { dragIdx.current = i }
    const onDragEnter = (i: number) => { dragOverIdx.current = i }
    const onDragEnd = () => {
        const from = dragIdx.current; const to = dragOverIdx.current
        if (from === null || to === null || from === to) return
        setEntries(prev => {
            const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next
        })
        dragIdx.current = null; dragOverIdx.current = null
    }

    const setH = (k: keyof HeaderForm, v: string | number) =>
        setHeader(p => ({ ...p, [k]: v }))

    const setEntry = (idx: number, k: keyof EntryForm, v: string) =>
        setEntries(p => p.map((e, i) => i === idx ? { ...e, [k]: v } : e))

    const onFundTypeChange = (idx: number, code: string) => {
        const ft = fundTypes.find(f => f.code === code)
        setEntries(p => p.map((e, i) => i === idx
            ? { ...e, fund_source: code, fund_type_description: ft?.name ?? code }
            : e
        ))
    }

    const onPAPChange = (papId: string) => {
        const found = paps.find(p => String(p.id) === papId)
        setHeader(prev => ({ ...prev, pap: papId === '' ? '' : Number(papId), pap_code: found?.pap_code ?? '' }))
    }

    const addEntry = () => setEntries(p => [...p, emptyEntry()])
    const removeEntry = (idx: number) => setEntries(p => p.filter((_, i) => i !== idx))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const payload = {
                pap: header.pap === '' ? null : header.pap,
                date_of_saro: header.date_of_saro,
                saro_no: header.saro_no,
                amount_of_allotment: stripNum(header.amount_of_allotment),
                remarks: header.remarks,
                object_description: header.object_description,
                object_code: header.object_code,
                entries: entries.map(e => ({
                    date_of_obligation: e.date_of_obligation || null,
                    fund_type_description: e.fund_type_description,
                    class_type: e.class_type,
                    fund_source: e.fund_source,
                    ors_no: e.ors_no,
                    name_of_claimant: e.name_of_claimant,
                    particulars: e.particulars,
                    obligated_amount: stripNum(e.obligated_amount),
                    disbursement_date: e.disbursement_date || null,
                    ada_check: e.ada_check.trim(),
                    cash: stripNum(e.cash),
                    non_tra: stripNum(e.non_tra),
                })),
            }
            if (isEdit) {
                await efasApi.put(`raod/${initial!.id}/`, payload)
            } else {
                await efasApi.post('raod/', payload)
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

    // Computed totals for footer preview
    const sumObligated = entries.reduce((s, e) => s + (parseFloat(stripNum(e.obligated_amount)) || 0), 0)
    const sumDisbursed = entries.reduce((s, e) =>
        s + (parseFloat(stripNum(e.cash)) || 0) + (parseFloat(stripNum(e.non_tra)) || 0), 0)
    const sumBalance = sumObligated - sumDisbursed

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            {loading && <LoadingOverlay message={isEdit ? 'Updating RAOD…' : 'Saving RAOD…'} sub="Please wait. Your record is being saved." />}
            <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">

                {/* Title bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="font-gbold text-foreground text-lg">
                        {isEdit ? 'Edit' : 'Add'} RAOD
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col gap-6 px-6 py-5">

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md px-4 py-2">{error}</div>
                    )}

                    {/* ── SARO Lookup ── */}
                    <section className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <p className="text-xs font-gbold uppercase tracking-widest text-primary mb-3">
                            Auto-fill from Received SARO
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                            Search and select a SARO to auto-populate the header fields below.
                        </p>
                        <div className="relative" ref={saroRef}>
                            {/* Selected badge + trigger */}
                            {selectedSaro && !saroOpen ? (
                                <div
                                    className="flex items-center justify-between w-full rounded-md bg-background border border-primary px-3 py-2 text-sm text-foreground cursor-pointer hover:border-primary/80 transition"
                                    onClick={() => setSaroOpen(true)}
                                >
                                    <span className="truncate text-primary font-gmedium">{saroLabel(selectedSaro)}</span>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); setSelectedSaro(null) }}
                                            className="text-muted-foreground hover:text-destructive transition"
                                        >
                                            <X size={13} />
                                        </button>
                                        <ChevronDown size={13} className="text-muted-foreground" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <input
                                        autoFocus={saroOpen}
                                        value={saroQuery}
                                        onChange={e => setSaroQuery(e.target.value)}
                                        onFocus={() => setSaroOpen(true)}
                                        placeholder={receivedSaros.length === 0 ? 'No received SAROs in the system yet.' : `Search by allotment no., PAP or purpose…`}
                                        disabled={receivedSaros.length === 0}
                                        className={`${inp} pl-9 pr-8`}
                                    />
                                    {saroQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSaroQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Dropdown list */}
                            {saroOpen && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                                    {saroQuery.trim() && (
                                        <div className="px-4 py-1.5 text-[11px] text-muted-foreground border-b border-border bg-muted/30">
                                            {filteredSaros.length} result{filteredSaros.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {filteredSaros.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-muted-foreground">
                                            No SAROs match &ldquo;{saroQuery}&rdquo;.
                                        </div>
                                    ) : (
                                        <div className="max-h-64 overflow-y-auto">
                                            {filteredSaros.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => onSelectSaro(s)}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition border-b border-border/40 last:border-0"
                                                >
                                                    <p className="text-sm font-gmedium text-primary truncate">
                                                        [{s.items[0]?.pap_name ? `${s.items[0].pap_name} ` : ''}{s.allotment_no}]
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                                        <span className="font-gsemibold text-foreground">₱{parseFloat(s.total_amount || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                        {s.items[0]?.purpose && <span className="truncate">{s.items[0].purpose}</span>}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {receivedSaros.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-2 italic">No received SAROs found. Add one in the Received SARO page first.</p>
                        )}
                    </section>

                    {/* ── RAOD Header ── */}
                    <section>
                        <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground mb-3">RAOD Header</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="PAP Name">
                                <select value={header.pap} onChange={e => onPAPChange(e.target.value)} className={inp}>
                                    <option value="">— None —</option>
                                    {paps.map(p => <option key={p.id} value={p.id}>{p.pap_name}</option>)}
                                </select>
                            </Field>
                            <Field label="PAP Code">
                                <input readOnly value={header.pap_code} placeholder="Auto-filled"
                                    className={`${inp} bg-muted/50 cursor-default text-muted-foreground`} />
                            </Field>
                            <Field label="Date of SARO" required>
                                <input type="date" required value={header.date_of_saro}
                                    onChange={e => setH('date_of_saro', e.target.value)} className={inp} />
                            </Field>
                            <Field label="SARO No." required>
                                <input required value={header.saro_no}
                                    onChange={e => setH('saro_no', e.target.value)}
                                    placeholder="e.g. R10-2026-01-0031" className={inp} />
                            </Field>
                            <Field label="Amount of Allotment">
                                <input inputMode="decimal" value={header.amount_of_allotment}
                                    onChange={e => setH('amount_of_allotment', e.target.value)}
                                    placeholder="0.00" className={inp} />
                            </Field>
                            <Field label="Object Code">
                                <input value={header.object_code}
                                    onChange={e => setH('object_code', e.target.value)}
                                    placeholder="e.g. 5020201000" className={inp} />
                            </Field>
                            <Field label="Object Description">
                                <input value={header.object_description}
                                    onChange={e => setH('object_description', e.target.value)}
                                    placeholder="e.g. Travelling Expenses" className={inp} />
                            </Field>
                            <Field label="Remarks (PO Only, JO Only, etc.)">
                                <input value={header.remarks}
                                    onChange={e => setH('remarks', e.target.value)}
                                    placeholder="Optional" className={inp} />
                            </Field>
                        </div>
                    </section>

                    {/* ── Entries ── */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground">
                                Obligation Entries ({entries.length})
                            </p>
                            <button type="button" onClick={addEntry}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition font-gmedium">
                                <Plus size={12} /> Add Entry
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {entries.map((entry, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={() => onDragStart(idx)}
                                    onDragEnter={() => onDragEnter(idx)}
                                    onDragEnd={onDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    className="border border-border rounded-lg p-4 bg-muted/10 flex flex-col gap-4"
                                >
                                    {/* Card header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <GripVertical size={14} className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                                            <span className="text-xs font-gmedium text-muted-foreground">Entry {idx + 1}</span>
                                        </div>
                                        {entries.length > 1 && (
                                            <button type="button" onClick={() => removeEntry(idx)}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition">
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Row 1: ORS No. + Date of Obligation + Class Type + Fund Source */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <Field label="ORS No.">
                                            <input value={entry.ors_no}
                                                onChange={e => setEntry(idx, 'ors_no', e.target.value)}
                                                placeholder="ORS Number" className={inp} />
                                        </Field>
                                        <Field label="Date of Obligation">
                                            <input type="date" value={entry.date_of_obligation}
                                                onChange={e => setEntry(idx, 'date_of_obligation', e.target.value)} className={inp} />
                                        </Field>
                                        <Field label="Class Type">
                                            <select value={entry.class_type}
                                                onChange={e => setEntry(idx, 'class_type', e.target.value)} className={inp}>
                                                <option value="">— Select —</option>
                                                {classTypes.map(ct => <option key={ct.id} value={ct.code}>{ct.code} — {ct.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Fund Source">
                                            <input readOnly value={entry.fund_source}
                                                placeholder="Auto-filled from Fund Type"
                                                className={`${inp} bg-muted/50 cursor-default text-muted-foreground`} />
                                        </Field>
                                    </div>

                                    {/* Computed ORS preview */}
                                    {(entry.class_type || entry.fund_source || entry.ors_no) && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground shrink-0">Full ORS:</span>
                                            <code className="bg-muted border border-border px-2.5 py-1 rounded font-mono text-foreground tracking-wide">
                                                {[entry.class_type, entry.fund_source, entry.ors_no].filter(Boolean).join('-')}
                                            </code>
                                        </div>
                                    )}

                                    {/* Row 2: Name of Claimant + Fund Type Description */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Name of Claimant">
                                            <input value={entry.name_of_claimant}
                                                onChange={e => setEntry(idx, 'name_of_claimant', e.target.value)}
                                                placeholder="Claimant name" className={inp} />
                                        </Field>
                                        <Field label="Description – Fund Type">
                                            <select
                                                value={entry.fund_source}
                                                onChange={e => onFundTypeChange(idx, e.target.value)}
                                                className={inp}>
                                                <option value="">— Select —</option>
                                                {fundTypes.map(ft => (
                                                    <option key={ft.id} value={ft.code}>{ft.code} — {ft.name}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    {/* Row 3: Particulars + Obligated Amount */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field label="Particulars">
                                            <textarea value={entry.particulars}
                                                onChange={e => setEntry(idx, 'particulars', e.target.value)}
                                                rows={2} placeholder="Description of expense/obligation" className={`${inp} resize-none`} />
                                        </Field>
                                        <Field label="Obligated Amount">
                                            <input inputMode="decimal" value={entry.obligated_amount}
                                                onChange={e => setEntry(idx, 'obligated_amount', e.target.value)}
                                                placeholder="0.00" className={inp} />
                                        </Field>
                                    </div>

                                    {/* Row 4: Disbursement fields */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                        <p className="col-span-full text-xs font-gmedium text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">
                                            Disbursement Details
                                        </p>
                                        <Field label="Date">
                                            <input type="date" value={entry.disbursement_date}
                                                onChange={e => setEntry(idx, 'disbursement_date', e.target.value)} className={inp} />
                                        </Field>
                                        <Field label="ADA/Check No.">
                                            <input value={entry.ada_check}
                                                onChange={e => setEntry(idx, 'ada_check', e.target.value)}
                                                placeholder="e.g. 101-01-329-2026" className={inp} />
                                        </Field>
                                        <Field label="Cash">
                                            <input inputMode="decimal" value={entry.cash}
                                                onChange={e => setEntry(idx, 'cash', e.target.value)}
                                                placeholder="0.00" className={inp} />
                                        </Field>
                                        <Field label="Non-TRA">
                                            <input inputMode="decimal" value={entry.non_tra}
                                                onChange={e => setEntry(idx, 'non_tra', e.target.value)}
                                                placeholder="0.00" className={inp} />
                                        </Field>
                                    </div>

                                    {/* Per-entry balance preview */}
                                    {(entry.obligated_amount || entry.ada_check || entry.cash || entry.non_tra) && (() => {
                                        const obl = parseFloat(stripNum(entry.obligated_amount)) || 0
                                        const dis = (parseFloat(stripNum(entry.ada_check)) || 0) + (parseFloat(stripNum(entry.cash)) || 0) + (parseFloat(stripNum(entry.non_tra)) || 0)
                                        const bal = obl - dis
                                        return (
                                            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
                                                <span>Obligated: <span className="font-gmedium text-foreground">₱{obl.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                                                <span>Disbursed: <span className="font-gmedium text-green-600 dark:text-green-400">₱{dis.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                                                <span>Balance: <span className={`font-gbold ${bal < 0 ? 'text-destructive' : 'text-foreground'}`}>₱{bal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Summary row ── */}
                    {entries.length > 1 && (
                        <div className="flex items-center justify-end gap-6 text-sm text-muted-foreground bg-muted/20 rounded-lg px-4 py-3 border border-border">
                            <span>Total Obligated: <span className="font-gbold text-foreground">₱{sumObligated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                            <span>Total Disbursed: <span className="font-gbold text-green-600 dark:text-green-400">₱{sumDisbursed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                            <span>Net Balance: <span className={`font-gbold ${sumBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>₱{sumBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></span>
                        </div>
                    )}

                    {/* ── Footer buttons ── */}
                    <div className="flex justify-end gap-3 pt-1 shrink-0">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60 font-gmedium">
                            {loading ? 'Saving…' : isEdit ? 'Update RAOD' : 'Save RAOD'}
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
