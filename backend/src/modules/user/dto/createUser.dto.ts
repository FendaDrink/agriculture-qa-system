import { Type } from 'class-transformer'
import { IsInt, IsPhoneNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateUserDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  username: string

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  city?: number

  @IsString()
  @IsNotEmpty()
  password: string

  @IsInt()
  @IsNotEmpty()
  roleId: number

  @IsInt()
  @IsNotEmpty()
  status: number
}
