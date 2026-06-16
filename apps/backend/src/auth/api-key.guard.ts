import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('HELPDESK_API_KEY');
    const provided = context.switchToHttp().getRequest().header('x-api-key');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
