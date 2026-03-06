import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator'

export class UserPwdDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  pwdHash: string
}
