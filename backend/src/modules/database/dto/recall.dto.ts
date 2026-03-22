import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class RecallDto {
  @IsString()
  @IsNotEmpty()
  query: string

  @IsString()
  @IsNotEmpty()
  collectionId: string

  @IsInt()
  @IsOptional()
  topN?: number
}
