import {WaitlistStatus,type Prisma} from "@prisma/client";
import {businessDateAt} from "./time";
import {createAppointmentNotification} from "@/lib/notifications/email";

type CancelledAppointment=Prisma.AppointmentGetPayload<{
  include:{
    patient:{select:{id:true,name:true,email:true,phone:true,smsNotificationsEnabled:true}};
    doctor:{select:{id:true,name:true}};
    service:{select:{id:true,name:true,durationMinutes:true}};
    chair:{select:{name:true}};
  };
}>;

export async function notifyWaitlistForOpenedAppointment(tx:Prisma.TransactionClient,appointment:CancelledAppointment){
  const date=businessDateAt(appointment.startAt);
  const day=new Date(`${date}T00:00:00.000Z`);
  const entries=await tx.appointmentWaitlistEntry.findMany({
    where:{
      status:WaitlistStatus.WAITING,
      serviceId:appointment.serviceId,
      fromDate:{lte:day},
      throughDate:{gte:day},
      OR:[{doctorId:null},{doctorId:appointment.doctorId}],
    },
    include:{patient:{select:{id:true,name:true,email:true}}},
    orderBy:{createdAt:"asc"},
    take:25,
  });
  let notified=0;
  for(const entry of entries){
    const claimed=await tx.appointmentWaitlistEntry.updateMany({
      where:{id:entry.id,status:WaitlistStatus.WAITING},
      data:{status:WaitlistStatus.CONTACTED},
    });
    if(!claimed.count)continue;
    await createAppointmentNotification(tx,{
      type:"WAITLIST_AVAILABLE",
      appointment,
      userId:entry.patient.id,
      recipientEmail:entry.patient.email,
      idempotencyKey:`${entry.id}:available:${appointment.startAt.toISOString()}`,
    });
    notified++;
  }
  return notified;
}
