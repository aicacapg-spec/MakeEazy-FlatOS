'use client'

import { useState, useCallback, createContext, useContext } from 'react'

// ─── Toast Context ──────────────────────────────────────────
interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

interface ToastContextType {
    toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => { } })

export function useToast() {
    return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now().toString(36)
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

// ─── Skeleton Components ─────────────────────────────────────
export function SkeletonCards({ count = 4 }: { count?: number }) {
    return (
        <div className="summary-cards">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="summary-card">
                    <div className="skeleton skeleton-avatar" style={{ marginBottom: 12 }} />
                    <div className="skeleton skeleton-text-sm" style={{ width: '50%' }} />
                    <div className="skeleton skeleton-text-lg" style={{ width: '40%', marginTop: 4 }} />
                </div>
            ))}
        </div>
    )
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="skeleton skeleton-text-md" />
            </div>
            <div style={{ padding: '4px 16px' }}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        {Array.from({ length: cols }).map((_, j) => (
                            <div key={j} className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%` }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export function SkeletonGrid({ count = 16 }: { count?: number }) {
    return (
        <div className="card" style={{ marginBottom: 24 }}>
            <div className="skeleton skeleton-text-lg" style={{ marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-grid-cell" />
                ))}
            </div>
        </div>
    )
}

export function SkeletonPage() {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <div className="skeleton skeleton-text-lg" style={{ marginBottom: 8 }} />
                <div className="skeleton skeleton-text-sm" />
            </div>
            <SkeletonCards />
            <SkeletonTable />
        </div>
    )
}
