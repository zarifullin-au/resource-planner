import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const artifact = String(body.artifact || '').trim()
  const task = String(body.task || '').trim()
  if (!artifact) return NextResponse.json({ error: 'Артефакт обязателен' }, { status: 400 })
  if (!task) return NextResponse.json({ error: 'Задача обязательна' }, { status: 400 })

  const norm = await prisma.norm.update({
    where: { id: params.id },
    data: {
      service: body.service,
      stage: body.stage,
      artifact,
      task,
      role: body.role,
      base: body.base,
      hResidential: num(body.hResidential),
      hCommercial: num(body.hCommercial),
    },
  })
  return NextResponse.json(norm)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.norm.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
