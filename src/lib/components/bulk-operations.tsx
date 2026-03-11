'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────
interface ColumnDef {
    key: string
    label: string
    required?: boolean
    type?: 'text' | 'number' | 'date' | 'select'
    options?: string[]
    example?: string
}

interface BulkOperationsProps {
    moduleName: string
    tableName: string
    columns: ColumnDef[]
    data: Record<string, unknown>[]
    onImportComplete: () => void
    orgIdRequired?: boolean
    lookupMaps?: Record<string, Map<string, string>> // e.g. flat_number → flat_id
}

// ─── Download Template ────────────────────────────────────
export function DownloadTemplateButton({ moduleName, columns }: { moduleName: string; columns: ColumnDef[] }) {
    function downloadTemplate() {
        const headers = columns.map(c => c.label)
        const examples = columns.map(c => c.example || '')
        const ws = XLSX.utils.aoa_to_sheet([
            headers,
            examples,
        ])
        // Style column widths
        ws['!cols'] = columns.map(c => ({ wch: Math.max(c.label.length + 4, 18) }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, moduleName)

        // Add instructions sheet
        const instrSheet = XLSX.utils.aoa_to_sheet([
            ['FlatOS — Import Instructions'],
            [''],
            ['1. Fill data in the first sheet starting from row 2'],
            ['2. Required fields: ' + columns.filter(c => c.required).map(c => c.label).join(', ')],
            ['3. Date format: YYYY-MM-DD (e.g., 2025-04-01)'],
            ['4. Do not modify column headers'],
            ...columns.filter(c => c.options).map(c => [`${c.label} options: ${c.options!.join(', ')}`]),
            [''],
            ['5. Save the file and upload it back in FlatOS'],
        ])
        instrSheet['!cols'] = [{ wch: 60 }]
        XLSX.utils.book_append_sheet(wb, instrSheet, 'Instructions')

        XLSX.writeFile(wb, `FlatOS_${moduleName}_Template.xlsx`)
    }

    return (
        <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} title={'Download ' + moduleName + ' Excel template'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Template
        </button>
    )
}

// ─── Export Data ───────────────────────────────────────────
export function ExportDataButton({ moduleName, columns, data }: { moduleName: string; columns: ColumnDef[]; data: Record<string, unknown>[] }) {
    function exportData() {
        if (data.length === 0) return
        const headers = columns.map(c => c.label)
        const rows = data.map(row => columns.map(c => {
            const val = row[c.key]
            if (val === null || val === undefined) return ''
            if (c.type === 'number') return Number(val)
            return String(val)
        }))
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = columns.map(c => ({ wch: Math.max(c.label.length + 4, 16) }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, moduleName)
        const dateSuffix = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `FlatOS_${moduleName}_${dateSuffix}.xlsx`)
    }

    return (
        <button className="btn btn-ghost btn-sm" onClick={exportData} disabled={data.length === 0} title={'Export ' + moduleName + ' as Excel'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Export
        </button>
    )
}

// ─── Bulk Import Modal ────────────────────────────────────
export function BulkImportButton({ moduleName, tableName, columns, onImportComplete, lookupMaps }: BulkOperationsProps) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)} title={'Import ' + moduleName + ' from Excel'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /></svg>
                Import
            </button>
            {showModal && (
                <ImportModal
                    moduleName={moduleName}
                    tableName={tableName}
                    columns={columns}
                    lookupMaps={lookupMaps}
                    onClose={() => setShowModal(false)}
                    onImportComplete={() => { setShowModal(false); onImportComplete() }}
                />
            )}
        </>
    )
}

