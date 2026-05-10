import { useEffect, useRef, useState } from 'react'
import efasApi from '@/plugin/axios'
import {
    Plus, Pencil, Trash2, Search, X, Shield, UserCheck, UserX,
    RefreshCw, Key,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserRecord {
    id: number
    email: string
    first_name: string
    last_name: string
    role: string
    position: string
    office: number | null
    acc_lvl: number
    is_active: boolean
    is_staff: boolean
    projects: number[]
}

interface Office {
    office_id: number
    name: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_CHOICES = [
    { value: 'admin', label: 'Admin' },
    { value: 'budget', label: 'Budget' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'provincial_officer', label: 'Provincial Officer' },
    { value: 'user', label: 'User' },
]

const ROLE_BADGE: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    budget: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    accounting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    cashier: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    provincial_officer: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    user: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    budget: 'Budget',
    accounting: 'Accounting',
    cashier: 'Cashier',
    provincial_officer: 'Provincial Officer',
    user: 'User',
}

const emptyForm = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
    position: '',
    office: '' as string | number,
    is_active: true,
    is_staff: false,
    acc_lvl: 3,
}

// ─── User Form Dialog ─────────────────────────────────────────────────────────

function UserFormDialog({
    mode,
    initial,
    offices,
    onClose,
    onSaved,
}: {
    mode: 'add' | 'edit'
    initial?: UserRecord | null
    offices: Office[]
    onClose: () => void
    onSaved: () => void
}) {
    const [form, setForm] = useState(() =>
        mode === 'edit' && initial
            ? {
                first_name: initial.first_name,
                last_name: initial.last_name,
                email: initial.email,
                password: '',
                role: initial.role || 'user',
                position: initial.position || '',
                office: initial.office ?? '',
                is_active: initial.is_active,
                is_staff: initial.is_staff,
                acc_lvl: initial.acc_lvl,
            }
            : { ...emptyForm }
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (k: string, v: string | boolean | number) => {
        setForm(p => ({ ...p, [k]: v }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            const payload: Record<string, unknown> = {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                role: form.role,
                position: form.position.trim(),
                office: form.office === '' ? null : Number(form.office),
                is_active: form.is_active,
                acc_lvl: Number(form.acc_lvl),
            }
            if (form.password) payload.password = form.password

            if (mode === 'add') {
                await efasApi.post('users/manage/', payload)
            } else {
                await efasApi.patch(`users/manage/${initial!.id}/`, payload)
            }
            onSaved()
            onClose()
        } catch (err: any) {
            const data = err.response?.data
            if (typeof data === 'object') {
                const msgs = Object.entries(data)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join(' | ')
                setError(msgs)
            } else {
                setError('An error occurred. Please try again.')
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-primary" />
                        <h2 className="text-base font-gmedium text-foreground">
                            {mode === 'add' ? 'Add New User' : 'Edit User'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                    {error && (
                        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    {/* Name row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground">First Name *</label>
                            <input
                                required
                                value={form.first_name}
                                onChange={e => handleChange('first_name', e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder="Juan"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-gmedium text-muted-foreground">Last Name *</label>
                            <input
                                required
                                value={form.last_name}
                                onChange={e => handleChange('last_name', e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder="Dela Cruz"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground">Email Address *</label>
                        <input
                            required
                            type="email"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="juan@dict.gov.ph"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground flex items-center gap-1">
                            <Key size={12} />
                            {mode === 'add' ? 'Password *' : 'New Password (leave blank to keep current)'}
                        </label>
                        <input
                            required={mode === 'add'}
                            type="password"
                            value={form.password}
                            onChange={e => handleChange('password', e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder={mode === 'add' ? '••••••••' : 'Leave blank to keep current'}
                        />
                    </div>

                    {/* Role */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground">Role *</label>
                        <select
                            required
                            value={form.role}
                            onChange={e => handleChange('role', e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                            {ROLE_CHOICES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Position */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground">Position</label>
                        <input
                            value={form.position}
                            onChange={e => handleChange('position', e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="e.g. Budget Officer II"
                        />
                    </div>

                    {/* Office */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-gmedium text-muted-foreground">Office</label>
                        <select
                            value={form.office}
                            onChange={e => handleChange('office', e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                            <option value="">— None —</option>
                            {offices.map(o => (
                                <option key={o.office_id} value={o.office_id}>{o.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Is Active */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={form.is_active}
                            onChange={e => handleChange('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <label htmlFor="is_active" className="text-sm text-foreground select-none">
                            Account is Active
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : mode === 'add' ? 'Create User' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({
    user,
    onClose,
    onDeleted,
}: {
    user: UserRecord
    onClose: () => void
    onDeleted: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setLoading(true)
        setError('')
        try {
            await efasApi.delete(`users/manage/${user.id}/`)
            onDeleted()
            onClose()
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete user.')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="px-6 py-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <Trash2 size={18} className="text-destructive" />
                        </div>
                        <div>
                            <p className="font-gmedium text-foreground text-sm">Delete User</p>
                            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                        </div>
                    </div>
                    <p className="text-sm text-foreground">
                        Are you sure you want to permanently delete{' '}
                        <span className="font-gmedium">{user.first_name} {user.last_name}</span>?
                    </p>
                    {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                </div>
                <div className="flex justify-end gap-2 px-6 pb-5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition disabled:opacity-60"
                    >
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Container ───────────────────────────────────────────────────────────

export default function UserManagementContainer() {
    const [users, setUsers] = useState<UserRecord[]>([])
    const [offices, setOffices] = useState<Office[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [editTarget, setEditTarget] = useState<UserRecord | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const scrollStartX = useRef(0)

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [usersRes, officesRes] = await Promise.all([
                efasApi.get('users/manage/'),
                efasApi.get('office/slim/'),
            ])
            setUsers(usersRes.data)
            setOffices(officesRes.data)
        } catch {
            /* silently handled */
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const officeMap = Object.fromEntries(offices.map(o => [o.office_id, o.name]))

    const filtered = users.filter(u => {
        const matchSearch =
            !search ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.position?.toLowerCase().includes(search.toLowerCase())
        const matchRole = !filterRole || u.role === filterRole
        return matchSearch && matchRole
    })

    const onDragStart = (e: React.MouseEvent) => {
        isDragging.current = true
        dragStartX.current = e.clientX
        scrollStartX.current = tableRef.current?.scrollLeft ?? 0
    }
    const onDragMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !tableRef.current) return
        tableRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current)
    }
    const onDragEnd = () => { isDragging.current = false }

    return (
        <div className="flex flex-col gap-5">
            {/* Page header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-gbold text-foreground">User Management</h1>
                <p className="text-sm text-muted-foreground">
                    Manage system accounts and role assignments.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users…"
                        className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Role filter */}
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <option value="">All Roles</option>
                    {ROLE_CHOICES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>

                {/* Refresh */}
                <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>

                {/* Add user */}
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition ml-auto"
                >
                    <Plus size={15} />
                    Add User
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-3">
                {[
                    { label: 'Total', count: users.length, color: 'text-foreground' },
                    { label: 'Active', count: users.filter(u => u.is_active).length, color: 'text-green-600 dark:text-green-400' },
                    { label: 'Inactive', count: users.filter(u => !u.is_active).length, color: 'text-red-600 dark:text-red-400' },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-2 flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <span className={`text-sm font-gmedium ${s.color}`}>{s.count}</span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div
                    ref={tableRef}
                    className="overflow-x-auto cursor-grab select-none"
                    onMouseDown={onDragStart}
                    onMouseMove={onDragMove}
                    onMouseUp={onDragEnd}
                    onMouseLeave={onDragEnd}
                >
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Email</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Role</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Position</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Office</th>
                                <th className="text-left px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                                <th className="text-right px-4 py-3 font-gmedium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                        Loading users…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u, i) => (
                                    <tr
                                        key={u.id}
                                        className={`border-b border-border/60 hover:bg-muted/30 transition ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                                    >
                                        {/* Name */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-gbold shrink-0">
                                                    {`${u.first_name[0] || ''}${u.last_name[0] || ''}`.toUpperCase()}
                                                </div>
                                                <span className="font-gmedium text-foreground whitespace-nowrap">
                                                    {u.first_name} {u.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Email */}
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email}</td>
                                        {/* Role */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-gmedium ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}>
                                                {ROLE_LABEL[u.role] || u.role}
                                            </span>
                                        </td>
                                        {/* Position */}
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.position || '—'}</td>
                                        {/* Office */}
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                            {u.office ? officeMap[u.office] || `ID ${u.office}` : '—'}
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {u.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-gmedium text-green-600 dark:text-green-400">
                                                    <UserCheck size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-gmedium text-red-500">
                                                    <UserX size={12} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    onClick={() => setEditTarget(u)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                                                    title="Edit user"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(u)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                {!loading && (
                    <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                        Showing {filtered.length} of {users.length} users
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {showAdd && (
                <UserFormDialog
                    mode="add"
                    offices={offices}
                    onClose={() => setShowAdd(false)}
                    onSaved={fetchAll}
                />
            )}
            {editTarget && (
                <UserFormDialog
                    mode="edit"
                    initial={editTarget}
                    offices={offices}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchAll}
                />
            )}
            {deleteTarget && (
                <DeleteDialog
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetchAll}
                />
            )}
        </div>
    )
}
