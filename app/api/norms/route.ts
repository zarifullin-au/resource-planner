import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const norms = await prisma.norm.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(norms)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const artifact = String(body.artifact || '').trim()
  const task = String(body.task || '').trim()
  if (!artifact) return NextResponse.json({ error: 'Артефакт обязателен' }, { status: 400 })
  if (!task) return NextResponse.json({ error: 'Задача обязательна' }, { status: 400 })

  const count = await prisma.norm.count()
  const norm = await prisma.norm.create({
    data: {
      service: body.service,
      stage: body.stage,
      artifact,
      task,
      role: body.role,
      base: body.base || 'Нет',
      hResidential: num(body.hResidential),
      hCommercial: num(body.hCommercial),
      order: count,
    },
  })
  return NextResponse.json(norm, { status: 201 })
}
