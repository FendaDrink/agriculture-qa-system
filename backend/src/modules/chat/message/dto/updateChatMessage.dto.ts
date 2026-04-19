import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class UpdateChatMessageDto {
  @IsNotEmpty()
  @IsString()
  id: string

  @IsString()
  @IsNotEmpty()
  sessionId: string

  @IsInt()
  @IsNotEmpty()
  sender: number

  @IsString()
  @IsNotEmpty()
  content: string

  @IsInt()
  @IsNotEmpty()
  status: number

  @IsObject()
  @IsOptional()
  extra?: Record<string, any>
}
