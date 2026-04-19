import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { v4 as uuidV4 } from 'uuid'
import { FaqItemEntity } from './entities/faqItem.entity'
import { CreateFaqItemDto } from './dto/createFaqItem.dto'
import { UpdateFaqItemDto } from './dto/updateFaqItem.dto'
import { OverrideFaqItemDto } from './dto/overrideFaqItem.dto'

interface AdminListQuery {
  page?: string | number
  pageSize?: string | number
  keyword?: string
  status?: string | number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(FaqItemEntity)
    private readonly faqRepo: Repository<FaqItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async listMerged(limitInput?: string | number) {
    const limit = clamp(Number(limitInput || 20), 1, 50)
    const allManualItems = await this.faqRepo.find({
      order: { updateTime: 'DESC' },
    })

    const manualItems = allManualItems
      .filter((item) => item.status === 1)
      .sort((a, b) => {
        if (a.sortNo !== b.sortNo) return b.sortNo - a.sortNo
        return new Date(b.updateTime).valueOf() - new Date(a.updateTime).valueOf()
      })
      .slice(0, limit)

    const hiddenOrOverriddenQuestions = new Set<string>()
    allManualItems.forEach((item) => {
      const q = item.question?.trim()?.toLowerCase()
      const origin = item.originQuestion?.trim()?.toLowerCase()
      if (origin) hiddenOrOverriddenQuestions.add(origin)
      if (q && item.status === 0) hiddenOrOverriddenQuestions.add(q)
    })

    const manualVisibleQuestions = new Set(
      manualItems
        .map((item) => item.question?.trim()?.toLowerCase())
        .filter(Boolean),
    )

    const autoRows = await this.getHighFrequencyRows(limit * 3)
    const autoItems = autoRows
      .map((item, index) => ({
        id: `auto-${index}-${Buffer.from(item.question).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`,
        question: item.question,
        source: 'auto' as const,
        frequency: Number(item.frequency),
        latestAskedAt: item.latestAskedAt,
      }))
      .filter((item) => {
        const key = item.question.trim().toLowerCase()
        if (hiddenOrOverriddenQuestions.has(key)) return false
        if (manualVisibleQuestions.has(key)) return false
        return true
      })

    const merged = [
      ...manualItems.map((item) => ({
        id: item.id,
        question: item.question,
        source: 'manual' as const,
        frequency: null,
        latestAskedAt: null,
      })),
      ...autoItems,
    ].slice(0, limit)

    return { items: merged }
  }

  async listRecommend(limitInput?: string | number) {
    const limit = clamp(Number(limitInput || 4), 1, 20)
    const rows = await this.getHighFrequencyRows(limit)
    return {
      items: rows.map((item, index) => ({
        id: `recommend-${index}`,
        question: item.question,
        frequency: Number(item.frequency),
        latestAskedAt: item.latestAskedAt,
        source: 'auto',
      })),
    }
  }

  async listHighFrequency(limitInput?: string | number) {
    const limit = clamp(Number(limitInput || 20), 1, 100)
    const rows = await this.getHighFrequencyRows(limit)
    return {
      items: rows.map((item, index) => ({
        id: `freq-${index}`,
        question: item.question,
        frequency: Number(item.frequency),
        latestAskedAt: item.latestAskedAt,
        source: 'auto',
      })),
    }
  }

  async listManualAdmin(query: AdminListQuery) {
    const page = clamp(Number(query.page || 1), 1, 100000)
    const pageSize = clamp(Number(query.pageSize || 20), 1, 200)

    const qb = this.faqRepo.createQueryBuilder('f').where('1=1')
    if (query.keyword) {
      qb.andWhere('(f.question LIKE :kw OR f.origin_question LIKE :kw)', { kw: `%${query.keyword.trim()}%` })
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('f.status = :status', { status: Number(query.status) })
    }

    qb.orderBy('f.sort_no', 'DESC').addOrderBy('f.update_time', 'DESC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, pageSize }
  }

  async createManual(data: CreateFaqItemDto, operatorId: string) {
    const entity = this.faqRepo.create({
      id: uuidV4(),
      question: data.question.trim(),
      originQuestion: data.originQuestion?.trim() || null,
      status: data.status ?? 1,
      sortNo: data.sortNo ?? 0,
      createBy: operatorId,
      updateBy: operatorId,
    })
    return this.faqRepo.save(entity)
  }

  async upsertOverride(data: OverrideFaqItemDto, operatorId: string) {
    const originQuestion = data.originQuestion.trim()
    const entity = await this.faqRepo.findOne({ where: { originQuestion } })
    if (entity) {
      await this.faqRepo.update(
        { id: entity.id },
        {
          question: data.question.trim(),
          status: data.status ?? 1,
          sortNo: data.sortNo ?? entity.sortNo ?? 0,
          updateBy: operatorId,
          originQuestion,
        },
      )
      return this.faqRepo.findOne({ where: { id: entity.id } })
    }

    return this.faqRepo.save(
      this.faqRepo.create({
        id: uuidV4(),
        question: data.question.trim(),
        originQuestion,
        status: data.status ?? 1,
        sortNo: data.sortNo ?? 0,
        createBy: operatorId,
        updateBy: operatorId,
      }),
    )
  }

  async updateManual(id: string, data: UpdateFaqItemDto, operatorId: string) {
    const patch: Partial<FaqItemEntity> = {
      updateBy: operatorId,
    }

    if (typeof data.question === 'string') patch.question = data.question.trim()
    if (typeof data.originQuestion === 'string') patch.originQuestion = data.originQuestion.trim()
    if (typeof data.status === 'number') patch.status = data.status
    if (typeof data.sortNo === 'number') patch.sortNo = data.sortNo

    await this.faqRepo.update({ id }, patch)
    return this.faqRepo.findOne({ where: { id } })
  }

  async deleteManual(id: string) {
    await this.faqRepo.delete({ id })
  }

  private async getHighFrequencyRows(limit: number) {
    return this.dataSource
      .createQueryBuilder()
      .select('TRIM(cm.content)', 'question')
      .addSelect('COUNT(1)', 'frequency')
      .addSelect('MAX(cm.create_time)', 'latestAskedAt')
      .from('chat_message', 'cm')
      .where('cm.sender = :sender', { sender: 1 })
      .andWhere('cm.status = :status', { status: 1 })
      .andWhere('TRIM(cm.content) <> ""')
      .andWhere('CHAR_LENGTH(TRIM(cm.content)) BETWEEN 6 AND 200')
      .groupBy('TRIM(cm.content)')
      .having('COUNT(1) >= 2')
      .orderBy('COUNT(1)', 'DESC')
      .addOrderBy('MAX(cm.create_time)', 'DESC')
      .limit(limit)
      .getRawMany<{ question: string; frequency: string; latestAskedAt: string }>()
  }
}
