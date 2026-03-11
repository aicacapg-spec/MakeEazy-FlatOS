'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import { DownloadTemplateButton, ExportDataButton, BulkImportButton, MODULE_COLUMNS } from '@/lib/components/bulk-operations'
import type { Flat } from '@/lib/types/database'

interface Complaint {
    id: string; org_id: string; flat_id: string | null; complaint_number: string | null;
    date: string; category: string | null; description: string | null;
    priority: string; reported_by: string | null; assigned_vendor_id: string | null;
    status: string; resolved_date: string | null; cost: number; photos: string[] | null;
    created_at: string; updated_at: string;
}

const PRIORITY_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    low: { bg: '#f1f5f9', color: '#64748b', label: 'Low' },
    medium: { bg: '#fffbeb', color: '#d97706', label: 'Medium' },
    high: { bg: '#fef2f2', color: '#dc2626', label: 'High' },
    urgent: { bg: '#fef2f2', color: '#b91c1c', label: '🔴 Urgent' },
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    open: { bg: '#fef2f2', color: '#dc2626', label: 'Open' },
    assigned: { bg: '#eff6ff', color: '#2563eb', label: 'Assigned' },
    in_progress: { bg: '#fffbeb', color: '#d97706', label: 'In Progress' },
    resolved: { bg: '#ecfdf5', color: '#059669', label: 'Resolved' },
    closed: { bg: '#f1f5f9', color: '#64748b', label: 'Closed' },
}

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState<(Complaint & { flat_number?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const [cmpRes, flatRes] = await Promise.all([
            supabase.from('complaints').select('*').order('created_at', { ascending: false }),
            supabase.from('flats').select('*').order('flat_number'),
        ])
        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        setFlats(flatRes.data as Flat[] || [])
        setComplaints((cmpRes.data || []).map(c => ({ ...c, flat_number: c.flat_id ? flatMap.get(c.flat_id) || '—' : 'Common' })) as (Complaint & { flat_number?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = complaints.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false
        if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
        return true
    })

    const open = complaints.filter(c => c.status === 'open' || c.status === 'assigned' || c.status === 'in_progress').length
    const resolved = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length
    const urgent = complaints.filter(c => c.priority === 'urgent' && c.status !== 'closed' && c.status !== 'resolved').length

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Complaint Management</h1>
                    <p className="page-description">Track maintenance requests, complaints, and resolution status</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DownloadTemplateButton moduleName="Complaints" columns={MODULE_COLUMNS.complaints as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} />
                    <ExportDataButton moduleName="Complaints" columns={MODULE_COLUMNS.complaints as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={filtered as unknown as Record<string, unknown>[]} />
                    <BulkImportButton moduleName="Complaints" tableName="complaints" columns={MODULE_COLUMNS.complaints as unknown as { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; example?: string }[]} data={[]} onImportComplete={loadData} lookupMaps={{ flat_number: new Map(flats.map(f => [f.flat_number, f.id])) }} />
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Log Complaint</button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>📋</span></div>
                    <div className="summary-card-label">Total Complaints</div>
                    <div className="summary-card-value">{complaints.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>🔴</span></div>
                    <div className="summary-card-label">Open / Active</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{open}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>✅</span></div>
                    <div className="summary-card-label">Resolved</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{resolved}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: urgent > 0 ? '#fef2f2' : '#f1f5f9' }}><span style={{ fontSize: 20 }}>🚨</span></div>
                    <div className="summary-card-label">Urgent</div>
                    <div className="summary-card-value" style={{ color: urgent > 0 ? '#b91c1c' : '#64748b' }}>{urgent}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All Status</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ width: 160 }}>
                        <option value="all">All Priority</option>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} complaint{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><h3>No complaints</h3><p>Log a complaint when a tenant reports an issue.</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Log Complaint</button></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>#</th><th>Flat</th><th>Category</th><th>Description</th><th>Priority</th><th>Status</th><th>Reported</th><th>Cost</th></tr></thead>
                            <tbody>
                                {filtered.map(c => {
                                    const pr = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium
                                    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.open
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>{c.complaint_number || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{c.flat_id ? <Link href={`/flats/${c.flat_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Flat {c.flat_number}</Link> : 'Common'}</td>
                                            <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{c.category || '—'}</td>
                                            <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>{c.description || '—'}</td>
                                            <td><span className="badge" style={{ background: pr.bg, color: pr.color }}>{pr.label}</span></td>
                                            <td><span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                            <td style={{ fontWeight: 600, color: c.cost > 0 ? '#dc2626' : 'var(--text-secondary)' }}>{c.cost > 0 ? fmt(c.cost) : '—'}</td>
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
                        <h2 className="modal-title">Log New Complaint</h2>
                        <ComplaintForm flats={flats} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function ComplaintForm({ flats, onClose, onSaved }: { flats: Flat[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        flat_id: '', category: 'plumbing', description: '', priority: 'medium',
        reported_by: '', date: new Date().toISOString().split('T')[0],
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setError('No org'); setLoading(false); return }
        const num = `CMP-${Date.now().toString(36).toUpperCase()}`
        const { error: err } = await supabase.from('complaints').insert({
            org_id: profile.org_id, flat_id: form.flat_id || null, complaint_number: num,
            category: form.category, description: form.description || null, priority: form.priority,
            reported_by: form.reported_by || null, date: form.date, status: 'open',
        })
        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label className="form-label">Flat</label>
                    <select className="form-select" value={form.flat_id} onChange={e => setForm(p => ({ ...p, flat_id: e.target.value }))}>
                        <option value="">Common area</option>{flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                        <option value="plumbing">🔧 Plumbing</option><option value="electrical">⚡ Electrical</option>
                        <option value="pest_control">🐛 Pest Control</option><option value="painting">🎨 Painting</option>
                        <option value="carpentry">🪚 Carpentry</option><option value="cleaning">🧹 Cleaning</option>
                        <option value="security">🔒 Security</option><option value="other">📋 Other</option>
                    </select></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Description</label>
                    <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue..." /></div>
                <div className="form-group"><label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                        <option value="low">Low</option><option value="medium">Medium</option>
                        <option value="high">High</option><option value="urgent">🔴 Urgent</option>
                    </select></div>
                <div className="form-group"><label className="form-label">Reported By</label>
                    <input className="form-input" value={form.reported_by} onChange={e => setForm(p => ({ ...p, reported_by: e.target.value }))} placeholder="Tenant name" /></div>
                <div className="form-group"><label className="form-label">Date</label>
                    <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Log Complaint'}</button>
            </div>
        </form>
    )
}
