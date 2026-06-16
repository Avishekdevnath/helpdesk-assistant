import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import { KbService } from './kb.service';

interface ScrapPostDto {
  title: string;
  body: string;
  discussion: Record<string, unknown>[];
  url: string;
  course?: string;
  batch?: string;
  fullContent?: string;
}

interface FromPostDto {
  postTitle: string;
  postBody: string;
  comment: string;
  url: string;
  savedBy?: string;
}

interface ExtractDto {
  title: string;
  body: string;
  url: string;
  status?: string;
  course?: string;
  batch?: string;
  discussion: Record<string, unknown>[];
  attributes?: Record<string, unknown>;
  fullContent?: string;
  screenshots?: string[];
}

@Controller('kb')
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Post('scrape')
  async scrapPost(@Body() data: ScrapPostDto) {
    return this.kbService.scrapPost(data);
  }

  @Post('from-post')
  async saveFromPost(@Body() data: FromPostDto) {
    return this.kbService.scrapPost({
      title: data.postTitle,
      body: data.postBody,
      discussion: data.comment
        ? [{ role: 'moderator', author: data.savedBy ?? 'moderator', text: data.comment }]
        : [],
      url: data.url,
    });
  }

  // AI-curated save: gate -> AI extract -> upsert by url -> embed.
  @Post('extract')
  async extract(@Body() data: ExtractDto) {
    return this.kbService.extractAndSave(data);
  }

  @Get('search')
  async search(@Query('q') q = '', @Query('limit') limit = '5') {
    return this.kbService.search(q, parseInt(limit));
  }

  @Get('posts')
  async getAllPosts(@Query('limit') limit = '50', @Query('offset') offset = '0') {
    return this.kbService.getAllPosts(parseInt(limit), parseInt(offset));
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    return this.kbService.getPostById(id);
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string) {
    return this.kbService.deletePost(id);
  }

  @Get('stats')
  async getStats() {
    return this.kbService.getStats();
  }
}
