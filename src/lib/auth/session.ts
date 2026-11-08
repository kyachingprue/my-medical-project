import "server-only";
import {getAuth} from "firebase-admin/auth";
import {cookies} from "next/headers";
import {connection} from "next/server";
import {Prisma} from "@prisma/client";
import {getAdminApp} from "@/lib/firebase/admin";
import {prisma} from "@/lib/prisma";

export const SESSION_COOKIE = "__session";

async function findUserWithRetry(firebaseUid:string){
  let retries=0;
  while(true){
    try{
      return await prisma.user.findUnique({where:{firebaseUid}});
    }catch(error){
      if(!(error instanceof Prisma.PrismaClientInitializationError)||error.errorCode!=="P1001"||retries>=3)throw error;
      retries+=1;
      await new Promise(resolve=>setTimeout(resolve,retries*1000));
    }
  }
}

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
  return findUserWithRetry(claims.uid);
}
