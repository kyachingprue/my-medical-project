import {notFound} from "next/navigation";
import {AccountProfileEditor} from "@/components/auth/account-profile-editor";
import {requireRole} from "@/lib/auth/authorize";

export default async function DoctorDashboardSection({params}:{params:Promise<{locale:string;section:string[]}>}){
  const {locale,section}=await params;
  const user=await requireRole("DOCTOR",locale);
  if(section.length!==1||section[0]!=="profile")notFound();
  const dateFormat=new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{timeZone:"Asia/Dhaka",dateStyle:"medium"});
  return <AccountProfileEditor initialName={user.name} email={user.email} initialPhone={user.phone??""} initialImage={user.image} emailVerified={user.emailVerified} joined={dateFormat.format(user.createdAt)} updated={dateFormat.format(user.updatedAt)} role="DOCTOR"/>;
}
