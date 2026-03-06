import { IsNotEmpty, IsString } from 'class-validator'

export class SpeechResDto {
  @IsString()
  @IsNotEmpty()
  text: string
}
