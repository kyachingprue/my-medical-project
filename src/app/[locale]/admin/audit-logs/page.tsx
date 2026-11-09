import {connection} from "next/server";
import {requireRole} from "@/lib/auth/authorize";
import {prisma} from "@/lib/prisma";

type Props={
  params:Promise<{locale:string}>;
  searchParams:Promise<{q?:string;action?:string;actor?:string;from?:string;to?:string;page?:string}>;
};

export default async function AdminAuditLogsPage({params,searchParams}:Props){
  const {locale}=await params;
  await requireRole("ADMIN",locale);
  await connection();
  const filters=await searchParams;
  const query=filters.q?.trim();
  const action=filters.action?.trim();
  const actor=filters.actor?.trim();
  const start=validDate(filters.from);
  const end=validDate(filters.to);
  if(end)end.setTime(end.getTime()+86_400_000);
  const requestedPage=Number(filters.page??1);
  const page=Number.isInteger(requestedPage)&&requestedPage>0?requestedPage:1;
  const limit=25;
  const where={
    AND:[
      ...(query?[{OR:[
        {action:{contains:query,mode:"insensitive" as const}},
        {entity:{contains:query,mode:"insensitive" as const}},
        {entityId:{contains:query,mode:"insensitive" as const}},
        {actorUid:{contains:query,mode:"insensitive" as const}},
        {actorEmail:{contains:query,mode:"insensitive" as const}},
      ]}]:[]),
      ...(actor?[{OR:[
        {actorUid:{contains:actor,mode:"insensitive" as const}},
        {actorEmail:{contains:actor,mode:"insensitive" as const}},
      ]}]:[]),
      ...(action?[{action:{equals:action,mode:"insensitive" as const}}]:[]),
      ...((start||end)?[{createdAt:{...(start?{gte:start}:{}),...(end?{lt:end}:{})}}]:[]),
    ],
  };
  const [events,total]=await Promise.all([
    prisma.auditLog.findMany({where,skip:(page-1)*limit,take:limit,orderBy:{createdAt:"desc"}}),
    prisma.auditLog.count({where}),
  ]);
  const pages=Math.max(1,Math.ceil(total/limit));
  const previous=new URLSearchParams({q:filters.q??"",action:filters.action??"",actor:filters.actor??"",from:filters.from??"",to:filters.to??"",page:String(Math.max(1,page-1))});
  const next=new URLSearchParams({q:filters.q??"",action:filters.action??"",actor:filters.actor??"",from:filters.from??"",to:filters.to??"",page:String(Math.min(pages,page+1))});

  return <section className="tw-management-page grid gap-[22px] max-w-[length:1180px] m-[0_auto]">
    <header className="tw-management-page-header flex items-end justify-between gap-[20px] [&_h1]:m-[8px_0] [&_h1]:text-[length:clamp(28px,4vw,40px)] [&_h1]:tracking-[-1.6px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mb-[0] [@media(max-width:650px)]:items-start [@media(max-width:650px)]:flex-col"><div><span className="tw-section-kicker text-[length:10px] tracking-[1.55px] font-extrabold [color:var(--teal)] inline-flex items-center gap-[9px] [.tw-cta-section_&]:[color:#b4ded2] [.tw-dashboard-subpage_&]:block [.tw-dashboard-subpage_&]:text-center">Security &amp; compliance</span><h1>Audit logs</h1><p>Review administrative and appointment activity recorded by the server.</p></div></header>
    <form className="tw-management-filters [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] flex gap-[10px] max-w-[length:620px] [&_input]:flex-[1] [&_select]:w-[auto] [@media(max-width:650px)]:[flex-wrap:wrap] [@media(max-width:650px)]:[&_input]:flex-[1_1_100%] [@media(max-width:650px)]:[&_select]:flex-[1]" method="GET">
      <input name="q" defaultValue={filters.q} placeholder="Search action, entity, ID, or actor" aria-label="Search audit logs"/>
      <input name="actor" defaultValue={filters.actor} placeholder="Actor email or UID" aria-label="Filter by actor"/>
      <input name="action" defaultValue={filters.action} placeholder="Action (e.g. CREATE)" aria-label="Filter by action"/>
      <label>From <input type="date" name="from" defaultValue={filters.from}/></label>
      <label>To <input type="date" name="to" defaultValue={filters.to}/></label>
      <button className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" type="submit">Filter</button>
    </form>
    <p className="tw-management-hint m-[0] [color:var(--muted)] text-[length:11px] leading-[1.6]">{total} matching events</p>
    {!events.length?<div className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]"><h2>No audit events found</h2><p>Try changing your search or filters.</p></div>:<div className="tw-management-table-wrap w-[100%] overflow-x-auto"><table className="tw-management-table w-[100%] [border-collapse:collapse] text-left text-[length:12px] [&_th]:p-[12px] [&_th]:[color:var(--muted)] [&_th]:text-[length:10px] [&_th]:tracking-[.8px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_td]:p-[14px_12px] [&_td]:[border-top:1px_solid_var(--line)] [&_td]:align-[middle] [&_td_small]:block [&_td_strong]:block [&_td_small]:mt-[5px] [&_td_small]:[color:var(--muted)] [&_td_small]:text-[length:11px] [&_td_small]:max-w-[length:340px] [&_td_small]:leading-[1.5] [@media(max-width:650px)]:[&_th]:p-[11px_9px] [@media(max-width:650px)]:[&_td]:p-[11px_9px]"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{events.map(event=><tr key={event.id}><td>{new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(event.createdAt)}</td><td>{event.actorEmail}<small>{event.actorUid}</small></td><td>{event.action}</td><td>{event.entity}<small>{event.entityId}</small></td><td>{event.details?<details><summary>View details</summary><pre className="whitespace-pre-wrap [overflow-wrap:anywhere] max-w-[420px]">{JSON.stringify(event.details,null,2)}</pre></details>:"—"}</td></tr>)}</tbody></table></div>}
    <div className="mt-5 flex items-center justify-between"><span>Page {page} of {pages}</span><div className="flex gap-2">{page>1?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?${previous}`}>Previous</a>:null}{page<pages?<a className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href={`?${next}`}>Next</a>:null}</div></div>
  </section>;
}

function validDate(value?:string){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
  const date=new Date(`${value}T00:00:00+06:00`);
  return Number.isFinite(date.getTime())?date:undefined;
}
