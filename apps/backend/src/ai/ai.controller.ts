import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AskStreamEvent } from '@helpdesk/shared-types';
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

  // Streaming Ask over SSE. Verified to stream (not buffer) on Vercel. Each event
  // is one `data: <json AskStreamEvent>` line; the stream ends after `done`/`error`.
  @Post('ask/stream')
  async askStream(@Body() dto: AskRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();

    const send = (event: AskStreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      (res as any).flush?.();
    };

    await this.ai.askStream(dto, send);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
