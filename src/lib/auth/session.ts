import "server-only";
import {getAuth} from "firebase-admin/auth";
import {cookies} from "next/headers";
import {connection} from "next/server";
import {getAdminApp} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";

export const SESSION_COOKIE = "__session";

export async function getCurrentUser() {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let claims: Awaited<ReturnType<ReturnType<typeof getAuth>["verifySessionCookie"]>>;
  try {
    claims = await getAuth(getAdminApp()).verifySessionCookie(token, true);
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
  return prisma.user.findUnique({where: {firebaseUid: claims.uid}});
}
