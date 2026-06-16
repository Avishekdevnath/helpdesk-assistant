import { IsArray, IsIn, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import type { KbSource } from '@helpdesk/shared-types';

export class CreateKbDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsIn(['manual', 'post_save', 'markdown', 'docx', 'xlsx'])
  source!: KbSource;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsString()
  @MinLength(1)
  createdBy!: string;
}
