'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../layout'
import Link from 'next/link'
import { SkeletonPage } from '@/lib/components/ui'

interface DashboardStats {
    totalFlats: number
    occupied: number
    vacant: number
    office: number
    activeTenants: number
    kycPendingCount: number
    thisMonthCollected: number
    thisMonthExpected: number
    outstanding: number
    overdueCount: number
    expiringSoon: { flat_number: string; days: number; tenant_name: string }[]
    recentPayments: { flat_number: string; amount: number; date: string; mode: string }[]
    flatsData: { flat_number: string; status: string; id: string }[]
}

const STATUS_COLORS: Record<string, string> = {
    occupied: '#10b981',
    vacant: '#ef4444',
    office: '#94a3b8',
    under_repair: '#f59e0b',
    blocked: '#6b7280',
    reserved: '#8b5cf6',
}

export default function DashboardPage() {
    const { user } = useApp()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadDashboard() {
            const supabase = createClient()
            const { data: authUser } = await supabase.auth.getUser()
            if (!authUser.user) return

            const { data: profile } = await supabase.from('users').select('org_id').eq('id', authUser.user.id).single()
            if (!profile?.org_id) { setLoading(false); return }
            const orgId = profile.org_id

            // Load all data in parallel
            const [flatsRes, tenantsRes, agreementsRes, demandsRes, paymentsRes] = await Promise.all([
                supabase.from('flats').select('id, flat_number, status, monthly_rent, monthly_maintenance').eq('org_id', orgId),
                supabase.from('tenants').select('id, full_name, status, kyc_status, flat_id').eq('org_id', orgId),
                supabase.from('agreements').select('id, flat_id, end_date, status, tenant_id').eq('org_id', orgId).in('status', ['signed', 'registered']),
                supabase.from('rent_demands').select('id, flat_id, total_demand, status, billing_month').eq('org_id', orgId),
                supabase.from('payments').select('id, flat_id, amount, date, mode').eq('org_id', orgId).order('date', { ascending: false }).limit(5),
            ])

            const flats = flatsRes.data || []
            const tenants = tenantsRes.data || []
            const agreements = agreementsRes.data || []
            const demands = demandsRes.data || []
            const payments = paymentsRes.data || []

            // Flat stats
            const totalFlats = flats.length
            const occupied = flats.filter(f => f.status === 'occupied').length
            const vacant = flats.filter(f => f.status === 'vacant').length
            const office = flats.filter(f => f.status === 'office').length

            // Tenant stats
            const activeTenants = tenants.filter(t => t.status === 'active').length
            const kycPending = tenants.filter(t => t.kyc_status !== 'complete' && t.status === 'active').length

            // Monthly financial stats
            const now = new Date()
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const monthDemands = demands.filter(d => d.billing_month === currentMonth)
            const thisMonthExpected = monthDemands.reduce((s, d) => s + (d.total_demand || 0), 0)

            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            const monthPayments = payments.filter(p => new Date(p.date) >= monthStart)
            const thisMonthCollected = monthPayments.reduce((s, p) => s + p.amount, 0)

            // Outstanding
            const pendingDemands = demands.filter(d => d.status === 'pending' || d.status === 'partial' || d.status === 'overdue')
            const outstanding = pendingDemands.reduce((s, d) => s + (d.total_demand || 0), 0)
            const overdueCount = demands.filter(d => d.status === 'overdue').length

            // Expiring agreements
            const flatMap = new Map(flats.map(f => [f.id, f.flat_number]))
            const tenantMap = new Map(tenants.map(t => [t.id, t.full_name]))
            const expiringSoon = agreements
                .map(a => {
                    const days = Math.ceil((new Date(a.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    return {
                        flat_number: flatMap.get(a.flat_id) || '—',
                        days,
                        tenant_name: a.tenant_id ? tenantMap.get(a.tenant_id) || '—' : '—',
                    }
                })
                .filter(a => a.days <= 60)
                .sort((a, b) => a.days - b.days)
                .slice(0, 4)

            // Recent payments
            const recentPayments = payments.slice(0, 5).map(p => ({
                flat_number: flatMap.get(p.flat_id) || '—',
                amount: p.amount,
                date: p.date,
                mode: p.mode,
            }))

            // Flat status grid
            const flatsData = flats.map(f => ({ flat_number: f.flat_number, status: f.status, id: f.id }))

            setStats({
                totalFlats, occupied, vacant, office, activeTenants, kycPendingCount: kycPending,
                thisMonthCollected, thisMonthExpected, outstanding, overdueCount,
                expiringSoon, recentPayments, flatsData,
            })
            setLoading(false)
        }
        loadDashboard()
    }, [])

    const fmt = (n: number) => {
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
        if (n >= 1000) return `₹${Math.round(n / 1000)}K`
        return `₹${n.toLocaleString('en-IN')}`
    }

    const fmtFull = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    const occupancyPct = stats ? Math.min(100, Math.round((stats.occupied / (stats.totalFlats || 1)) * 100)) : 0
    const collectionPct = stats && stats.thisMonthExpected > 0
        ? Math.min(100, Math.round((stats.thisMonthCollected / stats.thisMonthExpected) * 100))
        : 0

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-description">
                        Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}! Here&apos;s your property overview.
                    </p>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>Today</div>
                    <div>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>

            {loading ? (
                <SkeletonPage />
            ) : !stats ? (
                <div className="empty-state">
                    <h3>No data yet</h3>
                    <p>Add your first flat to get started.</p>
                    <Link href="/flats" className="btn btn-primary">Go to Flats →</Link>
                </div>
            ) : (
                <>
                    {/* Hero KPI Cards */}
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: 'var(--color-info-light)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg>
                            </div>
                            <div className="summary-card-label">Occupancy</div>
                            <div className="summary-card-value">{stats.occupied}/{stats.totalFlats}</div>
                            <div className="summary-card-secondary">{occupancyPct}% · {stats.vacant} vacant · {stats.office} office</div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: 'var(--color-success-light)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <div className="summary-card-label">This Month</div>
                            <div className="summary-card-value">{fmt(stats.thisMonthCollected)}</div>
                            <div className="summary-card-secondary">
                                {collectionPct}% of {fmt(stats.thisMonthExpected)} expected
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: 'var(--color-danger-light)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                            </div>
                            <div className="summary-card-label">Outstanding</div>
                            <div className="summary-card-value" style={{ color: stats.outstanding > 0 ? '#dc2626' : '#059669' }}>{fmt(stats.outstanding)}</div>
                            <div className="summary-card-secondary">{stats.overdueCount} flats overdue</div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: 'var(--color-warning-light)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
                            </div>
                            <div className="summary-card-label">Expiring Soon</div>
                            <div className="summary-card-value" style={{ color: stats.expiringSoon.length > 0 ? '#d97706' : '#059669' }}>{stats.expiringSoon.length}</div>
                            <div className="summary-card-secondary">agreements within 60 days</div>
                        </div>
                    </div>

                    {/* Flat Status Grid */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Flat Status Grid</h3>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', alignItems: 'center' }}>
                                {[['#10b981', 'Occupied'], ['#ef4444', 'Vacant'], ['#94a3b8', 'Office'], ['#f59e0b', 'Repair']].map(([c, l]) => (
                                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 10, height: 10, background: c, borderRadius: 3, display: 'inline-block' }}></span> {l}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {stats.flatsData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                                <Link href="/flats" className="btn btn-primary">+ Add Flats</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                                {stats.flatsData.sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true })).map(f => (
                                    <Link key={f.id} href={`/flats/${f.id}`} style={{
                                        padding: '14px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                                        fontWeight: 700, fontSize: 14, color: 'white', textDecoration: 'none',
                                        background: STATUS_COLORS[f.status] || '#94a3b8',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        display: 'block',
                                    }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                                    >
                                        {f.flat_number}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Expiring Agreements / Alerts */}
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 16 }}>⚠️ Alerts</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {stats.expiringSoon.length === 0 && stats.kycPendingCount === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                                        ✅ No active alerts
                                    </div>
                                ) : (
                                    <>
                                        {stats.expiringSoon.map((a, i) => (
                                            <div key={i} style={{
                                                padding: '12px 14px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid',
                                                background: a.days < 0 ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
                                                borderLeftColor: a.days < 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                                            }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>Agreement {a.days < 0 ? 'Expired' : 'Expiring Soon'}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    Flat {a.flat_number} — {a.tenant_name} · {a.days < 0 ? `${Math.abs(a.days)}d ago` : `${a.days}d left`}
                                                </div>
                                            </div>
                                        ))}
                                        {stats.kycPendingCount > 0 && (
                                            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-danger)', background: 'var(--color-danger-light)' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>KYC Incomplete</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{stats.kycPendingCount} active tenant{stats.kycPendingCount > 1 ? 's' : ''} with pending documents</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Recent Payments */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">💰 Recent Payments</h3>
                                <Link href="/collections" className="btn btn-ghost btn-sm">View All →</Link>
                            </div>
                            {stats.recentPayments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                                    No payments yet. <Link href="/collections" style={{ color: 'var(--color-primary)' }}>Record one →</Link>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {stats.recentPayments.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>Flat {p.flat_number}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                    {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {p.mode.toUpperCase()}
                                                </div>
                                            </div>
                                            <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>{fmtFull(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
