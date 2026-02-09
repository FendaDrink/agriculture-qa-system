import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { UserService } from './user.service'
import { UserDto } from './dto/user.dto'
import { LogRequestMiddleware } from '../../app.middleware'
import { LoginDto } from './dto/login.dto'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(UserController)
  }
  /**
   * 查找所有用户
   */
  @Get()
  async findAll(): Promise<UserDto[]> {
    return this.userService.findAllUsers()
  }

  /**
   * 新建用户
   */
  @Post()
  async create(@Body() data: UserDto): Promise<UserDto> {
    return this.userService.create(data)
  }

  /**
   * 更新用户
   */
  @Patch()
  async update(@Body() data: UserDto): Promise<UserDto> {
    return this.userService.update(data)
  }

  /**
   * 更新用户密码
   */
  @Patch('pwd')
  async updatePwd(@Body() data: LoginDto): Promise<void> {
    return this.userService.updatePwd(data)
  }

  /**
   * 删除用户（注销）
   */
  @Delete()
  async delete(@Query('userId') userId: string): Promise<void> {
    return this.userService.delete(userId)
  }
}
