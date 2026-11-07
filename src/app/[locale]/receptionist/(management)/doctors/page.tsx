import {getTranslations} from "next-intl/server";
import {connection} from "next/server";
import {prisma} from "@/lib/prisma";

export default async function ReceptionistDoctorsPage(){
  await connection();
  const [doctors,t]=await Promise.all([
    prisma.doctor.findMany({where:{isActive:true},include:{services:{where:{service:{isActive:true}},include:{service:{select:{name:true}}}}},orderBy:{name:"asc"}}),
    getTranslations("management"),
  ]);
  return <section className="management-page"><header className="management-page-header"><div><span className="section-kicker">{t("receptionDesk")}</span><h1>{t("doctors")}</h1><p>{t("doctorsHelp")}</p></div></header>{doctors.length?<div className="management-card"><div className="management-table-wrap"><table className="management-table"><thead><tr><th>{t("doctorName")}</th><th>{t("specialization")}</th><th>{t("qualification")}</th><th>{t("experienceYears")}</th><th>{t("services")}</th></tr></thead><tbody>{doctors.map(doctor=><tr key={doctor.id}><td><strong>{doctor.name}</strong><small>{doctor.email} · {doctor.phone}</small></td><td>{doctor.specialization}</td><td>{doctor.qualification}</td><td>{doctor.experienceYears}</td><td>{doctor.services.map(({service})=>service.name).join(", ")||"—"}</td></tr>)}</tbody></table></div></div>:<div className="management-empty"><h2>{t("noDoctors")}</h2><p>{t("noDoctorsHelp")}</p></div>}</section>;
}
