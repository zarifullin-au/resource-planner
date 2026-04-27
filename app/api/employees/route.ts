import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { num } from '@/lib/coerce'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Имя сотрудника обязательно' }, { status: 400 })

  const employee = await prisma.employee.create({
    data: { name, role: body.role, type: body.type, salary: num(body.salary) },
  })
  return NextResponse.json(employee, { status: 201 })
}
