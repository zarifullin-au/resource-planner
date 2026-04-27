import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_NORMS = [
  // ДПИ Этап 1
  { service:'ДПИ', stage:'Этап 1', artifact:'Лазерное сканирование', task:'Сделать лазерное сканирование', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:1 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Бриф/ТЗ', task:'Сделать Бриф/ТЗ от заказчика', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:2 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Карта разработки', task:'Подготовить карту разработки ДПИ', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:3 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Планировочное решение', task:'Сделать обмерный план', role:'Проектировщик', base:'Площадь объекта', hResidential:0.05, hCommercial:0.05, order:4 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Планировочное решение', task:'Сделать ТЗ для планировочного решения', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:5 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Планировочное решение', task:'Разработать планировочное решение', role:'Проектировщик', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:6 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Планировочное решение', task:'Разработать планировочное решение (вспом)', role:'Проектировщик', base:'Кол-во комнат вспомагательные', hResidential:1, hCommercial:1, order:7 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Планировочное решение', task:'Согласовать планировочное решение', role:'Тимлид', base:'Нет', hResidential:2, hCommercial:2, order:8 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Концептуальное решение', task:'Подготовить концептуальные решения интерьеров', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:6, hCommercial:6, order:9 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Концептуальное решение', task:'Согласовать концептуальное решение', role:'Тимлид', base:'Кол-во комнат основные', hResidential:4, hCommercial:4, order:10 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Презентация CEO', task:'Презентовать Этап 1 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:11 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Презентация CEO', task:'Презентовать Этап 1 CEO (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:3, hCommercial:3, order:12 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Презентация Заказчику', task:'Презентовать Этап 1 Заказчику', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:13 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Презентация Заказчику', task:'Презентовать Этап 1 Заказчику (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:4, hCommercial:4, order:14 },
  { service:'ДПИ', stage:'Этап 1', artifact:'Документы', task:'Подготовить документы Этап 1', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:15 },
  // ДПИ Этап 2
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'ТЗ для визуализатора (осн)', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:16 },
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'ТЗ для визуализатора (вспом)', role:'Дизайнер', base:'Кол-во комнат вспомагательные', hResidential:1, hCommercial:1, order:17 },
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'ТЗ для визуализатора (тех)', role:'Дизайнер', base:'Кол-во комнат технические', hResidential:0.5, hCommercial:0.5, order:18 },
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'3D-визуализация (осн)', role:'Визуализатор', base:'Кол-во комнат основные', hResidential:24, hCommercial:24, order:19 },
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'3D-визуализация (вспом)', role:'Визуализатор', base:'Кол-во комнат вспомагательные', hResidential:8, hCommercial:10, order:20 },
  { service:'ДПИ', stage:'Этап 2', artifact:'3D-визуализация', task:'3D-визуализация (тех)', role:'Визуализатор', base:'Кол-во комнат технические', hResidential:4, hCommercial:4, order:21 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Спецификация', task:'Спецификация материалов (осн)', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:22 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Спецификация', task:'Спецификация материалов (вспом)', role:'Дизайнер', base:'Кол-во комнат вспомагательные', hResidential:1, hCommercial:1, order:23 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Проект ЭО', task:'Предварительный проект ЭО', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:24 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Проект ОВК', task:'Предварительный проект ОВК', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:25 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Проект ВИК', task:'Предварительный проект ВИК', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:26 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Образцы материалов', task:'Основные образцы материалов', role:'Дизайнер', base:'Нет', hResidential:1, hCommercial:1, order:27 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Презентация CEO', task:'Презентовать Этап 2 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:28 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Презентация CEO', task:'Презентовать Этап 2 CEO (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:3, hCommercial:3, order:29 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Презентация Заказчику', task:'Презентовать Этап 2 Заказчику', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:30 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Презентация Заказчику', task:'Презентовать Этап 2 Заказчику (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:4, hCommercial:4, order:31 },
  { service:'ДПИ', stage:'Этап 2', artifact:'Документы', task:'Документы Этап 2', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:32 },
  // ДПИ Этап 3
  { service:'ДПИ', stage:'Этап 3', artifact:'3D-визуализация', task:'ТЗ для визуализатора (осн)', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:33 },
  { service:'ДПИ', stage:'Этап 3', artifact:'3D-визуализация', task:'ТЗ для визуализатора (вспом)', role:'Дизайнер', base:'Кол-во комнат вспомагательные', hResidential:1, hCommercial:1, order:34 },
  { service:'ДПИ', stage:'Этап 3', artifact:'3D-визуализация', task:'3D-визуализация (осн)', role:'Визуализатор', base:'Кол-во комнат основные', hResidential:24, hCommercial:24, order:35 },
  { service:'ДПИ', stage:'Этап 3', artifact:'3D-визуализация', task:'3D-визуализация (вспом)', role:'Визуализатор', base:'Кол-во комнат вспомагательные', hResidential:8, hCommercial:8, order:36 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Спецификация', task:'Спецификация оборудования (осн)', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:37 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Финальный проект ЭО', task:'Финальный проект ЭО', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:38 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Финальный проект ОВК', task:'Финальный проект ОВК', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:39 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Финальный проект ВИК', task:'Финальный проект ВИК', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:40 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Финальный проект СХК', task:'Финальный проект СХК', role:'Тимлид', base:'Нет', hResidential:8, hCommercial:8, order:41 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Презентация CEO', task:'Презентовать Этап 3 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:42 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Презентация CEO', task:'Презентовать Этап 3 CEO (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:3, hCommercial:3, order:43 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Презентация Заказчику', task:'Презентовать Этап 3 Заказчику', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:44 },
  { service:'ДПИ', stage:'Этап 3', artifact:'Документы', task:'Документы Этап 3', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:45 },
  // ДПИ Этап 4
  { service:'ДПИ', stage:'Этап 4', artifact:'Альбом визуализации', task:'Альбом визуализации (осн)', role:'Дизайнер', base:'Кол-во комнат основные', hResidential:0.25, hCommercial:0.25, order:46 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Спецификация с объемами', task:'Спецификация (осн)', role:'Проектировщик', base:'Кол-во комнат основные', hResidential:2, hCommercial:2, order:47 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Спецификация с объемами', task:'Спецификация (вспом)', role:'Проектировщик', base:'Кол-во комнат вспомагательные', hResidential:1, hCommercial:1, order:48 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Альбом проектной документации', task:'Альбом проектной документации (осн)', role:'Проектировщик', base:'Кол-во комнат основные', hResidential:3, hCommercial:3, order:49 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Альбом проектной документации', task:'Альбом проектной документации (вспом)', role:'Проектировщик', base:'Кол-во комнат вспомагательные', hResidential:2, hCommercial:2, order:50 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Альбом проектной документации', task:'Альбом проектной документации (тех)', role:'Проектировщик', base:'Кол-во комнат технические', hResidential:1, hCommercial:1, order:51 },
  { service:'ДПИ', stage:'Этап 4', artifact:'ТЗ на ИИИ', task:'Сделать ТЗ на ИИИ', role:'Проектировщик', base:'Кол-во комнат основные', hResidential:5, hCommercial:5, order:52 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Презентация CEO', task:'Презентовать Этап 4 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:53 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Презентация CEO', task:'Презентовать Этап 4 CEO (дизайнер)', role:'Дизайнер', base:'Нет', hResidential:3, hCommercial:3, order:54 },
  { service:'ДПИ', stage:'Этап 4', artifact:'Документы', task:'Документы Этап 4', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:55 },
  // ЭАП Этап 1
  { service:'ЭАП', stage:'Этап 1', artifact:'Бриф/ТЗ', task:'Бриф/ТЗ от заказчика', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:56 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Архитектурный анализ', task:'Архитектурный анализ', role:'Архитектор', base:'Площадь объекта', hResidential:0.5, hCommercial:0.5, order:57 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Генплан', task:'Разработать генплан', role:'Архитектор', base:'Площадь объекта', hResidential:0.1, hCommercial:0.1, order:58 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Планировочное решение', task:'Разработать планировочное решение', role:'Архитектор', base:'Площадь объекта', hResidential:0.5, hCommercial:0.5, order:59 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Планировочное решение', task:'Согласовать планировочное решение', role:'Тимлид', base:'Нет', hResidential:2, hCommercial:2, order:60 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Концепция', task:'Подготовить предварительную концепцию', role:'Архитектор', base:'Площадь объекта', hResidential:0.1, hCommercial:0.1, order:61 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Концепция', task:'Согласовать предварительную концепцию', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:62 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Презентация CEO', task:'Презентовать Этап 1 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:63 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Презентация CEO', task:'Презентовать Этап 1 CEO (архитектор)', role:'Архитектор', base:'Нет', hResidential:3, hCommercial:3, order:64 },
  { service:'ЭАП', stage:'Этап 1', artifact:'Документы', task:'Документы Этап 1', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:65 },
  // ЭАП Этап 2
  { service:'ЭАП', stage:'Этап 2', artifact:'3D-визуализация', task:'ТЗ для визуализатора', role:'Архитектор', base:'Площадь объекта', hResidential:1, hCommercial:1, order:66 },
  { service:'ЭАП', stage:'Этап 2', artifact:'3D-визуализация', task:'3D-визуализация', role:'Визуализатор', base:'Площадь объекта', hResidential:1, hCommercial:1, order:67 },
  { service:'ЭАП', stage:'Этап 2', artifact:'Образцы материалов', task:'Основные образцы', role:'Архитектор', base:'Площадь объекта', hResidential:0.1, hCommercial:0.1, order:68 },
  { service:'ЭАП', stage:'Этап 2', artifact:'Презентация CEO', task:'Презентовать Этап 2 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:69 },
  { service:'ЭАП', stage:'Этап 2', artifact:'Документы', task:'Документы Этап 2', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:70 },
  // ЭАП Этап 3
  { service:'ЭАП', stage:'Этап 3', artifact:'3D-визуализация', task:'3D-визуализация', role:'Визуализатор', base:'Площадь объекта', hResidential:1, hCommercial:1, order:71 },
  { service:'ЭАП', stage:'Этап 3', artifact:'Образцы материалов', task:'Все образцы материалов', role:'Архитектор', base:'Площадь объекта', hResidential:0.5, hCommercial:0.5, order:72 },
  { service:'ЭАП', stage:'Этап 3', artifact:'Презентация CEO', task:'Презентовать Этап 3 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:73 },
  { service:'ЭАП', stage:'Этап 3', artifact:'Документы', task:'Документы Этап 3', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:74 },
  // ЭАП Этап 4
  { service:'ЭАП', stage:'Этап 4', artifact:'Спецификация', task:'Спецификация материалов', role:'Архитектор', base:'Площадь объекта', hResidential:1, hCommercial:1, order:75 },
  { service:'ЭАП', stage:'Этап 4', artifact:'Проектная документация', task:'Альбом проектной документации', role:'Архитектор', base:'Площадь объекта', hResidential:1, hCommercial:1, order:76 },
  { service:'ЭАП', stage:'Этап 4', artifact:'Презентация CEO', task:'Презентовать Этап 4 CEO', role:'Тимлид', base:'Нет', hResidential:3, hCommercial:3, order:77 },
  { service:'ЭАП', stage:'Этап 4', artifact:'Документы', task:'Документы Этап 4', role:'Тимлид', base:'Нет', hResidential:4, hCommercial:4, order:78 },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Администратор',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    },
  })
  console.log('✅ Admin user created: admin@example.com / admin123')

  // Create global settings
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  })
  console.log('✅ Settings initialized')

  // Seed norms
  await prisma.norm.deleteMany()
  await prisma.norm.createMany({ data: DEFAULT_NORMS })
  console.log(`✅ ${DEFAULT_NORMS.length} norms seeded`)

  // Demo objects
  const obj1 = await prisma.object.create({
    data: { name: 'Яналиф', type: 'Жилой', complexity: 'Стандартный', area: 65, roomsMain: 3, roomsAux: 2, roomsTech: 1 },
  })
  const obj2 = await prisma.object.create({
    data: { name: 'Лофт Красный Октябрь', type: 'Коммерческий', complexity: 'Средней сложности', area: 320, roomsMain: 8, roomsAux: 4, roomsTech: 2 },
  })
  const obj3 = await prisma.object.create({
    data: { name: 'Резиденция Сосны', type: 'Жилой', complexity: 'Сложный', area: 480, roomsMain: 6, roomsAux: 5, roomsTech: 3 },
  })
  console.log('✅ Demo objects created')

  // Demo employees
  const e1 = await prisma.employee.create({ data: { name: 'Алексей Мартынов', role: 'Тимлид', type: 'Специалист', salary: 200 } })
  const e2 = await prisma.employee.create({ data: { name: 'Мария Степанова', role: 'Дизайнер', type: 'Ведущий специалист', salary: 160 } })
  const e3 = await prisma.employee.create({ data: { name: 'Дмитрий Орлов', role: 'Визуализатор', type: 'Специалист', salary: 160 } })
  const e4 = await prisma.employee.create({ data: { name: 'Ольга Федорова', role: 'Проектировщик', type: 'Младший специалист', salary: 150 } })
  const e5 = await prisma.employee.create({ data: { name: 'Сергей Новиков', role: 'Архитектор', type: 'Специалист', salary: 120 } })
  const e6 = await prisma.employee.create({ data: { name: 'Анна Белова', role: 'Дизайнер', type: 'Специалист', salary: 140 } })
  console.log('✅ Demo employees created')

  const now = new Date()
  const m = (n: number) => new Date(now.getFullYear(), now.getMonth() + n, 1)

  // Demo contracts
  const c1 = await prisma.contract.create({
    data: {
      name: 'ДПИ — Яналиф', objectId: obj1.id, service: 'ДПИ', status: 'active',
      team: { create: [
        { role: 'Тимлид', employeeId: e1.id },
        { role: 'Дизайнер', employeeId: e2.id },
        { role: 'Визуализатор', employeeId: e3.id },
        { role: 'Проектировщик', employeeId: e4.id },
      ]},
      stages: { create: [
        { stage: 'Этап 1', startDate: m(0), days: 20, order: 0 },
        { stage: 'Этап 2', startDate: m(1), days: 15, order: 1 },
        { stage: 'Этап 3', startDate: m(2), days: 15, order: 2 },
        { stage: 'Этап 4', startDate: m(3), days: 15, order: 3 },
      ]},
    },
  })

  const c2 = await prisma.contract.create({
    data: {
      name: 'ЭАП — Лофт Красный Октябрь', objectId: obj2.id, service: 'ЭАП', status: 'active',
      team: { create: [
        { role: 'Тимлид', employeeId: e1.id },
        { role: 'Архитектор', employeeId: e5.id },
        { role: 'Визуализатор', employeeId: e3.id },
      ]},
      stages: { create: [
        { stage: 'Этап 1', startDate: m(0), days: 25, order: 0 },
        { stage: 'Этап 2', startDate: m(1), days: 20, order: 1 },
        { stage: 'Этап 3', startDate: m(2), days: 20, order: 2 },
        { stage: 'Этап 4', startDate: m(3), days: 20, order: 3 },
      ]},
    },
  })

  const c3 = await prisma.contract.create({
    data: {
      name: 'ДПИ — Резиденция Сосны', objectId: obj3.id, service: 'ДПИ', status: 'active',
      team: { create: [
        { role: 'Тимлид', employeeId: e1.id },
        { role: 'Дизайнер', employeeId: e6.id },
        { role: 'Визуализатор', employeeId: e3.id },
        { role: 'Проектировщик', employeeId: e4.id },
      ]},
      stages: { create: [
        { stage: 'Этап 1', startDate: m(1), days: 30, order: 0 },
        { stage: 'Этап 2', startDate: m(2), days: 25, order: 1 },
        { stage: 'Этап 3', startDate: m(3), days: 25, order: 2 },
        { stage: 'Этап 4', startDate: m(4), days: 25, order: 3 },
      ]},
    },
  })
  console.log('✅ Demo contracts created')
  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
