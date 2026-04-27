import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { num, int } from '@/lib/coerce'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const objects = await prisma.object.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(objects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Название объекта обязательно' }, { status: 400 })
  const code = body.code ? String(body.code).trim() : null

  try {
    const object = await prisma.object.create({
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
    return NextResponse.json(object, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: `Объект с кодом «${code}» уже существует` }, { status: 409 })
    }
    throw e
  }
}
