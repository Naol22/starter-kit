import { PrismaClient } from "@prisma/client";

// Next.js App Router re-evaluates route modules on every hot-reload in dev.
// Without a singleton, `new PrismaClient()` inside each route file spins up a
// fresh client (and a fresh pool) on every HMR cycle — which leaks connections
// and eventually trips "too many clients" errors. Binding the client to
// globalThis in development keeps a single instance across reloads. In
// production each serverless invocation starts cold, so no global pollution.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
