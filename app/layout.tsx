import type { Metadata } from 'next'
import { IBM_Plex_Mono, Unbounded } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500'],
  variable: '--font-ibm-plex-mono',
})

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-unbounded',
})

export const metadata: Metadata = {
  title: 'Resource Planner',
  description: 'Система планирования нагрузки сотрудников',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${ibmPlexMono.variable} ${unbounded.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
