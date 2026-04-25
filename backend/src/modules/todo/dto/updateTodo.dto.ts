import { IsInt, IsOptional, IsString, Matches, MaxLength, Min, Max } from 'class-validator'

export class UpdateTodoDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式应为 YYYY-MM-DD' })
  dueDate?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1)
  done?: number
}

