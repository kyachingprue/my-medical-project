import {UserRole} from "@prisma/client";
import {listAppointments} from "@/lib/appointments/appointment-list.handlers";

export async function GET(request:Request){
  return listAppointments(request,[UserRole.ADMIN]);
}
