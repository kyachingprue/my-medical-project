import {PrismaClient, UserRole, Weekday} from "@prisma/client";
import {getAuth} from "firebase-admin/auth";
import {getAdminApp} from "../src/lib/firebase/admin-app";

const prisma = new PrismaClient();

const doctors = [
  {name:"Dr. Nasrin Sultana",email:"nasrin.sultana@smilecraft.example",phone:"+8801700000101",specialization:"General Dentistry",qualification:"BDS, FCPS (Conservative Dentistry)",experienceYears:12,bio:"Provides patient-centered preventive and restorative dental care, with a focus on clear explanations and comfortable visits.",serviceSlugs:["dental-checkup","scaling","tooth-extraction"]},
  {name:"Dr. Rahman",email:"rahman@smilecraft.example",phone:"+8801700000102",specialization:"Endodontics",qualification:"BDS, MS (Endodontics)",experienceYears:10,bio:"Focuses on preserving natural teeth through careful diagnosis and modern root canal treatment.",serviceSlugs:["dental-checkup","root-canal","tooth-extraction"]},
  {name:"Dr. Maria Akter",email:"maria.akter@smilecraft.example",phone:"+8801700000103",specialization:"Cosmetic Dentistry",qualification:"BDS, Diploma in Aesthetic Dentistry",experienceYears:8,bio:"Helps patients explore evidence-based cosmetic and preventive options for healthy, confident smiles.",serviceSlugs:["dental-checkup","scaling","teeth-whitening"]},
];
const services = [
  {name:"Dental Checkup",slug:"dental-checkup",description:"A comprehensive dental examination and personalized oral health guidance.",durationMinutes:20,price:"500.00"},
  {name:"Scaling",slug:"scaling",description:"Professional teeth cleaning to remove plaque and tartar and support gum health.",durationMinutes:45,price:"1500.00"},
  {name:"Root Canal",slug:"root-canal",description:"Treatment to address infection inside a tooth and help preserve the natural tooth.",durationMinutes:60,price:"4000.00"},
  {name:"Tooth Extraction",slug:"tooth-extraction",description:"Assessment and careful removal of a tooth when extraction is clinically indicated.",durationMinutes:30,price:"2000.00"},
  {name:"Teeth Whitening",slug:"teeth-whitening",description:"A consultation-led cosmetic treatment to brighten natural teeth safely.",durationMinutes:60,price:"3500.00"},
];
const doctorDays:Record<string,Weekday[]> = {
  "nasrin.sultana@smilecraft.example":[Weekday.SATURDAY,Weekday.SUNDAY,Weekday.TUESDAY,Weekday.WEDNESDAY],
  "rahman@smilecraft.example":[Weekday.SATURDAY,Weekday.MONDAY,Weekday.TUESDAY,Weekday.THURSDAY],
  "maria.akter@smilecraft.example":[Weekday.SUNDAY,Weekday.MONDAY,Weekday.WEDNESDAY,Weekday.THURSDAY],
};

async function seedStaff(uid: string | undefined, role: UserRole) {
  if (!uid) return;
  const account = await getAuth(getAdminApp()).getUser(uid);
  if (!account.email) throw new Error(`Firebase account ${uid} must have an email.`);
  await prisma.user.upsert({
    where: {firebaseUid: uid},
    update: {name: account.displayName ?? account.email, email: account.email, emailVerified: account.emailVerified, role},
    create: {firebaseUid: uid, name: account.displayName ?? account.email, email: account.email, emailVerified: account.emailVerified, role},
  });
}

async function main() {
  const serviceRecords = await Promise.all(services.map(service=>prisma.service.upsert({
    where:{slug:service.slug},
    update:{name:service.name,description:service.description,durationMinutes:service.durationMinutes,price:service.price,isActive:true},
    create:{...service,isActive:true},
  })));
  const doctorsByEmail = new Map<string,string>();
  for(const entry of doctors){
    const doctor=await prisma.doctor.upsert({
      where:{email:entry.email},
      update:{name:entry.name,phone:entry.phone,specialization:entry.specialization,qualification:entry.qualification,experienceYears:entry.experienceYears,bio:entry.bio,isActive:true},
      create:{name:entry.name,email:entry.email,phone:entry.phone,specialization:entry.specialization,qualification:entry.qualification,experienceYears:entry.experienceYears,bio:entry.bio,isActive:true},
    });
    doctorsByEmail.set(entry.email,doctor.id);
    const selectedServices=serviceRecords.filter(service=>entry.serviceSlugs.includes(service.slug));
    await prisma.doctorService.createMany({data:selectedServices.map(service=>({doctorId:doctor.id,serviceId:service.id})),skipDuplicates:true});
    for(const dayOfWeek of doctorDays[entry.email]){
      for(const [startTime,endTime] of [["10:00","13:00"],["14:00","20:00"]]){
        await prisma.workingHours.upsert({
          where:{doctorId_dayOfWeek_startTime:{doctorId:doctor.id,dayOfWeek,startTime}},
          update:{endTime,isActive:true},
          create:{doctorId:doctor.id,dayOfWeek,startTime,endTime,isActive:true},
        });
      }
    }
  }
  await Promise.all(["Dental Chair 01","Dental Chair 02"].map(name=>prisma.chair.upsert({
    where:{name},update:{isActive:true},create:{name,description:"Clinic treatment chair",isActive:true},
  })));
  await seedStaff(process.env.SEED_ADMIN_UID, UserRole.ADMIN);
  await seedStaff(process.env.SEED_RECEPTIONIST_UID, UserRole.RECEPTIONIST);
  console.log(`Seeded ${doctorsByEmail.size} doctors and ${serviceRecords.length} services; clinic chairs and schedules are up to date.`);
}

main().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
