import { IsNotEmpty, IsInt, IsPhoneNumber, IsOptional, IsDate } from 'class-validator'

export class UserDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  id: string

  @IsNotEmpty()
  username: string

  @IsOptional()
  password?: string

  @IsInt()
  @IsNotEmpty()
  roleId: number

  @IsDate()
  @IsNotEmpty()
  createTime: Date

  @IsDate()
  @IsNotEmpty()
  updateTime: Date

  @IsInt()
  @IsNotEmpty()
  status: number
}
