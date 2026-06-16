import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Difficulty, QuestionType } from '@helpdesk/shared-types';

export class UpdateQuestionDto {
  @IsOptional()
  @IsIn(['assignment', 'practice'])
  type?: QuestionType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sourceDoc?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  batch?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  course?: string;

  @IsOptional()
  @IsString()
  questionNo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  questionText?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  hint1?: string;

  @IsOptional()
  @IsString()
  hint2?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicTags?: string[];

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: Difficulty;
}
