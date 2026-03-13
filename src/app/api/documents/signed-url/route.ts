import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/utils/get-org-id'

/**
 * GET /api/documents/signed-url?path=org-id/doc-type/filename
 * Returns a short-lived signed URL for a private document.
 * If ?redirect=1 is set, redirects directly to the signed URL.
 * Otherwise returns JSON with { url, expiresIn }.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const path = request.nextUrl.searchParams.get('path')
        if (!path) {
            return NextResponse.json({ error: 'path is required' }, { status: 400 })
        }

        // Validate the path belongs to user's org (first segment = org_id)
        const orgId = await getOrgId(supabase)
        if (!orgId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
        }

        const pathOrgId = path.split('/')[0]
        if (pathOrgId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Generate signed URL (1 hour validity)
        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(path, 3600)

        if (error || !data?.signedUrl) {
            return NextResponse.json(
                { error: error?.message || 'Could not generate signed URL' },
                { status: 500 }
            )
        }

        // If redirect=1, redirect to the signed URL directly
        const shouldRedirect = request.nextUrl.searchParams.get('redirect') === '1'
        if (shouldRedirect) {
            return NextResponse.redirect(data.signedUrl)
        }

        return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
