import { apiDelete, apiGet, apiPatch, apiPost } from './api'

export interface TodoItem {
  id: string
  title: string
  dueDate: string
  done: boolean
  createTime: string
  updateTime?: string
}

interface TodoApiItem {
  id: string
  title: string
  dueDate: string
  done: boolean
  createTime: string
  updateTime: string
}

export interface TodoCalendarDay {
  date: string
  day: number
  todoCount: number
  doneCount: number
  agriNotes: string[]
}

export interface TodoCalendarData {
  month: string
  firstDate: string
  lastDate: string
  firstWeekday: number
  totalDays: number
  days: TodoCalendarDay[]
}

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const getTodayDateString = () => formatDate(new Date())

const toTodoItem = (item: TodoApiItem): TodoItem => {
  return {
    id: item.id,
    title: item.title,
    dueDate: item.dueDate,
    done: Boolean(item.done),
    createTime: item.createTime,
    updateTime: item.updateTime,
  }
}

export const listTodos = async (dueDate?: string): Promise<TodoItem[]> => {
  const normalizedDueDate =
    typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())
      ? dueDate.trim()
      : undefined
  const data = await apiGet<TodoApiItem[]>('/todo', { dueDate: normalizedDueDate })
  return (Array.isArray(data) ? data : []).map(toTodoItem).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.dueDate !== b.dueDate) return a.dueDate > b.dueDate ? 1 : -1
    return a.createTime < b.createTime ? 1 : -1
  })
}

export const listTodayTodos = async (): Promise<TodoItem[]> => {
  const today = getTodayDateString()
  return listTodos(today)
}

export const getCurrentMonthString = () => getTodayDateString().slice(0, 7)

export const getTodoCalendar = async (month?: string): Promise<TodoCalendarData> => {
  const text = String(month || '').trim()
  const normalizedMonth = /^\d{4}-\d{2}$/.test(text) ? text : getCurrentMonthString()
  const data = await apiGet<TodoCalendarData>('/todo/calendar', { month: normalizedMonth })
  return {
    month: data?.month || normalizedMonth,
    firstDate: data?.firstDate || `${normalizedMonth}-01`,
    lastDate: data?.lastDate || `${normalizedMonth}-31`,
    firstWeekday: Number(data?.firstWeekday || 0),
    totalDays: Number(data?.totalDays || 0),
    days: Array.isArray(data?.days) ? data.days : [],
  }
}

export const createTodo = async (title: string, dueDate?: string): Promise<TodoItem> => {
  const text = String(title || '').trim()
  if (!text) {
    throw new Error('待办内容不能为空')
  }
  const data = await apiPost<TodoApiItem>('/todo', {
    title: text,
    dueDate: dueDate || getTodayDateString(),
  })
  return toTodoItem(data)
}

export const toggleTodoDone = async (id: string): Promise<TodoItem | null> => {
  const data = await apiPatch<TodoApiItem | null>(`/todo/${encodeURIComponent(id)}/toggle`)
  return data ? toTodoItem(data) : null
}

export const deleteTodo = async (id: string): Promise<void> => {
  await apiDelete<void>(`/todo/${encodeURIComponent(id)}`)
}
