import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen grid" style={{ gridTemplateColumns: '220px 1fr', gridTemplateRows: '56px 1fr' }}>
      <Topbar />
      <Sidebar />
      <main className="overflow-y-auto p-7" style={{ background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}
