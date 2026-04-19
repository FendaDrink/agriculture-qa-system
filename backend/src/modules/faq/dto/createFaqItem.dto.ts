import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateFaqItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  originQuestion?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number

  @IsOptional()
  @IsInt()
  sortNo?: number
}
