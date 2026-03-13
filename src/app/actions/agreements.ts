'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'
import { revalidatePath } from 'next/cache'

// ─── Create Agreement (with validation + audit) ─────────────
export async function createAgreementAction(formData: {
    flat_id: string
    tenant_id?: string
    agreement_type: string
    start_date: string
    end_date: string
    rent_amount: string
    maintenance_amount: string
    deposit_amount: string
    lock_in_months: string
    notice_period_months: string
    escalation_percent: string
    replacement_charge?: string
    status?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        // Validate required fields
        if (!formData.flat_id) return { success: false, error: 'Flat is required' }
        if (!formData.start_date || !formData.end_date) return { success: false, error: 'Start and end dates are required' }

        // Validate date range
        if (new Date(formData.end_date) <= new Date(formData.start_date)) {
            return { success: false, error: 'End date must be after start date' }
        }

        // Validate amounts
        const rentAmount = parseFloat(formData.rent_amount) || 0
        const maintenanceAmount = parseFloat(formData.maintenance_amount) || 0
        const depositAmount = parseFloat(formData.deposit_amount) || 0
        if (rentAmount < 0 || maintenanceAmount < 0 || depositAmount < 0) {
            return { success: false, error: 'Amounts cannot be negative' }
        }

        // Validate percentages and months
        const escalationPercent = Math.min(50, Math.max(0, parseFloat(formData.escalation_percent) || 5))
        const lockInMonths = Math.min(60, Math.max(0, parseInt(formData.lock_in_months) || 6))
        const noticePeriodMonths = Math.min(12, Math.max(1, parseInt(formData.notice_period_months) || 1))

        // Check for existing active agreement on the same flat
        const { data: existingAgreement } = await supabase
            .from('agreements')
            .select('id')
            .eq('flat_id', formData.flat_id)
            .eq('org_id', orgId)
            .in('status', ['signed', 'registered'])
            .limit(1)

        if (existingAgreement && existingAgreement.length > 0) {
            return { success: false, error: 'An active agreement already exists for this flat. Terminate or expire it first.' }
        }

        const { data: agreement, error } = await supabase.from('agreements').insert({
            org_id: orgId,
            flat_id: formData.flat_id,
            tenant_id: formData.tenant_id || null,
            agreement_type: formData.agreement_type || 'leave_and_license',
            start_date: formData.start_date,
            end_date: formData.end_date,
            rent_amount: rentAmount,
            maintenance_amount: maintenanceAmount,
            deposit_amount: depositAmount,
            lock_in_months: lockInMonths,
            notice_period_months: noticePeriodMonths,
            escalation_percent: escalationPercent,
            replacement_charge: parseFloat(formData.replacement_charge || '0') || 0,
            status: formData.status || 'draft',
        }).select('id').single()

        if (error) return { success: false, error: error.message }

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'CREATE',
            entity_type: 'agreement',
            entity_id: agreement?.id as unknown as string,
            new_values: {
                flat_id: formData.flat_id,
                tenant_id: formData.tenant_id,
                start_date: formData.start_date,
                end_date: formData.end_date,
                rent_amount: rentAmount,
            },
        })

        revalidatePath('/agreements')
        return { success: true, id: agreement?.id }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Update Agreement Status (with audit) ───────────────────
export async function updateAgreementStatusAction(
    agreementId: string,
    newStatus: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        // Get old status for audit
        const { data: old } = await supabase
            .from('agreements')
            .select('status')
            .eq('id', agreementId)
            .eq('org_id', orgId)
            .single()

        const { error } = await supabase
            .from('agreements')
            .update({ status: newStatus })
            .eq('id', agreementId)
            .eq('org_id', orgId)

        if (error) return { success: false, error: error.message }

        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'UPDATE',
            entity_type: 'agreement',
            entity_id: agreementId as unknown as string,
            old_values: { status: old?.status },
            new_values: { status: newStatus },
        })

        revalidatePath('/agreements')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
