'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SkeletonPage } from '@/lib/components/ui'
import { KYCPreviewModal } from '@/lib/components/bulk-operations'
import type { Tenant, Flat, Agreement } from '@/lib/types/database'

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

interface Doc { id: string; doc_type: string; file_name: string; file_url: string; is_verified: boolean; created_at: string }
interface RentDemand { id: string; billing_month: string; rent_amount: number; maintenance_amount: number; status: string; due_date: string; flat_id: string }

const TABS = ['Profile', 'KYC Documents', 'Agreements', 'Payments', 'Timeline']

export default function TenantDetailPage() {
    const params = useParams()
    const router = useRouter()
    const tenantId = params.id as string

    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [flat, setFlat] = useState<Flat | null>(null)
    const [agreements, setAgreements] = useState<Agreement[]>([])
    const [documents, setDocuments] = useState<Doc[]>([])
    const [rentDemands, setRentDemands] = useState<RentDemand[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Profile')
    const [editing, setEditing] = useState(false)
    const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
    const [editForm, setEditForm] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const loadData = useCallback(async () => {
        const supabase = createClient()
        const { data: t } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
        if (t) {
            setTenant(t as Tenant)
            setEditForm({
                full_name: t.full_name, phone: t.phone || '', email: t.email || '',
                dob: t.dob || '', employer_name: t.employer_name || '',
                ctc_monthly: String(t.ctc_monthly || ''),
                emergency_contact_name: t.emergency_contact_name || '',
                emergency_contact_phone: t.emergency_contact_phone || '',
                rent_share: String(t.rent_share || 100), maint_share: String(t.maint_share || 100),
                source: t.source || '', kyc_status: t.kyc_status || 'pending', status: t.status || 'onboarding',
            })
            if (t.flat_id) {
                const { data: f } = await supabase.from('flats').select('*').eq('id', t.flat_id).single()
                if (f) setFlat(f as Flat)
            }
        }
        const { data: agr } = await supabase.from('agreements').select('*').eq('tenant_id', tenantId).order('start_date', { ascending: false })
        if (agr) setAgreements(agr as Agreement[])

        // Fetch KYC documents
        const { data: docs } = await supabase.from('documents').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
        if (docs) setDocuments(docs as Doc[])

        // Fetch rent demands for this tenant's flat
        if (t?.flat_id) {
            const { data: rd } = await supabase.from('rent_demands').select('*').eq('flat_id', t.flat_id).order('billing_month', { ascending: false })
            if (rd) setRentDemands(rd as RentDemand[])
        }

        setLoading(false)
    }, [tenantId])

    useEffect(() => { loadData() }, [loadData])

    async function handleSave() {
        setSaving(true)
        const supabase = createClient()
        await supabase.from('tenants').update({
            full_name: editForm.full_name, phone: editForm.phone || null, email: editForm.email || null,
            dob: editForm.dob || null, employer_name: editForm.employer_name || null,
            ctc_monthly: editForm.ctc_monthly ? parseFloat(editForm.ctc_monthly) : null,
            emergency_contact_name: editForm.emergency_contact_name || null,
            emergency_contact_phone: editForm.emergency_contact_phone || null,
            rent_share: parseFloat(editForm.rent_share) || 100,
            maint_share: parseFloat(editForm.maint_share) || 100,
            source: editForm.source || null,
            kyc_status: editForm.kyc_status as Tenant['kyc_status'],
            status: editForm.status as Tenant['status'],
        }).eq('id', tenantId)
        setEditing(false)
        loadData()
        setSaving(false)
    }

    async function handleDelete() {
        if (!confirm('Delete this tenant? This cannot be undone.')) return
        const supabase = createClient()
        await supabase.from('tenants').delete().eq('id', tenantId)
        router.push('/tenants')
    }

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    if (loading) return <SkeletonPage />
    if (!tenant) return (
        <div className="empty-state" style={{ minHeight: 400 }}>
            <h3>Tenant not found</h3>
            <Link href="/tenants" className="btn btn-primary">← Back to Tenants</Link>
        </div>
    )

    const kyc = KYC_CONFIG[tenant.kyc_status] || KYC_CONFIG.pending
    const status = STATUS_CONFIG[tenant.status] || STATUS_CONFIG.active

    return (
        <>
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/tenants" className="btn btn-ghost btn-sm">← Tenants</Link>
                    <span style={{ color: 'var(--text-secondary)' }}>/</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 800, fontSize: 18,
                        }}>
                            {tenant.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>{tenant.full_name}</h1>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                {flat && <Link href={`/flats/${flat.id}`} style={{ color: 'var(--color-primary)' }}>Flat {flat.flat_number}</Link>}
                                {tenant.is_primary ? <span>✭ Primary</span> : <span>Co-licensee</span>}
                            </div>
                        </div>
                    </div>
                    <span className="badge" style={{ background: status.bg, color: status.color, padding: '4px 12px' }}>{status.label}</span>
                    <span className="badge" style={{ background: kyc.bg, color: kyc.color, padding: '4px 12px' }}>KYC: {kyc.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {!editing ? (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : '💾 Save'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: 24 }}>
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: '10px 20px', fontSize: 14, fontWeight: activeTab === tab ? 700 : 500,
                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: -2, cursor: 'pointer',
                    }}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'Profile' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 20 }}>Personal Information</h3>
                        {editing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[
                                    { label: 'Full Name', key: 'full_name' },
                                    { label: 'Phone', key: 'phone' },
                                    { label: 'Email', key: 'email' },
                                    { label: 'Date of Birth', key: 'dob', type: 'date' },
                                    { label: 'Employer', key: 'employer_name' },
                                    { label: 'Monthly CTC (₹)', key: 'ctc_monthly', type: 'number' },
                                    { label: 'Emergency Contact', key: 'emergency_contact_name' },
                                    { label: 'Emergency Phone', key: 'emergency_contact_phone' },
                                    { label: 'Rent Share (%)', key: 'rent_share', type: 'number' },
                                    { label: 'Maintenance Share (%)', key: 'maint_share', type: 'number' },
                                ].map(f => (
                                    <div className="form-group" key={f.key} style={{ marginBottom: 8 }}>
                                        <label className="form-label">{f.label}</label>
                                        <input className="form-input" type={f.type || 'text'}
                                            value={editForm[f.key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                                    </div>
                                ))}
                                <div className="form-group" style={{ marginBottom: 8 }}>
                                    <label className="form-label">KYC Status</label>
                                    <select className="form-select" value={editForm.kyc_status} onChange={e => setEditForm(prev => ({ ...prev, kyc_status: e.target.value }))}>
                                        <option value="pending">Pending</option>
                                        <option value="incomplete">Incomplete</option>
                                        <option value="complete">Complete</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 8 }}>
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}>
                                        <option value="onboarding">Onboarding</option>
                                        <option value="active">Active</option>
                                        <option value="notice_period">Notice Period</option>
                                        <option value="moved_out">Moved Out</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                {[
                                    { label: 'Phone', value: tenant.phone || '—' },
                                    { label: 'Email', value: tenant.email || '—' },
                                    { label: 'Date of Birth', value: tenant.dob ? new Date(tenant.dob).toLocaleDateString('en-IN') : '—' },
                                    { label: 'Source', value: tenant.source || '—' },
                                    { label: 'Employer', value: tenant.employer_name || '—' },
                                    { label: 'Monthly CTC', value: tenant.ctc_monthly ? fmt(tenant.ctc_monthly) : '—' },
                                    { label: 'Emergency Contact', value: tenant.emergency_contact_name || '—' },
                                    { label: 'Emergency Phone', value: tenant.emergency_contact_phone || '—' },
                                    { label: 'Move-In Date', value: tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString('en-IN') : '—' },
                                    { label: 'Move-Out Date', value: tenant.move_out_date ? new Date(tenant.move_out_date).toLocaleDateString('en-IN') : '—' },
                                ].map(i => (
                                    <div key={i.label} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{i.label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 500 }}>{i.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Side cards */}
                    <div>
                        {flat && (
                            <div className="card" style={{ marginBottom: 16 }}>
                                <h3 className="card-title" style={{ marginBottom: 12 }}>Assigned Flat</h3>
                                <Link href={`/flats/${flat.id}`} style={{
                                    display: 'block', padding: 16, background: 'var(--color-primary-light)',
                                    borderRadius: 'var(--radius-md)', textDecoration: 'none',
                                }}>
                                    <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-primary)' }}>Flat {flat.flat_number}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        {flat.flat_type} · {flat.floor} Floor · {flat.furnishing?.replace('_', ' ')}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13 }}>
                                        <span>Rent: <strong>{fmt(flat.monthly_rent)}</strong></span>
                                        <span>Maint: <strong>{fmt(flat.monthly_maintenance)}</strong></span>
                                    </div>
                                </Link>
                            </div>
                        )}

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 12 }}>Rent Split</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rent Share</span>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>{tenant.rent_share}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Maintenance Share</span>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{tenant.maint_share}%</span>
                                </div>
                                {flat && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', marginTop: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>Effective Monthly</span>
                                        <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>
                                            {fmt((flat.monthly_rent * (tenant.rent_share / 100)) + (flat.monthly_maintenance * (tenant.maint_share / 100)))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KYC Tab */}
            {activeTab === 'KYC Documents' && (
                <div>
                    {/* KYC Status Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                        {['Aadhaar Card', 'PAN Card', 'Photo ID'].map(docName => {
                            const found = documents.find(d => d.file_name.toLowerCase().includes(docName.split(' ')[0].toLowerCase()))
                            return (
                                <div key={docName} className="card" style={{ padding: 16, textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>{found ? '✅' : '⏳'}</div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{docName}</div>
                                    <div style={{ fontSize: 12, color: found ? '#059669' : '#d97706', fontWeight: 600, marginTop: 4 }}>
                                        {found ? (found.is_verified ? 'Verified' : 'Uploaded — Pending Verification') : 'Not Uploaded'}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Document List */}
                    {/* Document List */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Uploaded Documents ({documents.length})</h3>
                            <Link href="/documents" className="btn btn-ghost btn-sm">📎 Upload More</Link>
                        </div>
                        {documents.length === 0 ? (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
                                <h3>No KYC Documents</h3>
                                <p>Upload documents via the Documents page and link them to this tenant.</p>
                                <Link href="/documents" className="btn btn-primary">📎 Upload Documents</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, padding: 16 }}>
                                {documents.map(d => {
                                    const isAadhaar = d.file_name.toLowerCase().includes('aadhaar')
                                    const isPan = d.file_name.toLowerCase().includes('pan')
                                    const isAgreement = d.doc_type === 'agreement'
                                    const icon = isAadhaar ? '🪪' : isPan ? '🪪' : isAgreement ? '📄' : '📋'
                                    const color = isAadhaar ? '#3b82f6' : isPan ? '#06b6d4' : isAgreement ? '#6366f1' : '#94a3b8'
                                    const label = isAadhaar ? 'Aadhaar' : isPan ? 'PAN Card' : isAgreement ? 'Agreement' : d.doc_type.replace(/_/g, ' ')
                                    return (
                                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name}</div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                                    <span className="badge" style={{ background: color + '15', color, fontSize: 11 }}>{label}</span>
                                                    <span className="badge" style={{ background: d.is_verified ? '#ecfdf5' : '#fffbeb', color: d.is_verified ? '#059669' : '#d97706', fontSize: 11 }}>{d.is_verified ? '✓ Verified' : '⏳ Pending'}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => setPreviewDoc(d)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>👁️ View</button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Agreements Tab */}
            {
                activeTab === 'Agreements' && (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {agreements.length === 0 ? (
                            <div className="empty-state"><h3>No agreements</h3><p>No agreements linked to this tenant.</p></div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr><th>Type</th><th>Start</th><th>End</th><th>Rent</th><th>Deposit</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {agreements.map(a => (
                                        <tr key={a.id}>
                                            <td style={{ textTransform: 'capitalize' }}>{a.agreement_type?.replace(/_/g, ' ')}</td>
                                            <td>{new Date(a.start_date).toLocaleDateString('en-IN')}</td>
                                            <td>{new Date(a.end_date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ fontWeight: 600 }}>{fmt(a.rent_amount)}</td>
                                            <td>{fmt(a.deposit_amount)}</td>
                                            <td><span className="badge" style={{
                                                background: a.status === 'signed' ? '#ecfdf5' : a.status === 'terminated' ? '#fef2f2' : '#fffbeb',
                                                color: a.status === 'signed' ? '#059669' : a.status === 'terminated' ? '#dc2626' : '#d97706',
                                            }}>{a.status}</span></td>
                                            <td><Link href={`/agreements/${a.id}`} className="btn btn-ghost btn-sm">View →</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )
            }

            {/* Payments Tab */}
            {
                activeTab === 'Payments' && (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Rent Demands ({rentDemands.length})</h3>
                        </div>
                        {rentDemands.length === 0 ? (
                            <div className="empty-state" style={{ padding: 40 }}><h3>No rent demands</h3><p>No billing records found for this tenant&apos;s flat.</p></div>
                        ) : (
                            <table className="data-table">
                                <thead><tr><th>Month</th><th>Rent</th><th>Maintenance</th><th>Total</th><th>Due Date</th><th>Status</th></tr></thead>
                                <tbody>
                                    {rentDemands.map(rd => (
                                        <tr key={rd.id}>
                                            <td style={{ fontWeight: 600 }}>{rd.billing_month}</td>
                                            <td>{fmt(rd.rent_amount)}</td>
                                            <td>{fmt(rd.maintenance_amount)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(rd.rent_amount + rd.maintenance_amount)}</td>
                                            <td style={{ fontSize: 13 }}>{new Date(rd.due_date).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: rd.status === 'paid' ? '#ecfdf5' : rd.status === 'overdue' ? '#fef2f2' : '#fffbeb',
                                                    color: rd.status === 'paid' ? '#059669' : rd.status === 'overdue' ? '#dc2626' : '#d97706',
                                                }}>{rd.status === 'paid' ? '✓ Paid' : rd.status === 'overdue' ? '⚠ Overdue' : '⏳ Pending'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )
            }

            {/* Timeline Tab */}
            {
                activeTab === 'Timeline' && (
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 20 }}>Activity Timeline</h3>
                        <div style={{ position: 'relative', paddingLeft: 24 }}>
                            <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: 'var(--border-color)' }} />
                            {[
                                ...(tenant.move_in_date ? [{ date: tenant.move_in_date, icon: '🏠', title: 'Moved In', desc: `Moved into Flat ${flat?.flat_number || ''}`, color: '#059669' }] : []),
                                ...agreements.map(a => ({ date: a.start_date, icon: '📋', title: `Agreement ${a.status === 'signed' ? 'Signed' : a.status}`, desc: `${a.agreement_type?.replace(/_/g, ' ')} — ${fmt(a.rent_amount)}/month`, color: '#6366f1' })),
                                ...documents.map(d => ({ date: d.created_at?.split('T')[0] || '', icon: '📄', title: `Document Uploaded`, desc: d.file_name, color: '#d97706' })),
                                ...(tenant.move_out_date ? [{ date: tenant.move_out_date, icon: '📤', title: 'Moved Out', desc: `Left Flat ${flat?.flat_number || ''}`, color: '#dc2626' }] : []),
                            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((ev, i) => (
                                <div key={i} style={{ position: 'relative', marginBottom: 24, paddingLeft: 16 }}>
                                    <div style={{ position: 'absolute', left: -20, top: 2, width: 14, height: 14, borderRadius: '50%', background: ev.color, border: '2px solid white' }} />
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.icon} {ev.title}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ev.desc}</div>
                                </div>
                            ))}
                            {agreements.length === 0 && documents.length === 0 && !tenant.move_in_date && (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>No activity recorded yet.</div>
                            )}
                        </div>
                    </div>
                )
            }
        </div>

            {/* KYC Document Preview Modal */}
            {previewDoc && tenant && (
                <KYCPreviewModal
                    document={previewDoc}
                    tenantName={tenant.full_name}
                    onClose={() => setPreviewDoc(null)}
                />
            )}
        </>    
    )
}
