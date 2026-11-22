const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../../ai-fallback-client.js'),'utf8');
const host='https://panchayat-ai-fallback.surajbhanpandey853.workers.dev';
function make({endpoint=host+'/panchayatai/api/ai-fallback',online=true}={}){
  const sent=[];
  const context={URL,AbortController,Error,setTimeout,clearTimeout,location:{origin:'https://techgaon.in'},
    window:{PAI_CONFIG:{aiFallback:{enabled:true,endpoint}},firebase:{auth:()=>({currentUser:{getIdToken:async()=> 'test-id-token'}})}},
    fetch:async(url,options={})=>{
      sent.push({url,options});
      if(options.method==='POST')return {ok:true,json:async()=>({text:'{"answer":"ok"}',provider:'Cloudflare Workers AI'})};
      return {ok:true,headers:{get:()=>online?'application/json':'text/html'},json:async()=>({status:'online',configured:{groq:false,cloudflare:true}})};
    }};
  vm.runInNewContext(code,context);return {api:context.window.PAI_FREE_FALLBACK,sent};
}
const payload={action:'draft',system:'Return JSON',messages:[{role:'user',content:'test draft'}]};
test('dedicated backup host receives an authenticated request',async()=>{
  const {api,sent}=make();const r=await api.complete(payload);
  assert.equal(r.provider,'Cloudflare Workers AI');assert.equal(sent.length,2);
  assert.equal(sent[1].url,host+'/panchayatai/api/ai-fallback');
  assert.equal(sent[1].options.headers.Authorization,'Bearer test-id-token');
  assert.equal(sent[1].options.redirect,'error');assert.equal(sent[1].options.credentials,'omit');
});
test('unapproved hosts never receive login tokens or network requests',async()=>{
  for(const endpoint of ['https://attacker.invalid/panchayatai/api/ai-fallback',host+'/wrong',host+'/panchayatai/api/ai-fallback?secret=1']){
    const {api,sent}=make({endpoint});await assert.rejects(()=>api.complete(payload));assert.equal(sent.length,0);
  }
});
test('an HTML hosting fallback is not treated as an online AI service',async()=>{
  const {api,sent}=make({online:false});await assert.rejects(()=>api.complete(payload));assert.equal(sent.length,1);
});
test('binary attachments are never silently sent to text-only backups',async()=>{
  const {api,sent}=make();await assert.rejects(()=>api.complete({...payload,attachments:[{data:'test-image',mime:'image/png'}]}));
  assert.equal(sent.filter(r=>r.options.method==='POST').length,0);
});
