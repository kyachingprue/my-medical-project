import type {Prisma} from "@prisma/client";

export async function lockDoctorRow(tx: Prisma.TransactionClient, doctorId: string, nowait = false) {
  const rows = nowait
    ? await tx.$queryRaw<Array<{id: string}>>`SELECT "id" FROM "Doctor" WHERE "id" = ${doctorId} FOR UPDATE NOWAIT`
    : await tx.$queryRaw<Array<{id: string}>>`SELECT "id" FROM "Doctor" WHERE "id" = ${doctorId} FOR UPDATE`;
  return rows.length > 0;
}
