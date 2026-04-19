import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class OverrideFaqItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  originQuestion: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string

  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number

  @IsOptional()
  @IsInt()
  sortNo?: number
}
