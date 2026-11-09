"use client";

import {useRouter} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import {Search} from "lucide-react";

type FilterOption = {value:string;label:string};

export function LiveFilters({
  query,
  category,
  queryPlaceholder,
  queryLabel,
  categoryLabel,
  categories,
}:{
  query:string;
  category:string;
  queryPlaceholder:string;
  queryLabel:string;
  categoryLabel:string;
  categories:FilterOption[];
}) {
  const router=useRouter();
  const [searchValue,setSearchValue]=useState(query);
  const [selectedCategory,setSelectedCategory]=useState(category);
  const previousQuery=useRef(query);
  const previousCategory=useRef(category);
  const submittedQuery=useRef(query);
  const submittedCategory=useRef(category);

  useEffect(()=>{
    if(query===previousQuery.current)return;
    if(searchValue.trim()===previousQuery.current||searchValue===submittedQuery.current)setSearchValue(query);
    previousQuery.current=query;
  },[query,searchValue]);

  useEffect(()=>{
    if(category===previousCategory.current)return;
    if(selectedCategory===previousCategory.current||selectedCategory===submittedCategory.current)setSelectedCategory(category);
    previousCategory.current=category;
  },[category,selectedCategory]);

  const updateFilters=useCallback((nextQuery:string,nextCategory:string)=>{
    const params=new URLSearchParams(window.location.search);
    const normalizedQuery=nextQuery.trim();
    if(normalizedQuery)params.set("q",normalizedQuery);
    else params.delete("q");
    if(nextCategory&&nextCategory!=="all")params.set("status",nextCategory);
    else params.delete("status");
    params.delete("page");
    submittedQuery.current=normalizedQuery;
    submittedCategory.current=nextCategory;
    const search=params.toString();
    router.replace(`${window.location.pathname}${search?`?${search}`:""}`,{scroll:false});
  },[router]);

  useEffect(()=>{
    if(searchValue.trim()===query&&selectedCategory===category)return;
    const timer=window.setTimeout(()=>updateFilters(searchValue,selectedCategory),250);
    return ()=>window.clearTimeout(timer);
  },[searchValue,selectedCategory,query,category,updateFilters]);

  return <form className="tw-management-filters [&_input]:w-[100%] [&_input]:min-h-[42px] [&_input]:p-[10px_12px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-[8px] [&_input]:[background:var(--bg)] [&_input]:[color:var(--text)] [&_input]:[outline:none] [&_select]:w-[100%] [&_select]:min-h-[42px] [&_select]:p-[10px_12px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-[8px] [&_select]:[background:var(--bg)] [&_select]:[color:var(--text)] [&_select]:[outline:none] [&_input:focus]:border-[color:var(--teal)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] [&_select:focus]:border-[color:var(--teal)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--teal)_14%,transparent)] flex gap-[10px] max-w-[length:620px] [&_input]:flex-[1] [&_select]:w-[auto] [@media(max-width:650px)]:[flex-wrap:wrap] [@media(max-width:650px)]:[&_input]:flex-[1_1_100%] [@media(max-width:650px)]:[&_select]:flex-[1]" onSubmit={event=>{event.preventDefault();updateFilters(searchValue,selectedCategory)}}>
    <label className="tw-sr-only absolute w-[1px] h-[1px] p-[0] m-[-1px] overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap [border:0]" htmlFor="management-live-search">{queryLabel}</label>
    <span className="relative flex min-w-0 flex-1 items-center">
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 text-slate-400"/>
      <input id="management-live-search" type="search" value={searchValue} maxLength={100} placeholder={queryPlaceholder} onChange={event=>setSearchValue(event.target.value)} className="pl-9"/>
    </span>
    <label className="tw-sr-only absolute w-[1px] h-[1px] p-[0] m-[-1px] overflow-hidden [clip:rect(0,0,0,0)] whitespace-nowrap [border:0]" htmlFor="management-live-category">{categoryLabel}</label>
    <select id="management-live-category" value={selectedCategory} onChange={event=>{const nextCategory=event.target.value;setSelectedCategory(nextCategory);updateFilters(searchValue,nextCategory)}}>
      {categories.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </form>;
}
