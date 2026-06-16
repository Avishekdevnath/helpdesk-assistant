import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');
    this.client = new OpenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const input = text.slice(0, 8000);
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });
    return res.data[0].embedding;
  }
}
