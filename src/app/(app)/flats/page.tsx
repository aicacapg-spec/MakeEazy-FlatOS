'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SkeletonGrid } from '@/lib/components/ui'
import type { Flat } from '@/lib/types/database'

// Status badge color mapping
const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    occupied: { bg: '#ecfdf5', color: '#059669', label: 'Occupied' },
    vacant: { bg: '#fef2f2', color: '#dc2626', label: 'Vacant' },
    under_repair: { bg: '#fffbeb', color: '#d97706', label: 'Under Repair' },
    office: { bg: '#f1f5f9', color: '#475569', label: 'Office' },
    blocked: { bg: '#fef2f2', color: '#b91c1c', label: 'Blocked' },
    reserved: { bg: '#eff6ff', color: '#2563eb', label: 'Reserved' },
}

const FLOOR_OPTIONS = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const STATUS_OPTIONS = ['occupied', 'vacant', 'under_repair', 'office', 'blocked', 'reserved']

export default function FlatsPage() {
    const [flats, setFlats] = useState<Flat[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [floorFilter, setFloorFilter] = useState<string>('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadFlats = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        let query = supabase.from('flats').select('*').order('flat_number', { ascending: true })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }
        if (floorFilter !== 'all') {
            query = query.eq('floor', floorFilter)
        }

        const { data, error } = await query
        if (error) {
            console.error('Error loading flats:', error)
        } else {
            setFlats(data || [])
        }
        setLoading(false)
    }, [statusFilter, floorFilter])

    useEffect(() => {
        loadFlats()
    }, [loadFlats])

    // Client-side search filtering
    const filteredFlats = flats.filter(flat => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            flat.flat_number.toLowerCase().includes(q) ||
            (flat.owner_entity || '').toLowerCase().includes(q) ||
            (flat.flat_type || '').toLowerCase().includes(q)
        )
    })

    // Stats
    const stats = {
        total: flats.length,
        occupied: flats.filter(f => f.status === 'occupied').length,
        vacant: flats.filter(f => f.status === 'vacant').length,
        office: flats.filter(f => f.status === 'office').length,
    }

    const formatCurrency = (amount: number) => {
        return `₹${Math.round(amount).toLocaleString('en-IN')}`
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Flat Management</h1>
                    <p className="page-description">Manage all flats, occupancy, and details for Priya Mahalakshmi Towers</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Flat
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg>
                    </div>
                    <div className="summary-card-label">Total Flats</div>
                    <div className="summary-card-value">{stats.total}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                    </div>
                    <div className="summary-card-label">Occupied</div>
                    <div className="summary-card-value" style={{ color: '#059669' }}>{stats.occupied}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12h6" /></svg>
                    </div>
                    <div className="summary-card-label">Vacant</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{stats.vacant}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#f1f5f9' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V3a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v4" /></svg>
                    </div>
                    <div className="summary-card-label">Office</div>
                    <div className="summary-card-value" style={{ color: '#475569' }}>{stats.office}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Search by flat number, type, or owner..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ fontSize: 13 }}
                        />
                    </div>
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ width: 160 }}
                    >
                        <option value="all">All Status</option>
                        {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                        ))}
                    </select>
                    <select
                        className="form-select"
                        value={floorFilter}
                        onChange={e => setFloorFilter(e.target.value)}
                        style={{ width: 140 }}
                    >
                        <option value="all">All Floors</option>
                        {FLOOR_OPTIONS.map(f => (
                            <option key={f} value={f}>{f} Floor</option>
                        ))}
                    </select>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {filteredFlats.length} flat{filteredFlats.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Flats Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonGrid count={12} />
                ) : filteredFlats.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                        </svg>
                        <h3>{flats.length === 0 ? 'No flats yet' : 'No flats match your filters'}</h3>
                        <p>{flats.length === 0 ? 'Create your first flat to get started.' : 'Try adjusting your search or filters.'}</p>
                        {flats.length === 0 && (
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                + Add First Flat
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Flat</th>
                                    <th>Floor</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Rent</th>
                                    <th>Maintenance</th>
                                    <th>Furnishing</th>
                                    <th>Owner Entity</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFlats.map(flat => {
                                    const status = STATUS_CONFIG[flat.status] || STATUS_CONFIG.vacant
                                    return (
                                        <tr key={flat.id}>
                                            <td>
                                                <Link href={`/flats/${flat.id}`} style={{
                                                    fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none',
                                                    fontSize: 15,
                                                }}>
                                                    {flat.flat_number}
                                                </Link>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{flat.floor || '—'}</td>
                                            <td>{flat.flat_type || '—'}</td>
                                            <td>
                                                <span className="badge" style={{ background: status.bg, color: status.color }}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(flat.monthly_rent)}</td>
                                            <td>{formatCurrency(flat.monthly_maintenance)}</td>
                                            <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                                                {flat.furnishing || '—'}
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{flat.owner_entity}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link href={`/flats/${flat.id}`} className="btn btn-ghost btn-sm">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Flat Modal */}
            {showAddModal && (
                <AddFlatModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadFlats() }} />
            )}
        </div>
    )
}

