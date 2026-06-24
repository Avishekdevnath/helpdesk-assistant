import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateReplyDto } from './dto/generate-reply.dto';
import { AskRequestDto } from './dto/ask.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-reply')
  generate(@Body() dto: GenerateReplyDto) {
    return this.ai.generateReply(dto);
  }

  @Post('ask')
  ask(@Body() dto: AskRequestDto) {
    return this.ai.ask(dto);
  }
}
