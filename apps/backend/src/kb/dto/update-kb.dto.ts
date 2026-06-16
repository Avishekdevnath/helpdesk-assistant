import { IsArray, IsIn, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import type { KbSource } from '@helpdesk/shared-types';

export class UpdateKbDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['manual', 'post_save', 'markdown', 'docx', 'xlsx'])
  source?: KbSource;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}
