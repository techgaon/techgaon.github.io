const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../../ai.js'),'utf8');
const helper=code.slice(code.indexOf('async function withFreeFallback('),code.indexOf('\nconst parts ='));
function build(backup){const ctx={window:{PAI_FREE_FALLBACK:{enabled:()=>true,complete:backup}},Error};vm.runInNewContext(helper+';this.run=withFreeFallback;',ctx);return ctx.run;}
test('a successful Gemini request never spends backup quota',async()=>{
  let backupCalls=0;const run=build(async()=>{backupCalls++;});
  const out=await run('chat','system',[],[],async()=>({response:{text:()=>'{"answer":"ok"}'}}));
  assert.equal(out.provider,'Gemini');assert.equal(backupCalls,0);
});
test('Gemini quota error reaches the authenticated backup client',async()=>{
  let calls=0;const run=build(async b=>{calls++;assert.equal(b.action,'draft');return {raw:'{"subject":"ok"}',provider:'Groq',fallback:true};});
  const out=await run('draft','system',[{role:'user',content:'sample'}],[],async()=>{throw Error('429 quota exceeded');});
  assert.equal(calls,1);assert.equal(out.provider,'Groq');assert.equal(out.fallback,true);
});
test('all-provider failure remains an explicit error, never a fake letter',async()=>{
  const run=build(async()=>{throw Object.assign(Error('backup unavailable'),{code:'BACKUP_EXHAUSTED'});});
  await assert.rejects(()=>run('draft','system',[],[],async()=>{throw Error('quota');}),e=>e.code==='BACKUP_EXHAUSTED'&&e.cause.message==='quota');
});
