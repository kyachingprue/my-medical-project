import type {Prisma,User} from "@prisma/client";

export async function logAdminAction(tx:Prisma.TransactionClient,actor:User,action:string,entity:string,entityId:string,details?:Prisma.InputJsonValue){
  await tx.auditLog.create({data:{actorUid:actor.firebaseUid,actorEmail:actor.email,action,entity,entityId,...(details===undefined?{}:{details})}});
}

export async function logUserAction(tx:Prisma.TransactionClient,actorId:string,action:string,entity:string,entityId:string,details?:Prisma.InputJsonValue){
  const actor=await tx.user.findUnique({where:{id:actorId},select:{firebaseUid:true,email:true}});
  if(!actor)return;
  await tx.auditLog.create({data:{actorUid:actor.firebaseUid,actorEmail:actor.email,action,entity,entityId,...(details===undefined?{}:{details})}});
}
