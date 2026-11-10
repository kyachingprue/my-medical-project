export function PublicDirectoryLoading({label}:{label:string}){
  return <section className="tw-content-page mx-auto grid max-w-[1184px] gap-6 p-[50px_24px_75px] max-[760px]:p-[24px_17px_55px]" role="status" aria-label={label} aria-busy="true">
    <div className="grid justify-items-center gap-4 py-10" aria-hidden="true">
      <span className="h-2 w-24 animate-pulse rounded bg-[var(--line)]"/>
      <span className="h-10 w-72 max-w-full animate-pulse rounded bg-[var(--line)]"/>
      <span className="h-3 w-[min(570px,90%)] animate-pulse rounded bg-[var(--line)]"/>
    </div>
    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[18px] max-[900px]:grid-cols-2 max-[650px]:grid-cols-1" aria-hidden="true">
      {Array.from({length:6},(_,index)=><div className="overflow-hidden rounded-[15px] border border-[var(--line)] bg-[var(--surface)]" key={index}>
        <div className="h-[220px] animate-pulse bg-[var(--mint)]"/>
        <div className="grid gap-3 p-[18px]">
          <span className="h-4 w-2/3 animate-pulse rounded bg-[var(--line)]"/>
          <span className="h-3 w-full animate-pulse rounded bg-[var(--line)]"/>
          <span className="h-3 w-4/5 animate-pulse rounded bg-[var(--line)]"/>
        </div>
      </div>)}
    </div>
  </section>;
}
