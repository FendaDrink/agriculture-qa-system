import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'

export class FollowupDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string

  @IsString()
  @IsOptional()
  query?: string

  @IsArray()
  @IsOptional()
  history?: any[]

  @IsInt()
  @Min(1)
  @Max(8)
  @IsOptional()
  limit?: number = 3

  @IsString()
  @IsOptional()
  model?: string
}

