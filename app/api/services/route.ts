export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
  const color = typeof body.color === 'string' && body.color ? body.color : '#1A6BFF'

  const max = await prisma.service.aggregate({ _max: { order: true } })
  try {
    const service = await prisma.service.create({
      data: { name, color, order: (max._max.order ?? -1) + 1 },
    })
    return NextResponse.json(service, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Вид услуги с таким названием уже существует' }, { status: 409 })
    }
    throw e
  }
}
