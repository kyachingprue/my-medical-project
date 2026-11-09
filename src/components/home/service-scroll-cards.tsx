"use client";

import {ArrowDown,ArrowRight} from "lucide-react";
import {useEffect,useRef} from "react";
import type {ReactNode} from "react";
import {Link} from "@/i18n/navigation";

type ServiceCard={
  title:string;
  description:string;
  icon:ReactNode;
};

type ServiceScrollCardsProps={
  services:ServiceCard[];
  scrollPrompt:string;
  progressLabel:string;
  linkLabel:string;
};

export function ServiceScrollCards({services,scrollPrompt,progressLabel,linkLabel}:ServiceScrollCardsProps){
  const sectionRef=useRef<HTMLDivElement>(null);
  const progressRef=useRef<HTMLSpanElement>(null);

  useEffect(()=>{
    let cancelled=false;
    let cleanup: (()=>void)|undefined;

    void Promise.all([import("gsap"),import("gsap/ScrollTrigger")]).then(([gsapModule,scrollTriggerModule])=>{
      const section=sectionRef.current;
      if(cancelled||!section)return;

      const gsap=gsapModule.gsap;
      gsap.registerPlugin(scrollTriggerModule.ScrollTrigger);

      const stack=section.querySelector<HTMLElement>(".care-scroll-stack");
      const layout=section.querySelector<HTMLElement>(".care-scroll-layout");
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".care-stack-card"));
      if(!stack||!layout||cards.length<2)return;

      const media=gsap.matchMedia(section);
      media.add("(min-width: 861px) and (prefers-reduced-motion: no-preference)",()=>{
        stack.classList.add("is-animated");
        gsap.set(cards,{transformOrigin:"top center"});
        cards.forEach((card,index)=>{
          gsap.set(card,{y:index*17,scale:1-index*.035});
        });

        const timeline=gsap.timeline({
          scrollTrigger:{
            trigger:layout,
            pin:layout,
            start:"top 96px",
            end:()=>`+=${window.innerHeight*(cards.length-1)}`,
            scrub:.65,
            anticipatePin:1,
            invalidateOnRefresh:true,
          },
        });

        cards.slice(0,-1).forEach((card,index)=>{
          timeline.to(card,{
            yPercent:-125,
            rotation:index%2===0?-4:4,
            opacity:0,
            scale:.94,
            ease:"none",
            duration:1,
          },index);
        });

        if(progressRef.current){
          timeline.to(progressRef.current,{scaleY:1,ease:"none",duration:cards.length-1},0);
        }

        return ()=>stack.classList.remove("is-animated");
      });
      cleanup=()=>media.revert();
    }).catch(error=>{
      console.error("Unable to initialize the home page service-card animation.",error);
    });

    return ()=>{
      cancelled=true;
      cleanup?.();
    };
  },[]);

  return <div className="tw-care-scroll-section pt-[8px] [@media(max-width:560px)]:pt-[0]" ref={sectionRef}>
    <div className="tw-care-scroll-layout grid grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] gap-[clamp(36px,6vw,88px)] items-center [@media(max-width:860px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:860px)]:gap-[25px] [@media(max-width:560px)]:gap-[20px]">
      <div className="tw-care-scroll-intro flex flex-col items-start [&>p]:max-w-[length:290px] [&>p]:m-[17px_0_24px] [&>p]:[color:var(--muted)] [&>p]:text-[length:17px] [&>p]:leading-[1.65] [@media(max-width:860px)]:[order:0] [@media(max-width:560px)]:[&>p]:m-[12px_0_15px] [@media(max-width:560px)]:[&>p]:text-[length:14px]">
        <span className="tw-care-scroll-prompt inline-flex items-center gap-[9px] [color:var(--teal)] text-[length:10px] font-extrabold tracking-[1.3px] uppercase">{scrollPrompt}<ArrowDown size={16}/></span>
        <p>{progressLabel}</p>
        <div className="tw-care-scroll-progress flex items-stretch gap-[14px] m-[0_0_26px_4px] [@media(max-width:560px)]:h-[56px] [@media(max-width:560px)]:mb-[18px]" aria-hidden="true">
          <span className="tw-care-scroll-progress-track relative block w-[2px] h-[76px] [background:var(--line)] [&>span]:absolute [&>span]:inset-[0] [&>span]:[background:var(--teal)] [&>span]:[transform:scaleY(0)] [&>span]:[transform-origin:top] [@media(max-width:560px)]:h-[56px]"><span ref={progressRef}/></span>
          <span className="tw-care-scroll-progress-steps flex flex-col justify-between [color:var(--muted)] text-[length:9px] tracking-[.7px] [&_i]:not-italic">{services.map((_,index)=><i key={index}>{String(index+1).padStart(2,"0")}</i>)}</span>
        </div>
        <Link className="tw-button inline-flex justify-center items-center gap-[12px] [border:1px_solid_transparent] rounded-[9px] p-[12px_18px] text-[length:13px] font-bold [transition:transform_.2s,background_.2s,border_.2s] [&:hover]:[transform:translateY(-2px)] [.tw-cta-section_&]:relative [.tw-cta-section_&]:z-[1] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:[color:white] [@media(max-width:760px)]:[.tw-mobile-auth-actions_&]:inline-flex [.tw-management-form_&]:[justify-self:start] [.tw-appointment-cancel-toast_&]:min-h-[42px] [.tw-booking-actions_&]:inline-flex [.tw-booking-actions_&]:items-center [.tw-booking-actions_&]:gap-[7px] [@media(max-width:650px)]:[.tw-booking-actions_&]:justify-center [.tw-appointment-pagination_&]:min-h-[34px] [.tw-appointment-pagination_&]:p-[0_12px] [.tw-appointment-pagination_&:disabled]:opacity-[.5] [.tw-appointment-pagination_&:disabled]:cursor-not-allowed [@media(max-width:650px)]:[.tw-reception-toolbar>&]:flex-[1_1_100%] tw-button-outline border-[color:var(--line)] [color:var(--text)] [&:hover]:border-[color:var(--teal)] [&:hover]:[color:var(--teal)]" href="/services">{linkLabel}<ArrowRight size={16}/></Link>
      </div>
      <div className="tw-care-scroll-stack grid gap-[14px] min-w-[length:0] [@media(max-width:860px)]:[order:1]">
        {services.map((service,index)=><article className="tw-care-stack-card relative [isolation:isolate] flex min-h-[310px] flex-col justify-between overflow-hidden p-[clamp(22px,3vw,34px)] [border:1px_solid_var(--line)] rounded-[24px] [background:var(--surface)] shadow-[var(--shadow)] [&:nth-child(2)]:[background:color-mix(in_srgb,var(--mint)_68%,var(--surface))] [&:nth-child(3)]:[background:color-mix(in_srgb,var(--peach)_48%,var(--surface))] [.tw-care-scroll-stack.tw-is-animated_&]:absolute [.tw-care-scroll-stack.tw-is-animated_&]:inset-[0] [.tw-care-scroll-stack.tw-is-animated_&]:min-h-[0] [.tw-care-scroll-stack.tw-is-animated_&:nth-child(1)]:z-[3] [.tw-care-scroll-stack.tw-is-animated_&:nth-child(2)]:z-[2] [.tw-care-scroll-stack.tw-is-animated_&:nth-child(3)]:z-[1] [@media(max-width:860px)]:min-h-[260px] [@media(max-width:560px)]:min-h-[235px] [@media(max-width:560px)]:p-[22px] [@media(max-width:560px)]:rounded-[20px]" key={service.title}>
          <div className="tw-care-stack-card-top relative z-[1] flex items-center justify-between">
            <span className="tw-care-stack-icon grid w-[54px] h-[54px] [place-items:center] [border:1px_solid_color-mix(in_srgb,var(--teal)_12%,transparent)] rounded-[17px] [background:color-mix(in_srgb,var(--surface)_72%,transparent)] [color:var(--teal)] [@media(max-width:560px)]:w-[46px] [@media(max-width:560px)]:h-[46px] [@media(max-width:560px)]:rounded-[14px]" aria-hidden="true">{service.icon}</span>
            <span className="tw-care-stack-number [color:var(--teal)] text-[length:12px] font-extrabold tracking-[.5px] [&_i]:[color:var(--muted)] [&_i]:text-[length:10px] [&_i]:not-italic [&_i]:font-semibold">{String(index+1).padStart(2,"0")} <i>/ {String(services.length).padStart(2,"0")}</i></span>
          </div>
          <div className="tw-care-stack-card-copy relative z-[1] max-w-[length:410px] [&_h3]:m-[0_0_11px] [&_h3]:text-[length:clamp(27px,3.2vw,40px)] [&_h3]:[font-weight:650] [&_h3]:tracking-[-1.7px] [&_h3]:leading-[1.12] [&_p]:max-w-[length:380px] [&_p]:m-[0_0_18px] [&_p]:[color:var(--muted)] [&_p]:text-[length:13px] [&_p]:leading-[1.75] [@media(max-width:560px)]:[&_h3]:text-[length:27px]">
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <Link className="tw-care-stack-link inline-flex items-center gap-[9px] [color:var(--teal)] text-[length:11px] font-extrabold [&_svg]:[transition:transform_.2s] [&:hover_svg]:[transform:translateX(4px)]" href="/services" aria-label={`${linkLabel}: ${service.title}`}>
              {linkLabel}<ArrowRight size={16}/>
            </Link>
          </div>
          <span className="tw-care-stack-orbit absolute z-[0] right-[-84px] bottom-[-174px] w-[300px] h-[300px] [border:1px_solid_color-mix(in_srgb,var(--teal)_15%,transparent)] rounded-[50%] shadow-[0_0_0_28px_color-mix(in_srgb,var(--teal)_4%,transparent),0_0_0_58px_color-mix(in_srgb,var(--teal)_3%,transparent)] [pointer-events:none]" aria-hidden="true"/>
        </article>)}
      </div>
    </div>
  </div>;
}
