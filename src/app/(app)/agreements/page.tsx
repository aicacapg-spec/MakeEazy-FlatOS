'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import { DownloadTemplateButton, ExportDataButton, BulkImportButton, MODULE_COLUMNS } from '@/lib/components/bulk-operations'
import type { Agreement, Flat, Tenant } from '@/lib/types/database'

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    sent: { bg: '#eff6ff', color: '#2563eb', label: 'Sent' },
    signed: { bg: '#ecfdf5', color: '#059669', label: 'Signed' },
    registered: { bg: '#f0fdf4', color: '#15803d', label: 'Registered' },
    expired: { bg: '#fef2f2', color: '#dc2626', label: 'Expired' },
    terminated: { bg: '#fef2f2', color: '#b91c1c', label: 'Terminated' },
    under_process: { bg: '#fffbeb', color: '#d97706', label: 'Under Process' },
}

function daysUntil(dateStr: string): number {
    const d = new Date(dateStr)
    const now = new Date()
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDaysLabel(days: number): { text: string; color: string } {
    if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, color: '#dc2626' }
    if (days <= 30) return { text: `${days}d left ⚠️`, color: '#d97706' }
    if (days <= 90) return { text: `${days}d left`, color: '#f59e0b' }
    return { text: `${days}d left`, color: '#059669' }
}

