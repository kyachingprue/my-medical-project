import {PrismaClient} from "@prisma/client";

const globalForPrisma = globalThis as unknown as {prisma?: PrismaClient};

function getDatasourceUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  const url = new URL(databaseUrl);
  if (!url.searchParams.has("channel_binding")) return undefined;

  url.searchParams.delete("channel_binding");
  return url.toString();
}

const datasourceUrl = getDatasourceUrl();
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  ...(datasourceUrl ? {datasources: {db: {url: datasourceUrl}}} : {}),
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