function ImportModal({ moduleName, tableName, columns, onClose, onImportComplete, lookupMaps }: {
    moduleName: string; tableName: string; columns: ColumnDef[];
    onClose: () => void; onImportComplete: () => void; lookupMaps?: Record<string, Map<string, string>>
}) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
    const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [importResult, setImportResult] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 })
    const fileRef = useRef<HTMLInputElement>(null)

    const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer)
            const wb = XLSX.read(data, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

            // Map header labels back to keys
            const labelToKey = new Map(columns.map(c => [c.label, c.key]))
            const mapped = jsonRows.map(row => {
                const mapped: Record<string, unknown> = {}
                for (const [label, val] of Object.entries(row)) {
                    const key = labelToKey.get(label) || label
                    mapped[key] = val
                }
                // Apply lookup maps (e.g., flat_number → flat_id)
                if (lookupMaps) {
                    for (const [displayKey, map] of Object.entries(lookupMaps)) {
                        const displayVal = String(mapped[displayKey] || '')
                        if (displayVal && map.has(displayVal)) {
                            // Replace display key with actual id
                            const idKey = displayKey.replace('_number', '_id').replace('_name', '_id')
                            mapped[idKey] = map.get(displayVal)
                            delete mapped[displayKey]
                        }
                    }
                }
                return mapped
            })

            // Validate
            const errs: string[] = []
            mapped.forEach((row, i) => {
                columns.filter(c => c.required).forEach(c => {
                    if (!row[c.key] && row[c.key] !== 0) {
                        errs.push(`Row ${i + 2}: "${c.label}" is required`)
                    }
                })
            })

            setParsedRows(mapped)
            setErrors(errs)
            setStep('preview')
        }
        reader.readAsArrayBuffer(file)
    }, [columns, lookupMaps])

    async function handleImport() {
        setStep('importing')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
        const orgId = profile?.org_id
        if (!orgId) return

        let success = 0
        let failed = 0

        for (const row of parsedRows) {
            const insertData: Record<string, unknown> = { ...row, org_id: orgId }
            // Remove empty string values
            for (const k of Object.keys(insertData)) {
                if (insertData[k] === '' || insertData[k] === undefined) delete insertData[k]
            }
            const { error } = await supabase.from(tableName).insert(insertData)
            if (error) { failed++; console.error('Import error:', error) }
            else success++
        }

        setImportResult({ success, failed })
        setStep('done')
    }

    // Close on Escape
    const handleEsc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }, [onClose])
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useState(() => { window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc) })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <h2 className="modal-title">📥 Import {moduleName}</h2>

                {step === 'upload' && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                        <h3 style={{ marginBottom: 8 }}>Upload Excel File</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                            Upload a .xlsx file with {moduleName.toLowerCase()} data. Use our template for the correct format.
                        </p>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                                Choose File
                            </button>
                            <DownloadTemplateButton moduleName={moduleName} columns={columns} />
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontSize: 14 }}>
                                <strong>{parsedRows.length}</strong> rows found
                                {errors.length > 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>⚠ {errors.length} errors</span>}
                            </span>
                        </div>
                        {errors.length > 0 && (
                            <div style={{ background: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 120, overflow: 'auto' }}>
                                {errors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 12, color: '#dc2626' }}>{e}</div>)}
                                {errors.length > 5 && <div style={{ fontSize: 12, color: '#dc2626' }}>...and {errors.length - 5} more</div>}
                            </div>
                        )}
                        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        {columns.slice(0, 6).map(c => <th key={c.key}>{c.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            {columns.slice(0, 6).map(c => <td key={c.key}>{String(row[c.key] || '—')}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {parsedRows.length > 10 && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>Showing first 10 of {parsedRows.length} rows</div>}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn-ghost" onClick={() => { setStep('upload'); setParsedRows([]); setErrors([]) }}>← Back</button>
                            <button className="btn btn-primary" onClick={handleImport} disabled={errors.length > 0 || parsedRows.length === 0}>
                                Import {parsedRows.length} Rows
                            </button>
                        </div>
                    </div>
                )}

                {step === 'importing' && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
                        <h3>Importing...</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Writing {parsedRows.length} rows to database</p>
                    </div>
                )}

                {step === 'done' && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                        <h3>Import Complete</h3>
                        <p style={{ fontSize: 14, marginTop: 8 }}>
                            <span style={{ color: '#059669', fontWeight: 700 }}>{importResult.success} successful</span>
                            {importResult.failed > 0 && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 12 }}>{importResult.failed} failed</span>}
                        </p>
                        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onImportComplete}>Done</button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── KYC Document Preview Modal ───────────────────────────
