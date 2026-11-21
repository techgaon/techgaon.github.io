/* Panchayat AI connection check — user-initiated, no keys/tokens shown. */
(() => {
 "use strict";
 document.addEventListener("click",async event=>{
   const btn=event.target.closest?.("[data-ai-health]");
   if(!btn||btn.disabled)return;
   const root=btn.closest(".pai-writing-form")||btn.closest("#view")||document;
   const panel=root.querySelector(".pai-ai-status");
   if(!panel)return;
   btn.disabled=true;panel.hidden=false;
   panel.textContent="Firebase App Check और Gemini AI कनेक्शन जाँचा जा रहा है…";
   try{
     if(!window.PAI_AI?.diagnose)
       throw Object.assign(new Error("AI मॉड्यूल पूरी तरह लोड नहीं हुआ।"),{code:"AI_MODULE_NOT_LOADED"});
     const state=await window.PAI_AI.diagnose();
     const info="Firebase Project: "+state.project+" | Model: "+state.model;
     if(state.ai&&state.appCheck){
       panel.textContent="✓ AI सेवा चालू है। App Check मान्य है और Gemini से उत्तर मिला।\n"+info;
     }else{
       const e=state.error||{};
       panel.textContent="⚠️ "+(e.title||"AI जाँच विफल")+" ["+(e.code||"AI_UNKNOWN")+
         (e.status?", HTTP "+e.status:"")+"]\n"+
         (e.message||"सेवा से संपर्क नहीं बना")+"\n"+
         (e.action||"")+"\n"+info+
         (e.technical?"\nसंक्षिप्त विवरण: "+e.technical:"");
     }
   }catch(error){
     const detail=window.PAI_AI_ERRORS?.explain(error,"diagnostic");
     panel.textContent="⚠️ "+(detail?.message||"AI जाँच अभी उपलब्ध नहीं है।")+
       " ["+(detail?.code||"AI_MODULE_NOT_LOADED")+"]";
   }finally{btn.disabled=false;}
 });
})();
