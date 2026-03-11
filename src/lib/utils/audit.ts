'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Audit logging utility — records important data mutations to `audit_log` table.
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'import' | 'export' | 'move_out' | 'renew' | 'generate_demands'

export async function logAudit(
    action: AuditAction,
    entityType: string,
    entityId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
): Promise<void> {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!profile?.org_id) return

        await supabase.from('audit_log').insert({
            org_id: profile.org_id,
            user_id: user.id,
            action,
            entity_type: entityType,
            entity_id: entityId || null,
            old_values: oldValues || null,
            new_values: newValues || null,
        })
    } catch (err) {
        // Never let audit logging break the main operation
        console.error('[Audit] Failed to log:', err)
    }
}
