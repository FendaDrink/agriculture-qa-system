import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateChatSessionDto {
  @IsNotEmpty()
  @IsString()
  id: string

  @IsString()
  @IsNotEmpty()
  title: string
}
