export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids обязательны' }, { status: 400 })

  await prisma.$transaction(
    ids.map((id, order) => prisma.service.update({ where: { id }, data: { order } }))
  )
  return NextResponse.json({ ok: true })
}