export function KYCPreviewModal({ document, tenantName, onClose }: {
    document: { file_name: string; doc_type: string; file_url: string; is_verified: boolean; created_at: string }
    tenantName: string; onClose: () => void
}) {
    const isAadhaar = document.file_name.toLowerCase().includes('aadhaar')
    const isPan = document.file_name.toLowerCase().includes('pan')
    const docLabel = isAadhaar ? 'Aadhaar Card' : isPan ? 'PAN Card' : document.doc_type
    const dummyNumber = isAadhaar ? 'XXXX XXXX ' + Math.floor(1000 + Math.random() * 9000) : isPan ? 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F' : ''

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 className="modal-title" style={{ margin: 0 }}>{docLabel} Preview</h2>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                {/* Visual Document Preview */}
                <div style={{
                    background: isAadhaar ? 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' : isPan ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
                    borderRadius: 12, padding: '28px 24px', color: 'white', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Watermark */}
                    <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 10, opacity: 0.5, fontWeight: 600 }}>
                        {isAadhaar ? 'भारत सरकार | GOVERNMENT OF INDIA' : isPan ? 'INCOME TAX DEPARTMENT' : 'DOCUMENT'}
                    </div>

                    {/* Logo area */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                            {isAadhaar ? '🪪' : isPan ? '🏛️' : '📄'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{isAadhaar ? 'Aadhaar' : isPan ? 'PAN Card' : docLabel}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>{isAadhaar ? 'Unique Identification Authority of India' : isPan ? 'Permanent Account Number' : 'Verified Document'}</div>
                        </div>
                    </div>

                    {/* Photo placeholder + Details */}
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 80, height: 96, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>👤</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>Name</div>
                            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{tenantName}</div>
                            <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{isAadhaar ? 'Aadhaar Number' : isPan ? 'PAN Number' : 'Document ID'}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, fontFamily: 'monospace' }}>{dummyNumber}</div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6 }}>
                        <span>File: {document.file_name}</span>
                        <span>Uploaded: {new Date(document.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                </div>

                {/* Status & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <span className="badge" style={{
                        background: document.is_verified ? '#ecfdf5' : '#fffbeb',
                        color: document.is_verified ? '#059669' : '#d97706',
                        padding: '6px 12px', fontSize: 13,
                    }}>
                        {document.is_verified ? '✓ Verified' : '⏳ Pending Verification'}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                        <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Column Definitions for Each Module ───────────────────
export const MODULE_COLUMNS = {
    flats: [
        { key: 'flat_number', label: 'Flat Number', required: true, example: '101' },
        { key: 'floor', label: 'Floor', example: '1st', options: ['Ground', '1st', '2nd', '3rd', '4th', '5th'] },
        { key: 'flat_type', label: 'Type', example: '2BHK', options: ['1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse'] },
        { key: 'furnishing', label: 'Furnishing', example: 'fully_furnished', options: ['unfurnished', 'semi_furnished', 'fully_furnished'] },
        { key: 'carpet_area_sqft', label: 'Carpet Area (sqft)', type: 'number' as const, example: '1200' },
        { key: 'ac_count', label: 'AC Count', type: 'number' as const, example: '2' },
        { key: 'monthly_rent', label: 'Monthly Rent', type: 'number' as const, required: true, example: '45000' },
        { key: 'monthly_maintenance', label: 'Monthly Maintenance', type: 'number' as const, required: true, example: '3000' },
        { key: 'owner_entity', label: 'Owner Entity', example: 'Priya Residences Private Limited' },
        { key: 'status', label: 'Status', example: 'occupied', options: ['occupied', 'vacant', 'under_repair', 'office', 'blocked'] },
    ],
    tenants: [
        { key: 'full_name', label: 'Full Name', required: true, example: 'Rajesh Kumar Sharma' },
        { key: 'phone', label: 'Phone', example: '9876540001' },
        { key: 'email', label: 'Email', example: 'rajesh@email.com' },
        { key: 'dob', label: 'Date of Birth', type: 'date' as const, example: '1990-05-15' },
        { key: 'flat_number', label: 'Flat Number', example: '101' },
        { key: 'is_primary', label: 'Primary?', example: 'true', options: ['true', 'false'] },
        { key: 'rent_share', label: 'Rent Share', type: 'number' as const, example: '18000' },
        { key: 'maint_share', label: 'Maint Share', type: 'number' as const, example: '1200' },
        { key: 'employer_name', label: 'Employer', example: 'TCS' },
        { key: 'move_in_date', label: 'Move In Date', type: 'date' as const, example: '2025-04-01' },
    ],
    agreements: [
        { key: 'flat_number', label: 'Flat Number', required: true, example: '101' },
        { key: 'tenant_name', label: 'Tenant Name', required: true, example: 'Rajesh Kumar Sharma' },
        { key: 'agreement_type', label: 'Type', example: 'leave_and_license', options: ['leave_and_license', 'rental', 'commercial'] },
        { key: 'start_date', label: 'Start Date', type: 'date' as const, required: true, example: '2025-04-01' },
        { key: 'end_date', label: 'End Date', type: 'date' as const, required: true, example: '2026-03-02' },
        { key: 'rent_amount', label: 'Rent Amount', type: 'number' as const, required: true, example: '45000' },
        { key: 'deposit_amount', label: 'Deposit', type: 'number' as const, example: '200000' },
        { key: 'maintenance_amount', label: 'Maintenance', type: 'number' as const, example: '3000' },
    ],
    deposits: [
        { key: 'flat_number', label: 'Flat Number', required: true, example: '101' },
        { key: 'tenant_name', label: 'Tenant Name', required: true, example: 'Rajesh Kumar Sharma' },
        { key: 'amount', label: 'Amount', type: 'number' as const, required: true, example: '200000' },
        { key: 'deposit_type', label: 'Type', example: 'security', options: ['security', 'maintenance', 'advance_rent'] },
        { key: 'payment_mode', label: 'Payment Mode', example: 'neft', options: ['neft', 'upi', 'cash', 'cheque'] },
        { key: 'received_date', label: 'Date Received', type: 'date' as const, required: true, example: '2025-04-01' },
    ],
    expenses: [
        { key: 'category', label: 'Category', required: true, example: 'maintenance', options: ['maintenance', 'electrical', 'plumbing', 'security', 'cleaning', 'administrative', 'legal', 'insurance', 'tax', 'other'] },
        { key: 'description', label: 'Description', required: true, example: 'Monthly elevator maintenance' },
        { key: 'amount', label: 'Amount', type: 'number' as const, required: true, example: '12000' },
        { key: 'vendor_name', label: 'Vendor Name', example: 'ABC Elevators Pvt Ltd' },
        { key: 'bill_number', label: 'Bill Number', example: 'INV-2025-001' },
        { key: 'expense_date', label: 'Date', type: 'date' as const, required: true, example: '2025-03-01' },
        { key: 'status', label: 'Status', example: 'paid', options: ['pending', 'paid', 'rejected'] },
    ],
    vendors: [
        { key: 'name', label: 'Vendor Name', required: true, example: 'ABC Elevators Pvt Ltd' },
        { key: 'category', label: 'Category', required: true, example: 'maintenance', options: ['maintenance', 'electrical', 'plumbing', 'security', 'cleaning', 'legal', 'administrative', 'other'] },
        { key: 'phone', label: 'Phone', example: '9876543210' },
        { key: 'email', label: 'Email', example: 'vendor@email.com' },
        { key: 'gstin', label: 'GSTIN', example: '36AABCP7654M1Z5' },
        { key: 'address', label: 'Address', example: 'Hyderabad, Telangana' },
    ],
    complaints: [
        { key: 'flat_number', label: 'Flat Number', required: true, example: '101' },
        { key: 'category', label: 'Category', required: true, example: 'plumbing', options: ['plumbing', 'electrical', 'structural', 'pest_control', 'noise', 'parking', 'housekeeping', 'other'] },
        { key: 'priority', label: 'Priority', example: 'medium', options: ['low', 'medium', 'high', 'critical'] },
        { key: 'description', label: 'Description', required: true, example: 'Leaking tap in kitchen' },
    ],
    compliance: [
        { key: 'name', label: 'Item Name', required: true, example: 'Fire NOC Renewal' },
        { key: 'category', label: 'Category', required: true, example: 'fire_safety', options: ['fire_safety', 'structural', 'electrical', 'lift_safety', 'insurance', 'tax', 'legal', 'environmental'] },
        { key: 'due_date', label: 'Due Date', type: 'date' as const, example: '2026-06-30' },
        { key: 'responsible_role', label: 'Responsible', example: 'admin', options: ['admin', 'owner', 'accountant', 'ca_reviewer'] },
        { key: 'status', label: 'Status', example: 'valid', options: ['valid', 'expiring_soon', 'expired', 'pending'] },
    ],
} as const
