import { X } from 'lucide-react'
import type { Saro } from '../SaroMainContainer'

interface Props { saro: Saro; onClose: () => void }

function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-sm text-foreground">{value || '—'}</span>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide border-b border-border pb-1">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
        </div>
    )
}

function fmt(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function ViewSaroDialog({ saro, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">{saro.saro_no}</h2>
                        <p className="text-xs text-muted-foreground">{saro.date_of_saro}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-6">
                    <Section title="PAP Information">
                        <Row label="PAP" value={saro.pap} />
                        <Row label="PAP Code" value={saro.pap_code} />
                    </Section>

                    <Section title="SARO Details">
                        <Row label="Date of SARO" value={saro.date_of_saro} />
                        <Row label="SARO No." value={saro.saro_no} />
                        <Row label="Amount of Allotment" value={fmt(saro.amount_of_allotment)} />
                        <div className="sm:col-span-2">
                            <Row label="Remarks" value={saro.remarks} />
                        </div>
                    </Section>

                    <Section title="Object">
                        <Row label="Object Description" value={saro.object_description} />
                        <Row label="Object Code" value={saro.object_code} />
                    </Section>

                    <Section title="Obligation">
                        <Row label="Date of Obligation" value={saro.date_of_obligation} />
                        <Row label="Fund Type Description" value={saro.fund_type_description} />
                        <Row label="Class Type" value={saro.class_type_detail ? `${saro.class_type_detail.code} - ${saro.class_type_detail.name}` : undefined} />
                        <Row label="Fund Source" value={saro.fund_source_detail ? `${saro.fund_source_detail.code} - ${saro.fund_source_detail.name}` : undefined} />
                    </Section>

                    <Section title="ORS / Claimant">
                        <Row label="ORS No." value={saro.ors_no} />
                        <Row label="Name of Claimant" value={saro.name_of_claimant} />
                        <div className="sm:col-span-2"><Row label="Particulars" value={saro.particulars} /></div>
                        <Row label="Obligated Amount" value={fmt(saro.obligated_amount)} />
                    </Section>

                    <Section title="Payment">
                        <Row label="Date" value={saro.date} />
                        <Row label="ADA / Check" value={saro.ada_check} />
                        <Row label="Cash" value={fmt(saro.cash)} />
                        <Row label="Non-TRA" value={fmt(saro.non_tra)} />
                        <Row label="Balance" value={fmt(saro.balance)} />
                    </Section>
                </div>

                <div className="px-6 py-4 border-t border-border flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">Close</button>
                </div>
            </div>
        </div>
    )
}
