import { ChevronRight, X, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import type { SaroGroup, Saro, Ntca } from './RaodMainContainer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPHP(val: string | null | number) {
    const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''))
    if (isNaN(n)) return '—'
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-gmedium">{label}</span>
            <span className="text-xs font-gmedium text-foreground truncate">{value}</span>
        </div>
    )
}

function SummaryCard({ label, value, color = 'text-foreground' }: { label: string; value: string; color?: string }) {
    return (
        <div className="bg-background border border-border rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className={`text-sm font-gbold leading-tight ${color}`}>{value}</span>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    group: SaroGroup
    ntcas: Ntca[]
    onClose: () => void
    onView: (e: Saro) => void
    onEdit: (e: Saro) => void
    onDelete: (id: number) => void
    onAddObligation: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RaodDetailPanel({ group, ntcas, onClose, onView, onEdit, onDelete, onAddObligation }: Props) {
    const amount = parseFloat(group.amount_of_allotment || '0')
    const pct = amount > 0 ? Math.min(100, (group.total_obligated / amount) * 100) : 0

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── Breadcrumb ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/20 shrink-0">
                <button
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:text-foreground transition font-gmedium"
                >
                    RAOD
                </button>
                <ChevronRight size={11} className="text-muted-foreground shrink-0" />
                <span className="text-xs font-gbold text-foreground truncate flex-1">{group.saro_no || '—'}</span>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground shrink-0 ml-1"
                >
                    <X size={14} />
                </button>
            </div>

            {/* ── Scrollable body ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

                {/* SARO header */}
                <div className="px-4 py-4 border-b border-border/50 bg-muted/5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Allotment No.</p>
                            <h3 className="text-base font-gbold text-foreground mt-0.5">{group.saro_no || '—'}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{group.date_of_saro}</p>
                        </div>
                        <button
                            onClick={onAddObligation}
                            className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-2.5 py-1.5 rounded-lg font-gmedium transition shrink-0"
                        >
                            <Plus size={11} /> Add Obligation
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                        <Detail label="PAP Code" value={group.pap_code || '—'} />
                        <Detail label="Obj. Code" value={group.object_code || '—'} />
                        {group.pap && <Detail label="Program" value={group.pap} />}
                        {group.object_description && <Detail label="Description" value={group.object_description} />}
                        {group.fund_source_detail && (
                            <Detail label="Fund Source" value={`${group.fund_source_detail.code} — ${group.fund_source_detail.name}`} />
                        )}
                        {group.class_type_detail && (
                            <Detail label="Class Type" value={`${group.class_type_detail.code} — ${group.class_type_detail.name}`} />
                        )}
                    </div>
                </div>

                {/* Summary cards */}
                <div className="px-4 pt-4 pb-3 border-b border-border/50">
                    <div className="grid grid-cols-3 gap-2">
                        <SummaryCard label="Amount" value={fmtPHP(group.amount_of_allotment)} />
                        <SummaryCard label="Obligated" value={fmtPHP(group.total_obligated)} color="text-emerald-600 dark:text-emerald-400" />
                        <SummaryCard
                            label="Unobligated"
                            value={fmtPHP(group.unobligated)}
                            color={group.unobligated >= 0 ? 'text-amber-500' : 'text-destructive'}
                        />
                    </div>

                    {/* Utilization bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                            <span className="text-muted-foreground">Utilization</span>
                            <span className="font-gbold text-amber-500">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                            <span>{group.entries.length} obligation{group.entries.length !== 1 ? 's' : ''}</span>
                            <span>{fmtPHP(group.total_obligated)} obligated</span>
                        </div>
                    </div>
                </div>

                {/* Obligations list */}
                <div className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-gbold text-foreground uppercase tracking-wide">Obligations</span>
                        <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-gmedium">
                            {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>

                    {group.entries.length === 0 ? (
                        <p className="text-xs text-center text-muted-foreground py-6">No obligations recorded yet.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {/* Initial allotment row */}
                            <div className="flex items-center justify-between rounded-lg bg-muted/20 border border-border/50 px-3 py-2.5">
                                <span className="text-xs text-muted-foreground font-gmedium uppercase tracking-wide">Initial Allotment</span>
                                <div className="text-right">
                                    <div className="text-[10px] text-muted-foreground">Balance</div>
                                    <div className="text-xs font-gbold text-emerald-600 dark:text-emerald-400">{fmtPHP(group.amount_of_allotment)}</div>
                                </div>
                            </div>

                            {/* Obligation entries with running balance */}
                            {(() => {
                                let running = parseFloat(group.amount_of_allotment || '0')
                                return group.entries.map((entry, idx) => {
                                    const obAmt = parseFloat(entry.obligated_amount || '0')
                                    running -= obAmt
                                    const snap = running
                                    return (
                                        <div key={entry.id} className="rounded-lg bg-background border border-border overflow-hidden">
                                            <div className="flex items-start justify-between px-3 py-2.5 gap-2">
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <span className="text-[10px] text-muted-foreground mt-0.5 shrink-0 w-4 text-center">{idx + 1}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-gmedium text-foreground truncate">
                                                            {entry.name_of_claimant || '—'}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            {entry.date_of_obligation || entry.date || '—'}
                                                            {entry.ors_no ? ` · ORS: ${entry.ors_no}` : ''}
                                                        </p>
                                                        {(entry.class_type_detail || entry.fund_source_detail) && (
                                                            <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-gmedium mt-1 inline-block">
                                                                {[entry.class_type_detail?.code, entry.fund_source_detail?.code].filter(Boolean).join(' / ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[10px] text-muted-foreground">Obligated</div>
                                                    <div className="text-xs font-gbold text-foreground">{fmtPHP(entry.obligated_amount)}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">Remaining</div>
                                                    <div className={`text-xs font-gbold ${snap >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                                        {fmtPHP(snap)}
                                                    </div>
                                                </div>
                                            </div>
                                            {entry.particulars && (
                                                <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground line-clamp-2">
                                                    {entry.particulars}
                                                </div>
                                            )}
                                            <div className="border-t border-border/50 px-3 py-1.5 flex gap-1 justify-end">
                                                <button
                                                    onClick={() => onView(entry)}
                                                    className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                                ><Eye size={11} /></button>
                                                <button
                                                    onClick={() => onEdit(entry)}
                                                    className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                                ><Pencil size={11} /></button>
                                                <button
                                                    onClick={() => onDelete(entry.id)}
                                                    className="p-1 rounded hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"
                                                ><Trash2 size={11} /></button>
                                            </div>
                                        </div>
                                    )
                                })
                            })()}

                            {/* Totals row */}
                            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
                                <span className="text-xs text-muted-foreground font-gbold uppercase tracking-wide">Totals</span>
                                <div className="text-right">
                                    <div className="text-xs font-gbold text-foreground">{fmtPHP(group.total_obligated)}</div>
                                    <div className={`text-xs font-gbold ${group.unobligated >= 0 ? 'text-amber-500' : 'text-destructive'}`}>
                                        {fmtPHP(group.unobligated)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── NTCA Section ─────────────────────────────────────────── */}
                <div className="px-4 py-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-gbold text-foreground uppercase tracking-wide">Tagged NTCAs</span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 rounded-full px-2 py-0.5 font-gmedium">
                            {ntcas.length} {ntcas.length === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>
                    {ntcas.length === 0 ? (
                        <p className="text-xs text-center text-muted-foreground py-4">No NTCAs tagged to this SARO.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {ntcas.map(ntca => (
                                <div key={ntca.id} className="rounded-lg bg-background border border-border overflow-hidden">
                                    <div className="flex items-start justify-between px-3 py-2.5 gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-gbold text-foreground">{ntca.ntca_no}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{ntca.date_of_ntca}</p>
                                            {ntca.nca_no && (
                                                <p className="text-[10px] text-muted-foreground">NCA: {ntca.nca_no}</p>
                                            )}
                                            {(ntca.class_type_detail || ntca.fund_source_detail) && (
                                                <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-gmedium mt-1 inline-block">
                                                    {[ntca.class_type_detail?.code, ntca.fund_source_detail?.code].filter(Boolean).join(' / ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] text-muted-foreground">Amount</div>
                                            <div className="text-xs font-gbold text-blue-500">{fmtPHP(ntca.amount)}</div>
                                        </div>
                                    </div>
                                    {ntca.particulars && (
                                        <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground line-clamp-2">
                                            {ntca.particulars}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
