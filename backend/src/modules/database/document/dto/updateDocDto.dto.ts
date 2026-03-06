import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateDocDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  fileName: string

  @IsString()
  @IsNotEmpty()
  collectionId: string

  @IsString()
  @IsNotEmpty()
  createBy: string
}
