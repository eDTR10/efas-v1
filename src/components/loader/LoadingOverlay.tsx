interface Props {
    message?: string
}

export default function LoadingOverlay({ message }: Props) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-3">
                <img
                    src={`${import.meta.env.BASE_URL.replace(/\/?$/, '/')}loading.gif`}
                    alt="Loading..."
                    className="w-44 h-44 object-contain"
                />
                {message && (
                    <p className="text-sm text-muted-foreground font-gmedium">{message}</p>
                )}
            </div>
        </div>
    )
}
