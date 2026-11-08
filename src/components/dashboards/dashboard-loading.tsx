type LoadingKind="dashboard"|"appointments"|"booking"|"analytics"|"workspace";

const shimmer="block animate-pulse rounded-lg bg-[var(--line)] motion-reduce:animate-none";
const card="rounded-[13px] border border-[var(--line)] bg-[var(--surface)] p-[17px]";

export function DashboardLoading({kind="dashboard",label="Loading"}:{kind?:LoadingKind;label?:string}){
  if(kind==="workspace"){
    return <div className="grid min-h-[70vh] place-content-center justify-items-center gap-[17px] bg-[var(--bg)]" role="status" aria-label={label} aria-busy="true">
      <span className="grid size-[52px] place-items-center rounded-[17px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_26px_color-mix(in_srgb,var(--teal)_10%,transparent)]">
        <span className="size-[17px] animate-pulse rounded-full bg-[var(--teal)] shadow-[0_0_0_7px_color-mix(in_srgb,var(--teal)_12%,transparent)] motion-reduce:animate-none"/>
      </span>
      <div className="grid justify-items-center gap-[7px]" aria-hidden="true">
        <i className={`${shimmer} h-[7px] w-[104px]`}/>
        <i className={`${shimmer} h-[7px] w-[70px] opacity-70`}/>
        <i className={`${shimmer} h-[7px] w-[42px] opacity-45`}/>
      </div>
    </div>;
  }

  return <section className="grid w-full min-w-0 gap-[18px]" role="status" aria-label={label} aria-busy="true">
    <span className="sr-only">{label}</span>
    <div className="mb-[3px] grid gap-[10px]" aria-hidden="true">
      <i className={`${shimmer} h-[7px] w-[108px] opacity-70`}/>
      <i className={`${shimmer} h-[25px] w-[min(310px,75%)]`}/>
      <i className={`${shimmer} h-[8px] w-[min(440px,92%)] opacity-65`}/>
    </div>
    {kind==="booking"?<BookingLoading/>:kind==="analytics"?<AnalyticsLoading/>:kind==="appointments"?<AppointmentsLoading/>:<DashboardContentLoading/>}
  </section>;
}

function DashboardContentLoading(){
  return <>
    <div className="grid grid-cols-4 gap-[13px] max-[760px]:grid-cols-2" aria-hidden="true">
      {Array.from({length:4},(_,index)=><div className={`${card} grid min-h-[122px] content-between gap-[18px]`} key={index}>
        <i className={`${shimmer} h-[8px] w-[64%]`}/>
        <i className={`${shimmer} h-6 w-[42%]`}/>
        <i className={`${shimmer} h-[7px] w-[53%] opacity-65`}/>
      </div>)}
    </div>
    <div className="grid grid-cols-2 gap-[14px] max-[760px]:grid-cols-1" aria-hidden="true">
      {[4,3].map((count,index)=><div className={`${card} grid min-h-[205px] content-start gap-[17px]`} key={index}>
        {Array.from({length:count},(_,line)=><i className={`${shimmer} ${line===0?"mb-2 h-3 w-[48%]":line===1?"w-[90%]":line===2?"w-[76%]":"w-[58%]"}`} key={line}/>)}
      </div>)}
    </div>
  </>;
}

function AppointmentsLoading(){
  return <>
    <div className="my-[2px] flex gap-[10px]" aria-hidden="true">
      <i className={`${shimmer} h-[38px] w-[125px] border border-[var(--line)]`}/>
      <i className={`${shimmer} h-[38px] w-[125px] border border-[var(--line)]`}/>
      <i className={`${shimmer} ml-auto h-[38px] w-[min(250px,45%)] border border-[var(--line)] max-[760px]:hidden`}/>
    </div>
    <div className="grid grid-cols-2 gap-[13px] max-[760px]:grid-cols-1" aria-hidden="true">
      {Array.from({length:4},(_,index)=><div className={`${card} grid min-h-[192px] content-start gap-[15px]`} key={index}>
        <div className="flex justify-between gap-[14px]"><i className={`${shimmer} h-5 w-[38%]`}/><i className={`${shimmer} h-2 w-[34%]`}/></div>
        <i className={`${shimmer} h-[9px] w-[74%]`}/>
        <i className={`${shimmer} h-[9px] w-[74%]`}/>
        <i className={`${shimmer} h-2 w-[48%] opacity-65`}/>
      </div>)}
    </div>
  </>;
}

function BookingLoading(){
  return <div className={`${card} grid gap-[23px] p-[clamp(18px,4vw,30px)]`} aria-hidden="true">
    <div className="grid grid-cols-3 gap-[14px] max-[760px]:grid-cols-1">
      {Array.from({length:3},(_,index)=><div className="grid gap-[9px]" key={index}><i className={`${shimmer} h-2 w-[46%]`}/><i className={`${shimmer} h-10 border border-[var(--line)]`}/></div>)}
    </div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(95px,1fr))] gap-[9px]">
      {Array.from({length:10},(_,index)=><i className={`${shimmer} h-[39px] border border-[var(--line)]`} key={index}/>)}
    </div>
    <i className={`${shimmer} ml-auto h-10 w-[155px]`}/>
  </div>;
}

function AnalyticsLoading(){
  return <>
    <div className="grid grid-cols-4 gap-[13px] max-[760px]:grid-cols-2" aria-hidden="true">
      {Array.from({length:8},(_,index)=><div className={`${card} grid min-h-[122px] content-between gap-[18px]`} key={index}>
        <i className={`${shimmer} h-[8px] w-[64%]`}/>
        <i className={`${shimmer} h-6 w-[42%]`}/>
        <i className={`${shimmer} h-[7px] w-[53%] opacity-65`}/>
      </div>)}
    </div>
    <div className="grid grid-cols-2 gap-[14px] max-[760px]:grid-cols-1" aria-hidden="true">
      {Array.from({length:6},(_,index)=><div className={`${card} relative grid min-h-[270px] content-start gap-[17px] max-[760px]:min-h-[220px]`} key={index}>
        <i className={`${shimmer} h-3 w-[56%]`}/>
        <i className={`${shimmer} mt-[27px] h-px w-[80%] opacity-75`}/>
        <i className={`${shimmer} mt-[27px] h-px w-[80%] opacity-75`}/>
      </div>)}
    </div>
  </>;
}