export default function AgreementsPage() {
    const [agreements, setAgreements] = useState<(Agreement & { flat_number?: string; tenant_name?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        const [agrRes, flatRes, tenantRes] = await Promise.all([
            supabase.from('agreements').select('*').order('end_date', { ascending: true }),
            supabase.from('flats').select('*').order('flat_number'),
            supabase.from('tenants').select('*').order('full_name'),
        ])

        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        const tenantMap = new Map((tenantRes.data || []).map(t => [t.id, t.full_name]))

        const enriched = (agrRes.data || []).map(a => ({
            ...a,
            flat_number: a.flat_id ? flatMap.get(a.flat_id) || '—' : '—',
            tenant_name: a.tenant_id ? tenantMap.get(a.tenant_id) || '—' : '—',
        }))

        setAgreements(enriched as (Agreement & { flat_number?: string; tenant_name?: string })[])
        setFlats(flatRes.data as Flat[] || [])
        setTenants(tenantRes.data as Tenant[] || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = agreements.filter(a => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                (a.flat_number || '').toLowerCase().includes(q) ||
                (a.tenant_name || '').toLowerCase().includes(q) ||
                (a.agreement_type || '').toLowerCase().includes(q)
            )
        }
        return true
    })

    const activeAgreements = agreements.filter(a => a.status === 'signed' || a.status === 'registered')
    const expiringSoon = activeAgreements.filter(a => {
        const days = daysUntil(a.end_date)
        return days >= 0 && days <= 60
    })
    const expired = agreements.filter(a => a.status === 'expired' || (a.status !== 'terminated' && daysUntil(a.end_date) < 0))

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Agreement Management</h1>
                    <p className="page-description">Track agreements, renewals, and compliance for all flats</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DownloadTemplateButton moduleName="Agreements" columns={MODULE_COLUMNS.agreements as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} />
                    <ExportDataButton moduleName="Agreements" columns={MODULE_COLUMNS.agreements as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={filtered as unknown as Record<string, unknown>[]} />
                    <BulkImportButton moduleName="Agreements" tableName="agreements" columns={MODULE_COLUMNS.agreements as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={[]} onImportComplete={loadData} lookupMaps={{ flat_number: new Map(flats.map(f => [f.flat_number, f.id])) }} />
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        New Agreement
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>
                    </div>
                    <div className="summary-card-label">Total Agreements</div>
                    <div className="summary-card-value">{agreements.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                    </div>
                    <div className="summary-card-label">Active</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{activeAgreements.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                    </div>
                    <div className="summary-card-label">Expiring ≤ 60 days</div>
                    <div className="summary-card-value" style={{ color: '#d97706' }}>{expiringSoon.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                    </div>
                    <div className="summary-card-label">Expired</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{expired.length}</div>
                </div>
            </div>

            {/* Expiring Soon Alert */}
            {expiringSoon.length > 0 && (
                <div style={{
                    padding: '16px 20px', marginBottom: 16, borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                    border: '1px solid #fcd34d',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                        <strong style={{ color: '#92400e' }}>Renewal Alert:</strong>
                        <span style={{ color: '#78350f', marginLeft: 8 }}>
                            {expiringSoon.length} agreement{expiringSoon.length > 1 ? 's' : ''} expiring within 60 days.
                            {expiringSoon.map(a => ` Flat ${a.flat_number} (${daysUntil(a.end_date)}d)`).join(',')}
                        </span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <input type="text" className="form-input" placeholder="🔍 Search by flat, tenant, or type..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ fontSize: 13 }} />
                    </div>
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 180 }}>
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="signed">Signed</option>
                        <option value="registered">Registered</option>
                        <option value="under_process">Under Process</option>
                        <option value="expired">Expired</option>
                        <option value="terminated">Terminated</option>
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} agreement{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={6} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                        <h3>{agreements.length === 0 ? 'No agreements yet' : 'No agreements match'}</h3>
                        <p>{agreements.length === 0 ? 'Create your first agreement to start tracking.' : 'Try adjusting your filters.'}</p>
                        {agreements.length === 0 && (
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Create First Agreement</button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Flat</th>
                                    <th>Tenant</th>
                                    <th>Type</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Days Left</th>
                                    <th>Rent</th>
                                    <th>Deposit</th>
                                    <th>Escalation</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => {
                                    const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft
                                    const days = daysUntil(a.end_date)
                                    const daysInfo = getDaysLabel(days)
                                    const isActive = a.status === 'signed' || a.status === 'registered'
                                    return (
                                        <tr key={a.id}>
                                            <td>
                                                <Link href={`/agreements/${a.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                    Flat {a.flat_number}
                                                </Link>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{a.tenant_name}</td>
                                            <td style={{ textTransform: 'capitalize', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {a.agreement_type?.replace(/_/g, ' ')}
                                            </td>
                                            <td style={{ fontSize: 13 }}>{new Date(a.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ fontSize: 13 }}>{new Date(a.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>
                                                {isActive && (
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: daysInfo.color }}>
                                                        {daysInfo.text}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{fmt(a.rent_amount)}</td>
                                            <td>{fmt(a.deposit_amount)}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{a.escalation_percent}%</td>
                                            <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link href={`/agreements/${a.id}`} className="btn btn-ghost btn-sm">View →</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddAgreementModal
                    flats={flats} tenants={tenants}
                    onClose={() => setShowAddModal(false)}
                    onSaved={() => { setShowAddModal(false); loadData() }}
                />
            )}
        </div>
    )
}

// ─── Add Agreement Modal ──────────────────────────────────
function AddAgreementModal({ flats, tenants, onClose, onSaved }: {
    flats: Flat[]; tenants: Tenant[]; onClose: () => void; onSaved: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        flat_id: '', tenant_id: '', agreement_type: 'leave_and_license',
        start_date: '', end_date: '', rent_amount: '', maintenance_amount: '',
        deposit_amount: '', lock_in_months: '6', notice_period_months: '1',
        escalation_percent: '5', replacement_charge: '15000', status: 'draft',
    })

    function update(k: string, v: string) {
        setForm(p => ({ ...p, [k]: v }))
        // Auto-set end date to 11 months from start
        if (k === 'start_date' && v) {
            const start = new Date(v)
            start.setMonth(start.getMonth() + 11)
            setForm(p => ({ ...p, end_date: start.toISOString().split('T')[0] }))
        }
        // Auto-populate rent from flat
        if (k === 'flat_id' && v) {
            const flat = flats.find(f => f.id === v)
            if (flat) {
                setForm(p => ({
                    ...p,
                    rent_amount: String(flat.monthly_rent || ''),
                    maintenance_amount: String(flat.monthly_maintenance || ''),
                }))
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }

        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setError('Organization not found'); setLoading(false); return }

        const { error: err } = await supabase.from('agreements').insert({
            org_id: profile.org_id,
            flat_id: form.flat_id,
            tenant_id: form.tenant_id || null,
            agreement_type: form.agreement_type,
            start_date: form.start_date,
            end_date: form.end_date,
            rent_amount: parseFloat(form.rent_amount) || 0,
            maintenance_amount: parseFloat(form.maintenance_amount) || 0,
            deposit_amount: parseFloat(form.deposit_amount) || 0,
            lock_in_months: parseInt(form.lock_in_months) || 6,
            notice_period_months: parseInt(form.notice_period_months) || 1,
            escalation_percent: parseFloat(form.escalation_percent) || 5,
            replacement_charge: parseFloat(form.replacement_charge) || 0,
            status: form.status as Agreement['status'],
        })

        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const selectedFlat = flats.find(f => f.id === form.flat_id)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                <h2 className="modal-title">New Agreement (UVPL Master Format)</h2>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--color-primary)' : 'var(--border-color)', transition: 'background 0.2s' }} />
                    ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Step {step} of 3 — {step === 1 ? 'Parties & Type' : step === 2 ? 'Terms & Financials' : 'Clauses & Confirm'}
                </div>

                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Flat *</label>
                                <select className="form-select" value={form.flat_id} onChange={e => update('flat_id', e.target.value)} required>
                                    <option value="">Select flat</option>
                                    {flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number} — {f.flat_type} ({f.status})</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tenant / Licensee</label>
                                <select className="form-select" value={form.tenant_id} onChange={e => update('tenant_id', e.target.value)}>
                                    <option value="">Select tenant (optional)</option>
                                    {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.status})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Agreement Type</label>
                                <select className="form-select" value={form.agreement_type} onChange={e => update('agreement_type', e.target.value)}>
                                    <option value="leave_and_license">Leave & License</option>
                                    <option value="rental">Rental Agreement</option>
                                    <option value="commercial">Commercial Lease</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={e => update('status', e.target.value)}>
                                    <option value="draft">Draft</option>
                                    <option value="sent">Sent for Signing</option>
                                    <option value="signed">Signed</option>
                                    <option value="registered">Registered</option>
                                    <option value="under_process">Under Process</option>
                                </select>
                            </div>
                            {selectedFlat && (
                                <div style={{ gridColumn: 'span 2', padding: 16, background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 8 }}>
                                        Selected: Flat {selectedFlat.flat_number}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {selectedFlat.flat_type} · {selectedFlat.floor} Floor · Rent: ₹{selectedFlat.monthly_rent?.toLocaleString('en-IN')} · Maintenance: ₹{selectedFlat.monthly_maintenance?.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input className="form-input" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date *</label>
                                <input className="form-input" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} required />
                                {form.start_date && form.end_date && (
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Duration: {Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monthly Rent (₹) *</label>
                                <input className="form-input" type="number" placeholder="25000" value={form.rent_amount} onChange={e => update('rent_amount', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Maintenance (₹)</label>
                                <input className="form-input" type="number" placeholder="5000" value={form.maintenance_amount} onChange={e => update('maintenance_amount', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Security Deposit (₹) *</label>
                                <input className="form-input" type="number" placeholder="200000" value={form.deposit_amount} onChange={e => update('deposit_amount', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Annual Escalation (%)</label>
                                <input className="form-input" type="number" value={form.escalation_percent} onChange={e => update('escalation_percent', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Lock-in Period (months)</label>
                                <input className="form-input" type="number" value={form.lock_in_months} onChange={e => update('lock_in_months', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>As per UVPL master format</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notice Period (months)</label>
                                <input className="form-input" type="number" value={form.notice_period_months} onChange={e => update('notice_period_months', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Replacement Charge (₹)</label>
                                <input className="form-input" type="number" value={form.replacement_charge} onChange={e => update('replacement_charge', e.target.value)} />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Charged if tenant leaves before lock-in period</div>
                            </div>

                            {/* UVPL Agreement Summary */}
                            <div style={{
                                gridColumn: 'span 2', padding: 20, borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                                border: '1px solid #c7d2fe',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--color-primary)' }}>📋 Agreement Summary (UVPL Format)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Rent:</span> <strong>₹{parseInt(form.rent_amount || '0').toLocaleString('en-IN')}</strong>/month</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Maintenance:</span> <strong>₹{parseInt(form.maintenance_amount || '0').toLocaleString('en-IN')}</strong>/month</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Deposit:</span> <strong>₹{parseInt(form.deposit_amount || '0').toLocaleString('en-IN')}</strong></div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Escalation:</span> <strong>{form.escalation_percent}%</strong> per annum</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Lock-in:</span> <strong>{form.lock_in_months}</strong> months</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Notice:</span> <strong>{form.notice_period_months}</strong> month(s)</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 24 }}>
                        <div>{step > 1 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            {step < 3 ? (
                                <button type="button" className="btn btn-primary" onClick={() => {
                                    if (step === 1 && !form.flat_id) return
                                    if (step === 2 && (!form.start_date || !form.end_date || !form.rent_amount)) return
                                    setStep(step + 1)
                                }}>Next →</button>
                            ) : (
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Creating...</> : 'Create Agreement'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
