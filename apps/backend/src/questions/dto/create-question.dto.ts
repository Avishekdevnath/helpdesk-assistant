import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Difficulty, QuestionType } from '@helpdesk/shared-types';

export class CreateQuestionDto {
  @IsIn(['assignment', 'practice'])
  type!: QuestionType;

  @IsString()
  @MinLength(1)
  sourceDoc!: string;

  @IsString()
  @MinLength(1)
  batch!: string;

  @IsString()
  @MinLength(1)
  course!: string;

  @IsOptional()
  @IsString()
  questionNo?: string;

  @IsString()
  @MinLength(1)
  questionText!: string;

  @IsString()
  @MinLength(1)
  hint1!: string;

  @IsOptional()
  @IsString()
  hint2?: string;

  @IsArray()
  @IsString({ each: true })
  topicTags!: string[];

  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: Difficulty;
}
