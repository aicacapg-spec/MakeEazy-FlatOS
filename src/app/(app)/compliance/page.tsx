'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonTable } from '@/lib/components/ui'

interface ComplianceItem {
    id: string; org_id: string; name: string; category: string; responsible_role: string;
    due_date: string | null; status: string; completed_date: string | null;
    completed_by: string | null; document_url: string | null; remarks: string | null;
    created_at: string; updated_at: string;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    not_due: { bg: '#f1f5f9', color: '#64748b', label: 'Not Due', icon: '⏱️' },
    pending: { bg: '#fffbeb', color: '#d97706', label: 'Pending', icon: '🕐' },
    in_progress: { bg: '#eff6ff', color: '#2563eb', label: 'In Progress', icon: '🔄' },
    complete: { bg: '#ecfdf5', color: '#059669', label: 'Complete', icon: '✅' },
    overdue: { bg: '#fef2f2', color: '#dc2626', label: 'Overdue', icon: '🚨' },
}

const DEFAULT_ITEMS = [
    { name: 'Fire Safety Certificate', category: 'safety', responsible_role: 'admin' },
    { name: 'Society NOC', category: 'legal', responsible_role: 'admin' },
    { name: 'Property Tax Payment', category: 'finance', responsible_role: 'accountant' },
    { name: 'Building Insurance Renewal', category: 'insurance', responsible_role: 'admin' },
    { name: 'Lift Maintenance Certificate', category: 'safety', responsible_role: 'admin' },
    { name: 'Electrical Safety Audit', category: 'safety', responsible_role: 'admin' },
    { name: 'Annual Income Tax Filing', category: 'finance', responsible_role: 'ca_reviewer' },
    { name: 'TDS on Rent (26AS)', category: 'finance', responsible_role: 'ca_reviewer' },
    { name: 'GST Filing (if applicable)', category: 'finance', responsible_role: 'ca_reviewer' },
    { name: 'Society AGM', category: 'legal', responsible_role: 'owner' },
]

