'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SkeletonPage } from '@/lib/components/ui'
import type { Flat, Tenant, Agreement } from '@/lib/types/database'

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    occupied: { bg: '#ecfdf5', color: '#059669', label: 'Occupied' },
    vacant: { bg: '#fef2f2', color: '#dc2626', label: 'Vacant' },
    under_repair: { bg: '#fffbeb', color: '#d97706', label: 'Under Repair' },
    office: { bg: '#f1f5f9', color: '#475569', label: 'Office' },
    blocked: { bg: '#fef2f2', color: '#b91c1c', label: 'Blocked' },
    reserved: { bg: '#eff6ff', color: '#2563eb', label: 'Reserved' },
}

interface Doc { id: string; doc_type: string; file_name: string; is_verified: boolean; created_at: string }
interface Complaint { id: string; complaint_number: string; date: string; category: string; description: string; priority: string; reported_by: string; status: string }

const TABS = ['Overview', 'Tenants', 'Financials', 'Documents', 'Complaints', 'Timeline']

export default function FlatDetailPage() {
    const params = useParams()
    const router = useRouter()
    const flatId = params.id as string

    const [flat, setFlat] = useState<Flat | null>(null)
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [agreements, setAgreements] = useState<Agreement[]>([])
    const [documents, setDocuments] = useState<Doc[]>([])
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Overview')
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const loadData = useCallback(async () => {
        const supabase = createClient()
        const { data: flatData } = await supabase.from('flats').select('*').eq('id', flatId).single()
        if (flatData) {
            setFlat(flatData as Flat)
            setEditForm({
                flat_number: flatData.flat_number || '', floor: flatData.floor || '',
                flat_type: flatData.flat_type || '', carpet_area_sqft: String(flatData.carpet_area_sqft || ''),
                furnishing: flatData.furnishing || '', ac_count: String(flatData.ac_count || 0),
                parking: flatData.parking || '', owner_entity: flatData.owner_entity || '',
                monthly_rent: String(flatData.monthly_rent || 0), monthly_maintenance: String(flatData.monthly_maintenance || 0),
                status: flatData.status || 'vacant', remarks: flatData.remarks || '',
            })
        }
        const { data: tenantData } = await supabase.from('tenants').select('*').eq('flat_id', flatId).order('is_primary', { ascending: false })
        if (tenantData) setTenants(tenantData as Tenant[])
        const { data: agreementData } = await supabase.from('agreements').select('*').eq('flat_id', flatId).order('start_date', { ascending: false })
        if (agreementData) setAgreements(agreementData as Agreement[])
        const { data: docData } = await supabase.from('documents').select('*').eq('flat_id', flatId).order('created_at', { ascending: false })
        if (docData) setDocuments(docData as Doc[])
        const { data: complaintData } = await supabase.from('complaints').select('*').eq('flat_id', flatId).order('date', { ascending: false })
        if (complaintData) setComplaints(complaintData as Complaint[])
        setLoading(false)
    }, [flatId])

    useEffect(() => { loadData() }, [loadData])

    async function handleSave() {
        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase.from('flats').update({
            flat_number: editForm.flat_number, floor: editForm.floor || null,
            flat_type: editForm.flat_type || null, carpet_area_sqft: editForm.carpet_area_sqft ? parseFloat(editForm.carpet_area_sqft) : null,
            furnishing: editForm.furnishing, ac_count: parseInt(editForm.ac_count) || 0,
            parking: editForm.parking || null, owner_entity: editForm.owner_entity,
            monthly_rent: parseFloat(editForm.monthly_rent) || 0, monthly_maintenance: parseFloat(editForm.monthly_maintenance) || 0,
            status: editForm.status as Flat['status'], remarks: editForm.remarks || null,
        }).eq('id', flatId)
        if (!error) { setEditing(false); loadData() }
        setSaving(false)
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this flat? This cannot be undone.')) return
        const supabase = createClient()
        await supabase.from('flats').delete().eq('id', flatId)
        router.push('/flats')
    }

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    if (loading) return <SkeletonPage />
    if (!flat) return (
        <div className="empty-state" style={{ minHeight: 400 }}>
            <h3>Flat not found</h3>
            <p>This flat may have been deleted or doesn&apos;t exist.</p>
            <Link href="/flats" className="btn btn-primary">← Back to Flats</Link>
        </div>
    )

    const status = STATUS_CONFIG[flat.status] || STATUS_CONFIG.vacant
    const activeTenants = tenants.filter(t => t.status === 'active')

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/flats" className="btn btn-ghost btn-sm">← Flats</Link>
                    <span style={{ color: 'var(--text-secondary)' }}>/</span>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Flat {flat.flat_number}</h1>
                    <span className="badge" style={{ background: status.bg, color: status.color, fontSize: 13, padding: '4px 12px' }}>{status.label}</span>
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
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-color)', marginBottom: 24 }}>
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        padding: '10px 20px', fontSize: 14, fontWeight: activeTab === tab ? 700 : 500,
                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--text-secondary)',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: -2, cursor: 'pointer', transition: 'all 0.15s',
                    }}>{tab}</button>
                ))}
            </div>

            {activeTab === 'Overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 20 }}>Flat Details</h3>
                        {editing ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[
                                    { label: 'Flat Number', key: 'flat_number', type: 'text' }, { label: 'Floor', key: 'floor', type: 'text' },
                                    { label: 'Type', key: 'flat_type', type: 'text' }, { label: 'Area (sq.ft)', key: 'carpet_area_sqft', type: 'number' },
                                    { label: 'Rent (₹)', key: 'monthly_rent', type: 'number' }, { label: 'Maintenance (₹)', key: 'monthly_maintenance', type: 'number' },
                                    { label: 'Furnishing', key: 'furnishing', type: 'text' }, { label: 'ACs', key: 'ac_count', type: 'number' },
                                    { label: 'Parking', key: 'parking', type: 'text' }, { label: 'Owner Entity', key: 'owner_entity', type: 'text' },
                                ].map(f => (
                                    <div className="form-group" key={f.key} style={{ marginBottom: 8 }}>
                                        <label className="form-label">{f.label}</label>
                                        <input className="form-input" type={f.type} value={editForm[f.key] || ''} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                {[
                                    { label: 'Floor', value: flat.floor || '—' }, { label: 'Type', value: flat.flat_type || '—' },
                                    { label: 'Carpet Area', value: flat.carpet_area_sqft ? `${flat.carpet_area_sqft} sq.ft` : '—' },
                                    { label: 'Furnishing', value: flat.furnishing?.replace('_', ' ') || '—' },
                                    { label: 'ACs', value: String(flat.ac_count || 0) }, { label: 'Parking', value: flat.parking || '—' },
                                    { label: 'Owner Entity', value: flat.owner_entity || '—' }, { label: 'Remarks', value: flat.remarks || '—' },
                                ].map(item => (
                                    <div key={item.label} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{item.label}</div>
                                        <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 className="card-title" style={{ marginBottom: 16 }}>Financials</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Monthly Rent</span>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>{fmt(flat.monthly_rent)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Maintenance</span>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt(flat.monthly_maintenance)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)' }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Total Per Month</span>
                                    <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>{fmt(flat.monthly_rent + flat.monthly_maintenance)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 12 }}>Current Tenants ({activeTenants.length})</h3>
                            {activeTenants.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No active tenants</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {activeTenants.map(t => (
                                        <Link key={t.id} href={`/tenants/${t.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.full_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.is_primary ? '✭ Primary' : 'Co-licensee'} · {t.employer_name || ''}</div>
                                            </div>
                                            <span className="badge" style={{ background: t.kyc_status === 'complete' ? '#ecfdf5' : '#fffbeb', color: t.kyc_status === 'complete' ? '#059669' : '#d97706' }}>KYC: {t.kyc_status}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Tenants' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}><h3 style={{ margin: 0, fontSize: 15 }}>Tenant History ({tenants.length})</h3></div>
                    {tenants.length === 0 ? <div className="empty-state"><h3>No tenants</h3><p>No tenants associated with this flat yet.</p></div> : (
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Type</th><th>Employer</th><th>Rent Share</th><th>KYC</th><th>Move In</th><th>Status</th><th></th></tr></thead>
                            <tbody>{tenants.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600 }}>{t.full_name}</td>
                                    <td>{t.is_primary ? '✭ Primary' : 'Co-licensee'}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.employer_name || '—'}</td>
                                    <td>{t.rent_share}%</td>
                                    <td><span className="badge" style={{ background: t.kyc_status === 'complete' ? '#ecfdf5' : '#fffbeb', color: t.kyc_status === 'complete' ? '#059669' : '#d97706' }}>{t.kyc_status}</span></td>
                                    <td style={{ fontSize: 13 }}>{t.move_in_date ? new Date(t.move_in_date).toLocaleDateString('en-IN') : '—'}</td>
                                    <td><span className="badge" style={{ background: t.status === 'active' ? '#ecfdf5' : '#f1f5f9', color: t.status === 'active' ? '#059669' : '#64748b' }}>{t.status}</span></td>
                                    <td><Link href={`/tenants/${t.id}`} className="btn btn-ghost btn-sm">View →</Link></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'Financials' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}><h3 style={{ margin: 0, fontSize: 15 }}>Agreements ({agreements.length})</h3></div>
                    {agreements.length === 0 ? <div className="empty-state"><h3>No agreements</h3><p>No agreements for this flat.</p></div> : (
                        <table className="data-table">
                            <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Rent</th><th>Deposit</th><th>Escalation</th><th>Status</th><th></th></tr></thead>
                            <tbody>{agreements.map(a => (
                                <tr key={a.id}>
                                    <td style={{ textTransform: 'capitalize' }}>{a.agreement_type?.replace(/_/g, ' ')}</td>
                                    <td>{new Date(a.start_date).toLocaleDateString('en-IN')}</td>
                                    <td>{new Date(a.end_date).toLocaleDateString('en-IN')}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(a.rent_amount)}</td>
                                    <td>{fmt(a.deposit_amount)}</td>
                                    <td>{a.escalation_percent}%</td>
                                    <td><span className="badge" style={{
                                        background: a.status === 'signed' ? '#ecfdf5' : a.status === 'expired' ? '#fef2f2' : a.status === 'terminated' ? '#f1f5f9' : '#fffbeb',
                                        color: a.status === 'signed' ? '#059669' : a.status === 'expired' ? '#dc2626' : a.status === 'terminated' ? '#64748b' : '#d97706',
                                    }}>{a.status}</span></td>
                                    <td><Link href={`/agreements/${a.id}`} className="btn btn-ghost btn-sm">View →</Link></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'Documents' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}><h3 style={{ margin: 0, fontSize: 15 }}>Documents ({documents.length})</h3></div>
                    {documents.length === 0 ? (
                        <div className="empty-state" style={{ padding: 40 }}><h3>No documents</h3><p>No documents linked to this flat yet.</p></div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Status</th></tr></thead>
                            <tbody>{documents.map(d => (
                                <tr key={d.id}>
                                    <td style={{ fontWeight: 600 }}>📄 {d.file_name}</td>
                                    <td style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--text-secondary)' }}>{d.doc_type}</td>
                                    <td style={{ fontSize: 13 }}>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                                    <td><span className="badge" style={{ background: d.is_verified ? '#ecfdf5' : '#fffbeb', color: d.is_verified ? '#059669' : '#d97706' }}>{d.is_verified ? '✓ Verified' : '⏳ Pending'}</span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'Complaints' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}><h3 style={{ margin: 0, fontSize: 15 }}>Complaints ({complaints.length})</h3></div>
                    {complaints.length === 0 ? (
                        <div className="empty-state" style={{ padding: 40 }}><h3>No complaints</h3><p>No complaints reported for this flat.</p></div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Priority</th><th>Status</th></tr></thead>
                            <tbody>{complaints.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600 }}>{c.complaint_number}</td>
                                    <td style={{ fontSize: 13 }}>{new Date(c.date).toLocaleDateString('en-IN')}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                                    <td><span className="badge" style={{ background: c.priority === 'high' || c.priority === 'urgent' ? '#fef2f2' : c.priority === 'medium' ? '#fffbeb' : '#f1f5f9', color: c.priority === 'high' || c.priority === 'urgent' ? '#dc2626' : c.priority === 'medium' ? '#d97706' : '#64748b' }}>{c.priority}</span></td>
                                    <td><span className="badge" style={{ background: c.status === 'resolved' || c.status === 'closed' ? '#ecfdf5' : c.status === 'in_progress' ? '#eff6ff' : '#fffbeb', color: c.status === 'resolved' || c.status === 'closed' ? '#059669' : c.status === 'in_progress' ? '#2563eb' : '#d97706' }}>{c.status?.replace('_', ' ')}</span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'Timeline' && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 20 }}>Flat Timeline</h3>
                    <div style={{ position: 'relative', paddingLeft: 24 }}>
                        <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: 'var(--border-color)' }} />
                        {[
                            ...tenants.filter(t => t.move_in_date).map(t => ({ date: t.move_in_date!, icon: '🏠', title: `${t.full_name} moved in`, desc: `${t.is_primary ? 'Primary' : 'Co-licensee'} · ${t.employer_name || ''}`, color: '#059669' })),
                            ...tenants.filter(t => t.move_out_date).map(t => ({ date: t.move_out_date!, icon: '📤', title: `${t.full_name} moved out`, desc: t.employer_name || '', color: '#dc2626' })),
                            ...agreements.map(a => ({ date: a.start_date, icon: '📋', title: `Agreement ${a.status}`, desc: `${fmt(a.rent_amount)}/month · ${a.agreement_type?.replace(/_/g, ' ')}`, color: '#6366f1' })),
                            ...complaints.map(c => ({ date: c.date, icon: '⚠️', title: `Complaint: ${c.category}`, desc: c.description, color: '#d97706' })),
                        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((ev, i) => (
                            <div key={i} style={{ position: 'relative', marginBottom: 24, paddingLeft: 16 }}>
                                <div style={{ position: 'absolute', left: -20, top: 2, width: 14, height: 14, borderRadius: '50%', background: ev.color, border: '2px solid white' }} />
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{new Date(ev.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.icon} {ev.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ev.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
