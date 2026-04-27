import { X } from 'lucide-react'
import type { ReceivedSaro } from '../ReceivedSaroMainContainer'

interface Props {
    record: ReceivedSaro
    onClose: () => void
}

function formatPHP(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function ViewReceivedSaroDialog({ record, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-gbold text-foreground text-lg">Received SARO Details</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Detail label="SARO No." value={record.saro_no} />
                        <Detail label="Date Received" value={record.date_received} />
                        <Detail label="Amount" value={formatPHP(record.amount)} />
                        <Detail label="Fund Source" value={record.fund_source_detail ? `${record.fund_source_detail.code} - ${record.fund_source_detail.name}` : '—'} />
                        <Detail label="Status" value={record.is_archived ? 'Archived' : 'Active'} />
                    </div>
                    <Detail label="Particulars" value={record.particulars || '—'} />
                    <div className="flex justify-end pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">Close</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-gmedium uppercase tracking-wide">{label}</span>
            <span className="text-sm text-foreground">{value}</span>
        </div>
    )
}
