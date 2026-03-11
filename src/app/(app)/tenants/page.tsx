'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import { DownloadTemplateButton, ExportDataButton, BulkImportButton, MODULE_COLUMNS } from '@/lib/components/bulk-operations'
import type { Tenant, Flat } from '@/lib/types/database'

const KYC_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    complete: { bg: '#ecfdf5', color: '#059669', label: 'Complete' },
    pending: { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
    incomplete: { bg: '#fef2f2', color: '#dc2626', label: 'Incomplete' },
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#ecfdf5', color: '#059669', label: 'Active' },
    moved_out: { bg: '#f1f5f9', color: '#64748b', label: 'Moved Out' },
    onboarding: { bg: '#eff6ff', color: '#2563eb', label: 'Onboarding' },
    notice_period: { bg: '#fffbeb', color: '#d97706', label: 'Notice Period' },
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<(Tenant & { flat_number?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [kycFilter, setKycFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false })

        const { data: flatData } = await supabase
            .from('flats')
            .select('*')
            .order('flat_number', { ascending: true })

        if (flatData) setFlats(flatData as Flat[])

        // Join flat_number to each tenant
        const flatMap = new Map((flatData || []).map(f => [f.id, f.flat_number]))
        const enriched = (tenantData || []).map(t => ({
            ...t,
            flat_number: t.flat_id ? flatMap.get(t.flat_id) || '—' : 'Unassigned',
        }))

        setTenants(enriched as (Tenant & { flat_number?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = tenants.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false
        if (kycFilter !== 'all' && t.kyc_status !== kycFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                t.full_name.toLowerCase().includes(q) ||
                (t.email || '').toLowerCase().includes(q) ||
                (t.phone || '').toLowerCase().includes(q) ||
                (t.flat_number || '').toLowerCase().includes(q)
            )
        }
        return true
    })

    const stats = {
        total: tenants.length,
        active: tenants.filter(t => t.status === 'active').length,
        onboarding: tenants.filter(t => t.status === 'onboarding').length,
        kycPending: tenants.filter(t => t.kyc_status !== 'complete' && t.status === 'active').length,
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tenant Management</h1>
                    <p className="page-description">Track tenants, KYC status, and onboarding progress</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DownloadTemplateButton moduleName="Tenants" columns={MODULE_COLUMNS.tenants as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} />
                    <ExportDataButton moduleName="Tenants" columns={MODULE_COLUMNS.tenants as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={filtered as unknown as Record<string, unknown>[]} />
                    <BulkImportButton moduleName="Tenants" tableName="tenants" columns={MODULE_COLUMNS.tenants as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={[]} onImportComplete={loadData} lookupMaps={{ flat_number: new Map(flats.map(f => [f.flat_number, f.id])) }} />
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add Tenant
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    </div>
                    <div className="summary-card-label">Total Tenants</div>
                    <div className="summary-card-value">{stats.total}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                    </div>
                    <div className="summary-card-label">Active</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{stats.active}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#eff6ff' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 6v6l4 2" /></svg>
                    </div>
                    <div className="summary-card-label">Onboarding</div>
                    <div className="summary-card-value" style={{ color: '#2563eb' }}>{stats.onboarding}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
                    </div>
                    <div className="summary-card-label">KYC Pending</div>
                    <div className="summary-card-value" style={{ color: '#d97706' }}>{stats.kycPending}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <input type="text" className="form-input" placeholder="🔍 Search by name, email, phone, or flat..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ fontSize: 13 }} />
                    </div>
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="notice_period">Notice Period</option>
                        <option value="moved_out">Moved Out</option>
                    </select>
                    <select className="form-select" value={kycFilter} onChange={e => setKycFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All KYC</option>
                        <option value="complete">Complete</option>
                        <option value="pending">Pending</option>
                        <option value="incomplete">Incomplete</option>
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} tenant{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={6} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <h3>{tenants.length === 0 ? 'No tenants yet' : 'No tenants match your filters'}</h3>
                        <p>{tenants.length === 0 ? 'Add your first tenant to get started.' : 'Try adjusting your filters.'}</p>
                        {tenants.length === 0 && (
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add First Tenant</button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Flat</th>
                                    <th>Type</th>
                                    <th>Phone</th>
                                    <th>KYC</th>
                                    <th>Rent Share</th>
                                    <th>Move In</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => {
                                    const kyc = KYC_CONFIG[t.kyc_status] || KYC_CONFIG.pending
                                    const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.active
                                    return (
                                        <tr key={t.id}>
                                            <td>
                                                <Link href={`/tenants/${t.id}`} style={{ fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                    {t.full_name}
                                                </Link>
                                                {t.email && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.email}</div>}
                                            </td>
                                            <td><Link href={`/flats/${t.flat_id}`} style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>{t.flat_number}</Link></td>
                                            <td>{t.is_primary ? '✭ Primary' : 'Co-licensee'}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{t.phone || '—'}</td>
                                            <td><span className="badge" style={{ background: kyc.bg, color: kyc.color }}>{kyc.label}</span></td>
                                            <td style={{ fontWeight: 600 }}>{t.rent_share}%</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                {t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td><span className="badge" style={{ background: status.bg, color: status.color }}>{status.label}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link href={`/tenants/${t.id}`} className="btn btn-ghost btn-sm">View →</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && <AddTenantModal flats={flats} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />}
        </div>
    )
}

// ─── Add Tenant Modal ─────────────────────────────────────
function AddTenantModal({ flats, onClose, onSaved }: { flats: Flat[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState(1) // 1: Basic, 2: KYC/Employment, 3: Flat Assignment
    const [form, setForm] = useState({
        full_name: '', phone: '', email: '', dob: '',
        employer_name: '', ctc_monthly: '',
        emergency_contact_name: '', emergency_contact_phone: '',
        flat_id: '', is_primary: 'true', rent_share: '100', maint_share: '100',
        move_in_date: '', source: '',
    })

    function updateField(key: string, value: string) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }

        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        const orgId = profile?.org_id
        if (!orgId) { setError('Organization not found. Please create a flat first.'); setLoading(false); return }

        const { error: insertError } = await supabase.from('tenants').insert({
            org_id: orgId,
            full_name: form.full_name,
            phone: form.phone || null,
            email: form.email || null,
            dob: form.dob || null,
            employer_name: form.employer_name || null,
            ctc_monthly: form.ctc_monthly ? parseFloat(form.ctc_monthly) : null,
            emergency_contact_name: form.emergency_contact_name || null,
            emergency_contact_phone: form.emergency_contact_phone || null,
            flat_id: form.flat_id || null,
            is_primary: form.is_primary === 'true',
            rent_share: parseFloat(form.rent_share) || 100,
            maint_share: parseFloat(form.maint_share) || 100,
            move_in_date: form.move_in_date || null,
            source: form.source || null,
            status: form.flat_id ? 'active' : 'onboarding',
            kyc_status: 'pending',
        })

        if (insertError) { setError(insertError.message); setLoading(false); return }
        onSaved()
    }

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <h2 className="modal-title">Add New Tenant</h2>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: s <= step ? 'var(--color-primary)' : 'var(--border-color)',
                            transition: 'background 0.2s',
                        }} />
                    ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Step {step} of 3 — {step === 1 ? 'Personal Details' : step === 2 ? 'Employment & Emergency' : 'Flat Assignment'}
                </div>

                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" placeholder="Tenant's full name" value={form.full_name}
                                    onChange={e => updateField('full_name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" placeholder="+91 98765 43210" value={form.phone}
                                    onChange={e => updateField('phone', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" placeholder="tenant@email.com" value={form.email}
                                    onChange={e => updateField('email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input className="form-input" type="date" value={form.dob}
                                    onChange={e => updateField('dob', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Source</label>
                                <select className="form-select" value={form.source} onChange={e => updateField('source', e.target.value)}>
                                    <option value="">Select source</option>
                                    <option value="direct">Direct</option>
                                    <option value="broker">Broker</option>
                                    <option value="referral">Referral</option>
                                    <option value="online">Online Listing</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Employer Name</label>
                                <input className="form-input" placeholder="Company name" value={form.employer_name}
                                    onChange={e => updateField('employer_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monthly CTC (₹)</label>
                                <input className="form-input" type="number" placeholder="e.g. 50000" value={form.ctc_monthly}
                                    onChange={e => updateField('ctc_monthly', e.target.value)} />
                            </div>
                            <div className="form-group" />
                            <div className="form-group">
                                <label className="form-label">Emergency Contact Name</label>
                                <input className="form-input" placeholder="Contact person" value={form.emergency_contact_name}
                                    onChange={e => updateField('emergency_contact_name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Emergency Contact Phone</label>
                                <input className="form-input" placeholder="+91..." value={form.emergency_contact_phone}
                                    onChange={e => updateField('emergency_contact_phone', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Assign to Flat</label>
                                <select className="form-select" value={form.flat_id} onChange={e => updateField('flat_id', e.target.value)}>
                                    <option value="">— Unassigned (Onboarding) —</option>
                                    {flats.map(f => (
                                        <option key={f.id} value={f.id}>Flat {f.flat_number} — {f.flat_type || 'N/A'} ({f.status})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tenant Type</label>
                                <select className="form-select" value={form.is_primary} onChange={e => updateField('is_primary', e.target.value)}>
                                    <option value="true">✭ Primary Licensee</option>
                                    <option value="false">Co-Licensee</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Move-in Date</label>
                                <input className="form-input" type="date" value={form.move_in_date}
                                    onChange={e => updateField('move_in_date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rent Share (%)</label>
                                <input className="form-input" type="number" min="0" max="100" placeholder="100" value={form.rent_share}
                                    onChange={e => updateField('rent_share', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Maintenance Share (%)</label>
                                <input className="form-input" type="number" min="0" max="100" placeholder="100" value={form.maint_share}
                                    onChange={e => updateField('maint_share', e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 24 }}>
                        <div>
                            {step > 1 && (
                                <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Back</button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            {step < 3 ? (
                                <button type="button" className="btn btn-primary" onClick={() => {
                                    if (step === 1 && !form.full_name) return
                                    setStep(step + 1)
                                }}>
                                    Next →
                                </button>
                            ) : (
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Creating...</> : 'Create Tenant'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
