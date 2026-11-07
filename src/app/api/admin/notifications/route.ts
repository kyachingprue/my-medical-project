import {NextResponse} from "next/server";
import {NotificationStatus,NotificationType,UserRole} from "@prisma/client";
import {apiError,authorizeApi,readPagination} from "@/lib/api/responses";
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await authorizeApi([UserRole.ADMIN, UserRole.RECEPTIONIST]);
  if (access.response) return access.response;

  const params = new URL(request.url).searchParams;
  const {page,limit,skip}=readPagination(params);
  const status = params.get("status");
  const type = params.get("type");
  const query = params.get("q")?.trim();
  const start = params.get("from");
  const end = params.get("to");
  const startDate = start ? parseDate(start) : undefined;
  const endDate = end ? parseDate(end) : undefined;
  if ((start && !startDate) || (end && !endDate) || (startDate && endDate && startDate > endDate)) {
    return apiError("INVALID_DATE_RANGE","Enter a valid notification date range.",400);
  }
  if (endDate) endDate.setTime(endDate.getTime()+86_400_000);

  const where = {
    ...(status && Object.values(NotificationStatus).includes(status as NotificationStatus) ? {status: status as NotificationStatus} : {}),
    ...(type && Object.values(NotificationType).includes(type as NotificationType) ? {type: type as NotificationType} : {}),
    ...(query ? {recipientEmail: {contains: query, mode: "insensitive" as const}} : {}),
    ...(startDate || endDate ? {createdAt: {
      ...(startDate ? {gte: startDate} : {}),
      ...(endDate ? {lt: endDate} : {}),
    }} : {}),
  };

  const [items, total, pending, sent, failed] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: {createdAt: "desc"},
      skip,
      take: limit,
      include: {appointment: {select: {id: true, patientName: true, doctor: {select: {name: true}}, service: {select: {name: true}}}}},
    }),
    prisma.notificationLog.count({where}),
    prisma.notificationLog.count({where: {...where, status: NotificationStatus.PENDING}}),
    prisma.notificationLog.count({where: {...where, status: NotificationStatus.SENT}}),
    prisma.notificationLog.count({where: {...where, status: NotificationStatus.FAILED}}),
  ]);

  return NextResponse.json({data:{items, pagination:{page,limit,total}, totals:{total, pending, sent, failed}}});
}

function parseDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(`${value}T00:00:00+06:00`);
  return Number.isFinite(date.getTime())?date:undefined;
}
