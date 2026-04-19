import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { FaqController } from './faq.controller'
import { FaqService } from './faq.service'
import { FaqItemEntity } from './entities/faqItem.entity'

@Module({
  imports: [TypeOrmModule.forFeature([FaqItemEntity]), AuthModule],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
