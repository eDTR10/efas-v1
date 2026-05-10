import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
    LayoutDashboard,
    ScrollText,
    FileText,
    BookMarked,
    Settings,
    ClipboardList,
    Users,
    LogOut,
    Menu,
    X,
    ChevronRight,
    User as UserIcon,
} from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from '@/components/mode-toggle'
import efasApi from '@/plugin/axios'
import efasLogo from '@/assets/eFAS_Logo.png'

const NAV_ITEMS = [
    { to: '/efas-v1/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/efas-v1/raod', label: 'RAOD', icon: ScrollText },
    { to: '/efas-v1/received-saro', label: 'SARO Received', icon: FileText },
    { to: '/efas-v1/reports', label: 'Reports', icon: BookMarked },
    { to: '/efas-v1/settings', label: 'Settings', icon: Settings },
    { to: '/efas-v1/audit-trail', label: 'Audit Trail', icon: ClipboardList },
    { to: '/efas-v1/user-management', label: 'User Management', icon: Users },
]

export default function AppLayout() {
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)

    const user = (() => {
        try { return JSON.parse(localStorage.getItem('efas_user') || '{}') } catch { return {} }
    })()

    const displayName = user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.email || user?.name || ''

    const initials = displayName
        ? displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : '?'

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleLogout = () => {
        const token = localStorage.getItem('efas_token')
        if (token) {
            efasApi.post('token/logout/', {}, { headers: { Authorization: `Token ${token}` } }).catch(() => { })
        }
        localStorage.removeItem('efas_token')
        localStorage.removeItem('efas_user')
        navigate('/efas-v1/login')
    }

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="relative flex items-center justify-center bg-primary border-b border-border/30 px-4 py-4" style={{ minHeight: 64 }}>
                <img
                    src={efasLogo}
                    alt="eFAS"
                    className={`object-contain shrink-0 transition-all duration-300 ${collapsed && !mobile ? 'h-10 w-10' : 'h-12 w-auto'}`}
                />
                {!mobile && (
                    <button
                        onClick={() => setCollapsed(p => !p)}
                        className="absolute right-3 text-white/60 hover:text-white transition"
                    >
                        <ChevronRight size={16} className={`transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 flex flex-col gap-1 py-4 px-2 overflow-y-auto">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all
              ${isActive
                                ? 'bg-primary text-white font-gmedium shadow'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }
              ${collapsed && !mobile ? 'justify-center px-2' : ''}
              `
                        }
                    >
                        <Icon size={18} className="min-w-[18px]" />
                        {(!collapsed || mobile) && <span>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-border px-2 py-4 flex flex-col gap-2">
                {(!collapsed || mobile) && user?.email && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                        Signed in as <span className="font-gmedium text-foreground">{displayName}</span>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition ${collapsed && !mobile ? 'justify-center px-2' : ''}`}
                >
                    <LogOut size={18} className="min-w-[18px]" />
                    {(!collapsed || mobile) && <span>Log Out</span>}
                </button>
            </div>
        </div>
    )

    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <div className="flex h-screen w-screen overflow-hidden bg-background">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}
                    style={{ minWidth: collapsed ? 64 : 240 }}
                >
                    <SidebarContent />
                </aside>

                {/* Mobile overlay */}
                {mobileOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <SidebarContent mobile />
                </aside>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Topbar */}
                    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                className="md:hidden text-muted-foreground hover:text-foreground transition"
                                onClick={() => setMobileOpen(p => !p)}
                            >
                                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <ModeToggle />

                            {/* Avatar + dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen(p => !p)}
                                    className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-gbold select-none shadow">
                                        {initials}
                                    </div>
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 top-11 z-50 w-56 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border">
                                            <p className="text-sm font-gmedium text-foreground truncate">{displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate('/efas-v1/settings') }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
                                            >
                                                <UserIcon size={15} className="text-muted-foreground" />
                                                Profile
                                            </button>
                                            <button
                                                onClick={() => { setProfileOpen(false); handleLogout() }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition"
                                            >
                                                <LogOut size={15} />
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="flex-1 overflow-y-auto p-5">
                        <Outlet />
                    </main>
                </div>
            </div>
        </ThemeProvider>
    )
}
