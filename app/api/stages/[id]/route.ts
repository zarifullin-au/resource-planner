export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { int } from '@/lib/coerce'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {

  const body = await req.json()
  const data: { startDate?: Date | null; days?: number } = {}

  if ('startDate' in body) {
    data.startDate = body.startDate ? new Date(body.startDate) : null
  }
  if ('days' in body) {
    data.days = int(body.days, 20)
  }

  const stage = await prisma.contractStage.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(stage)
}
