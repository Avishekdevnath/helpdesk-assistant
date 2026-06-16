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

@Controller('kb')
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Post('scrape')
  async scrapPost(@Body() data: ScrapPostDto) {
    return this.kbService.scrapPost(data);
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
