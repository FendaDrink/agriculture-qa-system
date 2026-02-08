import { Body, Controller, Get, MiddlewareConsumer, Post } from '@nestjs/common'
import { UserService } from './user.service'
import { UserDto } from './dto/user.dto'
import { LogRequestMiddleware } from '../../app.middleware'

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
    console.log(data)
    return this.userService.create(data)
  }
}
