import {Activity,ClipboardList,FileHeart,HeartPulse,ShieldCheck} from "lucide-react";
import {getTranslations} from "next-intl/server";
import type {LucideIcon} from "lucide-react";

type HealthRecord={id:string;title:string;diagnosis:string;treatment:string;notes:string|null;recordedAt:Date;createdBy:{name:string}};
type Prescription={id:string;medication:string;dosage:string;frequency:string;duration:string;instructions:string|null;issuedAt:Date;createdBy:{name:string}};

export async function PatientClinicalView({kind,records,prescriptions,locale}:{kind:"records"|"prescriptions";records?:HealthRecord[];prescriptions?:Prescription[];locale:string}){
  const t=await getTranslations("clinical");
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"full"});

  if(kind==="records"){
    const items=records??[];
    return <section className="grid gap-6">
      <header className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[linear-gradient(130deg,color-mix(in_srgb,var(--teal)_14%,var(--surface)),var(--surface)_72%)] p-6 sm:p-9">
        <div className="relative z-10 max-w-2xl"><span className="text-xs font-bold tracking-[.15em] text-[var(--teal)]">{t("recordsKicker")}</span><h1 className="mb-2 mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">{t("recordsTitle")}</h1><p className="m-0 text-sm leading-6 text-[var(--muted)]">{t("recordsDescription")}</p></div>
        <FileHeart className="absolute -bottom-5 right-5 h-32 w-32 text-[var(--teal)] opacity-10 sm:right-12 sm:h-44 sm:w-44"/>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Activity} label={t("recordCount")} value={items.length}/>
        <SummaryCard icon={HeartPulse} label={t("latestRecord")} value={items[0]?dateFormat.format(items[0].recordedAt):t("notAvailable")}/>
        <SummaryCard icon={ShieldCheck} label={t("privateRecords")} value={t("privateRecordsValue")}/>
      </div>
      <section className="grid gap-4">
        <h2 className="m-0 text-xl font-semibold text-[var(--text)]">{t("careTimeline")}</h2>
        {items.length===0?<EmptyState title={t("noRecords")} text={t("noRecordsDescription")}/>:items.map(record=><article key={record.id} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:grid-cols-[auto_1fr] sm:p-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mint)] text-[var(--teal)]"><ClipboardList size={20}/></div>
          <div className="grid gap-3">
            <header className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="m-0 text-lg font-semibold text-[var(--text)]">{record.title}</h3><p className="mb-0 mt-1 text-xs text-[var(--muted)]">{dateFormat.format(record.recordedAt)} · {t("authoredBy",{name:record.createdBy.name})}</p></div></header>
            <Detail label={t("diagnosis")} value={record.diagnosis}/>
            <Detail label={t("treatment")} value={record.treatment}/>
            {record.notes&&<Detail label={t("notes")} value={record.notes}/>}
          </div>
        </article>)}
      </section>
    </section>;
  }

  const items=prescriptions??[];
  return <section className="grid gap-6">
    <header className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[linear-gradient(130deg,color-mix(in_srgb,var(--teal)_14%,var(--surface)),var(--surface)_72%)] p-6 sm:p-9">
      <div className="relative z-10 max-w-2xl"><span className="text-xs font-bold tracking-[.15em] text-[var(--teal)]">{t("prescriptionsKicker")}</span><h1 className="mb-2 mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">{t("prescriptionsTitle")}</h1><p className="m-0 text-sm leading-6 text-[var(--muted)]">{t("prescriptionsDescription")}</p></div>
      <ClipboardList className="absolute -bottom-5 right-5 h-32 w-32 text-[var(--teal)] opacity-10 sm:right-12 sm:h-44 sm:w-44"/>
    </header>
    <div className="grid gap-4 sm:grid-cols-2">
      <SummaryCard icon={ClipboardList} label={t("prescriptionCount")} value={items.length}/>
      <SummaryCard icon={ShieldCheck} label={t("privateRecords")} value={t("privateRecordsValue")}/>
    </div>
    <section className="grid gap-4">
      <h2 className="m-0 text-xl font-semibold text-[var(--text)]">{t("prescriptionList")}</h2>
      {items.length===0?<EmptyState title={t("noPrescriptions")} text={t("noPrescriptionsDescription")}/>:items.map(prescription=><article key={prescription.id} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">{t("medication")}</span><h3 className="mb-0 mt-1 text-xl font-semibold text-[var(--text)]">{prescription.medication}</h3></div><span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-medium text-[var(--teal)]">{dateFormat.format(prescription.issuedAt)}</span></header>
        <div className="grid gap-3 sm:grid-cols-3"><Detail label={t("dosage")} value={prescription.dosage}/><Detail label={t("frequency")} value={prescription.frequency}/><Detail label={t("duration")} value={prescription.duration}/></div>
        {prescription.instructions&&<Detail label={t("instructions")} value={prescription.instructions}/>}
        <p className="m-0 text-xs text-[var(--muted)]">{t("authoredBy",{name:prescription.createdBy.name})}</p>
      </article>)}
    </section>
  </section>;
}

function SummaryCard({icon:Icon,label,value}:{icon:LucideIcon;label:string;value:string|number}){
  return <article className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"><span className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]"><Icon size={16} className="text-[var(--teal)]"/>{label}</span><strong className="text-lg font-semibold text-[var(--text)]">{value}</strong></article>;
}

function Detail({label,value}:{label:string;value:string}){
  return <div className="grid gap-1"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span><p className="m-0 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{value}</p></div>;
}

function EmptyState({title,text}:{title:string;text:string}){
  return <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-5 py-12 text-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--mint)] text-[var(--teal)]"><HeartPulse size={22}/></div><h3 className="m-0 text-base font-semibold text-[var(--text)]">{title}</h3><p className="m-0 max-w-md text-sm leading-6 text-[var(--muted)]">{text}</p></div>;
}
