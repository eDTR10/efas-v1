import { X } from 'lucide-react'
import type { Disbursement } from '../DisbursementMainContainer'
import {
    STATUS_DOC_LABELS,
    FUND_CLUSTER_LABELS,
    STATUS_NTCA_LABELS,
    MODE_PAYMENT_LABELS,
} from '../DisbursementMainContainer'

interface Props {
    record: Disbursement
    onClose: () => void
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' }) }
    catch { return d }
}

function fmtPHP(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function ViewDisbursementDialog({ record, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">Disbursement Record</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">DV No. {record.dv_number}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
                    {/* ── Primary Info ── */}
                    <Section title="Voucher Details">
                        <Row label="DV Number" value={record.dv_number} />
                        <Row label="Claimant" value={record.claimant} />
                        <Row label="Date Received from ORD" value={fmtDate(record.date_received)} />
                        <Row label="Net Amount of DV" value={fmtPHP(record.net_amount)} accent />
                    </Section>

                    {/* ── Particular ── */}
                    {record.particulars && (
                        <Section title="Particular">
                            <p className="text-sm text-foreground leading-relaxed">{record.particulars}</p>
                        </Section>
                    )}

                    {/* ── Status Info ── */}
                    <Section title="Status Information">
                        <Row label="Status of Documents" value={STATUS_DOC_LABELS[record.status_of_documents]} />
                        <Row label="Fund Cluster" value={FUND_CLUSTER_LABELS[record.fund_cluster]} />
                        <Row label="Status of NTCA" value={STATUS_NTCA_LABELS[record.status_of_ntca]} />
                        <Row label="Date of NTCA Download" value={fmtDate(record.date_of_ntca_download)} />
                    </Section>

                    {/* ── Payment Info ── */}
                    <Section title="Payment Information">
                        <Row label="Mode of Payment" value={MODE_PAYMENT_LABELS[record.mode_of_payment]} />
                        <Row label="Date Paid (ADA/Check)" value={fmtDate(record.date_paid)} />
                    </Section>

                    {/* ── Remarks ── */}
                    <Section title="Remarks & Notes">
                        <Row label="Remarks" value={record.remarks || '—'} />
                        <Row label="Reasons/Responsible" value={record.reasons_responsible || '—'} />
                    </Section>

                    {/* ── Meta ── */}
                    <div className="text-xs text-muted-foreground flex gap-4 border-t border-border pt-3">
                        <span>Created: {fmtDate(record.created_at)}</span>
                        <span>Updated: {fmtDate(record.updated_at)}</span>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-gsemibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
            <div className="rounded-lg border border-border divide-y divide-border">
                {children}
            </div>
        </div>
    )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="flex items-start px-4 py-2.5 gap-4">
            <span className="text-xs text-muted-foreground w-44 shrink-0 pt-0.5">{label}</span>
            <span className={`text-sm flex-1 ${accent ? 'font-gbold text-primary' : 'text-foreground'}`}>{value}</span>
        </div>
    )
}
