'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'
import { revalidatePath } from 'next/cache'

// ─── CREATE TENANT ─────────────────────────────────────────
export async function createTenantAction(formData: {
    full_name: string
    phone?: string
    email?: string
    dob?: string
    employer_name?: string
    ctc_monthly?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    flat_id?: string
    is_primary?: string
    rent_share?: string
    maint_share?: string
    move_in_date?: string
    source?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        if (!formData.full_name?.trim()) return { success: false, error: 'Full name is required' }

        const isPrimary = formData.is_primary === 'true'
        const hasFlatId = !!formData.flat_id

        // Enforce business rule: primary tenant requires flat assignment
        if (isPrimary && !hasFlatId) {
            return { success: false, error: 'Primary tenant must be assigned to a flat' }
        }

        // Enforce business rule: if move-in date is set, flat must be assigned
        if (formData.move_in_date && !hasFlatId) {
            return { success: false, error: 'Move-in date requires a flat assignment' }
        }

        const status = hasFlatId ? 'active' : 'onboarding'

        const { data, error } = await supabase.from('tenants').insert({
            org_id: orgId,
            full_name: formData.full_name.trim(),
            phone: formData.phone || null,
            email: formData.email || null,
            dob: formData.dob || null,
            employer_name: formData.employer_name || null,
            ctc_monthly: formData.ctc_monthly ? parseFloat(formData.ctc_monthly) : null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            flat_id: formData.flat_id || null,
            is_primary: isPrimary,
            rent_share: parseFloat(formData.rent_share || '100'),
            maint_share: parseFloat(formData.maint_share || '100'),
            move_in_date: formData.move_in_date || null,
            source: formData.source || null,
            status,
            kyc_status: 'pending',
        }).select('id').single()

        if (error) return { success: false, error: error.message }

        // If assigned to flat with move-in date, mark flat as occupied
        if (hasFlatId && formData.move_in_date) {
            await supabase
                .from('flats')
                .update({ status: 'occupied' })
                .eq('id', formData.flat_id!)
                .eq('org_id', orgId)
        }

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'CREATE',
            entity_type: 'tenant',
            entity_id: data?.id as unknown as string,
            new_values: { full_name: formData.full_name, status, flat_id: formData.flat_id },
        })

        revalidatePath('/tenants')
        revalidatePath('/flats')
        return { success: true, id: data?.id }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── ACTIVATE TENANT (move-in enforcement) ─────────────────
export async function activateTenantAction(
    tenantId: string,
    moveInDate: string,
    flatId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        if (!moveInDate) return { success: false, error: 'Move-in date is required to activate a tenant' }
        if (!flatId) return { success: false, error: 'Flat assignment is required to activate a tenant' }

        // Check for signed agreement
        const { data: agreements } = await supabase
            .from('agreements')
            .select('id, status')
            .eq('flat_id', flatId)
            .eq('tenant_id', tenantId)
            .in('status', ['signed', 'registered'])
            .limit(1)

        if (!agreements || agreements.length === 0) {
            return { success: false, error: 'A signed agreement is required before activating a tenant' }
        }

        // Activate tenant
        const { error: tenantErr } = await supabase
            .from('tenants')
            .update({ status: 'active', move_in_date: moveInDate, flat_id: flatId })
            .eq('id', tenantId)
            .eq('org_id', orgId)

        if (tenantErr) return { success: false, error: tenantErr.message }

        // Mark flat as occupied
        await supabase
            .from('flats')
            .update({ status: 'occupied', vacancy_since: null })
            .eq('id', flatId)
            .eq('org_id', orgId)

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'ACTIVATE',
            entity_type: 'tenant',
            entity_id: tenantId as unknown as string,
            new_values: { move_in_date: moveInDate, flat_id: flatId },
        })

        revalidatePath('/tenants')
        revalidatePath('/flats')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── UPDATE KYC STATUS from documents ─────────────────────
export async function updateKycFromDocumentsAction(
    tenantId: string
): Promise<{ success: boolean; kyc_status?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        // Count verified documents for this tenant
        const { data: docs } = await supabase
            .from('documents')
            .select('doc_type, is_verified')
            .eq('tenant_id', tenantId)
            .eq('org_id', orgId)

        if (!docs) return { success: false, error: 'Could not fetch documents' }

        const requiredDocTypes = ['aadhaar', 'pan', 'photo']
        const verifiedTypes = docs
            .filter(d => d.is_verified)
            .map(d => d.doc_type.toLowerCase())

        const allPresent = requiredDocTypes.every(t => docs.some(d => d.doc_type.toLowerCase().includes(t)))
        const allVerified = requiredDocTypes.every(t => verifiedTypes.some(v => v.includes(t)))

        let kycStatus: 'complete' | 'pending' | 'incomplete'
        if (!allPresent) kycStatus = 'incomplete'
        else if (!allVerified) kycStatus = 'pending'
        else kycStatus = 'complete'

        await supabase
            .from('tenants')
            .update({ kyc_status: kycStatus })
            .eq('id', tenantId)
            .eq('org_id', orgId)

        revalidatePath('/tenants')
        revalidatePath(`/tenants/${tenantId}`)
        return { success: true, kyc_status: kycStatus }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
