import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface CookieOptions {
    domain?: string
    path?: string
    maxAge?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
}

interface CookieToSet {
    name: string
    value: string
    options: CookieOptions
}

// ─── Role-based route matrix ───────────────────────────────────
const ROLE_ROUTES: Record<string, string[]> = {
    '/settings': ['owner', 'admin', 'super_admin'],
    '/expenses': ['owner', 'admin', 'accountant', 'super_admin'],
    '/collections': ['owner', 'admin', 'accountant', 'super_admin'],
    '/deposits': ['owner', 'admin', 'accountant', 'super_admin'],
    '/reports': ['owner', 'admin', 'accountant', 'ca_reviewer', 'super_admin'],
}

export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: CookieToSet[]) {
                    cookiesToSet.forEach(({ name, value }: CookieToSet) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do NOT run any logic between createServerClient and getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const publicRoutes = ['/login', '/signup', '/forgot-password', '/auth/callback']
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

    // Not authenticated → redirect to login (but preserve cookies!)
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies from supabaseResponse to the redirect response
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
    }

    // Logged in but on auth page → redirect to dashboard
    if (user && isPublicRoute && !request.nextUrl.pathname.startsWith('/auth/callback')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
    }

    // Root → dashboard
    if (user && request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
    }

    // ─── Role-based route protection ───────────────────────────
    if (user) {
        const pathname = request.nextUrl.pathname
        for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
            if (pathname.startsWith(route)) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                const userRole = profile?.role || 'viewer'
                if (!allowedRoles.includes(userRole)) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/dashboard'
                    url.searchParams.set('unauthorized', '1')
                    const redirectResponse = NextResponse.redirect(url)
                    supabaseResponse.cookies.getAll().forEach(cookie => {
                        redirectResponse.cookies.set(cookie.name, cookie.value)
                    })
                    return redirectResponse
                }
                break
            }
        }
    }

    return supabaseResponse
}
