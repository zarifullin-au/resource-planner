import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  })
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {
      hoursDay: num(body.hoursDay, 7),
      hoursMonth: num(body.hoursMonth, 160),
      insurance: num(body.insurance, 0.2),
      kStandard: num(body.kStandard, 1.0),
      kMedium: num(body.kMedium, 1.25),
      kComplex: num(body.kComplex, 1.5),
      kSenior: num(body.kSenior, 0.8),
      kMid: num(body.kMid, 1.0),
      kJunior: num(body.kJunior, 1.2),
    },
    create: { id: 'global' },
  })
  return NextResponse.json(settings)
}
