import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KbService } from './kb.service';
import { KbController } from './kb.controller';
import { EmbeddingService } from './embedding.service';
import { KnowledgeDocsService } from './knowledge-docs.service';

@Module({
  imports: [PrismaModule],
  providers: [KbService, EmbeddingService, KnowledgeDocsService],
  controllers: [KbController],
  exports: [KbService, EmbeddingService, KnowledgeDocsService],
})
export class KbModule {}
