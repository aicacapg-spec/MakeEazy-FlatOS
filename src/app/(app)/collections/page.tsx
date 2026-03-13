'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/utils/get-org-id'
import { generateRentDemandsAction, recordPaymentAction } from '@/app/actions/payments'
import { generateRentReceiptHTML } from '@/lib/templates/agreement-template'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import type { Flat } from '@/lib/types/database'

interface RentDemand {
    id: string; org_id: string; flat_id: string; billing_month: string;
    rent_amount: number; maintenance_amount: number; late_fee: number;
    total_demand: number; due_date: string; status: string;
    is_prorata: boolean; occupied_days: number | null; total_days: number | null;
    created_at: string; updated_at: string;
}

interface Payment {
    id: string; org_id: string; flat_id: string; tenant_id: string | null;
    demand_id: string | null; receipt_number: string | null; amount: number;
    date: string; mode: string; reference_number: string | null;
    rent_component: number; maintenance_component: number; late_fee_component: number;
    remarks: string | null; created_at: string;
    flat_number?: string; tenant_name?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
    partial: { bg: '#fef3c7', color: '#b45309', label: 'Partial' },
    paid: { bg: '#ecfdf5', color: '#059669', label: 'Paid' },
    overdue: { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
    waived: { bg: '#f1f5f9', color: '#64748b', label: 'Waived' },
}

const MODES: Record<string, string> = {
    upi: 'UPI', neft: 'NEFT', imps: 'IMPS', cash: 'Cash', cheque: 'Cheque', adjustment: 'Adjustment',
}

export default function CollectionsPage() {
    const [demands, setDemands] = useState<(RentDemand & { flat_number?: string })[]>([])
    const [payments, setPayments] = useState<(Payment & { flat_number?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [loading, setLoading] = useState(true)
    const [activeView, setActiveView] = useState<'demands' | 'payments'>('demands')
    const [monthFilter, setMonthFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showGenerateModal, setShowGenerateModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        const [demRes, payRes, flatRes] = await Promise.all([
            supabase.from('rent_demands').select('*').order('billing_month', { ascending: false }),
            supabase.from('payments').select('*').order('date', { ascending: false }),
            supabase.from('flats').select('*').order('flat_number'),
        ])

        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        setFlats(flatRes.data as Flat[] || [])
        setDemands((demRes.data || []).map(d => ({ ...d, flat_number: flatMap.get(d.flat_id) || '—' })) as (RentDemand & { flat_number?: string })[])
        setPayments((payRes.data || []).map(p => ({ ...p, flat_number: flatMap.get(p.flat_id) || '—' })) as (Payment & { flat_number?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filteredDemands = demands.filter(d => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false
        if (monthFilter && d.billing_month !== monthFilter) return false
        return true
    })

    const filteredPayments = payments.filter(p => {
        if (monthFilter) {
            const pMonth = new Date(p.date).toISOString().slice(0, 7)
            if (pMonth !== monthFilter) return false
        }
        return true
    })

    const totalDemand = filteredDemands.reduce((sum, d) => sum + (d.total_demand || 0), 0)
    const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
    const outstanding = totalDemand - totalCollected
    const collectionRate = totalDemand > 0 ? Math.round((totalCollected / totalDemand) * 100) : 0

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    // Get available months
    const months = [...new Set(demands.map(d => d.billing_month))].sort().reverse()

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Collections & Payments</h1>
                    <p className="page-description">Generate rent demands, record payments, and track outstanding dues</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setShowGenerateModal(true)}>
                        📋 Generate Demands
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                        💰 Record Payment
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /></svg>
                    </div>
                    <div className="summary-card-label">Total Demand</div>
                    <div className="summary-card-value">{fmt(totalDemand)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <div className="summary-card-label">Collected</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{fmt(totalCollected)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    </div>
                    <div className="summary-card-label">Outstanding</div>
                    <div className="summary-card-value" style={{ color: outstanding > 0 ? '#dc2626' : '#059669' }}>{fmt(outstanding)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: collectionRate >= 90 ? '#ecfdf5' : collectionRate >= 70 ? '#fffbeb' : '#fef2f2' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={collectionRate >= 90 ? '#10b981' : collectionRate >= 70 ? '#f59e0b' : '#ef4444'} strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                    </div>
                    <div className="summary-card-label">Collection Rate</div>
                    <div className="summary-card-value" style={{ color: collectionRate >= 90 ? '#059669' : collectionRate >= 70 ? '#d97706' : '#dc2626' }}>{collectionRate}%</div>
                </div>
            </div>

            {/* View Toggle + Filters */}
            <div className="card" style={{ marginBottom: 16, padding: '12px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 'var(--radius-md)', padding: 2 }}>
                        <button
                            onClick={() => setActiveView('demands')}
                            style={{
                                padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                                background: activeView === 'demands' ? 'white' : 'transparent',
                                color: activeView === 'demands' ? 'var(--color-primary)' : 'var(--text-secondary)',
                                boxShadow: activeView === 'demands' ? 'var(--shadow-sm)' : 'none',
                            }}
                        >📋 Demands ({filteredDemands.length})</button>
                        <button
                            onClick={() => setActiveView('payments')}
                            style={{
                                padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                                background: activeView === 'payments' ? 'white' : 'transparent',
                                color: activeView === 'payments' ? 'var(--color-primary)' : 'var(--text-secondary)',
                                boxShadow: activeView === 'payments' ? 'var(--shadow-sm)' : 'none',
                            }}
                        >💰 Payments ({filteredPayments.length})</button>
                    </div>

                    <select className="form-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="">All Months</option>
                        {months.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</option>)}
                    </select>
                    {activeView === 'demands' && (
                        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={6} cols={8} />
                ) : activeView === 'demands' ? (
                    filteredDemands.length === 0 ? (
                        <div className="empty-state">
                            <h3>No demands yet</h3>
                            <p>Generate rent demands for occupied flats to start tracking collections.</p>
                            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>📋 Generate Demands</button>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Flat</th><th>Month</th><th>Rent</th><th>Maintenance</th><th>Late Fee</th><th>Total</th><th>Due Date</th><th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDemands.map(d => {
                                        const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending
                                        return (
                                            <tr key={d.id}>
                                                <td><Link href={`/flats/${d.flat_id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>Flat {d.flat_number}</Link></td>
                                                <td>{new Date(d.billing_month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                                                <td>{fmt(d.rent_amount)}</td>
                                                <td>{fmt(d.maintenance_amount)}</td>
                                                <td style={{ color: d.late_fee > 0 ? '#dc2626' : 'var(--text-secondary)' }}>{fmt(d.late_fee)}</td>
                                                <td style={{ fontWeight: 700 }}>{fmt(d.total_demand)}</td>
                                                <td style={{ fontSize: 13 }}>{d.due_date ? new Date(d.due_date).toLocaleDateString('en-IN') : '—'}</td>
                                                <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    filteredPayments.length === 0 ? (
                        <div className="empty-state">
                            <h3>No payments recorded</h3>
                            <p>Record a payment once a tenant pays their rent.</p>
                            <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>💰 Record Payment</button>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Receipt #</th><th>Flat</th><th>Date</th><th>Amount</th><th>Mode</th><th>Ref.</th><th>Rent</th><th>Maint.</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.receipt_number || '—'}</td>
                                            <td><Link href={`/flats/${p.flat_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600 }}>Flat {p.flat_number}</Link></td>
                                            <td style={{ fontSize: 13 }}>{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ fontWeight: 700, color: '#059669' }}>{fmt(p.amount)}</td>
                                            <td><span className="badge badge-info">{MODES[p.mode] || p.mode}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.reference_number || '—'}</td>
                                            <td style={{ fontSize: 13 }}>{fmt(p.rent_component)}</td>
                                            <td style={{ fontSize: 13 }}>{fmt(p.maintenance_component)}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                                                    onClick={() => {
                                                        const flat = flats.find(f => f.id === p.flat_id)
                                                        const html = generateRentReceiptHTML({
                                                            receiptNumber: p.receipt_number || 'N/A',
                                                            date: p.date,
                                                            tenantName: p.tenant_name || 'Tenant',
                                                            flatNumber: flat?.flat_number || p.flat_number || '—',
                                                            propertyName: 'Property',
                                                            month: p.demand_id ? (demands.find(d => d.id === p.demand_id)?.billing_month || '') : new Date(p.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                                                            rentAmount: p.rent_component || 0,
                                                            maintenanceAmount: p.maintenance_component || 0,
                                                            lateFee: Math.max(0, p.amount - (p.rent_component || 0) - (p.maintenance_component || 0)),
                                                            totalPaid: p.amount,
                                                            paymentMode: p.mode || 'cash',
                                                            referenceNumber: p.reference_number || '',
                                                            landlordName: 'Licensor',
                                                            landlordPAN: '',
                                                        })
                                                        const win = window.open('', '_blank')
                                                        if (win) { win.document.write(html); win.document.close() }
                                                    }}
                                                >🧾 Receipt</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Generate Demands Modal */}
            {showGenerateModal && (
                <GenerateDemandsModal flats={flats} onClose={() => setShowGenerateModal(false)} onSaved={() => { setShowGenerateModal(false); loadData() }} />
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <RecordPaymentModal flats={flats} demands={demands} onClose={() => setShowPaymentModal(false)} onSaved={() => { setShowPaymentModal(false); loadData() }} />
            )}
        </div>
    )
}

// ─── Generate Demands Modal ───────────────────────────────
function GenerateDemandsModal({ flats, onClose, onSaved }: { flats: Flat[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
    const now = new Date()
    const [billingMonth, setBillingMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    const [dueDate, setDueDate] = useState('')
    const [settingsLoaded, setSettingsLoaded] = useState(false)

    // Load billing rules from org settings
    useEffect(() => {
        async function loadSettings() {
            const supabase = createClient()
            const orgId = await getOrgId(supabase)
            if (!orgId) return
            const { data: org } = await supabase.from('organizations').select('settings').eq('id', orgId).single()
            const settings = (org?.settings as Record<string, unknown>) || {}
            const rules = (settings.billing_rules as Record<string, number>) || {}
            const dueDay = rules.rent_due_day || 5
            setDueDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`)
            setSettingsLoaded(true)
        }
        loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const occupiedFlats = flats.filter(f => f.status === 'occupied')

    // Check for duplicates when billing month changes
    useEffect(() => {
        async function checkDuplicates() {
            if (!billingMonth) return
            const supabase = createClient()
            const { data: existing } = await supabase
                .from('rent_demands')
                .select('flat_id')
                .eq('billing_month', billingMonth)
            if (existing && existing.length > 0) {
                const existingFlatIds = new Set(existing.map(e => e.flat_id))
                const dupes = occupiedFlats.filter(f => existingFlatIds.has(f.id))
                if (dupes.length > 0) {
                    setDuplicateWarning(`${dupes.length} flat(s) already have demands for ${billingMonth}. They will be skipped.`)
                } else {
                    setDuplicateWarning(null)
                }
            } else {
                setDuplicateWarning(null)
            }
        }
        checkDuplicates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billingMonth])

    async function handleGenerate() {
        setLoading(true)
        setError(null)

        const result = await generateRentDemandsAction(billingMonth, dueDate)

        if (!result.success) { setError(result.error || 'Failed to generate demands'); setLoading(false); return }

        if (result.skipped && result.skipped > 0 && result.created === 0) {
            setError(`All ${result.skipped} flat(s) already have demands for this month`)
            setLoading(false)
            return
        }

        onSaved()
    }

    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h2 className="modal-title">Generate Rent Demands</h2>
                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-group">
                    <label className="form-label">Billing Month</label>
                    <input className="form-input" type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Will generate demands for {occupiedFlats.length} occupied flat{occupiedFlats.length !== 1 ? 's' : ''}:</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxHeight: 120, overflowY: 'auto' }}>
                        {occupiedFlats.length === 0 ? (
                            <span>No occupied flats. Mark flats as &quot;Occupied&quot; first.</span>
                        ) : (
                            occupiedFlats.map(f => (
                                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span>Flat {f.flat_number}</span>
                                    <span style={{ fontWeight: 600 }}>₹{((f.monthly_rent || 0) + (f.monthly_maintenance || 0)).toLocaleString('en-IN')}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                {duplicateWarning && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: '#92400e' }}>
                        ⚠️ {duplicateWarning}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" disabled={loading || occupiedFlats.length === 0} onClick={handleGenerate}>
                        {loading ? 'Generating...' : `Generate ${occupiedFlats.length} Demand${occupiedFlats.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── FY Receipt Number Generator ──────────────────────────
async function generateReceiptNumber(supabase: ReturnType<typeof createClient>, orgId: string): Promise<string> {
    const now = new Date()
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const fyLabel = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`
    const prefix = `RCP/${fyLabel}/`

    // Get latest receipt number for this FY
    const { data } = await supabase
        .from('payments')
        .select('receipt_number')
        .eq('org_id', orgId)
        .like('receipt_number', `${prefix}%`)
        .order('receipt_number', { ascending: false })
        .limit(1)

    let nextNum = 1
    if (data && data.length > 0 && data[0].receipt_number) {
        const lastNum = parseInt(data[0].receipt_number.replace(prefix, ''), 10)
        if (!isNaN(lastNum)) nextNum = lastNum + 1
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`
}

// ─── Record Payment Modal ─────────────────────────────────
function RecordPaymentModal({ flats, demands, onClose, onSaved }: {
    flats: Flat[]; demands: (RentDemand & { flat_number?: string })[]; onClose: () => void; onSaved: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        flat_id: '', demand_id: '', amount: '', date: new Date().toISOString().split('T')[0],
        mode: 'upi', reference_number: '', rent_component: '', maintenance_component: '', remarks: '',
    })

    function update(k: string, v: string) {
        setForm(p => ({ ...p, [k]: v }))
        if (k === 'demand_id' && v) {
            const demand = demands.find(d => d.id === v)
            if (demand) {
                setForm(p => ({
                    ...p,
                    flat_id: demand.flat_id,
                    amount: String(demand.total_demand),
                    rent_component: String(demand.rent_amount),
                    maintenance_component: String(demand.maintenance_amount),
                }))
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await recordPaymentAction({
            flat_id: form.flat_id,
            demand_id: form.demand_id || undefined,
            amount: form.amount,
            date: form.date,
            mode: form.mode,
            reference_number: form.reference_number || undefined,
            rent_component: form.rent_component,
            maintenance_component: form.maintenance_component,
            remarks: form.remarks || undefined,
        })

        if (!result.success) { setError(result.error || 'Failed to record payment'); setLoading(false); return }
        onSaved()
    }

    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [onClose])

    const pendingDemands = demands.filter(d => d.status === 'pending' || d.status === 'partial')

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                <h2 className="modal-title">Record Payment</h2>
                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Link to Demand (optional)</label>
                            <select className="form-select" value={form.demand_id} onChange={e => update('demand_id', e.target.value)}>
                                <option value="">— Direct payment —</option>
                                {pendingDemands.map(d => (
                                    <option key={d.id} value={d.id}>
                                        Flat {d.flat_number} — {d.billing_month} — ₹{d.total_demand?.toLocaleString('en-IN')} ({d.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {!form.demand_id && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Flat *</label>
                                <select className="form-select" value={form.flat_id} onChange={e => update('flat_id', e.target.value)} required>
                                    <option value="">Select flat</option>
                                    {flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Amount (₹) *</label>
                            <input className="form-input" type="number" value={form.amount} onChange={e => update('amount', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input className="form-input" type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mode *</label>
                            <select className="form-select" value={form.mode} onChange={e => update('mode', e.target.value)}>
                                {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reference #</label>
                            <input className="form-input" placeholder="UTR / Check #" value={form.reference_number} onChange={e => update('reference_number', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rent Component</label>
                            <input className="form-input" type="number" value={form.rent_component} onChange={e => update('rent_component', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Maintenance Component</label>
                            <input className="form-input" type="number" value={form.maintenance_component} onChange={e => update('maintenance_component', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Remarks</label>
                            <input className="form-input" value={form.remarks} onChange={e => update('remarks', e.target.value)} placeholder="Optional notes..." />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Recording...' : '💰 Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
