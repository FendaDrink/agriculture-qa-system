import { Injectable, NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { LogsService } from './logs.service'

const API_PREFIXES = ['/auth', '/user', '/database', '/chat', '/logs']

const isApiPath = (path: string) => {
  return API_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value ?? null)
  } catch (error) {
    return JSON.stringify({ __error: 'json_stringify_failed' })
  }
}

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private readonly logsService: LogsService) {}

  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const startTs = Date.now()
    const requestId = ((req.headers['x-request-id'] as string) || randomUUID()).trim()
    req.requestId = requestId
    res.setHeader('X-Request-Id', requestId)

    res.on('finish', async () => {
      const path = req.path || req.originalUrl || ''
      if (!isApiPath(path)) return

      const statusCode = Number((res.locals as any).__appCode ?? res.statusCode ?? 200)
      const durationMs = Date.now() - startTs
      const user = (req as any).user as { userId?: string; roleId?: number } | undefined
      const clientApp =
        ((req.headers['x-client-app'] as string | undefined) || (req.headers['x-client'] as string | undefined) || '')
          .trim() || null
      const fileMeta = (req as any).file
        ? {
            fieldname: (req as any).file.fieldname,
            originalname: (req as any).file.originalname,
            mimetype: (req as any).file.mimetype,
            size: (req as any).file.size,
          }
        : undefined
      const bodyValue = fileMeta ? { ...((req.body || {}) as Record<string, unknown>), __file: fileMeta } : req.body

      const forwardedFor = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      const ip = forwardedFor || req.ip || (req.connection as any)?.remoteAddress || null

      try {
        await this.logsService.create({
          id: randomUUID(),
          source: 'backend',
          clientApp,
          requestId,
          method: (req.method || '').toUpperCase(),
          path: req.path || '',
          originalUrl: req.originalUrl || req.url || '',
          statusCode,
          durationMs,
          ip,
          userAgent: (req.headers['user-agent'] as string | undefined) || null,
          referer: (req.headers['referer'] as string | undefined) || null,
          userId: user?.userId || null,
          roleId: typeof user?.roleId === 'number' ? user.roleId : null,
          headers: safeJson(req.headers),
          query: safeJson(req.query),
          body: safeJson(bodyValue),
          errorMessage:
            statusCode >= 400
              ? ((res.locals as any).__errorMessage as string | undefined) || ((res.locals as any).__appMessage as string | undefined) || null
              : null,
          errorStack: statusCode >= 400 ? (((res.locals as any).__errorStack as string | undefined) || null) : null,
        })
      } catch (error) {
        // do not affect normal response
      }
    })

    next()
  }
}

