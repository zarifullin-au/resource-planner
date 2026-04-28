import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'Resource Planner',
  description: 'Система планирования нагрузки сотрудников',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
