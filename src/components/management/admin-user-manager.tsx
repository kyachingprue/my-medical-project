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
  return <section className="management-stack">
    {error?<p className="management-error" role="alert">{error}</p>:null}
    {!users.length?<div className="management-empty"><h2>No accounts found</h2><p>Accounts will appear here after users register or staff are provisioned.</p></div>:<div className="management-table-wrap"><table className="management-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Email verified</th><th>Role</th><th>Created</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.phone??"—"}</td><td>{user.emailVerified?"Yes":"No"}</td><td><select aria-label={`Role for ${user.email}`} value={user.role} disabled={busyId===user.id||user.id===actorId} onChange={event=>onRoleChange(user.id,event.target.value)}>{roles.map(role=><option value={role.value} key={role.value}>{role.label}</option>)}</select>{user.id===actorId?<small>Your own role cannot be changed here.</small>:null}</td><td>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(user.createdAt)}</td></tr>)}</tbody></table></div>}
  </section>;
}
