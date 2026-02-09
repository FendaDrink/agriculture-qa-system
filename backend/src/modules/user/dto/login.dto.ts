import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator'

export class LoginDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  password: string
}
