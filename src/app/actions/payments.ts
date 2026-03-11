'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'
import { revalidatePath } from 'next/cache'

// ─── Record Payment (with demand status update) ────────────
export async function recordPaymentAction(formData: {
    flat_id: string
    demand_id?: string
    amount: string
    date: string
    mode: string
    reference_number?: string
    rent_component?: string
    maintenance_component?: string
    tenant_id?: string
    remarks?: string
}): Promise<{ success: boolean; receipt_number?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        if (!formData.flat_id) return { success: false, error: 'Flat is required' }
        const amount = parseFloat(formData.amount)
        if (isNaN(amount) || amount <= 0) return { success: false, error: 'Amount must be greater than 0' }

        // Generate receipt number
        const { data: lastPayment } = await supabase
            .from('payments')
            .select('receipt_number')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)

        const lastNum = lastPayment?.[0]?.receipt_number
        const nextNum = lastNum
            ? `RCP-${String(parseInt(lastNum.replace('RCP-', '')) + 1).padStart(4, '0')}`
            : 'RCP-0001'

        const rentComp = parseFloat(formData.rent_component || '0') || 0
        const maintComp = parseFloat(formData.maintenance_component || '0') || 0

        const { data: payment, error: payErr } = await supabase.from('payments').insert({
            org_id: orgId,
            flat_id: formData.flat_id,
            demand_id: formData.demand_id || null,
            tenant_id: formData.tenant_id || null,
            receipt_number: nextNum,
            amount,
            date: formData.date,
            mode: formData.mode,
            reference_number: formData.reference_number || null,
            rent_component: rentComp,
            maintenance_component: maintComp,
            late_fee_component: Math.max(0, amount - rentComp - maintComp),
            remarks: formData.remarks || null,
        }).select('id').single()

        if (payErr) return { success: false, error: payErr.message }

        // ── Update demand status based on payment amount ────
        if (formData.demand_id) {
            const { data: demand } = await supabase
                .from('rent_demands')
                .select('total_demand, status')
                .eq('id', formData.demand_id)
                .single()

            if (demand) {
                // Sum all payments for this demand
                const { data: allPayments } = await supabase
                    .from('payments')
                    .select('amount')
                    .eq('demand_id', formData.demand_id)

                const totalPaid = (allPayments || []).reduce((s, p) => s + p.amount, 0)
                const totalDue = demand.total_demand || 0

                let newStatus: string
                if (totalPaid >= totalDue) newStatus = 'paid'
                else if (totalPaid > 0) newStatus = 'partial'
                else newStatus = demand.status

                if (newStatus !== demand.status) {
                    await supabase
                        .from('rent_demands')
                        .update({ status: newStatus })
                        .eq('id', formData.demand_id)
                }
            }
        }

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'CREATE',
            entity_type: 'payment',
            entity_id: payment?.id as unknown as string,
            new_values: { amount, mode: formData.mode, receipt_number: nextNum, demand_id: formData.demand_id },
        })

        revalidatePath('/collections')
        revalidatePath('/deposits')
        return { success: true, receipt_number: nextNum }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Generate Rent Demands (with pro-rata support) ─────────
export async function generateRentDemandsAction(
    billingMonth: string,
    dueDate: string,
    flatIds?: string[]
): Promise<{ success: boolean; created?: number; skipped?: number; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        if (!billingMonth) return { success: false, error: 'Billing month is required' }

        // Get org billing rules
        const { data: org } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', orgId)
            .single()

        const settings = (org?.settings as Record<string, unknown>) || {}
        const billingRules = (settings.billing_rules as Record<string, number>) || {}
        const lateFeeAmount = billingRules.late_fee_amount || 0

        // Get occupied flats
        let query = supabase
            .from('flats')
            .select('id, monthly_rent, monthly_maintenance, flat_number')
            .eq('org_id', orgId)
            .eq('status', 'occupied')

        if (flatIds && flatIds.length > 0) {
            query = query.in('id', flatIds)
        }

        const { data: flats } = await query
        if (!flats || flats.length === 0) return { success: false, error: 'No occupied flats found' }

        // Check for existing demands this month
        const { data: existing } = await supabase
            .from('rent_demands')
            .select('flat_id')
            .eq('org_id', orgId)
            .eq('billing_month', billingMonth)

        const existingFlatIds = new Set((existing || []).map(e => e.flat_id))
        const newFlats = flats.filter(f => !existingFlatIds.has(f.id))

        if (newFlats.length === 0) {
            return { success: true, created: 0, skipped: flats.length }
        }

        // Parse billing month for date calculations
        const [year, month] = billingMonth.split('-').map(Number)
        const totalDays = new Date(year, month, 0).getDate()

        const records = newFlats.map(f => {
            // Get tenant move-in date for pro-rata if applicable
            // For simplicity: full month unless we have move-in logic
            const occupiedDays = totalDays
            const isProrata = occupiedDays < totalDays

            const rentAmount = isProrata
                ? Math.round((f.monthly_rent * occupiedDays) / totalDays)
                : f.monthly_rent || 0

            const maintAmount = isProrata
                ? Math.round((f.monthly_maintenance * occupiedDays) / totalDays)
                : f.monthly_maintenance || 0

            return {
                org_id: orgId,
                flat_id: f.id,
                billing_month: billingMonth,
                rent_amount: rentAmount,
                maintenance_amount: maintAmount,
                late_fee: lateFeeAmount,
                due_date: dueDate || null,
                status: 'pending',
                is_prorata: isProrata,
                occupied_days: occupiedDays,
                total_days: totalDays,
            }
        })

        const { error } = await supabase.from('rent_demands').insert(records)
        if (error) return { success: false, error: error.message }

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'GENERATE',
            entity_type: 'rent_demands',
            new_values: { billing_month: billingMonth, count: records.length },
        })

        revalidatePath('/collections')
        return { success: true, created: records.length, skipped: existingFlatIds.size }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
