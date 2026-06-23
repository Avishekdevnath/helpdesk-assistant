import { Body, Controller, Post } from '@nestjs/common';
import type { AskRequest } from '@helpdesk/shared-types';
import { AiService } from './ai.service';
import { GenerateReplyDto } from './dto/generate-reply.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('generate-reply')
  generate(@Body() dto: GenerateReplyDto) {
    return this.ai.generateReply(dto);
  }

  @Post('ask')
  ask(@Body() body: AskRequest) {
    return this.ai.ask(body);
  }
}
