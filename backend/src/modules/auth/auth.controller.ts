import { Body, Controller, MiddlewareConsumer, Post } from '@nestjs/common'
import { LogRequestMiddleware } from '../../app.middleware'
import { AuthService } from './auth.service'
import { LoginDto } from '../user/dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogRequestMiddleware).forRoutes(AuthController)
  }

  /**
   * 登陆
   */
  @Post('login')
  async login(@Body() data: LoginDto): Promise<string> {
    return this.authService.login(data)
  }
}
