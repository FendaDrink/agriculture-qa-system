import { IsDate, IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
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

  @IsDate()
  @IsNotEmpty()
  createTime: Date

  @IsInt()
  @IsNotEmpty()
  status: number

  @IsObject()
  @IsOptional()
  extra?: Record<string, any>
}