// ─── Add Flat Modal ──────────────────────────────────────────────────────
function AddFlatModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        flat_number: '',
        floor: '',
        flat_type: '2BHK',
        carpet_area_sqft: '',
        furnishing: 'semi_furnished',
        ac_count: '0',
        parking: '',
        owner_entity: 'PRPL',
        monthly_rent: '',
        monthly_maintenance: '',
        status: 'vacant',
        remarks: '',
    })

    function updateField(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Get org_id and property_id (first org and property)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }

        // Try to get user's org
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        let orgId = profile?.org_id

        // If no org exists, create one
        if (!orgId) {
            const { data: newOrg, error: orgError } = await supabase.from('organizations').insert({
                name: user.user_metadata?.org_name || 'My Organization',
                slug: 'my-org',
                email: user.email,
                status: 'active',
                subscription_tier: 'free',
            }).select('id').single()

            if (orgError) { setError('Failed to create organization: ' + orgError.message); setLoading(false); return }
            orgId = newOrg.id

            // Create user profile
            await supabase.from('users').insert({
                id: user.id,
                org_id: orgId,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || 'Admin',
                role: 'admin',
                is_active: true,
            })
        }

        // Ensure property exists
        const { data: props } = await supabase.from('properties').select('id').eq('org_id', orgId).limit(1)
        let propertyId = props?.[0]?.id

        if (!propertyId) {
            const { data: newProp, error: propError } = await supabase.from('properties').insert({
                org_id: orgId,
                name: 'Priya Mahalakshmi Towers',
                address: 'Hyderabad',
                city: 'Hyderabad',
                total_units: 16,
            }).select('id').single()

            if (propError) { setError('Failed to create property: ' + propError.message); setLoading(false); return }
            propertyId = newProp.id
        }

        const { error: insertError } = await supabase.from('flats').insert({
            org_id: orgId,
            property_id: propertyId,
            flat_number: form.flat_number,
            floor: form.floor || null,
            flat_type: form.flat_type || null,
            carpet_area_sqft: form.carpet_area_sqft ? parseFloat(form.carpet_area_sqft) : null,
            furnishing: form.furnishing,
            ac_count: parseInt(form.ac_count) || 0,
            parking: form.parking || null,
            owner_entity: form.owner_entity,
            monthly_rent: parseFloat(form.monthly_rent) || 0,
            monthly_maintenance: parseFloat(form.monthly_maintenance) || 0,
            status: form.status as Flat['status'],
            remarks: form.remarks || null,
        })

        if (insertError) {
            setError(insertError.message)
            setLoading(false)
            return
        }

        onSaved()
    }

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <h2 className="modal-title">Add New Flat</h2>

                {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Flat Number *</label>
                            <input className="form-input" placeholder="e.g. 101" value={form.flat_number}
                                onChange={e => updateField('flat_number', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Floor</label>
                            <select className="form-select" value={form.floor} onChange={e => updateField('floor', e.target.value)}>
                                <option value="">Select Floor</option>
                                {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-select" value={form.flat_type} onChange={e => updateField('flat_type', e.target.value)}>
                                <option value="1BHK">1BHK</option>
                                <option value="2BHK">2BHK</option>
                                <option value="3BHK">3BHK</option>
                                <option value="Studio">Studio</option>
                                <option value="Penthouse">Penthouse</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Carpet Area (sq.ft)</label>
                            <input className="form-input" type="number" placeholder="e.g. 1200"
                                value={form.carpet_area_sqft} onChange={e => updateField('carpet_area_sqft', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Monthly Rent (₹) *</label>
                            <input className="form-input" type="number" placeholder="e.g. 25000" value={form.monthly_rent}
                                onChange={e => updateField('monthly_rent', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Maintenance (₹) *</label>
                            <input className="form-input" type="number" placeholder="e.g. 5000" value={form.monthly_maintenance}
                                onChange={e => updateField('monthly_maintenance', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Furnishing</label>
                            <select className="form-select" value={form.furnishing} onChange={e => updateField('furnishing', e.target.value)}>
                                <option value="unfurnished">Unfurnished</option>
                                <option value="semi_furnished">Semi Furnished</option>
                                <option value="fully_furnished">Fully Furnished</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">AC Count</label>
                            <input className="form-input" type="number" min="0" max="10" value={form.ac_count}
                                onChange={e => updateField('ac_count', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Parking</label>
                            <input className="form-input" placeholder="e.g. B1-12" value={form.parking}
                                onChange={e => updateField('parking', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Owner Entity</label>
                            <select className="form-select" value={form.owner_entity} onChange={e => updateField('owner_entity', e.target.value)}>
                                <option value="PRPL">PRPL</option>
                                <option value="GreenTech Engineering">GreenTech Engineering</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-select" value={form.status} onChange={e => updateField('status', e.target.value)}>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 4 }}>
                        <label className="form-label">Remarks</label>
                        <input className="form-input" placeholder="Any notes about this flat..."
                            value={form.remarks} onChange={e => updateField('remarks', e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Creating...</>
                            ) : 'Create Flat'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
