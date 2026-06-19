import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { KbModule } from '../kb/kb.module';
import { QuestionsModule } from '../questions/questions.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [KbModule, QuestionsModule, AppConfigModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
