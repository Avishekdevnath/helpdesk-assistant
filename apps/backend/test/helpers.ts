import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export const API_KEY = 'test-helpdesk-key';

export async function bootTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('DATABASE_URL_TEST is required for e2e tests');
  }

  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.HELPDESK_API_KEY = API_KEY;
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDb(prisma: PrismaService) {
  await prisma.postSave.deleteMany();
  await prisma.kbEntry.deleteMany();
  await prisma.questionEntry.deleteMany();
}
