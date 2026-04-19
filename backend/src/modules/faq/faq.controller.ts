import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { FaqService } from './faq.service'
import { AuthGuard } from '../auth/auth.guard'
import { CreateFaqItemDto } from './dto/createFaqItem.dto'
import { UpdateFaqItemDto } from './dto/updateFaqItem.dto'
import { OverrideFaqItemDto } from './dto/overrideFaqItem.dto'

const ensureAdmin = (req: any) => {
  const roleId = req?.user?.roleId
  if (roleId !== 0 && roleId !== 1) {
    throw new ForbiddenException('无权限维护常见问题')
  }
}

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  async listMerged(@Query('limit') limit?: string | number) {
    return this.faqService.listMerged(limit)
  }

  @Get('/recommend')
  async listRecommend(@Query('limit') limit?: string | number) {
    return this.faqService.listRecommend(limit)
  }

  @Get('/high-frequency')
  @UseGuards(AuthGuard)
  async listHighFrequency(@Req() req: any, @Query('limit') limit?: string | number) {
    ensureAdmin(req)
    return this.faqService.listHighFrequency(limit)
  }

  @Get('/admin')
  @UseGuards(AuthGuard)
  async listManualAdmin(@Req() req: any, @Query() query: any) {
    ensureAdmin(req)
    return this.faqService.listManualAdmin(query)
  }

  @Post('/admin')
  @UseGuards(AuthGuard)
  async createManual(@Req() req: any, @Body() data: CreateFaqItemDto) {
    ensureAdmin(req)
    return this.faqService.createManual(data, req?.user?.userId || '')
  }

  @Post('/admin/override')
  @UseGuards(AuthGuard)
  async upsertOverride(@Req() req: any, @Body() data: OverrideFaqItemDto) {
    ensureAdmin(req)
    return this.faqService.upsertOverride(data, req?.user?.userId || '')
  }

  @Patch('/admin/:id')
  @UseGuards(AuthGuard)
  async updateManual(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateFaqItemDto,
  ) {
    ensureAdmin(req)
    return this.faqService.updateManual(id, data, req?.user?.userId || '')
  }

  @Delete('/admin/:id')
  @UseGuards(AuthGuard)
  async deleteManual(@Req() req: any, @Param('id') id: string) {
    ensureAdmin(req)
    return this.faqService.deleteManual(id)
  }
}
