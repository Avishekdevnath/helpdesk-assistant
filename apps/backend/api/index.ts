import 'reflect-metadata';
import serverlessExpress from '@vendia/serverless-express';
import type { Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { AppModule } from '../src/app.module';

let cached: ReturnType<typeof serverlessExpress> | null = null;

async function build() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: Request, res: Response) {
  if (!cached) cached = await build();
  return cached(req, res);
}
