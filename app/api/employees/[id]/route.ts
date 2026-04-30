export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Имя сотрудника обязательно' }, { status: 400 })

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data: { name, role: body.role, type: body.type, salary: num(body.salary) },
  })
  return NextResponse.json(employee)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {

  const teams = await prisma.contractTeam.findMany({
    where: { employeeId: params.id },
    include: { contract: { select: { name: true, status: true } } },
  })
  const active = teams.filter(t => t.contract.status !== 'done')
  if (active.length > 0) {
    const names = Array.from(new Set(active.map(t => `«${t.contract.name}»`))).join(', ')
    return NextResponse.json({
      error: `Сотрудник назначен на активные договоры: ${names}. Сначала удалите его из команд.`,
    }, { status: 409 })
  }

  await prisma.contractTeam.deleteMany({ where: { employeeId: params.id } })
  await prisma.employee.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
