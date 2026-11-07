import type {Prisma} from "@prisma/client";

export async function lockDoctorRow(tx: Prisma.TransactionClient, doctorId: string) {
  const rows = await tx.$queryRaw<Array<{id: string}>>`SELECT "id" FROM "Doctor" WHERE "id" = ${doctorId} FOR UPDATE`;
  return rows.length > 0;
}
