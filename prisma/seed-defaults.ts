import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SERVICES = [
  { name: 'ДПИ', color: '#1A6BFF', order: 0 },
  { name: 'ЭАП', color: '#6366f1', order: 1 },
  { name: 'АЛР', color: '#f59e0b', order: 2 },
  { name: 'Авторский надзор', color: '#0ea5e9', order: 3 },
]

const DEFAULT_STAGES = [
  { name: 'Этап 1', order: 0 },
  { name: 'Этап 2', order: 1 },
  { name: 'Этап 3', order: 2 },
  { name: 'Этап 4', order: 3 },
]

async function main() {
  // 1. Upsert built-in defaults (idempotent baseline).
  for (const s of DEFAULT_SERVICES) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    })
  }
  for (const s of DEFAULT_STAGES) {
    await prisma.stage.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    })
  }

  // 2. Backfill: any service/stage name already used in Norm/Contract/ContractStage
  //    must exist in Service/Stage tables so the UI lists/filters cover all real data.
  const [normServices, normStages, contractServices, contractStages] = await Promise.all([
    prisma.norm.findMany({ select: { service: true }, distinct: ['service'] }),
    prisma.norm.findMany({ select: { stage: true }, distinct: ['stage'] }),
    prisma.contract.findMany({ select: { service: true }, distinct: ['service'] }),
    prisma.contractStage.findMany({ select: { stage: true }, distinct: ['stage'] }),
  ])

  const existingServiceNames = new Set(
    (await prisma.service.findMany({ select: { name: true } })).map(s => s.name),
  )
  const existingStageNames = new Set(
    (await prisma.stage.findMany({ select: { name: true } })).map(s => s.name),
  )

  const allServiceNames = new Set<string>([
    ...normServices.map(n => n.service),
    ...contractServices.map(c => c.service),
  ])
  const allStageNames = new Set<string>([
    ...normStages.map(n => n.stage),
    ...contractStages.map(c => c.stage),
  ])

  let svcMaxOrder = (await prisma.service.aggregate({ _max: { order: true } }))._max.order ?? -1
  for (const name of Array.from(allServiceNames)) {
    if (!name || existingServiceNames.has(name)) continue
    svcMaxOrder += 1
    await prisma.service.create({ data: { name, color: '#94a3b8', order: svcMaxOrder } })
    console.log(`  ↳ восстановлен вид услуги: ${name}`)
  }

  let stgMaxOrder = (await prisma.stage.aggregate({ _max: { order: true } }))._max.order ?? -1
  for (const name of Array.from(allStageNames)) {
    if (!name || existingStageNames.has(name)) continue
    stgMaxOrder += 1
    await prisma.stage.create({ data: { name, order: stgMaxOrder } })
    console.log(`  ↳ восстановлен этап: ${name}`)
  }

  console.log('✅ Default services and stages bootstrapped')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
