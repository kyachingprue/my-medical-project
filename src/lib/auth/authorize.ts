import "server-only";
import {redirect} from "next/navigation";
import type {UserRole} from "@prisma/client";
import {getCurrentUser} from "./session";

export async function requireRole(role: UserRole, locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in`);
  if (user.role !== role) redirect(`/${locale}/unauthorized`);
  return user;
}
