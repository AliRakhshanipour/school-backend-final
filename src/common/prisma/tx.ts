import { Prisma } from '@prisma/client';

export async function runTxWithRetry<T>(
  prisma: any,
  fn: (tx: any) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastErr: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e: any) {
      lastErr = e;

      // Prisma write conflict / deadlock
      if (e?.code === 'P2034') continue;

      // Postgres serialization failure / deadlock
      const pg = e?.meta?.code || e?.code;
      if (pg === '40001' || pg === '40P01') continue;

      throw e;
    }
  }

  throw lastErr;
}
