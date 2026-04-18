import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { LogsService } from './logs.service'

@Injectable()
export class LogsScheduler implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(private readonly logsService: LogsService) {}

  async onModuleInit() {
    try {
      await this.logsService.cleanupByDays(30)
    } catch (error) {
      // ignore scheduler init errors
    }
    this.cleanupTimer = setInterval(() => {
      this.logsService.cleanupByDays(30).catch(() => {})
    }, 24 * 60 * 60 * 1000)
    this.cleanupTimer.unref?.()
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    this.cleanupTimer = null
  }
}

