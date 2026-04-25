import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class SessionTitleDto {
  @IsString()
  @IsNotEmpty()
  query: string

  @IsOptional()
  @IsString()
  answer?: string

  @IsOptional()
  @IsString()
  model?: string
}
