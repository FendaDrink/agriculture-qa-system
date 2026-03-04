import { IsNotEmpty, IsString } from 'class-validator'

export class CreateChatSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  createBy: string
}
