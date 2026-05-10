function EmptyPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-gbold text-foreground">{title}</h1>
            <div className="bg-card border border-border rounded-xl p-16 flex items-center justify-center text-muted-foreground text-sm">
                This section is under development.
            </div>
        </div>
    )
}

export function DashboardPage() {
    return <EmptyPage title="Dashboard" />
}

export function RaodPage() {
    return <EmptyPage title="RAOD" />
}

export function ReceivedSaroPage() {
    return <EmptyPage title="SARO Received" />
}

export function ReportsPage() {
    return <EmptyPage title="Reports" />
}

export function SettingsPage() {
    return <EmptyPage title="Settings" />
}

export function AuditTrailPage() {
    return <EmptyPage title="Audit Trail" />
}

export function UserManagementPage() {
    return <EmptyPage title="User Management" />
}

