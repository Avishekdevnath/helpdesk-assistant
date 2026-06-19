import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const row = await this.prisma.config.findUnique({ where: { key } });
    return row?.value ?? '';
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.config.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async listByPrefix(prefix: string): Promise<{ key: string; value: string }[]> {
    return this.prisma.config.findMany({ where: { key: { startsWith: prefix } } });
  }

  async deleteKey(key: string): Promise<void> {
    await this.prisma.config.delete({ where: { key } });
  }
}
