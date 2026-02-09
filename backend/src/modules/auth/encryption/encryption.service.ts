import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

@Injectable()
export class EncryptionService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10) // 控制盐值的复杂度
    return bcrypt.hash(password, salt)
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
