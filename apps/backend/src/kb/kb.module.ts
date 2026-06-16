import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KbService } from './kb.service';
import { KbController } from './kb.controller';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [PrismaModule],
  providers: [KbService, EmbeddingService],
  controllers: [KbController],
  exports: [KbService, EmbeddingService],
})
export class KbModule {}
