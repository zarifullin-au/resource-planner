export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

function parseHolidays(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(d => typeof d === 'string') : []
  } catch {
    return []
  }
}

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  })
  return NextResponse.json({ ...settings, customHolidays: parseHolidays(settings.customHolidays) })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const customHolidays = Array.isArray(body.customHolidays)
    ? body.customHolidays.filter((d: unknown) => typeof d === 'string')
    : []
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
      customHolidays: JSON.stringify(customHolidays),
    },
    create: { id: 'global' },
  })
  return NextResponse.json({ ...settings, customHolidays: parseHolidays(settings.customHolidays) })
}
