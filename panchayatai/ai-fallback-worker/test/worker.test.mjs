import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import worker from "../src/index.js";
globalThis.crypto=webcrypto;
const pubKeys=await webcrypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const pub=await webcrypto.subtle.exportKey("jwk",pubKeys.publicKey);pub.kid="testkey2026";pub.alg="RS256";pub.use="sig";
const b64=x=>Buffer.from(typeof x==="string"?x:JSON.stringify(x)).toString("base64url");
const now=Math.floor(Date.now()/1000);
const header={alg:"RS256",typ:"JWT",kid:"testkey2026"};
const claims={iss:"https://securetoken.google.com/panchayat-ai-f00d5",aud:"panchayat-ai-f00d5",
  auth_time:now-20,sub:"test-user-123",iat:now-10,exp:now+1800};
const jwtBase=b64(header)+"."+b64(claims);
const signature=await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5",pubKeys.privateKey,new TextEncoder().encode(jwtBase));
const token=jwtBase+"."+Buffer.from(signature).toString("base64url");
const origin="https://techgaon.in";
const url=origin+"/panchayatai/api/ai-fallback";
const payload={action:"draft",system:"Return JSON only.",messages:[{role:"user",content:"एडीओ को पत्र"}]};
let groqStatus=200;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{
  if(String(url).includes("service_accounts/v1/jwk"))
    return new Response(JSON.stringify({keys:[pub]}),{status:200});
  if(String(url).includes("api.groq.com")){
    if(groqStatus!==200)return new Response(JSON.stringify({error:{message:"quota"}}),{status:groqStatus});
    return new Response(JSON.stringify({choices:[{message:{content:'{"subject":"Groq से पत्र"}'}}]}),{status:200});
  }
  throw Error("Unexpected fetch in test");
};
const env={GROQ_API_KEY:"dummy-test-key",GROQ_MODEL:"openai/gpt-oss-20b",
  ENABLE_CF_AI:"false",AI:{run:async()=>({response:'{"subject":"Cloudflare से पत्र"}'})},
  LIMITER:{limit:async()=>({success:true})}};
const req=(body=payload,headers={})=>new Request(url,{method:"POST",
  headers:{"Content-Type":"application/json",Origin:origin,Authorization:"Bearer "+token,...headers},
  body:JSON.stringify(body)});
test("health response never includes API key",async()=>{
  const r=await worker.fetch(new Request(origin+"/panchayatai/api/ai-health"),env);
  const j=await r.json();assert.equal(r.status,200);
  assert.equal(j.configured.groq,true);
  assert.ok(!JSON.stringify(j).includes("dummy-test-key"));
});
test("unauthenticated fallback is denied",async()=>{
  const r=await worker.fetch(req(payload,{Authorization:"Bearer incorrect"}),env);
  assert.equal(r.status,401);
});
test("wrong site origin is denied",async()=>{
  const r=await worker.fetch(req(payload,{Origin:"https://malicious.invalid"}),env);
  assert.equal(r.status,403);
});
test("signed-in account receives Groq response",async()=>{
  groqStatus=200;
  const r=await worker.fetch(req(),env);
  const j=await r.json();assert.equal(r.status,200);
  assert.equal(j.provider,"Groq");
  assert.ok(j.text.includes("Groq से पत्र"));
});
test("Groq quota failure switches to Cloudflare Workers AI",async()=>{
  groqStatus=429;
  const r=await worker.fetch(req(),{...env,ENABLE_CF_AI:"true"});
  const j=await r.json();assert.equal(r.status,200);
  assert.equal(j.provider,"Cloudflare Workers AI");
  assert.ok(j.text.includes("Cloudflare से पत्र"));
});
test("without providers, error is explicit and no pretend response",async()=>{
  const r=await worker.fetch(req(),{...env,GROQ_API_KEY:""});
  assert.equal(r.status,503);
  assert.equal((await r.json()).error.code,"BACKUP_EXHAUSTED");
});
test("protect free tier from bursts",async()=>{
  const r=await worker.fetch(req(),{...env,LIMITER:{limit:async()=>({success:false})}});
  assert.equal(r.status,429);
  assert.equal((await r.json()).error.code,"USER_RATE_LIMIT");
});
test("do not accept arbitrary model or provider override to access keys",async()=>{
  groqStatus=200;
  const r=await worker.fetch(req({...payload,url:"https://malicious.invalid",model:"custom"}),env);
  assert.equal(r.status,200);
  assert.equal((await r.json()).model,"openai/gpt-oss-20b");
});
test.after(()=>{globalThis.fetch=originalFetch});
