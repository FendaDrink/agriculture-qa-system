import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

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

  @IsString()
  @IsOptional()
  extra?: Record<string, any>
}
