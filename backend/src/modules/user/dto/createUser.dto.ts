import { IsInt, IsPhoneNumber, IsString, IsNotEmpty } from 'class-validator'

export class CreateUserDto {
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  username: string

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
