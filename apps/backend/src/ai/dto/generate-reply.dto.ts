import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class GenerateReplyDto {
  @IsString()
  @MinLength(1)
  postTitle!: string;

  @IsString()
  @MinLength(1)
  postBody!: string;

  @IsOptional()
  @IsUrl()
  postUrl?: string;

  @IsOptional()
  @IsString()
  replyToAuthor?: string;

  @IsOptional()
  @IsString()
  replyToText?: string;

  @IsOptional()
  @IsIn(['en', 'bn', 'original'])
  replyLanguage?: 'en' | 'bn' | 'original';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  screenshots?: string[];
}
