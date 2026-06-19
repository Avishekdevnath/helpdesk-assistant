import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

const ALLOWED_KEYS = new Set(['core_info', 'reply_taste']);

@Controller('config')
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    if (!ALLOWED_KEYS.has(key)) return { key, value: '' };
    const value = await this.appConfig.get(key);
    return { key, value };
  }

  @Put(':key')
  async setConfig(@Param('key') key: string, @Body() body: { value?: string }) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, error: 'unknown key' };
    await this.appConfig.set(key, body.value ?? '');
    return { ok: true, key };
  }
}
