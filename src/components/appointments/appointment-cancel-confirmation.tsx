"use client";

import {toast} from "react-hot-toast";

export function confirmAppointmentCancellation(message:string,keepLabel:string,confirmLabel:string){
  return new Promise<boolean>(resolve=>{
    toast.custom(item=><section className="appointment-cancel-toast" role="alertdialog" aria-modal="true" aria-describedby="appointment-cancel-message">
      <p id="appointment-cancel-message">{message}</p>
      <div>
        <button type="button" className="button button-outline" onClick={()=>{toast.dismiss(item.id);resolve(false)}}>{keepLabel}</button>
        <button type="button" className="button button-primary" onClick={()=>{toast.dismiss(item.id);resolve(true)}}>{confirmLabel}</button>
      </div>
    </section>,{duration:Infinity});
  });
}
