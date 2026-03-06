import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

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

  @IsString()
  @IsOptional()
  extra?: Record<string, any>
}
