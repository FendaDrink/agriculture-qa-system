import {
  Body,
  Controller,
  Delete,
  Get,
  MiddlewareConsumer,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { UserService } from './user.service'
import { UserDto } from './dto/user.dto'
import { LogRequestMiddleware } from '../../app.middleware'
import { LoginDto } from './dto/login.dto'
import { AuthGuard } from '../auth/auth.guard'
import { CreateUserDto } from './dto/createUser.dto'
import { UpdateUserDto } from './dto/updateUser.dto'

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
  @UseGuards(AuthGuard)
  async findAll(@Req() req: any): Promise<UserDto[]> {
    return this.userService.findAllUsers(req.user)
  }

  /**
   * 新建用户
   */
  @Post()
  async create(@Body() data: CreateUserDto): Promise<UserDto> {
    return this.userService.create(data)
  }

  /**
   * 更新用户
   */
  @Patch()
  @UseGuards(AuthGuard)
  async update(@Body() data: UpdateUserDto): Promise<UserDto> {
    return this.userService.update(data)
  }

  /**
   * 更新用户密码
   */
  @Patch('pwd')
  @UseGuards(AuthGuard)
  async updatePwd(@Body() data: LoginDto): Promise<void> {
    return this.userService.updatePwd(data)
  }

  /**
   * 删除用户（注销）
   */
  @Delete()
  @UseGuards(AuthGuard)
  async delete(@Query('userId') userId: string): Promise<void> {
    return this.userService.delete(userId)
  }
}
