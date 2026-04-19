import { IsNotEmpty, IsInt, IsPhoneNumber, IsOptional, IsDate, IsString } from 'class-validator'

export class UserDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  id: string

  @IsNotEmpty()
  @IsString()
  username: string

  @IsNotEmpty()
  @IsString()
  city: string

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
