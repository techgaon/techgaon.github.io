const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const root='panchayatai/go-corpus',base='https://raw.githubusercontent.com/techgaon/techgaon.github.io/panchayat-go-pdfs/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function download(url,sha){let last;for(let n=0;n<6;n++){try{const r=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'Cache-Control':'no-cache'}});assert(r.ok,'HTTP '+r.status);assert.equal(r.headers.get('access-control-allow-origin'),'*');const b=Buffer.from(await r.arrayBuffer());assert(b.length<25*1024*1024);assert.equal(hash(b),sha);return b;}catch(e){last=e;if(n<5)await sleep(5000);}}throw last;}
async function main(){
 const pin=JSON.parse(fs.readFileSync('.github/scripts/panchayat-go-batch10-pin.json'));
 const cat=JSON.parse(fs.readFileSync(root+'/catalog.json'));assert(cat.documentCount>=pin.baseDocuments&&cat.pageCount>=pin.basePages,'Catalog is older than the reviewed baseline');
 const bytes=fs.readFileSync(root+'/'+cat.index);assert.equal(hash(bytes),cat.indexSha256);const index=JSON.parse(bytes),addBytes=fs.readFileSync('reviewed-batch10/'+pin.index);assert.equal(hash(addBytes),pin.sha256);const add=JSON.parse(addBytes);
 assert.equal(add.docs.length,pin.documents);assert.equal(add.pages.length,pin.pages);
 const ids=new Set(index.docs.map(d=>d.id)),seen=new Set(index.pages.map(p=>p.visualHash).filter(Boolean)),types=new Set(['act','rules','go','dm_order','cdo_order','dpro_order','ddo_order','bdo_order']);let blocks=0;
 const offset=index.docs.length;
 for(const d of add.docs){
  assert(/^[a-f0-9]{24}$/.test(d.id));assert(!ids.has(d.id));ids.add(d.id);assert(types.has(d.documentType));const exported=[];
  for(const b of d.blocks){assert(new RegExp('^blocks/'+d.id+'-[1-9][0-9]*\\.pdf$').test(b.file));assert(/^[a-f0-9]{64}$/.test(b.sha256));const body=await download(base+b.file,b.sha256);assert.equal(body.length,b.bytes);assert(body.subarray(0,5).equals(Buffer.from('%PDF-')));for(let n=b.first;n<=b.last;n++)exported.push(n);blocks++;}
  assert.deepEqual(exported,d.availablePages);d.assetBase=base;
 }
 for(const p of add.pages){assert(Number.isInteger(p.doc)&&p.doc>=0&&p.doc<add.docs.length);assert(add.docs[p.doc].availablePages.includes(p.page));assert(p.text.trim().length>=30);assert(/^[a-f0-9]{64}$/.test(p.visualHash));assert(!seen.has(p.visualHash));seen.add(p.visualHash);p.doc+=offset;}
 index.docs.push(...add.docs);index.pages.push(...add.pages);const core=require(path.resolve('panchayatai/reference-search.js'));index.terms=Object.create(null);
 for(let i=0;i<index.pages.length;i++){const p=index.pages[i],d=index.docs[p.doc];for(const t of core.tokens(p.text+' '+d.title+' '+(d.officialNumber||''),Infinity))(index.terms[t]??=[]).push(i);}
 for(const d of add.docs)assert(core.search(index,d.title).some(h=>h.id===d.id));

 const data=Buffer.from(JSON.stringify(index));assert(data.length<24*1024*1024);const sha=hash(data),name='search-'+sha.slice(0,16)+'.json';fs.writeFileSync(root+'/'+name,data);
 for(const n of fs.readdirSync(root))if(/^search-[a-f0-9]{16}\.json$/.test(n)&&n!==name&&n!==cat.index)fs.unlinkSync(root+'/'+n);
 Object.assign(cat,{version:sha.slice(0,16),index:name,indexSha256:sha,documentCount:index.docs.length,pageCount:index.pages.length,incompleteArchive:true,supplementReviewedOn:'2026-11-24'});fs.writeFileSync(root+'/catalog.json',JSON.stringify(cat));
 const size=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>{if(e.name==='.git'||e.name==='reviewed-batch10'||e.name==='panchayat-reviewed-batch10.zip')return n;const p=path.join(dir,e.name);return n+(e.isDirectory()?size(p):fs.statSync(p).size);},0);const siteBytes=size('.');assert(siteBytes<950*1024*1024);
 console.log(JSON.stringify({documents:index.docs.length,pages:index.pages.length,newDocuments:add.docs.length,newPages:add.pages.length,verifiedRemoteBlocks:blocks,version:cat.version,siteBytes}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
