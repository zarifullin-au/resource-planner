export function Topbar() {
  const today = new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="col-span-2 flex items-center px-6 gap-4"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="font-head text-accent text-xs font-bold tracking-widest">RESOURCE PLANNER</span>
      <span className="text-[11px] tracking-widest" style={{ color: 'var(--text3)' }}>// система планирования нагрузки</span>
      <div className="flex-1" />
      <span className="text-[11px]" style={{ color: 'var(--text3)' }}>{today}</span>
    </div>
  )
}
