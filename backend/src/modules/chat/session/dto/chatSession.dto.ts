import { IsDate, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class ChatSessionDto {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  createBy: string

  @IsInt()
  @IsNotEmpty()
  status: number

  @IsDate()
  @IsNotEmpty()
  createTime: Date

  @IsDate()
  @IsNotEmpty()
  updateTime: Date
}
