export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { num, int } from '@/lib/coerce'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const object = await prisma.object.findUnique({ where: { id: params.id } })
  if (!object) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(object)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Название объекта обязательно' }, { status: 400 })
  const code = body.code ? String(body.code).trim() : null

  try {
    const object = await prisma.object.update({
      where: { id: params.id },
      data: {
        code,
        name,
        type: body.type,
        complexity: body.complexity,
        area: num(body.area),
        roomsMain: int(body.roomsMain),
        roomsAux: int(body.roomsAux),
        roomsTech: int(body.roomsTech),
        roomsIii: int(body.roomsIii),
      },
    })
    return NextResponse.json(object)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: `Объект с кодом «${code}» уже существует` }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.object.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
