import { IsNotEmpty, IsInt, IsPhoneNumber, IsOptional, IsDate, IsString } from 'class-validator'

export class UserDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  id: string

  @IsNotEmpty()
  @IsString()
  username: string

  @IsInt()
  @IsNotEmpty()
  city: number

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
