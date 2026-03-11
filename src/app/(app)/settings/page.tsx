'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '../layout'
import { useToast } from '@/lib/components/ui'
import type { UserProfile, Organization } from '@/lib/types/database'

const TABS = ['Organization', 'Billing Rules', 'Users']

export default function SettingsPage() {
    const { user, orgName } = useApp()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState(0)
    const [org, setOrg] = useState<Organization | null>(null)
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Billing rules (stored in org.settings JSONB)
    const [billingRules, setBillingRules] = useState({
        rent_due_day: 1,
        grace_period_days: 7,
        late_fee_percent: 5,
        late_fee_type: 'simple_interest',
        escalation_percent: 5,
        notice_period_months: 1,
        lock_in_months: 6,
        agreement_duration_months: 11,
        deposit_refund_days: 30,
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) { setLoading(false); return }

            // Try user profile first, fallback to first org
            const { data: profile } = await supabase.from('users').select('org_id').eq('id', authUser.id).single()
            let orgId = profile?.org_id
            if (!orgId) {
                const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single()
                orgId = firstOrg?.id
            }
            if (!orgId) { setLoading(false); return }

            const [orgRes, usersRes] = await Promise.all([
                supabase.from('organizations').select('*').eq('id', orgId).single(),
                supabase.from('users').select('*').eq('org_id', orgId).order('created_at'),
            ])

            if (orgRes.data) {
                setOrg(orgRes.data as Organization)
                const s = (orgRes.data as Organization).settings as Record<string, unknown> || {}
                setBillingRules(prev => ({
                    ...prev,
                    ...(s.billing_rules as Record<string, unknown> || {}),
                }))
            }
            setUsers(usersRes.data as UserProfile[] || [])
        } catch (err) {
            console.error('[FlatOS] Settings load error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // ─── Save Organization ─────────────────────────────────────
    async function saveOrg(e: React.FormEvent) {
        e.preventDefault()
        if (!org) return
        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase.from('organizations').update({
            name: org.name, email: org.email, phone: org.phone,
            address: org.address, city: org.city,
            gst_number: org.gst_number, cin_number: org.cin_number,
        }).eq('id', org.id)
        setSaving(false)
        if (error) { toast(error.message, 'error') } else { toast('Organization updated') }
    }

    // ─── Save Billing Rules ────────────────────────────────────
    async function saveBilling(e: React.FormEvent) {
        e.preventDefault()
        if (!org) return
        setSaving(true)
        const supabase = createClient()
        const currentSettings = (org.settings || {}) as Record<string, unknown>
        const { error } = await supabase.from('organizations').update({
            settings: { ...currentSettings, billing_rules: billingRules },
        }).eq('id', org.id)
        setSaving(false)
        if (error) { toast(error.message, 'error') } else { toast('Billing rules saved') }
    }

    if (loading) return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <div className="skeleton skeleton-text-lg" style={{ marginBottom: 8 }} />
                <div className="skeleton skeleton-text-sm" />
            </div>
            <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
        </div>
    )

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-description">Manage your organization, billing rules, and user access</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24, width: 'fit-content' }}>
                {TABS.map((tab, i) => (
                    <button key={tab} onClick={() => setActiveTab(i)} style={{
                        padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                        background: activeTab === i ? 'white' : 'transparent',
                        color: activeTab === i ? 'var(--color-primary)' : 'var(--text-secondary)',
                        boxShadow: activeTab === i ? 'var(--shadow-sm)' : 'none',
                    }}>
                        {['🏢', '📋', '👤'][i]} {tab}
                    </button>
                ))}
            </div>

            {/* Organization Tab */}
            {activeTab === 0 && org && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 20 }}>Organization Details</h3>
                    <form onSubmit={saveOrg}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group"><label className="form-label">Organization Name *</label>
                                <input className="form-input" value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} required /></div>
                            <div className="form-group"><label className="form-label">Email</label>
                                <input className="form-input" type="email" value={org.email || ''} onChange={e => setOrg({ ...org, email: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Phone</label>
                                <input className="form-input" value={org.phone || ''} onChange={e => setOrg({ ...org, phone: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">City</label>
                                <input className="form-input" value={org.city || ''} onChange={e => setOrg({ ...org, city: e.target.value })} /></div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Address</label>
                                <input className="form-input" value={org.address || ''} onChange={e => setOrg({ ...org, address: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">GST Number</label>
                                <input className="form-input" value={org.gst_number || ''} onChange={e => setOrg({ ...org, gst_number: e.target.value })} placeholder="e.g. 36AABCP1234M1Z5" /></div>
                            <div className="form-group"><label className="form-label">CIN Number</label>
                                <input className="form-input" value={org.cin_number || ''} onChange={e => setOrg({ ...org, cin_number: e.target.value })} placeholder="e.g. U70102TG2023PTC123456" /></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Billing Rules Tab */}
            {activeTab === 1 && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 20 }}>Billing & Agreement Rules</h3>
                    <form onSubmit={saveBilling}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            <div className="form-group"><label className="form-label">Rent Due Day</label>
                                <input className="form-input" type="number" min="1" max="28" value={billingRules.rent_due_day} onChange={e => setBillingRules(p => ({ ...p, rent_due_day: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Grace Period (days)</label>
                                <input className="form-input" type="number" min="0" max="30" value={billingRules.grace_period_days} onChange={e => setBillingRules(p => ({ ...p, grace_period_days: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Late Fee % p.a.</label>
                                <input className="form-input" type="number" min="0" max="24" step="0.5" value={billingRules.late_fee_percent} onChange={e => setBillingRules(p => ({ ...p, late_fee_percent: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Agreement Duration (months)</label>
                                <input className="form-input" type="number" min="1" max="60" value={billingRules.agreement_duration_months} onChange={e => setBillingRules(p => ({ ...p, agreement_duration_months: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Lock-In Period (months)</label>
                                <input className="form-input" type="number" min="0" max="24" value={billingRules.lock_in_months} onChange={e => setBillingRules(p => ({ ...p, lock_in_months: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Notice Period (months)</label>
                                <input className="form-input" type="number" min="1" max="6" value={billingRules.notice_period_months} onChange={e => setBillingRules(p => ({ ...p, notice_period_months: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Annual Escalation %</label>
                                <input className="form-input" type="number" min="0" max="20" step="0.5" value={billingRules.escalation_percent} onChange={e => setBillingRules(p => ({ ...p, escalation_percent: +e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Deposit Refund Deadline (days)</label>
                                <input className="form-input" type="number" min="7" max="90" value={billingRules.deposit_refund_days} onChange={e => setBillingRules(p => ({ ...p, deposit_refund_days: +e.target.value }))} /></div>
                        </div>
                        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-info-light)', borderRadius: 'var(--radius-md)', fontSize: 13, color: '#3b82f6' }}>
                            💡 These rules auto-apply to new agreements and demand generation.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : '💾 Save Billing Rules'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 2 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="card-header">
                        <h3 className="card-title">Users & Access</h3>
                    </div>
                    {users.length === 0 ? (
                        <div className="empty-state"><h3>No users</h3></div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                                    {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                                                    {u.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.phone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{u.email}</td>
                                        <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{u.role.replace('_', ' ')}</span></td>
                                        <td><span className="badge" style={{ background: u.is_active ? '#ecfdf5' : '#fef2f2', color: u.is_active ? '#059669' : '#dc2626' }}>
                                            {u.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}
