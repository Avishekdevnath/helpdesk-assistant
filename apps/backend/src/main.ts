import 'reflect-metadata';
import { createApp } from './bootstrap';

async function main() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`backend listening on http://localhost:${port}`);
}

void main();
