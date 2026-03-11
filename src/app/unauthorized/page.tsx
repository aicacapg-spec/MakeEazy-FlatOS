'use client'

import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
    const router = useRouter()

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
            color: '#e2e8f0',
            fontFamily: "'Inter', sans-serif",
            padding: '2rem',
            textAlign: 'center',
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '3rem 4rem',
                maxWidth: 480,
                width: '100%',
            }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
                    Access Restricted
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                    You don&apos;t have permission to access this page.
                    Please contact your organization administrator if you believe this is a mistake.
                </p>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            padding: '10px 24px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8,
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 500,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    >
                        ← Go Back
                    </button>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>

            <p style={{ marginTop: 24, color: '#475569', fontSize: 13 }}>
                MakeEazy FlatOS · Role: <strong style={{ color: '#64748b' }}>No access to this area</strong>
            </p>
        </div>
    )
}
