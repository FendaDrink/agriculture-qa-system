import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class UploadDocDto {
  @IsString()
  @IsNotEmpty()
  user: string

  @IsString()
  @IsNotEmpty()
  collectionId: string

  @IsString()
  @IsOptional()
  fileName?: string
}
