'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/utils/get-org-id'
import Link from 'next/link'
import { SkeletonTable } from '@/lib/components/ui'
import type { Flat, Tenant } from '@/lib/types/database'

interface Document {
    id: string; org_id: string; flat_id: string | null; tenant_id: string | null;
    agreement_id: string | null; doc_type: string; file_name: string; file_url: string;
    file_size: number | null; mime_type: string | null; is_verified: boolean;
    expiry_date: string | null; created_at: string;
}

const DOC_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    agreement: { icon: '📄', label: 'Agreement', color: '#6366f1' },
    aadhar: { icon: '🪪', label: 'Aadhaar', color: '#3b82f6' },
    pan: { icon: '🪪', label: 'PAN Card', color: '#06b6d4' },
    passport: { icon: '📕', label: 'Passport', color: '#8b5cf6' },
    employer_letter: { icon: '🏢', label: 'Employer Letter', color: '#10b981' },
    salary_slip: { icon: '💰', label: 'Salary Slip', color: '#059669' },
    bank_statement: { icon: '🏦', label: 'Bank Statement', color: '#6d28d9' },
    noc: { icon: '✅', label: 'NOC', color: '#f59e0b' },
    photo: { icon: '📷', label: 'Photo', color: '#ec4899' },
    other: { icon: '📋', label: 'Other', color: '#94a3b8' },
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<(Document & { flat_number?: string; tenant_name?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showUploadModal, setShowUploadModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const [docRes, flatRes, tenRes] = await Promise.all([
            supabase.from('documents').select('*').order('created_at', { ascending: false }),
            supabase.from('flats').select('*').order('flat_number'),
            supabase.from('tenants').select('*').order('full_name'),
        ])
        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        const tenMap = new Map((tenRes.data || []).map(t => [t.id, t.full_name]))
        setFlats(flatRes.data as Flat[] || [])
        setTenants(tenRes.data as Tenant[] || [])
        setDocuments((docRes.data || []).map(d => ({
            ...d,
            flat_number: d.flat_id ? flatMap.get(d.flat_id) || '—' : '—',
            tenant_name: d.tenant_id ? tenMap.get(d.tenant_id) || '—' : '—',
        })) as (Document & { flat_number?: string; tenant_name?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = documents.filter(d => {
        if (typeFilter !== 'all' && d.doc_type !== typeFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return d.file_name.toLowerCase().includes(q) || (d.flat_number || '').toLowerCase().includes(q) || (d.tenant_name || '').toLowerCase().includes(q)
        }
        return true
    })

    const verified = documents.filter(d => d.is_verified).length
    const expiringSoon = documents.filter(d => {
        if (!d.expiry_date) return false
        const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000)
        return days >= 0 && days <= 30
    }).length

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Documents</h1>
                    <p className="page-description">Manage KYC documents, agreements, and compliance files</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>📎 Upload Document</button>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>📁</span></div>
                    <div className="summary-card-label">Total Documents</div>
                    <div className="summary-card-value">{documents.length}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>✅</span></div>
                    <div className="summary-card-label">Verified</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{verified}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}><span style={{ fontSize: 20 }}>⏳</span></div>
                    <div className="summary-card-label">Expiring ≤ 30d</div>
                    <div className="summary-card-value" style={{ color: expiringSoon > 0 ? '#d97706' : '#64748b' }}>{expiringSoon}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>⚠️</span></div>
                    <div className="summary-card-label">Unverified</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{documents.length - verified}</div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <input className="form-input" style={{ fontSize: 13 }} placeholder="🔍 Search documents..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 180 }}>
                        <option value="all">All Types</option>
                        {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} doc{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                        <h3>No documents yet</h3>
                        <p>Upload KYC documents, agreements, and other files.</p>
                        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>📎 Upload First Document</button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>File</th><th>Type</th><th>Flat</th><th>Tenant</th><th>Verified</th><th>Expiry</th><th>Uploaded</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(d => {
                                    const dt = DOC_TYPE_CONFIG[d.doc_type] || DOC_TYPE_CONFIG.other
                                    const expiryDays = d.expiry_date ? Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000) : null
                                    return (
                                        <tr key={d.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: dt.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{dt.icon}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.file_name}</div>
                                                        {d.file_size && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{(d.file_size / 1024).toFixed(0)} KB</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="badge" style={{ background: dt.color + '15', color: dt.color }}>{dt.icon} {dt.label}</span></td>
                                            <td style={{ fontWeight: 600 }}>{d.flat_id ? <Link href={`/flats/${d.flat_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Flat {d.flat_number}</Link> : '—'}</td>
                                            <td style={{ fontSize: 13 }}>{d.tenant_id ? <Link href={`/tenants/${d.tenant_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{d.tenant_name}</Link> : '—'}</td>
                                            <td>
                                                <span className="badge" style={{ background: d.is_verified ? '#ecfdf5' : '#fef2f2', color: d.is_verified ? '#059669' : '#dc2626' }}>
                                                    {d.is_verified ? '✓ Verified' : '✗ Pending'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13 }}>
                                                {d.expiry_date ? (
                                                    <span style={{ color: expiryDays !== null && expiryDays <= 30 ? '#d97706' : expiryDays !== null && expiryDays < 0 ? '#dc2626' : 'inherit', fontWeight: expiryDays !== null && expiryDays <= 30 ? 600 : 400 }}>
                                                        {new Date(d.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View ↗</a>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {
                showUploadModal && (
                    <UploadModal flats={flats} tenants={tenants} onClose={() => setShowUploadModal(false)} onSaved={() => { setShowUploadModal(false); loadData() }} />
                )
            }
        </div >
    )
}

function UploadModal({ flats, tenants, onClose, onSaved }: { flats: Flat[]; tenants: Tenant[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({ flat_id: '', tenant_id: '', doc_type: 'aadhar', expiry_date: '' })
    const [file, setFile] = useState<File | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) { setError('Please select a file'); return }
        setLoading(true)
        setError(null)
        const supabase = createClient()
        const orgId = await getOrgId(supabase)
        if (!orgId) { setError('Organization not found'); setLoading(false); return }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const path = `${orgId}/${form.doc_type}/${Date.now()}.${fileExt}`
        const { data: uploadData, error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
        if (upErr) { setError(`Upload failed: ${upErr.message}`); setLoading(false); return }

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

        const { error: dbErr } = await supabase.from('documents').insert({
            org_id: orgId, flat_id: form.flat_id || null, tenant_id: form.tenant_id || null,
            doc_type: form.doc_type, file_name: file.name, file_url: publicUrl || uploadData.path,
            file_size: file.size, mime_type: file.type, is_verified: false,
            expiry_date: form.expiry_date || null,
        })
        if (dbErr) { setError(dbErr.message); setLoading(false); return }
        onSaved()
    }

    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', esc)
        return () => window.removeEventListener('keydown', esc)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <h2 className="modal-title">Upload Document</h2>
                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group"><label className="form-label">Document Type *</label>
                            <select className="form-select" value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                                {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                            </select></div>
                        <div className="form-group"><label className="form-label">Expiry Date</label>
                            <input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Linked Flat</label>
                            <select className="form-select" value={form.flat_id} onChange={e => setForm(p => ({ ...p, flat_id: e.target.value }))}>
                                <option value="">None</option>{flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Linked Tenant</label>
                            <select className="form-select" value={form.tenant_id} onChange={e => setForm(p => ({ ...p, tenant_id: e.target.value }))}>
                                <option value="">None</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">File *</label>
                            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center', cursor: 'pointer', background: file ? '#ecfdf5' : '#f8fafc' }}
                                onClick={() => document.getElementById('file-input')?.click()}>
                                <input id="file-input" type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={e => setFile(e.target.files?.[0] || null)} />
                                {file ? (
                                    <div>
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: '#059669' }}>{file.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(0)} KB</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
                                        <div style={{ fontSize: 14, fontWeight: 500 }}>Click to select file</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>PDF, JPG, PNG, DOC supported</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !file}>{loading ? 'Uploading...' : '📎 Upload'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
