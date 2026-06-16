import { IsString, IsUrl, MinLength } from 'class-validator';

export class FromPostDto {
  @IsString()
  @MinLength(1)
  postTitle!: string;

  @IsString()
  @MinLength(1)
  postBody!: string;

  @IsString()
  @MinLength(1)
  comment!: string;

  @IsUrl()
  url!: string;

  @IsString()
  @MinLength(1)
  savedBy!: string;
}
