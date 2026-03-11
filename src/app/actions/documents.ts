'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'
import { revalidatePath } from 'next/cache'

// ─── Verify a document ─────────────────────────────────────
export async function verifyDocumentAction(
    docId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        const { error } = await supabase
            .from('documents')
            .update({ is_verified: true, verified_by: user.id })
            .eq('id', docId)
            .eq('org_id', orgId)

        if (error) return { success: false, error: error.message }

        // Log audit
        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'VERIFY',
            entity_type: 'document',
            entity_id: docId as unknown as string,
        })

        // Check if tenant KYC should update
        const { data: doc } = await supabase
            .from('documents')
            .select('tenant_id')
            .eq('id', docId)
            .single()

        if (doc?.tenant_id) {
            // Derive new KYC status
            const { data: allDocs } = await supabase
                .from('documents')
                .select('doc_type, is_verified')
                .eq('tenant_id', doc.tenant_id)
                .eq('org_id', orgId)

            const requiredTypes = ['aadhaar', 'pan', 'photo']
            const allPresent = requiredTypes.every(t =>
                (allDocs || []).some(d => d.doc_type.toLowerCase().includes(t))
            )
            const allVerified = requiredTypes.every(t =>
                (allDocs || []).some(d => d.doc_type.toLowerCase().includes(t) && d.is_verified)
            )

            const kycStatus = !allPresent ? 'incomplete' : !allVerified ? 'pending' : 'complete'
            await supabase
                .from('tenants')
                .update({ kyc_status: kycStatus })
                .eq('id', doc.tenant_id)
                .eq('org_id', orgId)
        }

        revalidatePath('/documents')
        revalidatePath('/tenants')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Delete document (with storage cleanup) ────────────────
export async function deleteDocumentAction(
    docId: string,
    storagePath?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        // Delete from storage if path provided
        if (storagePath) {
            await supabase.storage.from('documents').remove([storagePath])
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', docId)
            .eq('org_id', orgId)

        if (error) return { success: false, error: error.message }

        await supabase.from('audit_log').insert({
            org_id: orgId,
            user_id: user.id,
            action: 'DELETE',
            entity_type: 'document',
            entity_id: docId as unknown as string,
        })

        revalidatePath('/documents')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}

// ─── Upload document (server-side validation) ──────────────
export async function getDocumentSignedUploadUrl(
    fileName: string,
    docType: string
): Promise<{ success: boolean; uploadUrl?: string; path?: string; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const orgId = await getOrgId(supabase)
        if (!orgId) return { success: false, error: 'Organization not found' }

        const ext = fileName.split('.').pop()
        const path = `${orgId}/${docType}/${Date.now()}.${ext}`

        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUploadUrl(path)

        if (error || !data) return { success: false, error: error?.message || 'Failed to create upload URL' }

        return { success: true, uploadUrl: data.signedUrl, path }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
