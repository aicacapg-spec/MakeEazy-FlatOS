'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonTable } from '@/lib/components/ui'
import type { Flat, Tenant, Agreement } from '@/lib/types/database'

interface MonthlyData {
    month: string
    demanded: number
    collected: number
    expenses: number
    netIncome: number
}

interface FlatReport {
    flat_number: string
    status: string
    annualRent: number
    collected: number
    outstanding: number
    collectionRate: number
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [flatReports, setFlatReports] = useState<FlatReport[]>([])
    const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'flat'>('overview')

    // Summary totals
    const [summary, setSummary] = useState({
        totalRevenue: 0, totalExpenses: 0, netIncome: 0,
        totalDepositsHeld: 0, totalOutstanding: 0, occupiedFlats: 0, vacantFlats: 0,
    })

    useEffect(() => {
        async function loadReports() {
            setLoading(true)
            const supabase = createClient()
            const { data: authUser } = await supabase.auth.getUser()
            if (!authUser.user) return
            const { data: profile } = await supabase.from('users').select('org_id').eq('id', authUser.user.id).single()
            if (!profile?.org_id) { setLoading(false); return }
            const orgId = profile.org_id

            const [flatRes, payRes, demRes, expRes, depRes] = await Promise.all([
                supabase.from('flats').select('id, flat_number, status, monthly_rent, monthly_maintenance').eq('org_id', orgId),
                supabase.from('payments').select('amount, date, flat_id').eq('org_id', orgId),
                supabase.from('rent_demands').select('flat_id, billing_month, total_demand, status').eq('org_id', orgId),
                supabase.from('expenses').select('amount, date').eq('org_id', orgId),
                supabase.from('deposits').select('amount, type').eq('org_id', orgId),
            ])

            const flats = flatRes.data || []
            const payments = payRes.data || []
            const demands = demRes.data || []
            const expenses = expRes.data || []
            const deposits = depRes.data || []

            // Monthly aggregation — last 12 months
            const months: MonthlyData[] = []
            for (let i = 11; i >= 0; i--) {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)

                const demanded = demands.filter(x => x.billing_month === monthStr).reduce((s, x) => s + (x.total_demand || 0), 0)
                const collected = payments.filter(p => {
                    const pd = new Date(p.date)
                    return pd >= monthStart && pd <= monthEnd
                }).reduce((s, p) => s + p.amount, 0)
                const exp = expenses.filter(e => {
                    const ed = new Date(e.date)
                    return ed >= monthStart && ed <= monthEnd
                }).reduce((s, e) => s + e.amount, 0)

                months.push({
                    month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                    demanded, collected, expenses: exp, netIncome: collected - exp,
                })
            }
            setMonthlyData(months)

            // Flat-wise report
            const flatColumns: FlatReport[] = flats.map(f => {
                const flatDemands = demands.filter(d => d.flat_id === f.id)
                const flatPayments = payments.filter(p => p.flat_id === f.id)
                const totalDemanded = flatDemands.reduce((s, d) => s + (d.total_demand || 0), 0)
                const totalCollected = flatPayments.reduce((s, p) => s + p.amount, 0)
                const outstanding = Math.max(0, totalDemanded - totalCollected)
                return {
                    flat_number: f.flat_number,
                    status: f.status,
                    annualRent: (f.monthly_rent || 0) * 12,
                    collected: totalCollected,
                    outstanding,
                    collectionRate: totalDemanded > 0 ? Math.round((totalCollected / totalDemanded) * 100) : 0,
                }
            }).sort((a, b) => b.collected - a.collected)
            setFlatReports(flatColumns)

            // Summary totals
            const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
            const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
            const depositsHeld = deposits.filter(d => d.type === 'initial' || d.type === 'additional').reduce((s, d) => s + d.amount, 0)
            const depositsRefunded = deposits.filter(d => d.type === 'refund').reduce((s, d) => s + d.amount, 0)
            const pendingDemands = demands.filter(d => d.status === 'pending' || d.status === 'partial' || d.status === 'overdue')
            const totalOutstanding = pendingDemands.reduce((s, d) => s + (d.total_demand || 0), 0)

            setSummary({
                totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses,
                totalDepositsHeld: depositsHeld - depositsRefunded,
                totalOutstanding,
                occupiedFlats: flats.filter(f => f.status === 'occupied').length,
                vacantFlats: flats.filter(f => f.status === 'vacant').length,
            })

            setLoading(false)
        }
        loadReports()
    }, [])

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
    const fmtShort = (n: number) => {
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
        return `₹${n}`
    }

    const maxBarVal = Math.max(...monthlyData.map(m => Math.max(m.demanded, m.collected, m.expenses))) || 1

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="page-description">Financial summaries, collection trends, and flat-wise performance</p>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                    All time · {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </div>
            </div>

            {loading ? (
                <SkeletonTable rows={5} cols={5} />
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="summary-cards">
                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>📈</span></div>
                            <div className="summary-card-label">Total Revenue</div>
                            <div className="summary-card-value" style={{ color: '#059669' }}>{fmtShort(summary.totalRevenue)}</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>📉</span></div>
                            <div className="summary-card-label">Total Expenses</div>
                            <div className="summary-card-value" style={{ color: '#dc2626' }}>{fmtShort(summary.totalExpenses)}</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>💎</span></div>
                            <div className="summary-card-label">Net Income</div>
                            <div className="summary-card-value" style={{ color: summary.netIncome >= 0 ? '#059669' : '#dc2626' }}>{fmtShort(summary.netIncome)}</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-card-icon" style={{ background: '#fffbeb' }}><span style={{ fontSize: 20 }}>🏦</span></div>
                            <div className="summary-card-label">Deposits Held</div>
                            <div className="summary-card-value">{fmtShort(summary.totalDepositsHeld)}</div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 20, width: 'fit-content' }}>
                        {(['overview', 'monthly', 'flat'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all 0.15s', textTransform: 'capitalize',
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
                                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                            }}>
                                {tab === 'overview' ? '📊 Overview' : tab === 'monthly' ? '📅 Monthly' : '🏠 Flat-wise'}
                            </button>
                        ))}
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="card">
                                <h3 className="card-title" style={{ marginBottom: 16 }}>Revenue vs Expenses Summary</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                        { label: 'Revenue Collected', value: summary.totalRevenue, color: '#10b981' },
                                        { label: 'Total Expenses', value: summary.totalExpenses, color: '#ef4444' },
                                        { label: 'Net Operating Income', value: summary.netIncome, color: 'var(--color-primary)' },
                                        { label: 'Outstanding Dues', value: summary.totalOutstanding, color: '#f59e0b' },
                                        { label: 'Security Deposits Held', value: summary.totalDepositsHeld, color: '#8b5cf6' },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: item.color }}>{fmt(item.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="card-title" style={{ marginBottom: 16 }}>Occupancy Overview</h3>
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{
                                        position: 'relative', width: 160, height: 160, margin: '0 auto 20px',
                                        borderRadius: '50%',
                                        background: `conic-gradient(#10b981 0% ${summary.occupiedFlats / ((summary.occupiedFlats + summary.vacantFlats) || 1) * 100}%, #ef4444 ${summary.occupiedFlats / ((summary.occupiedFlats + summary.vacantFlats) || 1) * 100}% 100%)`,
                                    }}>
                                        <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                            <div style={{ fontSize: 24, fontWeight: 900 }}>
                                                {summary.occupiedFlats + summary.vacantFlats > 0
                                                    ? Math.round((summary.occupiedFlats / (summary.occupiedFlats + summary.vacantFlats)) * 100)
                                                    : 0}%
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Occupied</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', fontSize: 13 }}>
                                        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 3, marginRight: 4 }}></span>Occupied: {summary.occupiedFlats}</span>
                                        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 3, marginRight: 4 }}></span>Vacant: {summary.vacantFlats}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Monthly Tab */}
                    {activeTab === 'monthly' && (
                        <div>
                            {/* Bar Chart */}
                            <div className="card" style={{ marginBottom: 16 }}>
                                <h3 className="card-title" style={{ marginBottom: 20 }}>Monthly Collection Trend (Last 12 Months)</h3>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 8px' }}>
                                    {monthlyData.map((m, i) => (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 140 }}>
                                                <div title={`Demanded: ${fmt(m.demanded)}`} style={{ width: 10, background: '#e0e7ff', borderRadius: '3px 3px 0 0', height: `${(m.demanded / maxBarVal) * 100}%`, minHeight: m.demanded > 0 ? 2 : 0 }} />
                                                <div title={`Collected: ${fmt(m.collected)}`} style={{ width: 10, background: '#10b981', borderRadius: '3px 3px 0 0', height: `${(m.collected / maxBarVal) * 100}%`, minHeight: m.collected > 0 ? 2 : 0 }} />
                                                <div title={`Expenses: ${fmt(m.expenses)}`} style={{ width: 10, background: '#fca5a5', borderRadius: '3px 3px 0 0', height: `${(m.expenses / maxBarVal) * 100}%`, minHeight: m.expenses > 0 ? 2 : 0 }} />
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>{m.month}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
                                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#e0e7ff', borderRadius: 2, marginRight: 4 }}></span>Demanded</span>
                                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 4 }}></span>Collected</span>
                                    <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fca5a5', borderRadius: 2, marginRight: 4 }}></span>Expenses</span>
                                </div>
                            </div>

                            {/* Monthly Table */}
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead><tr><th>Month</th><th>Demanded</th><th>Collected</th><th>Expenses</th><th>Net Income</th><th>Collection %</th></tr></thead>
                                        <tbody>
                                            {[...monthlyData].reverse().map((m, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{m.month}</td>
                                                    <td>{fmt(m.demanded)}</td>
                                                    <td style={{ color: '#059669', fontWeight: 600 }}>{fmt(m.collected)}</td>
                                                    <td style={{ color: '#dc2626' }}>{fmt(m.expenses)}</td>
                                                    <td style={{ fontWeight: 700, color: m.netIncome >= 0 ? '#059669' : '#dc2626' }}>{fmt(m.netIncome)}</td>
                                                    <td>
                                                        {m.demanded > 0 ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                                                                    <div style={{
                                                                        height: '100%', borderRadius: 3,
                                                                        width: `${Math.min(100, (m.collected / m.demanded) * 100)}%`,
                                                                        background: m.collected >= m.demanded ? '#10b981' : '#f59e0b',
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{Math.round((m.collected / m.demanded) * 100)}%</span>
                                                            </div>
                                                        ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Flat-wise Tab */}
                    {activeTab === 'flat' && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {flatReports.length === 0 ? (
                                <div className="empty-state"><h3>No flat data</h3><p>Add flats and record payments to see flat-wise reports.</p></div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead><tr><th>Flat</th><th>Status</th><th>Annual Rent</th><th>Collected</th><th>Outstanding</th><th>Collection Rate</th></tr></thead>
                                        <tbody>
                                            {flatReports.map((f, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 700 }}>Flat {f.flat_number}</td>
                                                    <td><span className="badge" style={{
                                                        background: f.status === 'occupied' ? '#ecfdf5' : f.status === 'vacant' ? '#fef2f2' : '#f1f5f9',
                                                        color: f.status === 'occupied' ? '#059669' : f.status === 'vacant' ? '#dc2626' : '#64748b',
                                                        textTransform: 'capitalize' as const,
                                                    }}>{f.status}</span></td>
                                                    <td>{fmt(f.annualRent)}</td>
                                                    <td style={{ fontWeight: 600, color: '#059669' }}>{fmt(f.collected)}</td>
                                                    <td style={{ fontWeight: 600, color: f.outstanding > 0 ? '#dc2626' : '#059669' }}>{fmt(f.outstanding)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                                                                <div style={{
                                                                    height: '100%', borderRadius: 3, width: `${Math.min(100, f.collectionRate)}%`,
                                                                    background: f.collectionRate >= 90 ? '#10b981' : f.collectionRate >= 70 ? '#f59e0b' : '#ef4444',
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}>{f.collectionRate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
