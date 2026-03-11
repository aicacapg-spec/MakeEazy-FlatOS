'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SkeletonPage } from '@/lib/components/ui'
import type { Agreement, Flat, Tenant } from '@/lib/types/database'
import { generateAgreementHTML } from '@/lib/templates/agreement-template'

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
    sent: { bg: '#eff6ff', color: '#2563eb', label: 'Sent' },
    signed: { bg: '#ecfdf5', color: '#059669', label: 'Signed' },
    registered: { bg: '#f0fdf4', color: '#15803d', label: 'Registered' },
    expired: { bg: '#fef2f2', color: '#dc2626', label: 'Expired' },
    terminated: { bg: '#fef2f2', color: '#b91c1c', label: 'Terminated' },
    under_process: { bg: '#fffbeb', color: '#d97706', label: 'Under Process' },
}

const LIFECYCLE_STEPS = [
    { key: 'draft', label: 'Draft', icon: '📝' },
    { key: 'sent', label: 'Sent', icon: '📤' },
    { key: 'signed', label: 'Signed', icon: '✍️' },
    { key: 'registered', label: 'Registered', icon: '✅' },
]

function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
}

export default function AgreementDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [agreement, setAgreement] = useState<Agreement | null>(null)
    const [flat, setFlat] = useState<Flat | null>(null)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const loadData = useCallback(async () => {
        const supabase = createClient()
        const { data } = await supabase.from('agreements').select('*').eq('id', id).single()
        if (data) {
            const agr = data as Agreement
            setAgreement(agr)
            setEditForm({
                start_date: agr.start_date, end_date: agr.end_date,
                rent_amount: String(agr.rent_amount), maintenance_amount: String(agr.maintenance_amount),
                deposit_amount: String(agr.deposit_amount), escalation_percent: String(agr.escalation_percent),
                lock_in_months: String(agr.lock_in_months), notice_period_months: String(agr.notice_period_months),
                replacement_charge: String(agr.replacement_charge), status: agr.status,
            })
            if (agr.flat_id) {
                const { data: f } = await supabase.from('flats').select('*').eq('id', agr.flat_id).single()
                if (f) setFlat(f as Flat)
            }
            if (agr.tenant_id) {
                const { data: t } = await supabase.from('tenants').select('*').eq('id', agr.tenant_id).single()
                if (t) setTenant(t as Tenant)
            }
        }
        setLoading(false)
    }, [id])

    useEffect(() => { loadData() }, [loadData])

    async function handleSave() {
        setSaving(true)
        const supabase = createClient()
        await supabase.from('agreements').update({
            start_date: editForm.start_date, end_date: editForm.end_date,
            rent_amount: parseFloat(editForm.rent_amount) || 0,
            maintenance_amount: parseFloat(editForm.maintenance_amount) || 0,
            deposit_amount: parseFloat(editForm.deposit_amount) || 0,
            escalation_percent: parseFloat(editForm.escalation_percent) || 5,
            lock_in_months: parseInt(editForm.lock_in_months) || 6,
            notice_period_months: parseInt(editForm.notice_period_months) || 1,
            replacement_charge: parseFloat(editForm.replacement_charge) || 0,
            status: editForm.status as Agreement['status'],
        }).eq('id', id)
        setEditing(false)
        loadData()
        setSaving(false)
    }

    async function handleDelete() {
        if (!confirm('Delete this agreement?')) return
        const supabase = createClient()
        await supabase.from('agreements').delete().eq('id', id)
        router.push('/agreements')
    }

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    if (loading) return <SkeletonPage />
    if (!agreement) return (
        <div className="empty-state" style={{ minHeight: 400 }}>
            <h3>Agreement not found</h3>
            <Link href="/agreements" className="btn btn-primary">← Back</Link>
        </div>
    )

    const st = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.draft
    const days = daysUntil(agreement.end_date)
    const isActive = agreement.status === 'signed' || agreement.status === 'registered'
    const durationMonths = Math.round((new Date(agreement.end_date).getTime() - new Date(agreement.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))

    // Lifecycle progress
    const lifecycleIndex = LIFECYCLE_STEPS.findIndex(s => s.key === agreement.status)
    const progressPct = agreement.status === 'expired' || agreement.status === 'terminated' ? 100
        : lifecycleIndex >= 0 ? ((lifecycleIndex + 1) / LIFECYCLE_STEPS.length) * 100 : 0

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link href="/agreements" className="btn btn-ghost btn-sm">← Agreements</Link>
                    <span style={{ color: 'var(--text-secondary)' }}>/</span>
                    <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
                        {flat ? `Flat ${flat.flat_number}` : 'Agreement'} — {agreement.agreement_type?.replace(/_/g, ' ')}
                    </h1>
                    <span className="badge" style={{ background: st.bg, color: st.color, padding: '4px 14px', fontSize: 13 }}>{st.label}</span>
                    {isActive && (
                        <span style={{
                            fontWeight: 700, fontSize: 14, padding: '4px 12px', borderRadius: 20,
                            background: days <= 30 ? '#fef2f2' : days <= 60 ? '#fffbeb' : '#ecfdf5',
                            color: days <= 30 ? '#dc2626' : days <= 60 ? '#d97706' : '#059669',
                        }}>
                            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {!editing ? (
                        <>
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                const html = generateAgreementHTML({
                                    licensorName: flat?.owner_entity || 'Priya Residences Private Limited',
                                    licensorPAN: '',
                                    licensorAddress: 'Hyderabad, Telangana',
                                    licensorDirector: 'Authorized Signatory',
                                    licensees: tenant ? [{
                                        name: tenant.full_name,
                                        pan: '', aadhaar: '',
                                        phone: tenant.phone || '', email: tenant.email || '',
                                    }] : [{ name: '_______________', pan: '', aadhaar: '', phone: '', email: '' }],
                                    flatNumber: flat?.flat_number || '—',
                                    floor: flat?.floor || 'Ground',
                                    propertyName: 'Priya Mahalakshmi Towers',
                                    propertyAddress: 'Hyderabad, Telangana',
                                    carpetAreaSqft: flat?.carpet_area_sqft || 0,
                                    furnishing: flat?.furnishing || 'Semi',
                                    startDate: agreement.start_date,
                                    endDate: agreement.end_date,
                                    monthlyRent: agreement.rent_amount,
                                    monthlyMaintenance: agreement.maintenance_amount,
                                    securityDeposit: agreement.deposit_amount,
                                    lockInMonths: agreement.lock_in_months,
                                    noticePeriodMonths: agreement.notice_period_months,
                                    escalationPercent: agreement.escalation_percent,
                                    rentDueDay: 1,
                                    gracePeriodDays: 7,
                                    lateFeePercent: 5,
                                    inventory: [],
                                    agreementDate: agreement.start_date,
                                })
                                const w = window.open('', '_blank')
                                if (w) { w.document.write(html); w.document.close() }
                            }}>📄 Generate Draft</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Delete</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</button>
                        </>
                    )}
                </div>
            </div>

            {/* Lifecycle Progress Bar */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 16 }}>Agreement Lifecycle</h3>
                <div style={{ position: 'relative' }}>
                    {/* Progress track */}
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginBottom: 8 }}>
                        <div style={{
                            height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                            width: `${progressPct}%`,
                            background: agreement.status === 'expired' || agreement.status === 'terminated'
                                ? '#ef4444' : 'linear-gradient(90deg, var(--color-primary), #8b5cf6)',
                        }} />
                    </div>
                    {/* Steps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {LIFECYCLE_STEPS.map((step, i) => {
                            const isCompleted = lifecycleIndex >= i
                            const isCurrent = lifecycleIndex === i
                            return (
                                <div key={step.key} style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', margin: '0 auto 8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isCompleted ? 'var(--color-primary)' : '#f1f5f9',
                                        color: isCompleted ? 'white' : '#94a3b8',
                                        fontWeight: 700, fontSize: 16,
                                        boxShadow: isCurrent ? '0 0 0 3px rgba(99, 102, 241, 0.3)' : 'none',
                                        transition: 'all 0.3s',
                                    }}>
                                        {step.icon}
                                    </div>
                                    <div style={{
                                        fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                                        color: isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    }}>{step.label}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Agreement Terms */}
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 20 }}>Agreement Terms</h3>
                    {editing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {[
                                { label: 'Start Date', key: 'start_date', type: 'date' },
                                { label: 'End Date', key: 'end_date', type: 'date' },
                                { label: 'Rent (₹)', key: 'rent_amount', type: 'number' },
                                { label: 'Maintenance (₹)', key: 'maintenance_amount', type: 'number' },
                                { label: 'Deposit (₹)', key: 'deposit_amount', type: 'number' },
                                { label: 'Escalation (%)', key: 'escalation_percent', type: 'number' },
                                { label: 'Lock-in (months)', key: 'lock_in_months', type: 'number' },
                                { label: 'Notice (months)', key: 'notice_period_months', type: 'number' },
                                { label: 'Replacement Charge (₹)', key: 'replacement_charge', type: 'number' },
                            ].map(f => (
                                <div className="form-group" key={f.key} style={{ marginBottom: 8 }}>
                                    <label className="form-label">{f.label}</label>
                                    <input className="form-input" type={f.type}
                                        value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                </div>
                            ))}
                            <div className="form-group" style={{ marginBottom: 8 }}>
                                <label className="form-label">Status</label>
                                <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                            {[
                                { label: 'Type', value: agreement.agreement_type?.replace(/_/g, ' ') || '—' },
                                { label: 'Duration', value: `${durationMonths} months` },
                                { label: 'Start Date', value: fmtDate(agreement.start_date) },
                                { label: 'End Date', value: fmtDate(agreement.end_date) },
                                { label: 'Lock-in Period', value: `${agreement.lock_in_months} months` },
                                { label: 'Notice Period', value: `${agreement.notice_period_months} month(s)` },
                                { label: 'Escalation', value: `${agreement.escalation_percent}% per annum` },
                                { label: 'Replacement Charge', value: fmt(agreement.replacement_charge) },
                                { label: 'Signed Date', value: agreement.signed_date ? fmtDate(agreement.signed_date) : '—' },
                            ].map(i => (
                                <div key={i.label} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{i.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{i.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div>
                    {/* Financial Summary */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 className="card-title" style={{ marginBottom: 16 }}>Financial Terms</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Monthly Rent</span>
                                <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)' }}>{fmt(agreement.rent_amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Maintenance</span>
                                <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt(agreement.maintenance_amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Security Deposit</span>
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#f59e0b' }}>{fmt(agreement.deposit_amount)}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', padding: '12px',
                                background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', marginTop: 4,
                            }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>Total Monthly</span>
                                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>
                                    {fmt(agreement.rent_amount + agreement.maintenance_amount)}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', marginTop: 4 }}>
                                Annual Value: {fmt((agreement.rent_amount + agreement.maintenance_amount) * 12)}
                            </div>
                        </div>
                    </div>

                    {/* Linked Flat */}
                    {flat && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 className="card-title" style={{ marginBottom: 12 }}>Linked Flat</h3>
                            <Link href={`/flats/${flat.id}`} style={{
                                display: 'block', padding: 14, background: '#f8fafc',
                                borderRadius: 'var(--radius-md)', textDecoration: 'none',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)' }}>Flat {flat.flat_number}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {flat.flat_type} · {flat.floor} Floor · {flat.owner_entity}
                                </div>
                            </Link>
                        </div>
                    )}

                    {/* Linked Tenant */}
                    {tenant && (
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 12 }}>Licensee</h3>
                            <Link href={`/tenants/${tenant.id}`} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                                background: '#f8fafc', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                            }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 14,
                                }}>
                                    {tenant.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tenant.full_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tenant.phone || tenant.email || '—'}</div>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
