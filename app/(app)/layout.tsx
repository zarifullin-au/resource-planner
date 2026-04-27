import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

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
