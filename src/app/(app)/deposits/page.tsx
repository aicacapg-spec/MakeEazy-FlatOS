'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import type { Flat, Tenant } from '@/lib/types/database'

interface Deposit {
    id: string; org_id: string; flat_id: string; tenant_id: string | null;
    type: string; amount: number; mode: string | null; reference_number: string | null;
    date: string; remarks: string | null; created_at: string;
}

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    initial: { bg: '#ecfdf5', color: '#059669', label: 'Initial', icon: '💰' },
    additional: { bg: '#eff6ff', color: '#2563eb', label: 'Additional', icon: '➕' },
    deduction: { bg: '#fef2f2', color: '#dc2626', label: 'Deduction', icon: '➖' },
    refund: { bg: '#fffbeb', color: '#d97706', label: 'Refund', icon: '↩️' },
    replacement: { bg: '#faf5ff', color: '#7c3aed', label: 'Replacement', icon: '🔄' },
}

const MODES: Record<string, string> = { upi: 'UPI', neft: 'NEFT', imps: 'IMPS', cash: 'Cash', cheque: 'Cheque', adjustment: 'Adjustment' }

export default function DepositsPage() {
    const [deposits, setDeposits] = useState<(Deposit & { flat_number?: string; tenant_name?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const [depRes, flatRes, tenRes] = await Promise.all([
            supabase.from('deposits').select('*').order('date', { ascending: false }),
            supabase.from('flats').select('*').order('flat_number'),
            supabase.from('tenants').select('*').order('full_name'),
        ])
        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        const tenMap = new Map((tenRes.data || []).map(t => [t.id, t.full_name]))
        setFlats(flatRes.data as Flat[] || [])
        setTenants(tenRes.data as Tenant[] || [])
        setDeposits((depRes.data || []).map(d => ({
            ...d, flat_number: flatMap.get(d.flat_id) || '—', tenant_name: d.tenant_id ? tenMap.get(d.tenant_id) || '—' : '—',
        })) as (Deposit & { flat_number?: string; tenant_name?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = typeFilter === 'all' ? deposits : deposits.filter(d => d.type === typeFilter)
    const totalHeld = deposits.filter(d => d.type === 'initial' || d.type === 'additional').reduce((s, d) => s + d.amount, 0)
    const totalRefunded = deposits.filter(d => d.type === 'refund').reduce((s, d) => s + d.amount, 0)
    const totalDeducted = deposits.filter(d => d.type === 'deduction').reduce((s, d) => s + d.amount, 0)
    const netHeld = totalHeld - totalRefunded - totalDeducted

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Deposit Management</h1>
                    <p className="page-description">Track security deposits, refunds, and deductions for all flats</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Record Deposit</button>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>💰</span></div>
                    <div className="summary-card-label">Deposits Received</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{fmt(totalHeld)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}><span style={{ fontSize: 20 }}>↩️</span></div>
                    <div className="summary-card-label">Refunded</div>
                    <div className="summary-card-value" style={{ color: '#d97706' }}>{fmt(totalRefunded)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>➖</span></div>
                    <div className="summary-card-label">Deductions</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{fmt(totalDeducted)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>🏦</span></div>
                    <div className="summary-card-label">Net Held</div>
                    <div className="summary-card-value">{fmt(netHeld)}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 180 }}>
                        <option value="all">All Types</option>
                        {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><h3>No deposits recorded</h3><p>Record a deposit when a tenant pays a security deposit.</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Record Deposit</button></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Flat</th><th>Tenant</th><th>Type</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Remarks</th></tr></thead>
                            <tbody>
                                {filtered.map(d => {
                                    const tc = TYPE_CONFIG[d.type] || TYPE_CONFIG.initial
                                    return (
                                        <tr key={d.id}>
                                            <td style={{ fontSize: 13 }}>{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ fontWeight: 700 }}><Link href={`/flats/${d.flat_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Flat {d.flat_number}</Link></td>
                                            <td>{d.tenant_id ? <Link href={`/tenants/${d.tenant_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{d.tenant_name}</Link> : '—'}</td>
                                            <td><span className="badge" style={{ background: tc.bg, color: tc.color }}>{tc.icon} {tc.label}</span></td>
                                            <td style={{ fontWeight: 700, color: d.type === 'refund' || d.type === 'deduction' ? '#dc2626' : '#059669' }}>
                                                {d.type === 'refund' || d.type === 'deduction' ? '-' : '+'}{fmt(d.amount)}
                                            </td>
                                            <td><span className="badge badge-info">{MODES[d.mode || ''] || d.mode || '—'}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.reference_number || '—'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.remarks || '—'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h2 className="modal-title">Record Deposit</h2>
                        <DepositForm flats={flats} tenants={tenants} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function DepositForm({ flats, tenants, onClose, onSaved }: { flats: Flat[]; tenants: Tenant[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ flat_id: '', tenant_id: '', type: 'initial', amount: '', mode: 'neft', reference_number: '', date: new Date().toISOString().split('T')[0], remarks: '' })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setError('No org'); setLoading(false); return }
        const { error: err } = await supabase.from('deposits').insert({
            org_id: profile.org_id, flat_id: form.flat_id, tenant_id: form.tenant_id || null,
            type: form.type, amount: parseFloat(form.amount), mode: form.mode,
            reference_number: form.reference_number || null, date: form.date, remarks: form.remarks || null,
        })
        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label className="form-label">Flat *</label>
                    <select className="form-select" value={form.flat_id} onChange={e => setForm(p => ({ ...p, flat_id: e.target.value }))} required>
                        <option value="">Select flat</option>{flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Tenant</label>
                    <select className="form-select" value={form.tenant_id} onChange={e => setForm(p => ({ ...p, tenant_id: e.target.value }))}>
                        <option value="">Select tenant</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Type *</label>
                    <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                        {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label>
                    <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Mode</label>
                    <select className="form-select" value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}>
                        {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Reference #</label>
                    <input className="form-input" value={form.reference_number} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Remarks</label>
                    <input className="form-input" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Record Deposit'}</button>
            </div>
        </form>
    )
}
