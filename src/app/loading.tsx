export default function RootLoading() {
    return (
        <html lang="en">
            <body style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
                fontFamily: 'system-ui, sans-serif', margin: 0,
                flexDirection: 'column', gap: 16,
            }}>
                <div style={{
                    width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#6366f1', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ fontSize: 14, opacity: 0.7 }}>Loading FlatOS...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </body>
        </html>
    )
}
