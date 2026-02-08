import { IsNotEmpty, IsPhoneNumber } from 'class-validator'

export class UserPwdDto {
  @IsPhoneNumber()
  userId: string

  @IsNotEmpty()
  pwdHash: string
}
