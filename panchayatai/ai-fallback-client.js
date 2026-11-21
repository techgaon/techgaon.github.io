/* Client for secured Groq/Cloudflare free-provider Worker.
   Gemini stays primary. Never embed GROQ_API_KEY in this file or app. */
(() => {
 "use strict";
 const ENDPOINT="/panchayatai/api/ai-fallback";
 const HEALTH="/panchayatai/api/ai-health";
 const NO_DEPLOY="AI_BACKUP_NOT_DEPLOYED";
 const enabled=()=>window.PAI_CONFIG?.aiFallback?.enabled===true;
 let healthCache={at:0,data:null};
 const fail=(code,message)=>Object.assign(new Error(message),{code});
 async function health(force=false){
   if(!enabled())return {ready:false,code:"AI_BACKUP_DISABLED"};
   if(!force&&Date.now()-healthCache.at<60000&&healthCache.data)return healthCache.data;
   const control=new AbortController();
   const timer=setTimeout(()=>control.abort(),6500);
   let outcome;
   try{
     const url=new URL(HEALTH,location.origin);
     if(url.origin!==location.origin)throw fail("AI_BACKUP_CONFIG","अमान्य Fallback URL");
     const r=await fetch(url.toString(),{cache:"no-store",signal:control.signal,redirect:"error"});
     if(!r.ok||!/application\/json/i.test(r.headers.get("content-type")||""))
       throw fail(NO_DEPLOY,"Groq बैकअप सर्वर अभी Deploy नहीं हुआ है।");
     const j=await r.json();
     if(j?.status!=="online"||!j.configured||typeof j.configured.groq!=="boolean")
       throw fail(NO_DEPLOY,"Groq बैकअप सर्वर का सही जवाब नहीं मिला।");
     outcome={ready:!!(j.configured.groq||j.configured.cloudflare),providers:j.configured,
       code:j.configured.groq||j.configured.cloudflare?"AI_BACKUP_READY":"AI_BACKUP_NOT_CONFIGURED"};
   }catch(e){
     outcome={ready:false,code:e.code||NO_DEPLOY,
       message:e.code===NO_DEPLOY?e.message:"Groq बैकअप सर्वर अभी उपलब्ध नहीं है।"};
   }finally{clearTimeout(timer)}
   healthCache={at:Date.now(),data:outcome};
   return outcome;
 }
 async function complete({action,system,messages,attachments=[]}={}){
   const state=await health();
   if(!state.ready)throw fail(state.code||NO_DEPLOY,state.message||"Free AI Fallback सेटअप अधूरा है।");
   const current=window.firebase?.auth?.().currentUser;
   if(!current)throw fail("AI_BACKUP_LOGIN","Free AI बैकअप इस्तेमाल करने के लिए Google Login आवश्यक है।");
   if(attachments.some(a=>a?.data&&!a?.text))
     throw fail("AI_BACKUP_TEXT_ONLY","Groq/Cloudflare Free मॉडल अभी PDF या फोटो की जाँच नहीं कर सकते। ऐसे दस्तावेज़ के लिए Gemini आवश्यक है।");
   const items=Array.isArray(messages)?messages.map(m=>({
     role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,10000)
   })):[];
   if(attachments.length){
     const text=attachments.filter(a=>a.text).slice(0,3).map(a=>
       "\n[संलग्न दस्तावेज़: "+String(a.name||"Word") +"]\n"+String(a.text).slice(0,5500)).join("\n");
     if(text&&items.length)items[items.length-1].content+=text;
   }
   const token=await current.getIdToken();
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),55000);
   try{
     const res=await fetch(ENDPOINT,{method:"POST",cache:"no-store",redirect:"error",
       headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
       body:JSON.stringify({action,system,messages:items}),signal:ctrl.signal});
     let j={};try{j=await res.json()}catch{}
     if(!res.ok){
       const code=/^[A-Z0-9_]{3,60}$/.test(String(j.error?.code||""))?j.error.code:"AI_BACKUP_HTTP_"+res.status;
       throw fail(code,code==="BACKUP_EXHAUSTED"?"Groq और Cloudflare की Free AI सीमा या सेवा अभी उपलब्ध नहीं है।":
         "Groq/Cloudflare AI बैकअप से जवाब नहीं मिला। ["+code+"]");
     }
     if(typeof j.text!=="string"||!j.text.trim()||!["Groq","Cloudflare Workers AI"].includes(j.provider))
       throw fail("AI_BACKUP_INVALID_RESPONSE","बैकअप AI से मान्य उत्तर नहीं आया।");
     return {raw:j.text,provider:j.provider,model:j.model||"",fallback:true};
   }finally{clearTimeout(timeout)}
 }
 window.PAI_FREE_FALLBACK={health,complete,enabled};
})();