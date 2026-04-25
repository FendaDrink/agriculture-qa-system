import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidV4 } from 'uuid'
import { TodoItemEntity } from './entities/todoItem.entity'
import { CreateTodoDto } from './dto/createTodo.dto'
import { UpdateTodoDto } from './dto/updateTodo.dto'

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const normalizeDate = (value?: string) => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return formatDate(new Date())
}

const normalizeDateFilter = (value?: string) => {
  const text = String(value || '').trim()
  if (!text || text === 'undefined' || text === 'null') return ''
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const normalizeMonthFilter = (value?: string) => {
  const text = String(value || '').trim()
  if (!text || text === 'undefined' || text === 'null') return ''
  return /^\d{4}-\d{2}$/.test(text) ? text : ''
}

const SOLAR_TERM_BASE = 0.2422
const SOLAR_TERMS = [
  { name: '小寒', month: 1, c21: 5.4055 },
  { name: '大寒', month: 1, c21: 20.12 },
  { name: '立春', month: 2, c21: 3.87 },
  { name: '雨水', month: 2, c21: 18.73 },
  { name: '惊蛰', month: 3, c21: 5.63 },
  { name: '春分', month: 3, c21: 20.646 },
  { name: '清明', month: 4, c21: 4.81 },
  { name: '谷雨', month: 4, c21: 20.1 },
  { name: '立夏', month: 5, c21: 5.52 },
  { name: '小满', month: 5, c21: 21.04 },
  { name: '芒种', month: 6, c21: 5.678 },
  { name: '夏至', month: 6, c21: 21.37 },
  { name: '小暑', month: 7, c21: 7.108 },
  { name: '大暑', month: 7, c21: 22.83 },
  { name: '立秋', month: 8, c21: 7.5 },
  { name: '处暑', month: 8, c21: 23.13 },
  { name: '白露', month: 9, c21: 7.646 },
  { name: '秋分', month: 9, c21: 23.042 },
  { name: '寒露', month: 10, c21: 8.318 },
  { name: '霜降', month: 10, c21: 23.438 },
  { name: '立冬', month: 11, c21: 7.438 },
  { name: '小雪', month: 11, c21: 22.36 },
  { name: '大雪', month: 12, c21: 7.18 },
  { name: '冬至', month: 12, c21: 21.94 },
] as const

const getMonthRange = (monthText?: string) => {
  const normalizedMonth = normalizeMonthFilter(monthText) || formatDate(new Date()).slice(0, 7)
  const [yearText, monthValue] = normalizedMonth.split('-')
  const year = Number(yearText)
  const month = Number(monthValue)
  const firstDate = `${normalizedMonth}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const lastDate = `${normalizedMonth}-${String(lastDay).padStart(2, '0')}`

  return {
    year,
    month,
    monthText: normalizedMonth,
    firstDate,
    lastDate,
    totalDays: lastDay,
    firstWeekday: new Date(year, month - 1, 1).getDay(),
  }
}

const getSolarTermDay = (year: number, cValue: number) => {
  const yy = year % 100
  return Math.floor(yy * SOLAR_TERM_BASE + cValue) - Math.floor((yy - 1) / 4)
}

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(TodoItemEntity)
    private readonly todoRepo: Repository<TodoItemEntity>,
  ) {}

  async listByUser(userId: string, dueDate?: string) {
    const dateFilter = normalizeDateFilter(dueDate)
    const qb = this.todoRepo.createQueryBuilder('t')
      .where('t.create_by = :userId', { userId })
      .andWhere('t.status = 1')

    if (dateFilter) {
      qb.andWhere('t.due_date = :dueDate', { dueDate: dateFilter })
    }

    const items = await qb
      .orderBy('t.done', 'ASC')
      .addOrderBy('t.due_date', 'ASC')
      .addOrderBy('t.create_time', 'DESC')
      .getMany()

    return items.map((item) => this.toTodoDto(item))
  }

  async getCalendarByUser(userId: string, month?: string) {
    const { year, month: monthNumber, monthText, firstDate, lastDate, totalDays, firstWeekday } = getMonthRange(month)

    const items = await this.todoRepo.createQueryBuilder('t')
      .where('t.create_by = :userId', { userId })
      .andWhere('t.status = 1')
      .andWhere('t.due_date BETWEEN :firstDate AND :lastDate', {
        firstDate,
        lastDate,
      })
      .orderBy('t.due_date', 'ASC')
      .addOrderBy('t.done', 'ASC')
      .addOrderBy('t.create_time', 'DESC')
      .getMany()

    const todoMap = new Map<string, TodoItemEntity[]>()
    items.forEach((item) => {
      const list = todoMap.get(item.dueDate) || []
      list.push(item)
      todoMap.set(item.dueDate, list)
    })

    const agriDateMap = new Map<string, string[]>()
    SOLAR_TERMS
      .filter((item) => item.month === monthNumber)
      .forEach((item) => {
        const day = getSolarTermDay(year, item.c21)
        if (day < 1 || day > totalDays) return
        const key = `${monthText}-${String(day).padStart(2, '0')}`
        const list = agriDateMap.get(key) || []
        list.push(item.name)
        agriDateMap.set(key, list)
      })

    const days = Array.from({ length: totalDays }).map((_, index) => {
      const date = `${monthText}-${String(index + 1).padStart(2, '0')}`
      const todos = todoMap.get(date) || []
      const agriNotes = agriDateMap.get(date) || []
      return {
        date,
        day: index + 1,
        todoCount: todos.length,
        doneCount: todos.filter((item) => item.done === 1).length,
        agriNotes,
      }
    })

    return {
      month: monthText,
      firstDate,
      lastDate,
      firstWeekday,
      totalDays,
      days,
    }
  }

  async create(userId: string, data: CreateTodoDto) {
    const entity = this.todoRepo.create({
      id: uuidV4(),
      title: data.title.trim(),
      dueDate: normalizeDate(data.dueDate),
      done: 0,
      createBy: userId,
      status: 1,
    })
    const saved = await this.todoRepo.save(entity)
    return this.toTodoDto(saved)
  }

  async update(userId: string, id: string, data: UpdateTodoDto) {
    const item = await this.todoRepo.findOne({ where: { id, status: 1 } })
    if (!item) throw new NotFoundException('待办不存在')
    if (item.createBy !== userId) throw new ForbiddenException('无权限操作此待办')

    const patch: Partial<TodoItemEntity> = {}
    if (typeof data.title === 'string') patch.title = data.title.trim()
    if (typeof data.dueDate === 'string') patch.dueDate = data.dueDate
    if (typeof data.done === 'number') patch.done = data.done ? 1 : 0

    await this.todoRepo.update({ id }, patch)
    const latest = await this.todoRepo.findOne({ where: { id } })
    return latest ? this.toTodoDto(latest) : null
  }

  async toggle(userId: string, id: string) {
    const item = await this.todoRepo.findOne({ where: { id, status: 1 } })
    if (!item) throw new NotFoundException('待办不存在')
    if (item.createBy !== userId) throw new ForbiddenException('无权限操作此待办')
    await this.todoRepo.update({ id }, { done: item.done ? 0 : 1 })
    const latest = await this.todoRepo.findOne({ where: { id } })
    return latest ? this.toTodoDto(latest) : null
  }

  async delete(userId: string, id: string) {
    const item = await this.todoRepo.findOne({ where: { id, status: 1 } })
    if (!item) throw new NotFoundException('待办不存在')
    if (item.createBy !== userId) throw new ForbiddenException('无权限操作此待办')
    await this.todoRepo.update({ id }, { status: 0 })
  }

  private toTodoDto(item: TodoItemEntity) {
    return {
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      done: item.done === 1,
      createTime: item.createTime,
      updateTime: item.updateTime,
    }
  }
}
