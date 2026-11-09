"use client";

import {Toaster} from "react-hot-toast";

export function AppToaster(){
  return <Toaster
    position="top-center"
    gutter={8}
    toastOptions={{
      duration:4000,
      success:{duration:4000},
      error:{duration:5000},
      style:{
        background:"var(--surface)",
        color:"var(--text)",
        border:"1px solid var(--line)",
        borderRadius:"10px",
      },
    }}
  />;
}
