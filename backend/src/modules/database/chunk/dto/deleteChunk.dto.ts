import { IsNotEmpty, IsString } from 'class-validator'

export class DeleteChunkDto {
  @IsNotEmpty()
  @IsString()
  id: string

  @IsNotEmpty()
  @IsString()
  collectionId: string

  @IsNotEmpty()
  @IsString()
  documentId: string
}
