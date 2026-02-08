import { IsNotEmpty, IsInt, IsPhoneNumber } from 'class-validator'

export class UserDto {
  @IsPhoneNumber('CN')
  id: string

  @IsNotEmpty()
  username: string

  @IsInt()
  @IsNotEmpty()
  roleId: number
}
