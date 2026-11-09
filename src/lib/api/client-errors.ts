export type SafeApiErrorMessages={
  permissionError:string;
  serverError:string;
  validationError:string;
  fallback:string;
  slotUnavailable?:string;
};

export function getSafeApiErrorMessage(status:number,code:string|undefined,messages:SafeApiErrorMessages){
  if(code==="SLOT_UNAVAILABLE"&&messages.slotUnavailable)return messages.slotUnavailable;
  if(status===401||status===403)return messages.permissionError;
  if(status===400||status===422)return messages.validationError;
  if(status>=500)return messages.serverError;
  return messages.fallback;
}
