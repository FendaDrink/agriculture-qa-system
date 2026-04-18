import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { LogsService } from './logs.service'

const ensureAdmin = (req: any) => {
  const roleId = req?.user?.roleId
  if (roleId !== 0 && roleId !== 1) {
    throw new ForbiddenException('无权限访问日志')
  }
}

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async list(@Req() req: any, @Query() query: any) {
    ensureAdmin(req)
    return this.logsService.list(query)
  }

  @Get('/metrics')
  async metrics(@Req() req: any, @Query() query: any) {
    ensureAdmin(req)
    return this.logsService.metrics(query)
  }

  @Get('/:id')
  async detail(@Req() req: any, @Param('id') id: string) {
    ensureAdmin(req)
    return this.logsService.detail(id)
  }
}

