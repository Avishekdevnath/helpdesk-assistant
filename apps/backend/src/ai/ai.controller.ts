import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  // TRANSPORT PROBE — emits 5 SSE chunks 600ms apart. If a client sees them
  // arrive incrementally, Vercel streams this handler and real SSE for /ask is
  // viable; if all 5 land at once after ~3s, the platform buffers (pivot needed).
  // Remove after the streaming decision is made.
  @Get('stream-probe')
  async streamProbe(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();
    for (let i = 1; i <= 5; i++) {
      res.write(`data: ${JSON.stringify({ i, t: Date.now() })}\n\n`);
      (res as any).flush?.();
      await new Promise((r) => setTimeout(r, 600));
    }
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
