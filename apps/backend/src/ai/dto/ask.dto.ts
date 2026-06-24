import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Caps bound cost + prompt-injection surface. A single question is a few hundred
// chars; multi-turn history is short. These limits are generous but finite.
export const ASK_MAX_MESSAGES = 30;
export const ASK_MAX_CONTENT_CHARS = 8000;
export const ASK_MAX_IMAGES = 4;

export class AskMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  // May be empty for an image-only turn (the request still carries images[]).
  @IsString()
  @MaxLength(ASK_MAX_CONTENT_CHARS)
  content!: string;
}

export class AskRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASK_MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AskMessageDto)
  messages!: AskMessageDto[];

  @IsOptional()
  @IsIn(['en', 'bn', 'original'])
  replyLanguage?: 'en' | 'bn' | 'original';

  // Data-URL images for the latest turn. Count-capped; total size bounded by the
  // 4mb body limit. Clients downscale before sending.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ASK_MAX_IMAGES)
  @IsString({ each: true })
  images?: string[];
}
