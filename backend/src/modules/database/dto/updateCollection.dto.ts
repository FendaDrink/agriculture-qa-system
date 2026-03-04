import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateCollectionDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  collectionName: string

  @IsString()
  @IsNotEmpty()
  createBy: string
}
