import { IsNotEmpty, IsString } from 'class-validator'

export class createCollectionDto {
  @IsNotEmpty()
  @IsString()
  collectionName: string

  @IsNotEmpty()
  @IsString()
  createBy: string
}
