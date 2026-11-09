"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

type UserRole="PATIENT"|"RECEPTIONIST"|"ADMIN";
export type AdminUser={id:string;name:string;email:string;phone:string|null;role:UserRole;emailVerified:boolean;createdAt:Date};
const roles:{value:UserRole;label:string}[]=[
  {value:"PATIENT",label:"Patient"},
  {value:"RECEPTIONIST",label:"Receptionist"},
  {value:"ADMIN",label:"Admin"},
];

export function AdminUserManager({users,actorId}:{users:AdminUser[];actorId:string}){
  const router=useRouter();
  const [error,setError]=useState("");
  const [busyId,setBusyId]=useState("");
  async function changeRole(id:string,role:UserRole){
    setError("");
    setBusyId(id);
    try{
      const response=await fetch(`/api/admin/users/${id}/role`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});
      const result=await response.json() as {error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??"Could not update the role.");
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not update the role.")}
    finally{setBusyId("")}
  }
  function onRoleChange(id:string,value:string){
    const role=roles.find(option=>option.value===value)?.value;
    if(role)void changeRole(id,role);
  }
  return <section className="tw-management-stack grid gap-[18px]">
    {error?<p className="tw-management-error m-[0] [color:#b43e37] text-[length:12px]" role="alert">{error}</p>:null}
    {!users.length?<div className="tw-management-empty p-[38px_24px] text-center [border:1px_dashed_var(--line)] rounded-[14px] [background:var(--surface)] [&_h2]:mb-[7px] [&_h2]:text-[length:17px] [&_p]:m-[0] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px]"><h2>No accounts found</h2><p>Accounts will appear here after users register or staff are provisioned.</p></div>:<div className="tw-management-table-wrap w-[100%] overflow-x-auto"><table className="tw-management-table w-[100%] [border-collapse:collapse] text-left text-[length:12px] [&_th]:p-[12px] [&_th]:[color:var(--muted)] [&_th]:text-[length:10px] [&_th]:tracking-[.8px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_td]:p-[14px_12px] [&_td]:[border-top:1px_solid_var(--line)] [&_td]:align-[middle] [&_td_small]:block [&_td_strong]:block [&_td_small]:mt-[5px] [&_td_small]:[color:var(--muted)] [&_td_small]:text-[length:11px] [&_td_small]:max-w-[length:340px] [&_td_small]:leading-[1.5] [@media(max-width:650px)]:[&_th]:p-[11px_9px] [@media(max-width:650px)]:[&_td]:p-[11px_9px]"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Email verified</th><th>Role</th><th>Created</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.phone??"—"}</td><td>{user.emailVerified?"Yes":"No"}</td><td><select aria-label={`Role for ${user.email}`} value={user.role} disabled={busyId===user.id||user.id===actorId} onChange={event=>onRoleChange(user.id,event.target.value)}>{roles.map(role=><option value={role.value} key={role.value}>{role.label}</option>)}</select>{user.id===actorId?<small>Your own role cannot be changed here.</small>:null}</td><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(user.createdAt)}</td></tr>)}</tbody></table></div>}
  </section>;
}
