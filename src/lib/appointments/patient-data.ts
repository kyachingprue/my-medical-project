export function omitStaffNotes<T extends {staffNotes:string|null}>(appointment:T):Omit<T,"staffNotes">{
  const safe:Omit<T,"staffNotes">&{staffNotes?:T["staffNotes"]}={...appointment};
  delete safe.staffNotes;
  return safe;
}
