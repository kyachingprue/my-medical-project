import {connection} from "next/server";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {requireRole} from "@/lib/auth/authorize";

export default async function AdminProfilePage({params}:{params:Promise<{locale:string}>}){
  await connection();
  const {locale}=await params;
  const user=await requireRole("ADMIN",locale);
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});

  return <AccountProfileEditor
    initialName={user.name}
    email={user.email}
    initialPhone={user.phone??""}
    initialImage={user.image}
    emailVerified={user.emailVerified}
    joined={dateFormat.format(user.createdAt)}
    updated={dateFormat.format(user.updatedAt)}
    role="ADMIN"
  />;
}
