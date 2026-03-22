import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CompletionDto {
  @IsString()
  @IsNotEmpty()
  query: string

  @IsString()
  @IsOptional()
  model?: string = 'gpt-3.5-turbo-1106'

  @IsString()
  @IsOptional()
  collectionId?: string = '013573a2_agriculture'

  @IsString()
  @IsNotEmpty()
  sessionId: string

  @IsArray()
  @IsOptional()
  history?: any
}
