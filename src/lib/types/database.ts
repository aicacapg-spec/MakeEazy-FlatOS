// Database types matching the Supabase schema

export type UserRole = 'super_admin' | 'owner' | 'admin' | 'accountant' | 'ca_reviewer' | 'viewer'
export type FlatStatus = 'occupied' | 'vacant' | 'under_repair' | 'office' | 'blocked' | 'reserved'
export type TenantStatus = 'active' | 'moved_out' | 'onboarding' | 'notice_period'
export type KycStatus = 'complete' | 'pending' | 'incomplete'
export type AgreementStatus = 'draft' | 'sent' | 'signed' | 'registered' | 'expired' | 'terminated' | 'under_process'
export type DemandStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived'
export type PaymentMode = 'upi' | 'neft' | 'imps' | 'cash' | 'cheque' | 'adjustment'
export type DepositType = 'initial' | 'additional' | 'deduction' | 'refund' | 'replacement'
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
export type ComplianceStatus = 'not_due' | 'pending' | 'in_progress' | 'complete' | 'overdue'
export type ExpenseCategory = 'maintenance' | 'repair' | 'cleaning' | 'security' | 'electricity' | 'water' | 'insurance' | 'legal' | 'accounting' | 'other'
export type VendorCategory = 'plumber' | 'electrician' | 'carpenter' | 'painter' | 'pest_control' | 'cleaning' | 'security' | 'general' | 'other'

export interface UserProfile {
    id: string
    org_id: string
    email: string
    full_name: string
    phone: string | null
    role: UserRole
    avatar_url: string | null
    is_active: boolean
    last_login_at: string | null
    created_at: string
    updated_at: string
}

export interface Organization {
    id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    gst_number: string | null
    cin_number: string | null
    settings: Record<string, unknown>
    subscription_tier: string
    status: string
    created_at: string
    updated_at: string
}

export interface Flat {
    id: string
    org_id: string
    property_id: string
    flat_number: string
    floor: string | null
    flat_type: string | null
    carpet_area_sqft: number | null
    furnishing: string
    ac_count: number
    parking: string | null
    owner_entity: string
    monthly_rent: number
    monthly_maintenance: number
    status: FlatStatus
    vacancy_since: string | null
    remarks: string | null
    created_at: string
    updated_at: string
}

export interface Tenant {
    id: string
    org_id: string
    flat_id: string | null
    agreement_id: string | null
    full_name: string
    phone: string | null
    email: string | null
    dob: string | null
    employer_name: string | null
    ctc_monthly: number | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    move_in_date: string | null
    move_out_date: string | null
    is_primary: boolean
    kyc_status: KycStatus
    status: TenantStatus
    rent_share: number
    maint_share: number
    source: string | null
    created_at: string
    updated_at: string
}

export interface Agreement {
    id: string
    org_id: string
    flat_id: string
    tenant_id: string | null
    agreement_type: string
    start_date: string
    end_date: string
    rent_amount: number
    maintenance_amount: number
    deposit_amount: number
    lock_in_months: number
    notice_period_months: number
    escalation_percent: number
    replacement_charge: number
    status: AgreementStatus
    document_url: string | null
    signed_date: string | null
    created_at: string
    updated_at: string
}

export interface Deposit {
    id: string
    org_id: string
    flat_id: string
    tenant_id: string | null
    type: DepositType
    amount: number
    mode: PaymentMode | null
    reference_number: string | null
    date: string
    remarks: string | null
    created_at: string
}

export interface RentDemand {
    id: string
    org_id: string
    flat_id: string
    billing_month: string
    rent_amount: number
    maintenance_amount: number
    late_fee: number
    total_demand: number
    due_date: string | null
    status: DemandStatus
    is_prorata: boolean
    occupied_days: number | null
    total_days: number | null
    created_at: string
    updated_at: string
}

export interface Payment {
    id: string
    org_id: string
    flat_id: string
    tenant_id: string | null
    demand_id: string | null
    receipt_number: string | null
    amount: number
    date: string
    mode: PaymentMode
    reference_number: string | null
    rent_component: number
    maintenance_component: number
    late_fee_component: number
    remarks: string | null
    created_at: string
}

export interface Complaint {
    id: string
    org_id: string
    flat_id: string | null
    complaint_number: string | null
    date: string
    category: string | null
    description: string | null
    priority: ComplaintPriority
    reported_by: string | null
    assigned_vendor_id: string | null
    status: ComplaintStatus
    resolved_date: string | null
    cost: number
    photos: string[] | null
    created_at: string
    updated_at: string
}

export interface Vendor {
    id: string
    org_id: string
    name: string
    category: VendorCategory
    phone: string | null
    email: string | null
    address: string | null
    rate_card: Record<string, unknown>
    rating: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface Expense {
    id: string
    org_id: string
    flat_id: string | null
    vendor_id: string | null
    category: ExpenseCategory
    description: string | null
    amount: number
    date: string
    is_recurring: boolean
    is_capex: boolean
    invoice_url: string | null
    remarks: string | null
    created_at: string
}

export interface Document {
    id: string
    org_id: string
    flat_id: string | null
    tenant_id: string | null
    agreement_id: string | null
    doc_type: string
    file_name: string
    file_url: string
    file_size: number | null
    mime_type: string | null
    is_verified: boolean
    verified_by: string | null
    expiry_date: string | null
    created_at: string
}

export interface ComplianceItem {
    id: string
    org_id: string
    name: string
    category: string
    responsible_role: UserRole
    due_date: string | null
    status: ComplianceStatus
    completed_date: string | null
    completed_by: string | null
    document_url: string | null
    remarks: string | null
    created_at: string
    updated_at: string
}

export interface Notification {
    id: string
    org_id: string
    user_id: string | null
    channel: string
    template_key: string | null
    message: string | null
    metadata: Record<string, unknown>
    is_read: boolean
    sent_at: string
    created_at: string
}

// Supabase Database type for typed client
export type Database = {
    public: {
        Tables: {
            organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> }
            users: { Row: UserProfile; Insert: Partial<UserProfile>; Update: Partial<UserProfile> }
            flats: { Row: Flat; Insert: Partial<Flat>; Update: Partial<Flat> }
            tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant> }
            agreements: { Row: Agreement; Insert: Partial<Agreement>; Update: Partial<Agreement> }
            deposits: { Row: Deposit; Insert: Partial<Deposit>; Update: Partial<Deposit> }
            rent_demands: { Row: RentDemand; Insert: Partial<RentDemand>; Update: Partial<RentDemand> }
            payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
            complaints: { Row: Complaint; Insert: Partial<Complaint>; Update: Partial<Complaint> }
            vendors: { Row: Vendor; Insert: Partial<Vendor>; Update: Partial<Vendor> }
            expenses: { Row: Expense; Insert: Partial<Expense>; Update: Partial<Expense> }
            documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document> }
            compliance_items: { Row: ComplianceItem; Insert: Partial<ComplianceItem>; Update: Partial<ComplianceItem> }
            notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
        }
    }
}
