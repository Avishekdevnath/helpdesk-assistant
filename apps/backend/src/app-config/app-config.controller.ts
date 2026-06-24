import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { KnowledgeDocsService } from '../kb/knowledge-docs.service';

const KNOWLEDGE_RE = /^knowledge:[a-z0-9_-]+$/;

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
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly knowledgeDocs: KnowledgeDocsService,
  ) {}

  @Get('knowledge')
  async listKnowledge() {
    const rows = await this.appConfig.listByPrefix('knowledge:');
    return Promise.all(
      rows.map(async (r) => {
        const slug = r.key.replace('knowledge:', '');
        return { slug, key: r.key, value: r.value, status: await this.knowledgeDocs.statusFor(slug, r.value) };
      }),
    );
  }

  // Force re-embed a knowledge doc (backfill / retry). Multi-segment path — no
  // clash with @Put(':key') / @Get(':key').
  @Post('knowledge/:slug/revectorize')
  async revectorize(@Param('slug') slug: string) {
    if (!KNOWLEDGE_RE.test(`knowledge:${slug}`)) return { ok: false, error: 'bad slug' };
    const value = await this.appConfig.get(`knowledge:${slug}`);
    const res = await this.knowledgeDocs.embedDoc(slug, value);
    return { ok: res.status !== 'failed', status: res.status };
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
    const value = body.value ?? '';
    await this.appConfig.set(key, value);
    // Knowledge docs auto-embed on save so retrieval stays consistent.
    if (KNOWLEDGE_RE.test(key)) {
      const slug = key.replace('knowledge:', '');
      const res = await this.knowledgeDocs.embedDoc(slug, value);
      return { ok: true, key, embed: res.status };
    }
    return { ok: true, key };
  }

  @Delete(':key')
  async deleteConfig(@Param('key') key: string) {
    if (!isDeletable(key)) return { ok: false, error: 'not deletable' };
    await this.appConfig.deleteKey(key);
    if (KNOWLEDGE_RE.test(key)) {
      await this.knowledgeDocs.deleteDoc(key.replace('knowledge:', ''));
    }
    return { ok: true };
  }
}
