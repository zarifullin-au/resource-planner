export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(stages)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })

  const max = await prisma.stage.aggregate({ _max: { order: true } })
  try {
    const stage = await prisma.stage.create({
      data: { name, order: (max._max.order ?? -1) + 1 },
    })
    return NextResponse.json(stage, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Этап с таким названием уже существует' }, { status: 409 })
    }
    throw e
  }
}
