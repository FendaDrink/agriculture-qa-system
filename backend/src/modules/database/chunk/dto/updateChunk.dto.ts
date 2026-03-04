import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateChunkDto {
  @IsNotEmpty()
  @IsString()
  id: string

  @IsNotEmpty()
  @IsString()
  content: string

  @IsNotEmpty()
  @IsString()
  collectionId: string

  @IsNotEmpty()
  @IsString()
  documentId: string

  @IsNotEmpty()
  @IsString()
  user: string
}
