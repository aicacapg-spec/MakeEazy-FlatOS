'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleReset(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-logo">
                        <h1>MakeEazy FlatOS</h1>
                    </div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
                    <h2 className="auth-title">Check your email</h2>
                    <p className="auth-subtitle" style={{ marginBottom: 28 }}>
                        We sent a password reset link to <strong>{email}</strong>. Click the link to reset your password.
                    </p>
                    <Link href="/login" className="btn btn-secondary btn-full">
                        Back to Sign In
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

                <h2 className="auth-title">Reset your password</h2>
                <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link</p>

                {error && (
                    <div className="auth-alert auth-alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Remember your password? <Link href="/login" className="auth-link">Sign in</Link>
                </div>
            </div>
        </div>
    )
}
