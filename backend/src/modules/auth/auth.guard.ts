import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Observable } from 'rxjs'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)
    if (!token) {
      throw new UnauthorizedException('未登陆无权限，请登录后再试')
    }

    try {
      request.user = this.jwtService.verify(token) // 将解码后的用户信息附加到请求对象
      return true
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('登陆信息失效，请重新登陆后再试')
      } else {
        throw new UnauthorizedException('密码错误')
      }
    }
  }

  private extractTokenFromHeader(request: Request): string {
    const header = request.headers['authorization']
    const [type, token] = header?.split(' ') || []
    return type === 'Bearer' ? token : ''
  }
}
