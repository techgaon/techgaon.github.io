import {DatabaseSync} from 'node:sqlite';import {strict as assert} from 'node:assert';import worker from './d1-worker.mjs';
const sql=new DatabaseSync(':memory:');
function convert(v){return v instanceof ArrayBuffer?Buffer.from(v):v;}
const db={async exec(s){sql.exec(s);},prepare(s){return {args:[],bind(...args){this.args=args.map(convert);return this;},async first(){return sql.prepare(s).get(...this.args)||null;},async all(){return {results:sql.prepare(s).all(...this.args).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Uint8Array?Array.from(v):v])))};},async run(){const r=sql.prepare(s).run(...this.args);return {meta:{changes:Number(r.changes)}};}};},async batch(qs){sql.exec('BEGIN');try{const rs=[];for(const q of qs)rs.push(await q.run());sql.exec('COMMIT');return rs;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const env={DB:db};let token='';
async function op(action,payload={}){const r=await worker.fetch(new Request('https://sangh.test/op',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'CF-Connecting-IP':'127.0.0.1'},body:JSON.stringify({action,payload})}),env);return {status:r.status,body:await r.json()};}
let r=await worker.fetch(new Request('https://sangh.test/public'),env);assert.equal(r.status,200);assert.equal((await r.json()).memberCount,0);
let login=await op('login',{role:'gpa',mobile:'9129203268',code:'1234'});assert.equal(login.status,200);token=login.body.token;
const content=new Uint8Array([137,80,78,71,1,2,3]);const upload=await worker.fetch(new Request('https://sangh.test/file',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png','X-File-Name':'proof.png'},body:content}),env);assert.equal(upload.status,200);const file=(await upload.json()).id;
let saved=await op('payment',{fund:'2026-apr',file});assert.equal(saved.status,200);assert.equal(saved.body.payments[0].status,'submitted');
const image=await worker.fetch(new Request('https://sangh.test/file/'+file,{headers:{Authorization:'Bearer '+token}}),env);assert.equal(image.status,200);assert.deepEqual(new Uint8Array(await image.arrayBuffer()),content);
const denied=await worker.fetch(new Request('https://sangh.test/file/'+file),env);assert.equal(denied.status,400);
login=await op('login',{role:'district',mobile:'9415213754',code:'1234',district:'BARABANKI'});token=login.body.token;
const read=await op('read');const payment=read.body.payments[0];assert.equal(payment.file,file);assert.equal((await op('verify',{id:payment.id,status:'verified'})).status,200);
const rows=Array.from({length:1200},(_,i)=>({name:'Member '+i,parent:'Parent',gender:'पुरुष',mobile:String(8000000000+i),first:'MEMBER'}));const imported=await op('members',{district:'BARABANKI',rows});assert.equal(imported.status,200);assert.equal(imported.body.members.length,1201);assert(sql.prepare('SELECT COUNT(*) AS n FROM sangh_chunks').get().n>1);
assert.equal((await op('read')).body.members.length,1201);assert.equal((await op('logout')).status,200);assert.equal((await op('read')).status,400);
console.log('Passed: real SQLite schema, persistent sessions, file upload/download privacy, payment review, 1,200-member chunked persistence and logout.');
