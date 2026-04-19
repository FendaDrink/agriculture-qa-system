import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class CreateChatMessageDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string

  @IsInt()
  @IsNotEmpty()
  sender: number

  @IsString()
  @IsNotEmpty()
  content: string

  @IsObject()
  @IsOptional()
  extra?: Record<string, any>
}
