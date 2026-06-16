import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('search')
  search(@Query('q') q = '') {
    return this.questions.search(q);
  }

  @Get()
  list() {
    return this.questions.list();
  }

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questions.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questions.remove(id);
  }
}
