'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/utils/get-org-id'
import { SkeletonTable } from '@/lib/components/ui'
import { DownloadTemplateButton, ExportDataButton, BulkImportButton, MODULE_COLUMNS } from '@/lib/components/bulk-operations'

interface Vendor {
    id: string; org_id: string; name: string; category: string; phone: string | null;
    email: string | null; address: string | null; rate_card: object; rating: number;
    is_active: boolean; created_at: string; updated_at: string;
}

const CAT_CONFIG: Record<string, { icon: string; label: string }> = {
    plumber: { icon: '🔧', label: 'Plumber' }, electrician: { icon: '⚡', label: 'Electrician' },
    carpenter: { icon: '🪚', label: 'Carpenter' }, painter: { icon: '🎨', label: 'Painter' },
    pest_control: { icon: '🐛', label: 'Pest Control' }, cleaning: { icon: '🧹', label: 'Cleaning' },
    security: { icon: '🔒', label: 'Security' }, general: { icon: '🏗️', label: 'General' },
    other: { icon: '📋', label: 'Other' },
}

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [catFilter, setCatFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase.from('vendors').select('*').order('name')
        setVendors(data as Vendor[] || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = catFilter === 'all' ? vendors : vendors.filter(v => v.category === catFilter)
    const active = vendors.filter(v => v.is_active).length

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vendor Directory</h1>
                    <p className="page-description">Manage service providers and maintenance vendors</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DownloadTemplateButton moduleName="Vendors" columns={MODULE_COLUMNS.vendors as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} />
                    <ExportDataButton moduleName="Vendors" columns={MODULE_COLUMNS.vendors as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={filtered as unknown as Record<string, unknown>[]} />
                    <BulkImportButton moduleName="Vendors" tableName="vendors" columns={MODULE_COLUMNS.vendors as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={[]} onImportComplete={loadData} />
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Vendor</button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>👥</span></div>
                    <div className="summary-card-label">Total Vendors</div>
                    <div className="summary-card-value">{vendors.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>✅</span></div>
                    <div className="summary-card-label">Active</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{active}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#f1f5f9' }}><span style={{ fontSize: 20 }}>🏷️</span></div>
                    <div className="summary-card-label">Categories</div>
                    <div className="summary-card-value">{new Set(vendors.map(v => v.category)).size}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
                        <option value="all">All Categories</option>
                        {Object.entries(CAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} vendor{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={6} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><h3>No vendors</h3><p>Add your first vendor to get started.</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Vendor</button></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Category</th><th>Phone</th><th>Email</th><th>Rating</th><th>Status</th></tr></thead>
                            <tbody>
                                {filtered.map(v => {
                                    const cat = CAT_CONFIG[v.category] || CAT_CONFIG.other
                                    return (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 700 }}>{v.name}</td>
                                            <td><span className="badge badge-info">{cat.icon} {cat.label}</span></td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{v.phone || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v.email || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {'★'.repeat(Math.round(v.rating || 0))}{'☆'.repeat(5 - Math.round(v.rating || 0))}
                                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>{v.rating?.toFixed(1) || '0.0'}</span>
                                                </div>
                                            </td>
                                            <td><span className="badge" style={{ background: v.is_active ? '#ecfdf5' : '#fef2f2', color: v.is_active ? '#059669' : '#dc2626' }}>
                                                {v.is_active ? 'Active' : 'Inactive'}</span></td>
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
                        <h2 className="modal-title">Add Vendor</h2>
                        <VendorForm onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function VendorForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', category: 'general', phone: '', email: '', address: '' })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const orgId = await getOrgId(supabase)
        if (!orgId) { setError('Organization not found'); setLoading(false); return }
        const { error: err } = await supabase.from('vendors').insert({
            org_id: orgId, name: form.name, category: form.category,
            phone: form.phone || null, email: form.email || null, address: form.address || null,
        })
        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Vendor name" /></div>
                <div className="form-group"><label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                        {Object.entries(CAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Address</label>
                    <input className="form-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Vendor'}</button>
            </div>
        </form>
    )
}
