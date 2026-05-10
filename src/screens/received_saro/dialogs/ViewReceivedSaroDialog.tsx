import { X } from 'lucide-react'
import type { ReceivedSARO } from '../ReceivedSaroMainContainer'

interface Props {
    saro: ReceivedSARO
    onClose: () => void
}

function fmtNum(val: string | null) {
    if (!val) return '—'
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null) {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function ViewReceivedSaroDialog({ saro, onClose }: Props) {
    const th = 'px-3 py-2 text-left text-xs font-gmedium text-white whitespace-nowrap'
    const td = 'px-3 py-2 text-xs text-foreground whitespace-nowrap'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Title bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="font-gbold text-foreground text-lg">SARO Details</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{saro.allotment_no}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">

                    {/* Header info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
                        <Detail label="Allotment No." value={saro.allotment_no} highlight />
                        <Detail label="Date Received in Email" value={fmtDate(saro.date_recd_in_email)} />
                        <Detail label="Date of SARO" value={fmtDate(saro.date_of_saro)} />
                        <Detail label="Class Type" value={saro.class_type || '—'} />
                        <Detail label="Total Amount" value={fmtNum(saro.total_amount)} />
                        <Detail label="Notes / Validity" value={saro.notes_validity || '—'} />
                    </div>

                    {/* Line Items */}
                    <div>
                        <p className="text-xs font-gmedium uppercase tracking-widest text-muted-foreground mb-2">
                            Line Items ({saro.items.length})
                        </p>

                        {saro.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No line items.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="min-w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-primary">
                                            <th className={th}>#</th>
                                            <th className={th}>PAP CODE</th>
                                            <th className={th}>DESCRIPTION</th>
                                            <th className={th}>CLASS TYPE</th>
                                            <th className={th}>FUND TYPE</th>
                                            <th className={th}>OBJ CODE NO.</th>
                                            <th className={th}>OBJ CODE DESC</th>
                                            <th className={`${th} text-right`}>AMOUNT</th>
                                            <th className={th}>PURPOSE</th>
                                            <th className={`${th} bg-green-700 text-right`}>NCA AMOUNT</th>
                                            <th className={`${th} bg-green-700`}>NCA DATE</th>
                                            <th className={`${th} bg-green-700`}>NTA NO.</th>
                                            <th className={`${th} bg-green-700 text-right`}>BALANCE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {saro.items.map((item, idx) => (
                                            <tr
                                                key={item.id}
                                                className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                            >
                                                <td className={`${td} text-muted-foreground`}>{idx + 1}</td>
                                                <td className={`${td} font-gmedium text-primary`}>{item.pap_code || '—'}</td>
                                                <td className={`${td} max-w-[180px] truncate`} title={item.description}>{item.description || '—'}</td>
                                                <td className={td}>{item.class_type || '—'}</td>
                                                <td className={td}>{item.fund_type || '—'}</td>
                                                <td className={td}>{item.object_code_no || '—'}</td>
                                                <td className={`${td} max-w-[140px] truncate`} title={item.object_code_desc}>{item.object_code_desc || '—'}</td>
                                                <td className={`${td} text-right`}>{fmtNum(item.amount)}</td>
                                                <td className={`${td} max-w-[140px] truncate`} title={item.purpose}>{item.purpose || '—'}</td>
                                                <td className={`${td} text-right bg-green-50 dark:bg-green-950/20`}>{fmtNum(item.nca_amount)}</td>
                                                <td className={`${td} bg-green-50 dark:bg-green-950/20`}>{fmtDate(item.nca_date)}</td>
                                                <td className={`${td} font-gmedium text-primary bg-green-50 dark:bg-green-950/20`}>{item.nta_no || '—'}</td>
                                                <td className={`${td} text-right font-gmedium bg-green-50 dark:bg-green-950/20`}>{fmtNum(item.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 border-t border-border shrink-0">
                    <button onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-gmedium uppercase tracking-wide">{label}</span>
            <span className={`text-sm ${highlight ? 'font-gbold text-primary' : 'text-foreground'}`}>{value}</span>
        </div>
    )
}
