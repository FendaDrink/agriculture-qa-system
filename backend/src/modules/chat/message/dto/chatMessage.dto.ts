import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

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

  @IsString()
  @IsOptional()
  extra?: Record<string, any>
}
