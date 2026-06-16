import 'dotenv/config';

export default {
  datasource: {
    url: (globalThis as any).process?.env.DIRECT_URL || '',
  },
};
