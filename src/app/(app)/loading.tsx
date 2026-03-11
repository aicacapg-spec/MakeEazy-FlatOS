export default function Loading() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', flexDirection: 'column', gap: 16,
        }}>
            <div className="spinner spinner-lg" />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
        </div>
    )
}
