import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function contextWithKey(key?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => (name === 'x-api-key' ? key : undefined),
      }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  it('allows requests with the configured api key', () => {
    const guard = new ApiKeyGuard({ get: () => 'secret' } as unknown as ConfigService);
    expect(guard.canActivate(contextWithKey('secret'))).toBe(true);
  });

  it('rejects requests without the configured api key', () => {
    const guard = new ApiKeyGuard({ get: () => 'secret' } as unknown as ConfigService);
    expect(() => guard.canActivate(contextWithKey('wrong'))).toThrow(UnauthorizedException);
  });
});