export default function CompliancePage() {
    const [items, setItems] = useState<ComplianceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [catFilter, setCatFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [seeding, setSeeding] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase.from('compliance_items').select('*').order('due_date', { ascending: true, nullsFirst: false })
        setItems(data as ComplianceItem[] || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    async function seedDefaults() {
        setSeeding(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSeeding(false); return }
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setSeeding(false); return }
        await supabase.from('compliance_items').insert(DEFAULT_ITEMS.map(i => ({ ...i, org_id: profile.org_id, status: 'pending' })))
        await loadData()
        setSeeding(false)
    }

    async function updateStatus(id: string, status: string) {
        const supabase = createClient()
        await supabase.from('compliance_items').update({
            status, completed_date: status === 'complete' ? new Date().toISOString().split('T')[0] : null,
        }).eq('id', id)
        loadData()
    }

    const filtered = items.filter(i => {
        if (catFilter !== 'all' && i.category !== catFilter) return false
        if (statusFilter !== 'all' && i.status !== statusFilter) return false
        return true
    })

    const overdue = items.filter(i => i.status === 'overdue').length
    const complete = items.filter(i => i.status === 'complete').length
    const pending = items.filter(i => i.status === 'pending' || i.status === 'in_progress').length
    const compliancePct = items.length > 0 ? Math.round((complete / items.length) * 100) : 0

    const categories = [...new Set(items.map(i => i.category))]

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Compliance Tracker</h1>
                    <p className="page-description">Track regulatory, legal, and financial compliance items</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {items.length === 0 && (
                        <button className="btn btn-secondary" onClick={seedDefaults} disabled={seeding}>
                            {seeding ? 'Seeding...' : '🌱 Load Default Items'}
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Item</button>
                </div>
            </div>

            {/* Compliance Score */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 className="card-title">Compliance Score</h3>
                    <span style={{
                        fontSize: 32, fontWeight: 900, letterSpacing: -1,
                        color: compliancePct >= 80 ? '#059669' : compliancePct >= 60 ? '#d97706' : '#dc2626',
                    }}>{compliancePct}%</span>
                </div>
                <div style={{ height: 12, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 8, transition: 'width 0.8s ease',
                        width: `${compliancePct}%`,
                        background: compliancePct >= 80
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : compliancePct >= 60
                                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                : 'linear-gradient(90deg, #ef4444, #dc2626)',
                    }} />
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 13 }}>
                    <span style={{ color: '#059669', fontWeight: 600 }}>✅ {complete} Complete</span>
                    <span style={{ color: '#d97706', fontWeight: 600 }}>🕐 {pending} Pending</span>
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>🚨 {overdue} Overdue</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{items.length} Total Items</span>
                </div>
            </div>

            <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>✅</span></div>
                    <div className="summary-card-label">Complete</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{complete}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}><span style={{ fontSize: 20 }}>🕐</span></div>
                    <div className="summary-card-label">Pending</div>
                    <div className="summary-card-value" style={{ color: '#d97706' }}>{pending}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>🚨</span></div>
                    <div className="summary-card-label">Overdue</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{overdue}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>📋</span></div>
                    <div className="summary-card-label">Total</div>
                    <div className="summary-card-value">{items.length}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                    </select>
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={6} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <h3>{items.length === 0 ? 'No compliance items' : 'No items match'}</h3>
                        <p>{items.length === 0 ? 'Load default items or add custom compliance tasks.' : 'Try adjusting your filters.'}</p>
                        {items.length === 0 && <button className="btn btn-primary" onClick={seedDefaults}>🌱 Load Default Items</button>}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Item</th><th>Category</th><th>Responsible</th><th>Due Date</th><th>Status</th><th>Completed</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => {
                                    const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
                                    const daysLeft = item.due_date ? Math.ceil((new Date(item.due_date).getTime() - Date.now()) / 86400000) : null
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                {item.remarks && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.remarks}</div>}
                                            </td>
                                            <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{item.category}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{item.responsible_role?.replace('_', ' ')}</td>
                                            <td>
                                                {item.due_date ? (
                                                    <span style={{
                                                        fontWeight: 600, fontSize: 13,
                                                        color: daysLeft !== null && daysLeft < 0 ? '#dc2626' : daysLeft !== null && daysLeft <= 30 ? '#d97706' : 'inherit',
                                                    }}>
                                                        {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {daysLeft !== null && daysLeft <= 30 && daysLeft >= 0 && <span style={{ fontSize: 11, marginLeft: 4 }}>({daysLeft}d)</span>}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {item.completed_date ? new Date(item.completed_date).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {item.status !== 'complete' && (
                                                        <button className="btn btn-ghost btn-sm" style={{ color: '#059669' }} onClick={() => updateStatus(item.id, 'complete')}>✓ Done</button>
                                                    )}
                                                    {item.status === 'complete' && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(item.id, 'pending')}>↩ Reopen</button>
                                                    )}
                                                </div>
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
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <h2 className="modal-title">Add Compliance Item</h2>
                        <AddComplianceForm onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function AddComplianceForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', category: 'legal', responsible_role: 'admin', due_date: '', remarks: '' })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setError('No org'); setLoading(false); return }
        const { error: err } = await supabase.from('compliance_items').insert({
            org_id: profile.org_id, name: form.name, category: form.category,
            responsible_role: form.responsible_role as ComplianceItem['responsible_role'],
            due_date: form.due_date || null, remarks: form.remarks || null, status: 'pending',
        })
        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Item Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Fire Safety Certificate Renewal" /></div>
                <div className="form-group"><label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                        <option value="legal">Legal</option><option value="finance">Finance</option>
                        <option value="safety">Safety</option><option value="insurance">Insurance</option>
                        <option value="general">General</option>
                    </select></div>
                <div className="form-group"><label className="form-label">Responsible</label>
                    <select className="form-select" value={form.responsible_role} onChange={e => setForm(p => ({ ...p, responsible_role: e.target.value }))}>
                        <option value="admin">Admin</option><option value="owner">Owner</option>
                        <option value="accountant">Accountant</option><option value="ca_reviewer">CA / Reviewer</option>
                    </select></div>
                <div className="form-group"><label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Remarks</label>
                    <input className="form-input" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Item'}</button>
            </div>
        </form>
    )
}
