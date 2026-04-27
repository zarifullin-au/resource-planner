'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { section: 'Обзор', items: [
    { href: '/dashboard', icon: '⬡', label: 'Загрузка сотрудников' },
    { href: '/heatmap', icon: '▦', label: 'Тепловая карта' },
  ]},
  { section: 'Данные', items: [
    { href: '/objects', icon: '◈', label: 'Объекты' },
    { href: '/contracts', icon: '◫', label: 'Договоры' },
    { href: '/employees', icon: '◎', label: 'Сотрудники' },
  ]},
  { section: 'Справочник', items: [
    { href: '/norms', icon: '⊞', label: 'Нормы часов' },
    { href: '/settings', icon: '◌', label: 'Настройки' },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="overflow-y-auto py-5" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {NAV.map(group => (
        <div key={group.section}>
          <div className="px-4 py-2 text-[10px] tracking-[0.14em] uppercase" style={{ color: 'var(--text3)' }}>
            {group.section}
          </div>
          {group.items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-5 py-2.5 text-xs transition-all duration-150"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  background: active ? 'rgba(74,240,180,0.07)' : 'transparent',
                  borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <span className="text-sm w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
