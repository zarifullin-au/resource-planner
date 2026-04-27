import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { int } from '@/lib/coerce'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contracts = await prisma.contract.findMany({
    include: { team: true, stages: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Название договора обязательно' }, { status: 400 })
  if (!body.objectId) return NextResponse.json({ error: 'Не выбран объект' }, { status: 400 })
  if (!body.service) return NextResponse.json({ error: 'Не выбран вид услуги' }, { status: 400 })

  const contract = await prisma.contract.create({
    data: {
      name,
      objectId: body.objectId,
      service: body.service,
      status: 'active',
      team: {
        create: Object.entries(body.team || {})
          .filter(([, empId]) => empId)
          .map(([role, employeeId]) => ({ role, employeeId: employeeId as string })),
      },
      stages: {
        create: (body.stages || []).map((s: any, i: number) => ({
          stage: s.stage,
          startDate: s.startDate ? new Date(s.startDate) : null,
          days: int(s.days, 20),
          order: i,
        })),
      },
    },
    include: { team: true, stages: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(contract, { status: 201 })
}
