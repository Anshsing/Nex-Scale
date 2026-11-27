import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const db: PrismaClient =
  global.__prismaClient ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = db;
}

export * from '@prisma/client';
