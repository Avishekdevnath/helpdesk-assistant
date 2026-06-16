import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects on init and disconnects on destroy', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@example.com/db?sslmode=require';
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    const service = moduleRef.get(PrismaService);
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
});
