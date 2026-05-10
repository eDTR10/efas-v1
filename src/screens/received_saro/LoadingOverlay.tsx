// ─── Shared CRUD loading overlay ─────────────────────────────────────────────

interface Props {
    message?: string
    sub?: string
}

export default function LoadingOverlay({ message = 'Processing…', sub = 'Please wait. Do not close this window.' }: Props) {
    return (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl px-10 py-10 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full">
                {/* Spinning coin */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    {/* Outer ring pulse */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping" />
                    {/* Spinning arc */}
                    <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '1.2s' }}>
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary)/0.15)" strokeWidth="5" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="5"
                            strokeDasharray="213" strokeDashoffset="160" strokeLinecap="round" />
                    </svg>
                    {/* Money bag emoji */}
                    <span className="text-3xl select-none">&#x1F4B0;</span>
                </div>

                <div className="text-center flex flex-col gap-1">
                    <p className="font-gbold text-foreground text-base">{message}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
            </div>
        </div>
    )
}
