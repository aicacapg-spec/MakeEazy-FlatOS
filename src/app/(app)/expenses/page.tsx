'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonTable } from '@/lib/components/ui'
import type { Flat } from '@/lib/types/database'

interface Expense {
    id: string; org_id: string; flat_id: string | null; vendor_id: string | null;
    category: string; description: string | null; amount: number; date: string;
    is_recurring: boolean; is_capex: boolean; invoice_url: string | null;
    remarks: string | null; created_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    maintenance: { icon: '🔧', label: 'Maintenance', color: '#3b82f6' },
    repair: { icon: '🛠️', label: 'Repair', color: '#f59e0b' },
    cleaning: { icon: '🧹', label: 'Cleaning', color: '#10b981' },
    security: { icon: '🔒', label: 'Security', color: '#8b5cf6' },
    electricity: { icon: '⚡', label: 'Electricity', color: '#ef4444' },
    water: { icon: '💧', label: 'Water', color: '#06b6d4' },
    insurance: { icon: '🛡️', label: 'Insurance', color: '#6366f1' },
    legal: { icon: '⚖️', label: 'Legal', color: '#64748b' },
    accounting: { icon: '📊', label: 'Accounting', color: '#ec4899' },
    other: { icon: '📋', label: 'Other', color: '#94a3b8' },
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<(Expense & { flat_number?: string })[]>([])
    const [flats, setFlats] = useState<Flat[]>([])
    const [loading, setLoading] = useState(true)
    const [catFilter, setCatFilter] = useState('all')
    const [showAddModal, setShowAddModal] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const [expRes, flatRes] = await Promise.all([
            supabase.from('expenses').select('*').order('date', { ascending: false }),
            supabase.from('flats').select('*').order('flat_number'),
        ])
        const flatMap = new Map((flatRes.data || []).map(f => [f.id, f.flat_number]))
        setFlats(flatRes.data as Flat[] || [])
        setExpenses((expRes.data || []).map(e => ({ ...e, flat_number: e.flat_id ? flatMap.get(e.flat_id) || '—' : 'Common' })) as (Expense & { flat_number?: string })[])
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = catFilter === 'all' ? expenses : expenses.filter(e => e.category === catFilter)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const thisMonth = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear()).reduce((s, e) => s + e.amount, 0)
    const recurring = expenses.filter(e => e.is_recurring).reduce((s, e) => s + e.amount, 0)

    const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    // Category breakdown
    const catBreakdown = Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({
        key: k, ...v, total: expenses.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0),
        count: expenses.filter(e => e.category === k).length,
    })).filter(c => c.count > 0).sort((a, b) => b.total - a.total)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Expense Tracking</h1>
                    <p className="page-description">Track property maintenance, repairs, and operational expenses</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Expense</button>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: 'var(--color-primary-light)' }}><span style={{ fontSize: 20 }}>📊</span></div>
                    <div className="summary-card-label">Total Expenses</div>
                    <div className="summary-card-value">{fmt(totalExpenses)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fef2f2' }}><span style={{ fontSize: 20 }}>📅</span></div>
                    <div className="summary-card-label">This Month</div>
                    <div className="summary-card-value" style={{ color: '#dc2626' }}>{fmt(thisMonth)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#fffbeb' }}><span style={{ fontSize: 20 }}>🔄</span></div>
                    <div className="summary-card-label">Recurring</div>
                    <div className="summary-card-value" style={{ color: '#d97706' }}>{fmt(recurring)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon" style={{ background: '#ecfdf5' }}><span style={{ fontSize: 20 }}>📋</span></div>
                    <div className="summary-card-label">Transactions</div>
                    <div className="summary-card-value">{expenses.length}</div>
                </div>
            </div>

            {/* Category Breakdown */}
            {catBreakdown.length > 0 && (
                <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>EXPENSE BREAKDOWN</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {catBreakdown.map(c => (
                            <div key={c.key} onClick={() => setCatFilter(catFilter === c.key ? 'all' : c.key)} style={{
                                padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                background: catFilter === c.key ? c.color + '15' : '#f8fafc',
                                border: catFilter === c.key ? `1.5px solid ${c.color}` : '1.5px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                                <span>{c.icon} {c.label}</span>
                                <span style={{ fontWeight: 700, marginLeft: 8, color: c.color }}>{fmt(c.total)}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>({c.count})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable rows={5} cols={7} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><h3>No expenses</h3><p>Record your first expense to start tracking.</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Expense</button></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Flat</th><th>Amount</th><th>Type</th></tr></thead>
                            <tbody>
                                {filtered.map(e => {
                                    const cat = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.other
                                    return (
                                        <tr key={e.id}>
                                            <td style={{ fontSize: 13 }}>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td><span className="badge" style={{ background: cat.color + '15', color: cat.color }}>{cat.icon} {cat.label}</span></td>
                                            <td>{e.description || '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{e.flat_number}</td>
                                            <td style={{ fontWeight: 700, color: '#dc2626' }}>-{fmt(e.amount)}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {e.is_recurring && <span className="badge badge-info" style={{ marginRight: 4 }}>🔄 Recurring</span>}
                                                {e.is_capex && <span className="badge badge-warning">CapEx</span>}
                                                {!e.is_recurring && !e.is_capex && 'One-time'}
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h2 className="modal-title">Add Expense</h2>
                        <ExpenseForm flats={flats} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadData() }} />
                    </div>
                </div>
            )}
        </div>
    )
}

function ExpenseForm({ flats, onClose, onSaved }: { flats: Flat[]; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        flat_id: '', category: 'maintenance', description: '', amount: '',
        date: new Date().toISOString().split('T')[0], is_recurring: false, is_capex: false, remarks: '',
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setLoading(false); return }
        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        if (!profile?.org_id) { setError('No org'); setLoading(false); return }
        const { error: err } = await supabase.from('expenses').insert({
            org_id: profile.org_id, flat_id: form.flat_id || null, category: form.category,
            description: form.description || null, amount: parseFloat(form.amount),
            date: form.date, is_recurring: form.is_recurring, is_capex: form.is_capex, remarks: form.remarks || null,
        })
        if (err) { setError(err.message); setLoading(false); return }
        onSaved()
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label className="form-label">Category *</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Flat (or Common)</label>
                    <select className="form-select" value={form.flat_id} onChange={e => setForm(p => ({ ...p, flat_id: e.target.value }))}>
                        <option value="">Common area</option>{flats.map(f => <option key={f.id} value={f.id}>Flat {f.flat_number}</option>)}</select></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Description</label>
                    <input className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What was this expense for?" /></div>
                <div className="form-group"><label className="form-label">Amount (₹) *</label>
                    <input className="form-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))} /> 🔄 Recurring
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.is_capex} onChange={e => setForm(p => ({ ...p, is_capex: e.target.checked }))} /> 📦 CapEx
                    </label>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Expense'}</button>
            </div>
        </form>
    )
}
