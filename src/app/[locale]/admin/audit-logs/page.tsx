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

  return <section className="management-page">
    <header className="management-page-header"><div><span className="section-kicker">Security &amp; compliance</span><h1>Audit logs</h1><p>Review administrative and appointment activity recorded by the server.</p></div></header>
    <form className="management-filters" method="GET">
      <input name="q" defaultValue={filters.q} placeholder="Search action, entity, ID, or actor" aria-label="Search audit logs"/>
      <input name="actor" defaultValue={filters.actor} placeholder="Actor email or UID" aria-label="Filter by actor"/>
      <input name="action" defaultValue={filters.action} placeholder="Action (e.g. CREATE)" aria-label="Filter by action"/>
      <label>From <input type="date" name="from" defaultValue={filters.from}/></label>
      <label>To <input type="date" name="to" defaultValue={filters.to}/></label>
      <button className="button button-outline" type="submit">Filter</button>
    </form>
    <p className="management-hint">{total} matching events</p>
    {!events.length?<div className="management-empty"><h2>No audit events found</h2><p>Try changing your search or filters.</p></div>:<div className="management-table-wrap"><table className="management-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{events.map(event=><tr key={event.id}><td>{new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(event.createdAt)}</td><td>{event.actorEmail}<small>{event.actorUid}</small></td><td>{event.action}</td><td>{event.entity}<small>{event.entityId}</small></td><td>{event.details?<details><summary>View details</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxWidth:420}}>{JSON.stringify(event.details,null,2)}</pre></details>:"—"}</td></tr>)}</tbody></table></div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20}}><span>Page {page} of {pages}</span><div style={{display:"flex",gap:8}}>{page>1?<a className="button button-outline" href={`?${previous}`}>Previous</a>:null}{page<pages?<a className="button button-outline" href={`?${next}`}>Next</a>:null}</div></div>
  </section>;
}

function validDate(value?:string){
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return undefined;
  const date=new Date(`${value}T00:00:00+06:00`);
  return Number.isFinite(date.getTime())?date:undefined;
}
