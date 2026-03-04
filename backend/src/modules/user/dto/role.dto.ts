import { IsNotEmpty, IsInt, IsString, IsObject, IsOptional } from 'class-validator'

export class RoleDto {
  @IsInt()
  @IsNotEmpty()
  id: number

  @IsString()
  @IsNotEmpty()
  roleName: string

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>
}
