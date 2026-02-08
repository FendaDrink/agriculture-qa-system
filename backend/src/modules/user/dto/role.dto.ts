import { IsNotEmpty, IsInt, IsString, IsObject } from 'class-validator'

export class RoleDto {
  @IsInt()
  id: number

  @IsNotEmpty()
  roleName: string

  @IsString()
  description: string

  @IsObject()
  permissions: Record<string, any>
}
