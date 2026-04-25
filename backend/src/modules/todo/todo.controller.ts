import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { TodoService } from './todo.service'
import { CreateTodoDto } from './dto/createTodo.dto'
import { UpdateTodoDto } from './dto/updateTodo.dto'

@Controller('todo')
@UseGuards(AuthGuard)
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  async list(@Req() req: any, @Query('dueDate') dueDate?: string) {
    return this.todoService.listByUser(req?.user?.userId || '', dueDate)
  }

  @Get('calendar')
  async calendar(@Req() req: any, @Query('month') month?: string) {
    return this.todoService.getCalendarByUser(req?.user?.userId || '', month)
  }

  @Post()
  async create(@Req() req: any, @Body() data: CreateTodoDto) {
    return this.todoService.create(req?.user?.userId || '', data)
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() data: UpdateTodoDto) {
    return this.todoService.update(req?.user?.userId || '', id, data)
  }

  @Patch(':id/toggle')
  async toggle(@Req() req: any, @Param('id') id: string) {
    return this.todoService.toggle(req?.user?.userId || '', id)
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.todoService.delete(req?.user?.userId || '', id)
  }
}
