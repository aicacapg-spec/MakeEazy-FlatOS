'use client'

import { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { UserProfile } from '@/lib/types/database'
import { ToastProvider } from '@/lib/components/ui'

// ─── Context for user data across the app ──────────────────────────
interface AppContextType {
    user: UserProfile | null
    orgName: string
    loading: boolean
    signOut: () => Promise<void>
}

const AppContext = createContext<AppContextType>({
    user: null,
    orgName: '',
    loading: true,
    signOut: async () => { },
})

export function useApp() {
    return useContext(AppContext)
}

// ─── Sidebar Navigation Items ──────────────────────────────────────
const NAV_ITEMS = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', section: 'main', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Flats', route: '/flats', icon: 'flats', section: 'main', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Tenants', route: '/tenants', icon: 'tenants', section: 'main', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Agreements', route: '/agreements', icon: 'agreements', section: 'main', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Collections', route: '/collections', icon: 'collections', section: 'finance', allowedRoles: ['super_admin','owner','admin','accountant'] },
    { label: 'Deposits', route: '/deposits', icon: 'deposits', section: 'finance', allowedRoles: ['super_admin','owner','admin','accountant'] },
    { label: 'Expenses', route: '/expenses', icon: 'expenses', section: 'finance', allowedRoles: ['super_admin','owner','admin','accountant'] },
    { label: 'Complaints', route: '/complaints', icon: 'complaints', section: 'operations', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Vendors', route: '/vendors', icon: 'vendors', section: 'operations', allowedRoles: ['super_admin','owner','admin','accountant'] },
    { label: 'Documents', route: '/documents', icon: 'documents', section: 'operations', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Compliance', route: '/compliance', icon: 'compliance', section: 'operations', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer','viewer'] },
    { label: 'Reports', route: '/reports', icon: 'reports', section: 'reports', allowedRoles: ['super_admin','owner','admin','accountant','ca_reviewer'] },
    { label: 'Settings', route: '/settings', icon: 'settings', section: 'system', allowedRoles: ['super_admin','owner','admin'] },
]

// ─── SVG Icons ──────────────────────────────────────────────────────
function NavIcon({ name }: { name: string }) {
    const icons: Record<string, React.ReactElement> = {
        dashboard: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
        flats: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
            </svg>
        ),
        tenants: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        agreements: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
            </svg>
        ),
        collections: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
        deposits: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
        expenses: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M14 8H8" /><path d="M16 12H8" /><path d="M13 16H8" />
            </svg>
        ),
        complaints: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
        ),
        vendors: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
            </svg>
        ),
        documents: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
            </svg>
        ),
        compliance: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
            </svg>
        ),
        reports: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
        ),
        settings: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        ),
        menu: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
        ),
        bell: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
        ),
        logout: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" x2="9" y1="12" y2="12" />
            </svg>
        ),
    }
    return icons[name] || <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /></svg>
}

// ─── Section Titles ────────────────────────────────────────────────
const SECTIONS: Record<string, string> = {
    main: 'Main',
    finance: 'Finance',
    operations: 'Operations',
    reports: 'Reports',
    system: 'System',
}

