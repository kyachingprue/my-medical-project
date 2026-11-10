import {BadgeCheck,CalendarDays,Phone,Users} from "lucide-react";
import {getTranslations} from "next-intl/server";

type PatientEntry={
  id:string;
  name:string;
  email:string;
  phone:string|null;
  emailVerified:boolean;
  createdAt:Date;
};

export async function PatientDirectory({patients,locale}:{patients:PatientEntry[];locale:string}){
  const [t,account,directory]=await Promise.all([
    getTranslations("dashboard"),
    getTranslations("accountProfile"),
    getTranslations("patientDirectory"),
  ]);
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{
    timeZone:"Asia/Dhaka",
    dateStyle:"medium",
  });

  return <section className="grid gap-[18px]">
    <header className="flex flex-wrap items-end justify-between gap-[14px] rounded-[16px] [border:1px_solid_var(--line)] [background:var(--surface)] p-[22px_24px] [@media(max-width:640px)]:p-[18px]">
      <div className="min-w-0">
        <span className="mb-[8px] inline-flex items-center gap-[7px] text-[10px] font-bold tracking-[1.2px] [color:var(--teal)]">
          <Users size={14}/>{t("patients")}
        </span>
        <h1 className="m-0 text-[24px] font-semibold tracking-[-.5px] [color:var(--text)] [@media(max-width:480px)]:text-[21px]">{t("patients")}</h1>
        <p className="mb-0 mt-[6px] text-[13px] [color:var(--muted)]">{directory("description")}</p>
      </div>
      <div className="inline-flex items-center gap-[9px] rounded-[12px] [background:var(--mint)] px-[14px] py-[10px] [color:var(--teal)]">
        <Users size={17}/>
        <span className="text-[20px] font-bold leading-none">{patients.length}</span>
        <span className="text-[11px] font-semibold">{t("totalPatients")}</span>
      </div>
    </header>

    {patients.length===0?
      <div className="rounded-[16px] [border:1px_dashed_var(--line)] [background:var(--surface)] px-[20px] py-[52px] text-center">
        <span className="mx-auto mb-[12px] grid h-[48px] w-[48px] place-items-center rounded-[14px] [background:var(--mint)] [color:var(--teal)]"><Users size={22}/></span>
        <h2 className="m-0 text-[16px] font-semibold [color:var(--text)]">{directory("emptyTitle")}</h2>
        <p className="mx-auto mb-0 mt-[7px] max-w-[420px] text-[13px] leading-[1.6] [color:var(--muted)]">{directory("emptyDescription")}</p>
      </div>:
      <>
        <div className="hidden overflow-hidden rounded-[16px] [border:1px_solid_var(--line)] [background:var(--surface)] shadow-[0_8px_24px_color-mix(in_srgb,var(--text)_4%,transparent)] [@media(min-width:761px)]:block">
          <div className="overflow-x-auto">
            <table className="w-[100%] min-w-[900px] [border-collapse:collapse] text-left">
              <thead className="[background:var(--bg)] text-[10px] font-bold uppercase tracking-[.7px] [color:var(--muted)]">
                <tr>
                  <th scope="col" className="px-[16px] py-[14px]">{account("fullName")}</th>
                  <th scope="col" className="px-[16px] py-[14px]">{directory("id")}</th>
                  <th scope="col" className="px-[16px] py-[14px]">{account("email")}</th>
                  <th scope="col" className="px-[16px] py-[14px]">{account("phone")}</th>
                  <th scope="col" className="px-[16px] py-[14px]">{account("verified")}</th>
                  <th scope="col" className="px-[16px] py-[14px]">{account("joined")}</th>
                </tr>
              </thead>
              <tbody className="text-[12px] [color:var(--text)]">
                {patients.map(patient=><tr key={patient.id} className="[border-top:1px_solid_var(--line)] [&:hover]:[background:color-mix(in_srgb,var(--mint)_42%,transparent)]">
                  <td className="px-[16px] py-[14px]">
                    <span className="flex min-w-[150px] items-center gap-[10px]">
                      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] [background:var(--mint)] text-[12px] font-bold [color:var(--teal)]">{patient.name.slice(0,1).toUpperCase()}</span>
                      <strong className="font-semibold">{patient.name}</strong>
                    </span>
                  </td>
                  <td className="max-w-[155px] break-all px-[16px] py-[14px] font-mono text-[10px] [color:var(--muted)]">{patient.id}</td>
                  <td className="max-w-[210px] break-all px-[16px] py-[14px]">{patient.email}</td>
                  <td className="whitespace-nowrap px-[16px] py-[14px]">{patient.phone??"—"}</td>
                  <td className="px-[16px] py-[14px]">
                    <span className={`inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] py-[5px] text-[10px] font-semibold ${patient.emailVerified?"[background:var(--mint)] [color:var(--teal)]":"[background:var(--bg)] [color:var(--muted)]"}`}>
                      {patient.emailVerified?<BadgeCheck size={13}/>:null}{patient.emailVerified?account("verified"):account("notVerified")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-[16px] py-[14px] [color:var(--muted)]">{dateFormat.format(patient.createdAt)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <ul className="m-0 grid list-none gap-[11px] p-0 [@media(min-width:761px)]:hidden">
          {patients.map(patient=><li key={patient.id} className="rounded-[15px] [border:1px_solid_var(--line)] [background:var(--surface)] p-[16px] shadow-[0_6px_18px_color-mix(in_srgb,var(--text)_4%,transparent)]">
            <div className="flex min-w-0 items-center gap-[11px]">
              <span className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[13px] [background:var(--mint)] text-[13px] font-bold [color:var(--teal)]">{patient.name.slice(0,1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <h2 className="m-0 break-words text-[14px] font-semibold [color:var(--text)]">{patient.name}</h2>
                <span className="mt-[3px] block break-all text-[11px] [color:var(--muted)]">{patient.email}</span>
              </div>
              <span className={`shrink-0 rounded-full px-[8px] py-[5px] text-[9px] font-semibold ${patient.emailVerified?"[background:var(--mint)] [color:var(--teal)]":"[background:var(--bg)] [color:var(--muted)]"}`}>{patient.emailVerified?account("verified"):account("notVerified")}</span>
            </div>
            <dl className="mb-0 mt-[14px] grid gap-[10px] [border-top:1px_solid_var(--line)] pt-[13px] text-[11px]">
              <div className="grid grid-cols-[90px_1fr] gap-[9px]"><dt className="font-medium [color:var(--muted)]">{directory("id")}</dt><dd className="m-0 break-all font-mono [color:var(--text)]">{patient.id}</dd></div>
              <div className="grid grid-cols-[90px_1fr] gap-[9px]"><dt className="flex items-center gap-[5px] font-medium [color:var(--muted)]"><Phone size={12}/>{account("phone")}</dt><dd className="m-0 break-words [color:var(--text)]">{patient.phone??"—"}</dd></div>
              <div className="grid grid-cols-[90px_1fr] gap-[9px]"><dt className="flex items-center gap-[5px] font-medium [color:var(--muted)]"><CalendarDays size={12}/>{account("joined")}</dt><dd className="m-0 [color:var(--text)]">{dateFormat.format(patient.createdAt)}</dd></div>
            </dl>
          </li>)}
        </ul>
      </>
    }
  </section>;
}
