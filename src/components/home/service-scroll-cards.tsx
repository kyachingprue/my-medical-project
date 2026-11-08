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

  return <div className="care-scroll-section" ref={sectionRef}>
    <div className="care-scroll-layout">
      <div className="care-scroll-intro">
        <span className="care-scroll-prompt">{scrollPrompt}<ArrowDown size={16}/></span>
        <p>{progressLabel}</p>
        <div className="care-scroll-progress" aria-hidden="true">
          <span className="care-scroll-progress-track"><span ref={progressRef}/></span>
          <span className="care-scroll-progress-steps">{services.map((_,index)=><i key={index}>{String(index+1).padStart(2,"0")}</i>)}</span>
        </div>
        <Link className="button button-outline" href="/services">{linkLabel}<ArrowRight size={16}/></Link>
      </div>
      <div className="care-scroll-stack">
        {services.map((service,index)=><article className="care-stack-card" key={service.title}>
          <div className="care-stack-card-top">
            <span className="care-stack-icon" aria-hidden="true">{service.icon}</span>
            <span className="care-stack-number">{String(index+1).padStart(2,"0")} <i>/ {String(services.length).padStart(2,"0")}</i></span>
          </div>
          <div className="care-stack-card-copy">
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <Link className="care-stack-link" href="/services" aria-label={`${linkLabel}: ${service.title}`}>
              {linkLabel}<ArrowRight size={16}/>
            </Link>
          </div>
          <span className="care-stack-orbit" aria-hidden="true"/>
        </article>)}
      </div>
    </div>
  </div>;
}
