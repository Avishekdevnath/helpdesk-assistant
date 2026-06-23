import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

const ALLOWED_KEYS = new Set([
  'core_prompt',
  'core_info',
  'reply_style',
  'refine_prompt',
  'prompt:assignment',
  'prompt:practice',
  'taste',
]);

function isAllowed(key: string): boolean {
  if (ALLOWED_KEYS.has(key)) return true;
  return /^knowledge:[a-z0-9_-]+$/.test(key);
}

function isDeletable(key: string): boolean {
  return /^knowledge:[a-z0-9_-]+$/.test(key);
}

@Controller('config')
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get('knowledge')
  async listKnowledge() {
    const rows = await this.appConfig.listByPrefix('knowledge:');
    return rows.map((r) => ({ slug: r.key.replace('knowledge:', ''), key: r.key, value: r.value }));
  }

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    if (!isAllowed(key)) return { key, value: '' };
    const value = await this.appConfig.get(key);
    return { key, value };
  }

  @Put(':key')
  async setConfig(@Param('key') key: string, @Body() body: { value?: string }) {
    if (!isAllowed(key)) return { ok: false, error: 'unknown key' };
    await this.appConfig.set(key, body.value ?? '');
    return { ok: true, key };
  }

  @Delete(':key')
  async deleteConfig(@Param('key') key: string) {
    if (!isDeletable(key)) return { ok: false, error: 'not deletable' };
    await this.appConfig.deleteKey(key);
    return { ok: true };
  }
}
