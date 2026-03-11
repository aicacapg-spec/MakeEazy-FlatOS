import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the org_id for the current user.
 * First tries the public.users profile row, then falls back to the first organization.
 * Returns null only if truly no org exists.
 */
export async function getOrgId(supabase?: SupabaseClient): Promise<string | null> {
    const client = supabase ?? createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    // Try user profile first
    const { data: profile } = await client
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (profile?.org_id) return profile.org_id

    // Fallback: get first org (works for single-org setup)
    const { data: org } = await client
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

    return org?.id ?? null
}
