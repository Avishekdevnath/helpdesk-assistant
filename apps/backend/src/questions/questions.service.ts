import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateQuestionDto) {
    return this.prisma.questionEntry.create({
      data: {
        type: dto.type,
        sourceDoc: dto.sourceDoc,
        batch: dto.batch,
        course: dto.course,
        questionNo: dto.questionNo,
        questionText: dto.questionText,
        hint1: dto.hint1,
        hint2: dto.hint2,
        topicTags: dto.topicTags,
        difficulty: dto.difficulty,
      },
    });
  }

  list() {
    return this.prisma.questionEntry.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const entry = await this.prisma.questionEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Question entry not found');
    return entry;
  }

  search(q: string, take = 5) {
    const terms = [
      q,
      ...q
        .split(/\s+/)
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length > 0),
    ];
    const uniqueTerms = [...new Set(terms)];

    return this.prisma.questionEntry.findMany({
      where: {
        OR: uniqueTerms.flatMap((term) => [
          { questionText: { contains: term, mode: 'insensitive' as const } },
          { course: { contains: term, mode: 'insensitive' as const } },
          { batch: { contains: term, mode: 'insensitive' as const } },
          { topicTags: { has: term } },
        ]),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  searchForPost(q: string, take = 5) {
    const ignoredTerms = new Set([
      'problem',
      'question',
      'issue',
      'help',
      'please',
      'moddhe',
      'kunu',
      'kono',
      'ache',
    ]);
    const terms = [
      ...new Set(
        (q.toLowerCase().match(/[a-z0-9]+(?:\.[a-z0-9]+)*/g) ?? [])
          .map((term) => term.trim())
          .filter((term) => term.length >= 4 && !ignoredTerms.has(term)),
      ),
    ];

    if (terms.length === 0) return Promise.resolve([]);

    return this.prisma.questionEntry.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { questionText: { contains: term, mode: 'insensitive' as const } },
          { topicTags: { has: term } },
        ]),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  update(id: string, dto: UpdateQuestionDto) {
    return this.prisma.questionEntry.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.questionEntry.delete({ where: { id } });
  }
}