// ─── App Layout Component ──────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [orgName, setOrgName] = useState('')
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const loadUser = useCallback(async () => {
        try {
            const supabase = createClient()
            const { data: { user: authUser } } = await supabase.auth.getUser()

            if (!authUser) {
                setLoading(false)
                return
            }

            // Try to get profile from users table
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (profile) {
                setUser(profile as UserProfile)

                // Get org name
                const { data: org } = await supabase
                    .from('organizations')
                    .select('name')
                    .eq('id', profile.org_id)
                    .single()
                if (org) setOrgName(org.name)
            } else {
                // Fallback: use auth metadata
                setUser({
                    id: authUser.id,
                    org_id: '',
                    email: authUser.email || '',
                    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                    phone: null,
                    role: 'admin',
                    avatar_url: null,
                    is_active: true,
                    last_login_at: null,
                    created_at: authUser.created_at,
                    updated_at: authUser.created_at,
                })
                setOrgName(authUser.user_metadata?.org_name || 'My Organization')
            }
        } catch (err) {
            console.error('[FlatOS] Error loading user profile:', err)
            // Set a basic fallback user so the app doesn't get stuck loading
            setUser({
                id: 'fallback',
                org_id: '',
                email: '',
                full_name: 'User',
                phone: null,
                role: 'admin',
                avatar_url: null,
                is_active: true,
                last_login_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            setOrgName('My Organization')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadUser()
    }, [loadUser])

    async function signOut() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick() { setDropdownOpen(false) }
        if (dropdownOpen) {
            document.addEventListener('click', handleClick)
            return () => document.removeEventListener('click', handleClick)
        }
    }, [dropdownOpen])

    // User initials
    const initials = user?.full_name
        ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '?'

    // Group nav items by section
    const sections = Object.keys(SECTIONS)

    if (loading) {
        return (
            <div className="loading-page" style={{ minHeight: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading FlatOS...</p>
                </div>
            </div>
        )
    }

    return (
        <AppContext.Provider value={{ user, orgName, loading, signOut }}>
            <ToastProvider>
                <div className="app-layout">
                    {/* Mobile overlay */}
                    {sidebarOpen && (
                        <div
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                zIndex: 45, display: 'none',
                            }}
                            className="sidebar-overlay"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                        <div className="sidebar-brand">
                            <h2>Make<span>Eazy</span> FlatOS</h2>
                            <p>{orgName || 'Property Management'}</p>
                        </div>

                        <nav className="sidebar-nav">
                            {sections.map(section => {
                                const userRole = user?.role || 'viewer'
                                const items = NAV_ITEMS.filter(i => i.section === section && i.allowedRoles.includes(userRole))
                                if (items.length === 0) return null
                                return (
                                    <div key={section}>
                                        <div className="sidebar-section-title">{SECTIONS[section]}</div>
                                        {items.map(item => (
                                            <Link
                                                key={item.route}
                                                href={item.route}
                                                className={`sidebar-link ${pathname === item.route || (pathname.startsWith(item.route) && item.route !== '/dashboard') ? 'active' : ''}`}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <NavIcon name={item.icon} />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                )
                            })}
                        </nav>

                        <div className="sidebar-footer">
                            <div style={{ fontSize: 11, color: '#475569' }}>
                                MakeEazy FlatOS v1.0
                            </div>
                        </div>
                    </aside>

                    {/* Main */}
                    <div className="main-content">
                        {/* Header */}
                        <header className="header">
                            <div className="header-left">
                                <button className="header-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                    <NavIcon name="menu" />
                                </button>
                                <div>
                                    <div className="header-title">{orgName || 'MakeEazy FlatOS'}</div>
                                    <div className="header-subtitle">Priya Mahalakshmi Towers</div>
                                </div>
                            </div>

                            <div className="header-right">
                                <button className="header-notification-btn">
                                    <NavIcon name="bell" />
                                    <span className="notification-badge"></span>
                                </button>

                                <div
                                    className="header-user"
                                    onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen) }}
                                >
                                    <div className="header-user-avatar">{initials}</div>
                                    <div className="header-user-info">
                                        <span className="header-user-name">{user?.full_name || 'User'}</span>
                                        <span className="header-user-role">{user?.role?.replace('_', ' ') || 'Admin'}</span>
                                    </div>

                                    {dropdownOpen && (
                                        <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                                            <div className="user-dropdown-item" style={{ fontWeight: 600, cursor: 'default' }}>
                                                {user?.email}
                                            </div>
                                            <div className="user-dropdown-separator" />
                                            <Link href="/settings" className="user-dropdown-item" onClick={() => setDropdownOpen(false)}>
                                                <NavIcon name="settings" /> Settings
                                            </Link>
                                            <div className="user-dropdown-separator" />
                                            <button className="user-dropdown-item danger" onClick={signOut}>
                                                <NavIcon name="logout" /> Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* Page content */}
                        <main className="page-content">
                            {children}
                        </main>

                        {/* Footer */}
                        <footer className="footer">
                            Powered by <a href="https://makeeazy.com" target="_blank" rel="noopener">MakeEazy</a> · © {new Date().getFullYear()} All rights reserved
                        </footer>
                    </div>
                </div>
            </ToastProvider>
        </AppContext.Provider>
    )
}
