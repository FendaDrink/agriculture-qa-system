import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { RequestLogEntity } from './entities/requestLog.entity'

interface ListQuery {
  page?: string | number
  pageSize?: string | number
  startTime?: string
  endTime?: string
  source?: string
  clientApp?: string
  method?: string
  statusCode?: string | number
  path?: string
  userId?: string
  keyword?: string
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const parseDate = (value?: string) => {
  if (!value) return null
  const result = new Date(value)
  if (Number.isNaN(result.valueOf())) return null
  return result
}

const calcP95 = (list: number[]) => {
  if (!list.length) return 0
  const sorted = [...list].sort((a, b) => a - b)
  const idx = Math.floor((sorted.length - 1) * 0.95)
  return sorted[idx]
}

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(RequestLogEntity, 'rag')
    private readonly logRepo: Repository<RequestLogEntity>,
  ) {}

  async create(payload: Omit<RequestLogEntity, 'createTime'>) {
    await this.logRepo.insert(payload as RequestLogEntity)
  }

  async list(query: ListQuery) {
    const page = clamp(Number(query.page || 1), 1, 100000)
    const pageSize = clamp(Number(query.pageSize || 20), 1, 200)

    const qb = this.logRepo.createQueryBuilder('l')
    qb.where('1=1')

    if (query.source) qb.andWhere('l.source = :source', { source: query.source })
    if (query.clientApp) qb.andWhere('l.client_app = :clientApp', { clientApp: query.clientApp })
    if (query.method) qb.andWhere('l.method = :method', { method: query.method.toUpperCase() })
    if (query.userId) qb.andWhere('l.user_id = :userId', { userId: query.userId })
    if (query.path) qb.andWhere('l.path LIKE :path', { path: `%${query.path}%` })
    if (query.statusCode !== undefined && query.statusCode !== '') {
      qb.andWhere('l.status_code = :statusCode', { statusCode: Number(query.statusCode) })
    }

    const startTime = parseDate(query.startTime)
    const endTime = parseDate(query.endTime)
    if (startTime && endTime) qb.andWhere('l.create_time BETWEEN :startTime AND :endTime', { startTime, endTime })
    else if (startTime) qb.andWhere('l.create_time >= :startTime', { startTime })
    else if (endTime) qb.andWhere('l.create_time <= :endTime', { endTime })

    if (query.keyword) {
      qb.andWhere('(l.original_url LIKE :kw OR l.error_message LIKE :kw)', { kw: `%${query.keyword}%` })
    }

    qb.select([
      'l.id',
      'l.createTime',
      'l.source',
      'l.clientApp',
      'l.requestId',
      'l.method',
      'l.path',
      'l.originalUrl',
      'l.statusCode',
      'l.durationMs',
      'l.ip',
      'l.userAgent',
      'l.referer',
      'l.userId',
      'l.roleId',
      'l.errorMessage',
    ])
    qb.orderBy('l.create_time', 'DESC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async detail(id: string) {
    return this.logRepo.findOne({ where: { id } })
  }

  async metrics(query: Omit<ListQuery, 'page' | 'pageSize'>) {
    const qb = this.logRepo.createQueryBuilder('l')
    qb.where('1=1')
    if (query.source) qb.andWhere('l.source = :source', { source: query.source })
    if (query.clientApp) qb.andWhere('l.client_app = :clientApp', { clientApp: query.clientApp })

    const startTime = parseDate(query.startTime)
    const endTime = parseDate(query.endTime)
    if (startTime && endTime) qb.andWhere('l.create_time BETWEEN :startTime AND :endTime', { startTime, endTime })
    else if (startTime) qb.andWhere('l.create_time >= :startTime', { startTime })
    else if (endTime) qb.andWhere('l.create_time <= :endTime', { endTime })

    const total = await qb.getCount()
    const error = await qb.clone().andWhere('l.status_code >= 400').getCount()
    const avgRow = await qb.clone().select('AVG(l.duration_ms)', 'avg').getRawOne<{ avg: string | null }>()
    const avgDurationMs = avgRow?.avg ? Math.round(Number(avgRow.avg)) : 0

    const durationRows = await qb.clone().select('l.duration_ms', 'durationMs').limit(10000).getRawMany<{ durationMs: number }>()
    const p95DurationMs = calcP95(durationRows.map((item) => Number(item.durationMs)).filter((n) => Number.isFinite(n)))

    const topEndpoints = await qb
      .clone()
      .select('l.method', 'method')
      .addSelect('l.path', 'path')
      .addSelect('COUNT(1)', 'count')
      .groupBy('l.method')
      .addGroupBy('l.path')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ method: string; path: string; count: string }>()

    const slowEndpoints = await qb
      .clone()
      .select('l.method', 'method')
      .addSelect('l.path', 'path')
      .addSelect('AVG(l.duration_ms)', 'avg')
      .groupBy('l.method')
      .addGroupBy('l.path')
      .orderBy('avg', 'DESC')
      .limit(10)
      .getRawMany<{ method: string; path: string; avg: string }>()

    const recentErrors = await qb
      .clone()
      .andWhere('l.status_code >= 400')
      .orderBy('l.create_time', 'DESC')
      .limit(20)
      .select([
        'l.id',
        'l.createTime',
        'l.source',
        'l.clientApp',
        'l.method',
        'l.path',
        'l.originalUrl',
        'l.statusCode',
        'l.durationMs',
        'l.userId',
        'l.errorMessage',
      ])
      .getMany()

    return {
      total,
      error,
      errorRate: total ? Number((error / total).toFixed(4)) : 0,
      avgDurationMs,
      p95DurationMs,
      topEndpoints: topEndpoints.map((item) => ({ ...item, count: Number(item.count) })),
      slowEndpoints: slowEndpoints.map((item) => ({ ...item, avg: Math.round(Number(item.avg)) })),
      recentErrors,
    }
  }

  async cleanupByDays(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    await this.logRepo.delete({ createTime: LessThan(cutoff) })
  }
}

