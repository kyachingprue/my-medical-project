"use client";

import {useSyncExternalStore} from "react";

export type AdminView="day"|"week"|"month";
export type AdminDensity="comfortable"|"compact";
export type AdminRefresh=0|30|60;
export type AdminPreferences={view:AdminView;density:AdminDensity;refresh:AdminRefresh};

const storageKeys={
  view:"admin:appointment-view",
  density:"admin:table-density",
  refresh:"admin:auto-refresh",
} as const;
const defaults:AdminPreferences={view:"day",density:"comfortable",refresh:0};
let snapshot=defaults;
const listeners=new Set<()=>void>();

function readStoredPreferences():AdminPreferences{
  try{
    const view=window.localStorage.getItem(storageKeys.view);
    const density=window.localStorage.getItem(storageKeys.density);
    const refresh=Number(window.localStorage.getItem(storageKeys.refresh));
    return {
      view:view==="day"||view==="week"||view==="month"?view:defaults.view,
      density:density==="compact"||density==="comfortable"?density:defaults.density,
      refresh:refresh===30||refresh===60?refresh:defaults.refresh,
    };
  }catch(error){
    console.error("Could not read dashboard preferences:",error);
    return defaults;
  }
}

function updateSnapshot(next:AdminPreferences){
  if(next.view===snapshot.view&&next.density===snapshot.density&&next.refresh===snapshot.refresh)return;
  snapshot=next;
  listeners.forEach(listener=>listener());
}

function onStorageChange(event:StorageEvent){
  if(event.key===null||event.key===storageKeys.view||event.key===storageKeys.density||event.key===storageKeys.refresh){
    updateSnapshot(readStoredPreferences());
  }
}

function subscribe(listener:()=>void){
  listeners.add(listener);
  if(listeners.size===1)window.addEventListener("storage",onStorageChange);
  updateSnapshot(readStoredPreferences());
  return ()=>{
    listeners.delete(listener);
    if(listeners.size===0)window.removeEventListener("storage",onStorageChange);
  };
}

function getSnapshot(){
  return snapshot;
}

function getServerSnapshot(){
  return defaults;
}

export function useAdminPreferences(){
  return useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
}

export function setAdminPreference<Key extends keyof AdminPreferences>(key:Key,value:AdminPreferences[Key]){
  const storageKey=key==="view"?storageKeys.view:key==="density"?storageKeys.density:storageKeys.refresh;
  try{
    window.localStorage.setItem(storageKey,String(value));
  }catch(error){
    console.error("Could not save dashboard preference:",error);
    throw new Error("Could not save this preference.");
  }
  updateSnapshot({...snapshot,[key]:value});
}
