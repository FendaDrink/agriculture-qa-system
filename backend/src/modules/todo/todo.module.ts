import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { TodoItemEntity } from './entities/todoItem.entity'
import { TodoService } from './todo.service'
import { TodoController } from './todo.controller'

@Module({
  imports: [TypeOrmModule.forFeature([TodoItemEntity]), AuthModule],
  providers: [TodoService],
  controllers: [TodoController],
})
export class TodoModule {}

