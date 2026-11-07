import {redirect} from "next/navigation";
export default function ReceptionAppointmentNewPage({params}:{params:Promise<{locale:string}>}){
  return params.then(({locale})=>redirect(`/${locale}/receptionist/dashboard/phone-booking`));
}
