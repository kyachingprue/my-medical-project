type LoadingKind="dashboard"|"appointments"|"booking"|"analytics"|"workspace";

export function DashboardLoading({kind="dashboard",label="Loading"}:{kind?:LoadingKind;label?:string}){
  if(kind==="workspace"){
    return <div className="workspace-loading" role="status" aria-label={label}>
      <span className="workspace-loading-mark"><span/></span>
      <div className="workspace-loading-lines"><i/><i/><i/></div>
    </div>;
  }

  return <section className={`page-loading page-loading-${kind}`} role="status" aria-label={label} aria-busy="true">
    <span className="sr-only">{label}</span>
    <div className="page-loading-heading"><i/><i/><i/></div>
    {kind==="booking"?<BookingLoading/>:kind==="analytics"?<AnalyticsLoading/>:kind==="appointments"?<AppointmentsLoading/>:<DashboardContentLoading/>}
  </section>;
}

function DashboardContentLoading(){
  return <>
    <div className="loading-stat-grid">{Array.from({length:4},(_,index)=><div className="loading-stat-card" key={index}><i/><i/><i/></div>)}</div>
    <div className="loading-content-grid"><div className="loading-content-card"><i/><i/><i/><i/></div><div className="loading-content-card"><i/><i/><i/></div></div>
  </>;
}

function AppointmentsLoading(){
  return <>
    <div className="loading-toolbar"><i/><i/><i/></div>
    <div className="loading-appointment-grid">{Array.from({length:4},(_,index)=><div className="loading-appointment-card" key={index}><div><i/><i/></div><i/><i/><i/></div>)}</div>
  </>;
}

function BookingLoading(){
  return <div className="loading-booking-card"><div className="loading-form-grid">{Array.from({length:3},(_,index)=><div key={index}><i/><i/></div>)}</div><div className="loading-slot-grid">{Array.from({length:10},(_,index)=><i key={index}/>)}</div><div className="loading-button"/></div>;
}

function AnalyticsLoading(){
  return <>
    <div className="loading-stat-grid loading-stat-grid-wide">{Array.from({length:8},(_,index)=><div className="loading-stat-card" key={index}><i/><i/><i/></div>)}</div>
    <div className="loading-content-grid loading-chart-grid">{Array.from({length:6},(_,index)=><div className="loading-content-card loading-chart-card" key={index}><i/><i/><i/></div>)}</div>
  </>;
}
