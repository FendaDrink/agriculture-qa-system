import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LogRequestMiddleware implements NestMiddleware {
  private logger = new Logger('Request')

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`Body: ${JSON.stringify(req.body)}`)
    this.logger.log(`Query: ${JSON.stringify(req.query)}`)
    this.logger.log(`Params: ${JSON.stringify(req.params)}`)
    next()
  }
}
