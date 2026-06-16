import { Module } from '@nestjs/common';
import { KbModule } from '../kb/kb.module';
import { QuestionsModule } from '../questions/questions.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [KbModule, QuestionsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
