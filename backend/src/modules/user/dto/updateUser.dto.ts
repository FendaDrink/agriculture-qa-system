import { IsInt, IsPhoneNumber, IsOptional, IsString } from 'class-validator'

export class UpdateUserDto {
  @IsPhoneNumber('CN')
  @IsOptional()
  id?: string

  @IsString()
  @IsOptional()
  username?: string

  @IsInt()
  @IsOptional()
  roleId?: number

  @IsInt()
  @IsOptional()
  status?: number
}
