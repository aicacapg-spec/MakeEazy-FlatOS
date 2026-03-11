'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
    const [orgName, setOrgName] = useState('')
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // 1. Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    org_name: orgName,
                },
            },
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (authData.user) {
            setSuccess(true)
        }

        setLoading(false)
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-logo">
                        <h1>MakeEazy FlatOS</h1>
                    </div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                    <h2 className="auth-title">Account Created!</h2>
                    <p className="auth-subtitle" style={{ marginBottom: 28 }}>
                        Check your email for a confirmation link. Once confirmed, you can sign in.
                    </p>
                    <Link href="/login" className="btn btn-primary btn-full btn-lg">
                        Go to Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <h1>MakeEazy FlatOS</h1>
                    <p>Property Management Platform</p>
                </div>

                <h2 className="auth-title">Create your organization</h2>
                <p className="auth-subtitle">Set up your property management account</p>

                {error && (
                    <div className="auth-alert auth-alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="orgName">Organization Name</label>
                        <input
                            id="orgName"
                            type="text"
                            className="form-input"
                            placeholder="e.g. Priya Residences Private Limited"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="fullName">Your Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            className="form-input"
                            placeholder="Admin name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="admin@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                Creating account...
                            </>
                        ) : (
                            'Create Organization'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link href="/login" className="auth-link">Sign in</Link>
                </div>
            </div>
        </div>
    )
}
