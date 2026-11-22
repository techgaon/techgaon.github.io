/* Panchayat AI secure free-provider fallback
   Gemini is primary in the browser. This Worker only calls:
   Groq GPT-OSS-20B -> Cloudflare Workers AI (text).
   Secrets stay on the Worker, never in the publicly hosted app.
 */
const JWKS_URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const PROJECT="panchayat-ai-f00d5";
const ORIGIN="https://techgaon.in";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":ORIGIN,"Vary":"Origin"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const fail=(code,status=503)=>reply({error:{code,message:code==="BACKUP_EXHAUSTED"?"Groq और Cloudflare दोनों की Free AI सेवाएँ अभी अनुपलब्ध हैं।":"AI बैकअप सेवा उपलब्ध नहीं है।"}},status);
const parsePart=(p)=>JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(p.length/4)*4,"=")));
const decodeBytes=p=>Uint8Array.from(atob(p.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(p.length/4)*4,"=")),c=>c.charCodeAt(0));
let cachedKeys=null,keysFetched=0;
async function verifyFirebase(token){
  if(!token||token.length>7500||token.split(".").length!==3)throw Error("UNAUTHENTICATED");
  const [a,b,c]=token.split(".");
  let h,p;try{h=parsePart(a);p=parsePart(b)}catch{throw Error("UNAUTHENTICATED")}
  const now=Math.floor(Date.now()/1000);
  if(h.alg!=="RS256"||!h.kid||p.aud!==PROJECT||p.iss!=="https://securetoken.google.com/"+PROJECT||
     !p.sub||typeof p.sub!=="string"||p.sub.length>128||
     typeof p.exp!=="number"||p.exp<=now||typeof p.iat!=="number"||p.iat>now+60)
    throw Error("UNAUTHENTICATED");
  if(!cachedKeys||Date.now()-keysFetched>3600e3){
    const r=await fetch(JWKS_URL,{signal:AbortSignal.timeout(8500)});
    if(!r.ok)throw Error("AUTH_PROVIDER_UNAVAILABLE");
    const j=await r.json();if(!Array.isArray(j.keys))throw Error("AUTH_PROVIDER_UNAVAILABLE");
    cachedKeys=j.keys;keysFetched=Date.now();
  }
  let jwk=cachedKeys.find(k=>k.kid===h.kid);
  if(!jwk){
    cachedKeys=null;
    const r=await fetch(JWKS_URL,{signal:AbortSignal.timeout(8500)});
    if(!r.ok)throw Error("AUTH_PROVIDER_UNAVAILABLE");
    cachedKeys=(await r.json()).keys||[];keysFetched=Date.now();
    jwk=cachedKeys.find(k=>k.kid===h.kid);
  }
  if(!jwk)throw Error("UNAUTHENTICATED");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decodeBytes(c),new TextEncoder().encode(a+"."+b));
  if(!ok)throw Error("UNAUTHENTICATED");
  return p.sub;
}
function validateInput(body){
  if(!body||typeof body!=="object"||!["chat","draft","hindi"].includes(body.action)||
    typeof body.system!=="string"||body.system.length>18000||
    !Array.isArray(body.messages)||body.messages.length<1||body.messages.length>12)
    throw Error("BAD_REQUEST");
  const messages=body.messages.map(m=>{
    if(!m||!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>12000)
      throw Error("BAD_REQUEST");
    return {role:m.role,content:m.content};
  });
  const size=messages.reduce((n,m)=>n+m.content.length,body.system.length);
  if(size>32000)throw Error("REQUEST_TOO_LARGE");
  // Never accept caller-selected provider URL or API key.
  return {action:body.action,system:body.system,messages};
}
async function groq(body,env){
  if(!env.GROQ_API_KEY)throw Error("GROQ_NOT_CONFIGURED");
  const req={
    model:env.GROQ_MODEL||"openai/gpt-oss-20b",
    messages:[{role:"system",content:body.system},...body.messages],
    temperature:0.2,max_completion_tokens:1800,
    response_format:{type:"json_object"}
  };
  const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+env.GROQ_API_KEY},
    body:JSON.stringify(req),signal:AbortSignal.timeout(24000)
  });
  if(!r.ok)throw Error("GROQ_HTTP_"+r.status);
  const j=await r.json();
  const text=j.choices?.[0]?.message?.content;
  if(typeof text!=="string"||!text.trim())throw Error("GROQ_EMPTY");
  return {text,provider:"Groq",model:req.model};
}
async function cloudflareAI(body,env){
  if(env.ENABLE_CF_AI!=="true"||!env.AI)throw Error("CLOUDFLARE_DISABLED");
  const model=env.CF_MODEL||"@cf/meta/llama-3.1-8b-instruct-fp8-fast";
  const messages=[{role:"system",content:body.system},...body.messages];
  const j=await env.AI.run(model,{messages,max_tokens:3072,temperature:0.2,response_format:{type:"json_object"}});
  let text=j?.response||j?.result?.response||j?.choices?.[0]?.message?.content;
  if(text&&typeof text==="object"&&!Array.isArray(text))text=JSON.stringify(text);
  if(typeof text!=="string"||!text.trim())throw Error("CLOUDFLARE_EMPTY");
  return {text,provider:"Cloudflare Workers AI",model};
}
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(!url.pathname.startsWith("/panchayatai/api/"))return fail("NOT_FOUND",404);
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{...headers,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization, Content-Type"}});
    const origin=req.headers.get("Origin");
    if(origin&&origin!==ORIGIN)return fail("INVALID_ORIGIN",403);
    if(url.pathname==="/panchayatai/api/ai-health"&&req.method==="GET")
      return reply({status:"online",configured:{
        groq:!!env.GROQ_API_KEY,cloudflare:env.ENABLE_CF_AI==="true"&&!!env.AI
      }});
    if(url.pathname!=="/panchayatai/api/ai-fallback"||req.method!=="POST")return fail("NOT_FOUND",404);
    if(Number(req.headers.get("Content-Length")||0)>48000)return fail("REQUEST_TOO_LARGE",413);
    let uid;
    try{
      const auth=req.headers.get("Authorization")||"";
      uid=await verifyFirebase(auth.startsWith("Bearer ")?auth.slice(7):"");
    }catch(e){return fail(e.message==="AUTH_PROVIDER_UNAVAILABLE"?"AUTH_PROVIDER_UNAVAILABLE":"UNAUTHENTICATED",401);}
    if(env.LIMITER){
      try{
        const result=await env.LIMITER.limit({key:uid});
        if(!result.success)return fail("USER_RATE_LIMIT",429);
      }catch{return fail("RATE_LIMITER_UNAVAILABLE",503);}
    }
    let input;
    try{input=validateInput(await req.json())}
    catch{return fail("BAD_REQUEST",400)}
    const order=[["Groq",groq],["Cloudflare Workers AI",cloudflareAI]];
    for(const [provider,fn] of order){
      try{
        const result=await fn(input,env);
        const parsed=JSON.parse(result.text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,""));
        if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("INVALID_PROVIDER_JSON");
        return reply({...result,text:JSON.stringify(parsed)});
      }
      catch(e){/* Never log letters, identifiers, tokens, or the provider response. */ }
    }
    return fail("BACKUP_EXHAUSTED",503);
  }
};

