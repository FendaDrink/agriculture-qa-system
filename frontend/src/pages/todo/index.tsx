import { Button, Input, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useMemo, useState } from 'react'
import {
  createTodo,
  deleteTodo,
  getCurrentMonthString,
  getTodayDateString,
  getTodoCalendar,
  listTodos,
  TodoCalendarData,
  TodoItem,
  toggleTodoDone,
} from '@/services/todo'
import { ensureAuthed } from '@/utils/auth'
import './index.scss'

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

type CalendarCell =
  | { key: string; empty: true; item?: undefined }
  | { key: string; empty: false; item: TodoCalendarData['days'][number] }

const emptyCalendar: TodoCalendarData = {
  month: getCurrentMonthString(),
  firstDate: '',
  lastDate: '',
  firstWeekday: 0,
  totalDays: 0,
  days: [],
}

const shiftMonth = (monthText: string, offset: number) => {
  const [yearText, monthValue] = String(monthText || getCurrentMonthString()).split('-')
  const date = new Date(Number(yearText), Number(monthValue) - 1 + offset, 1)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

const getDateMonth = (dateText: string) => String(dateText || getCurrentMonthString()).slice(0, 7)

const YEAR_OPTIONS = Array.from({ length: 11 }).map((_, index) => String(2021 + index))
const MONTH_OPTIONS = Array.from({ length: 12 }).map((_, index) => `${index + 1}月`)

const TodoPage = () => {
  const [title, setTitle] = useState('')
  const today = getTodayDateString()
  const [dueDate, setDueDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonthString())
  const [calendar, setCalendar] = useState<TodoCalendarData>(emptyCalendar)
  const [todos, setTodos] = useState<TodoItem[]>([])

  const refreshTodos = async () => {
    try {
      const items = await listTodos()
      setTodos(items)
    } catch (err) {
      setTodos([])
      Taro.showToast({ title: (err as Error).message || '加载待办失败', icon: 'none' })
    }
  }

  const refreshCalendar = async (month = calendarMonth) => {
    try {
      const data = await getTodoCalendar(month)
      setCalendar(data)
    } catch (err) {
      setCalendar({
        ...emptyCalendar,
        month,
      })
      Taro.showToast({ title: (err as Error).message || '加载日历失败', icon: 'none' })
    }
  }

  useDidShow(() => {
    ;(async () => {
      if (!await ensureAuthed()) return
      await Promise.all([refreshTodos(), refreshCalendar(calendarMonth)])
    })()
  })

  const selectedDateTodos = useMemo(() => todos.filter((item) => item.dueDate === selectedDate), [todos, selectedDate])
  const otherTodos = useMemo(() => todos.filter((item) => item.dueDate !== selectedDate), [todos, selectedDate])
  const selectedCalendarDay = useMemo(
    () => calendar.days.find((item) => item.date === selectedDate) || null,
    [calendar.days, selectedDate],
  )
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const leading: CalendarCell[] = Array.from({ length: calendar.firstWeekday }).map((_, index) => ({
      key: `empty-start-${index}`,
      empty: true as const,
    }))
    const middle: CalendarCell[] = calendar.days.map((item) => ({
      key: item.date,
      empty: false as const,
      item,
    }))
    const totalCount = leading.length + middle.length
    const trailingCount = totalCount % 7 === 0 ? 0 : 7 - (totalCount % 7)
    const trailing: CalendarCell[] = Array.from({ length: trailingCount }).map((_, index) => ({
      key: `empty-end-${index}`,
      empty: true as const,
    }))
    return [...leading, ...middle, ...trailing]
  }, [calendar.days, calendar.firstWeekday])

  const onAdd = async () => {
    try {
      await createTodo(title, dueDate)
      setTitle('')
      await Promise.all([refreshTodos(), refreshCalendar(calendarMonth)])
      await Taro.showToast({ title: '已添加待办', icon: 'none' })
    } catch (err) {
      await Taro.showToast({ title: (err as Error).message || '添加失败', icon: 'none' })
    }
  }

  const onToggle = async (id: string) => {
    await toggleTodoDone(id)
    await Promise.all([refreshTodos(), refreshCalendar(calendarMonth)])
  }

  const onDelete = async (id: string) => {
    await deleteTodo(id)
    await Promise.all([refreshTodos(), refreshCalendar(calendarMonth)])
  }

  const onSelectDate = (date: string) => {
    if (!date) return
    setSelectedDate(date)
    setDueDate(date)
    setCalendarMonth(getDateMonth(date))
  }

  const onChangeMonth = async (offset: number) => {
    const nextMonth = shiftMonth(calendarMonth, offset)
    setCalendarMonth(nextMonth)
    const nextSelectedDate = `${nextMonth}-01`
    setSelectedDate(nextSelectedDate)
    setDueDate(nextSelectedDate)
    await refreshCalendar(nextMonth)
  }

  const onChangeDueDate = async (date: string) => {
    const nextDate = date || today
    const nextMonth = getDateMonth(nextDate)
    setDueDate(nextDate)
    setSelectedDate(nextDate)
    if (nextMonth !== calendarMonth) {
      setCalendarMonth(nextMonth)
      await refreshCalendar(nextMonth)
    }
  }

  const onPickCalendarMonth = async (yearIndex: number, monthIndex: number) => {
    const year = YEAR_OPTIONS[yearIndex] || String(new Date().getFullYear())
    const month = `${String(monthIndex + 1).padStart(2, '0')}`
    const nextMonth = `${year}-${month}`
    const nextSelectedDate = `${nextMonth}-01`
    setCalendarMonth(nextMonth)
    setSelectedDate(nextSelectedDate)
    setDueDate(nextSelectedDate)
    await refreshCalendar(nextMonth)
  }

  const currentYearIndex = Math.max(0, YEAR_OPTIONS.findIndex((item) => item === calendarMonth.slice(0, 4)))
  const currentMonthIndex = Math.max(0, Number(calendarMonth.slice(5, 7)) - 1)

  return (
    <View className='todo-page safe-shell safe-top'>
      <View className='todo-hero'>
        <Text className='todo-hero-badge'>待办事项</Text>
        <Text className='todo-hero-title'>待办事项记录</Text>
        <Text className='todo-hero-desc'>记录巡田、施肥、观察病虫害和其他农事安排，首页会同步展示今日重点</Text>
      </View>
      <View className='todo-create'>
        <Text className='section-title'>新建待办</Text>
        <Input
          className='todo-input'
          value={title}
          maxlength={40}
          onInput={(e) => setTitle(e.detail.value)}
          placeholder='例如：检查黄瓜地块白粉病情况'
        />
        <View className='todo-create-row'>
          <Picker className='date-picker' mode='date' value={dueDate} onChange={(e) => onChangeDueDate((e as any).detail?.value || today)}>
            <View className='date-pill'>日期：{dueDate}</View>
          </Picker>
          <Button className='add-btn' size='mini' onClick={onAdd}>
            添加
          </Button>
        </View>
      </View>

      <View className='todo-calendar'>
        <View className='todo-calendar-head'>
          <Text className='section-title'>农事日历</Text>
          <View className='todo-calendar-switch'>
            <Text className='calendar-switch-btn' onClick={() => onChangeMonth(-1)}>上月</Text>
            <Picker
              mode='multiSelector'
              range={[YEAR_OPTIONS, MONTH_OPTIONS]}
              value={[currentYearIndex, currentMonthIndex]}
              onChange={(e) => {
                const value = (e as any).detail?.value || []
                onPickCalendarMonth(Number(value[0] || 0), Number(value[1] || 0))
              }}
            >
              <View className='calendar-month-picker'>
                <Text className='calendar-month'>{calendar.month}</Text>
                <Text className='calendar-month-arrow'>点击切换</Text>
              </View>
            </Picker>
            <Text className='calendar-switch-btn' onClick={() => onChangeMonth(1)}>下月</Text>
          </View>
        </View>
        <Text className='todo-calendar-tip'>日历中会标出当月节气日期和你记录的待办事项，点击日期可查看当天安排。</Text>
        <View className='calendar-week-row'>
          {WEEK_LABELS.map((label) => (
            <Text key={label} className='calendar-week-label'>{label}</Text>
          ))}
        </View>
        <View className='calendar-grid'>
          {calendarCells.map((cell) => cell.empty ? (
            <View key={cell.key} className='calendar-cell is-empty' />
          ) : (
            <View
              key={cell.key}
              className={`calendar-cell ${cell.item?.date === selectedDate ? 'is-active' : ''} ${cell.item?.date === today ? 'is-today' : ''}`}
              onClick={() => onSelectDate(cell.item?.date || '')}
            >
              <Text className='calendar-day'>{cell.item?.day}</Text>
              {cell.item?.agriNotes?.[0] ? <Text className='calendar-agri'>{cell.item.agriNotes[0]}</Text> : null}
              <View className='calendar-markers'>
                {cell.item && cell.item.todoCount > 0 ? <Text className='calendar-dot todo-dot' /> : null}
                {cell.item && cell.item.agriNotes.length > 0 ? <Text className='calendar-dot agri-dot' /> : null}
              </View>
            </View>
          ))}
        </View>
        <View className='calendar-legend'>
          <View className='calendar-legend-item'>
            <Text className='calendar-dot todo-dot' />
            <Text className='calendar-legend-text'>个人待办</Text>
          </View>
          <View className='calendar-legend-item'>
            <Text className='calendar-dot agri-dot' />
            <Text className='calendar-legend-text'>节气提醒</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY className='todo-scroll'>
        <View className='todo-block'>
          <View className='todo-block-head'>
            <Text className='section-title'>所选日期事项</Text>
            <Text className='todo-block-meta'>{selectedDate} · {selectedDateTodos.length} 项</Text>
          </View>
          {selectedCalendarDay?.agriNotes?.length ? (
            <View className='agri-note-card'>
              <Text className='agri-note-title'>节气提醒</Text>
              <Text className='agri-note-text'>{selectedCalendarDay.agriNotes.join('、')}</Text>
            </View>
          ) : null}
          {selectedDateTodos.length > 0 ? selectedDateTodos.map((item) => (
            <View key={item.id} className='todo-item'>
              <View className='todo-main' onClick={() => onToggle(item.id)}>
                <Text className={`todo-check ${item.done ? 'done' : ''}`}>{item.done ? '✓' : ''}</Text>
                <View className='todo-meta'>
                  <Text className={`todo-title ${item.done ? 'done' : ''}`}>{item.title}</Text>
                  <Text className='todo-date'>{item.dueDate}</Text>
                </View>
              </View>
              <Button className='del-btn' size='mini' onClick={() => onDelete(item.id)}>
                删除
              </Button>
            </View>
          )) : (
            <Text className='empty-text'>这一天暂无待办事项</Text>
          )}
        </View>

        <View className='todo-block'>
          <View className='todo-block-head'>
            <Text className='section-title'>其他待办</Text>
            <Text className='todo-block-meta'>{otherTodos.length} 项</Text>
          </View>
          {otherTodos.length > 0 ? otherTodos.map((item) => (
            <View key={item.id} className='todo-item'>
              <View className='todo-main' onClick={() => onToggle(item.id)}>
                <Text className={`todo-check ${item.done ? 'done' : ''}`}>{item.done ? '✓' : ''}</Text>
                <View className='todo-meta'>
                  <Text className={`todo-title ${item.done ? 'done' : ''}`}>{item.title}</Text>
                  <Text className='todo-date'>{item.dueDate}</Text>
                </View>
              </View>
              <Button className='del-btn' size='mini' onClick={() => onDelete(item.id)}>
                删除
              </Button>
            </View>
          )) : (
            <Text className='empty-text'>暂无其他待办</Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default TodoPage
