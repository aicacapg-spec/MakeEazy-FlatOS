'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'
import { revalidatePath } from 'next/cache'
import type { Flat } from '@/lib/types/database'

// ─── Input validation helpers ──────────────────────────────
function requireString(val: unknown, name: string): string {
    if (typeof val !== 'string' || !val.trim()) throw new Error(`${name} is required`)
    return val.trim()
}

function toFloat(val: unknown): number {
    const n = parseFloat(String(val))
    return isNaN(n) ? 0 : n
}

function toInt(val: unknown): number {
    const n = parseInt(String(val))
    return isNaN(n) ? 0 : n
}

// ─── CREATE FLAT ───────────────────────────────────────────
export async function createFlatAction(formData: {
    flat_number: string
    floor?: string
    flat_type?: string
    carpet_area_sqft?: string
    furnishing: string
    ac_count: string
    parking?: string
    owner_entity: string
    monthly_rent: string
    monthly_maintenance: string
    status: string
    remarks?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        // Validate required fields
        const flat_number = requireString(formData.flat_number, 'Flat number')
        const owner_entity = requireString(formData.owner_entity, 'Owner entity')

        // Look up property for this org
        const { data: props } = await supabase
            .from('properties')
            .select('id')
            .eq('org_id', orgId)
            .limit(1)

        if (!props || props.length === 0) {
            return { success: false, error: 'No property found for this organization. Please contact your administrator.' }
        }
        const propertyId = props[0].id

        const { error } = await supabase.from('flats').insert({
            org_id: orgId,
            property_id: propertyId,
            flat_number,
            floor: formData.floor || null,
            flat_type: formData.flat_type || null,
            carpet_area_sqft: formData.carpet_area_sqft ? toFloat(formData.carpet_area_sqft) : null,
            furnishing: formData.furnishing || 'unfurnished',
            ac_count: toInt(formData.ac_count),
            parking: formData.parking || null,
            owner_entity,
            monthly_rent: toFloat(formData.monthly_rent),
            monthly_maintenance: toFloat(formData.monthly_maintenance),
            status: (formData.status || 'vacant') as Flat['status'],
            remarks: formData.remarks || null,
        })

        if (error) return { success: false, error: error.message }

        // Audit log
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'CREATE',
            entity_type: 'flat',
            new_values: { flat_number, owner_entity },
        })

        revalidatePath('/flats')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── UPDATE FLAT STATUS ────────────────────────────────────
export async function updateFlatStatusAction(
    flatId: string,
    status: Flat['status'],
    remarks?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        const { error } = await supabase
            .from('flats')
            .update({ status, remarks: remarks || null })
            .eq('id', flatId)
            .eq('org_id', orgId)

        if (error) return { success: false, error: error.message }

        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'UPDATE_STATUS',
            entity_type: 'flat',
            entity_id: flatId as unknown as string,
            new_values: { status },
        })

        revalidatePath('/flats')
        revalidatePath(`/flats/${flatId}`)
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
