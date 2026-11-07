import {notFound} from "next/navigation";
import {connection} from "next/server";
import {Link} from "@/i18n/navigation";
import {getTranslations} from "next-intl/server";
import {DoctorForm} from "@/components/management/doctor-form";
import {DoctorServiceAssignment} from "@/components/management/doctor-service-assignment";
import {prisma} from "@/lib/prisma";
type Props={params:Promise<{id:string}>};
export default async function AdminDoctorDetailsPage({params}:Props){
  await connection();
  const [{id},t]=await Promise.all([params,getTranslations("management")]);
  const [doctor,services]=await Promise.all([
    prisma.doctor.findUnique({where:{id},include:{services:{select:{serviceId:true}}}}),
    prisma.service.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);
  if(!doctor)notFound();
  return <section className="management-page"><Link href="/admin/doctors" className="back-link">← {t("backToDoctors")}</Link><header className="management-page-header"><div><span className="section-kicker">{t("doctorDetails")}</span><h1>{doctor.name}</h1><p>{doctor.specialization}</p></div><span className={`status-badge ${doctor.isActive?"is-active":"is-inactive"}`}>{doctor.isActive?t("active"):t("inactive")}</span></header><div className="management-card"><DoctorForm initial={{...doctor,profileImage:doctor.profileImage??"",id:doctor.id}}/></div><DoctorServiceAssignment doctorId={doctor.id} services={services} selectedIds={doctor.services.map(item=>item.serviceId)}/></section>;
}
