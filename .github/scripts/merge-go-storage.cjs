const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),path=require('path');
const root='panchayatai/go-corpus',host='https://techgaon-panchayat-orders.pages.dev/';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function download(url,sha){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(r.ok,'HTTP '+r.status+' '+url);assert.equal(r.headers.get('access-control-allow-origin'),'*','PDF host must allow app downloads');const b=Buffer.from(await r.arrayBuffer());assert(b.length<25*1024*1024);if(sha)assert.equal(hash(b),sha);return b;}
async function main(){
 const supplement=JSON.parse(fs.readFileSync('.github/scripts/panchayat-go-batch2-pin.json'));
 const catalog=JSON.parse(fs.readFileSync(root+'/catalog.json'));
 assert.equal(catalog.version,supplement.baseVersion,'Corpus changed; review and regenerate merge before publishing');
 const bytes=fs.readFileSync(root+'/'+catalog.index);assert.equal(hash(bytes),catalog.indexSha256);
 const index=JSON.parse(bytes);
 const add=JSON.parse(await download(host+supplement.index,supplement.sha256));
 assert.equal(add.docs.length,supplement.documents);assert.equal(add.pages.length,supplement.pages);
 assert(index.docs.length===309&&index.pages.length===2641);
 const ids=new Set(index.docs.map(d=>d.id)),oldDocs=index.docs.length;
 const allowed=new Set(['act','rules','go','dm_order','cdo_order','dpro_order','ddo_order','bdo_order']);
 let blocks=0;
 for(const d of add.docs){
  assert(/^[a-f0-9]{24}$/.test(d.id));assert(!ids.has(d.id),'Duplicate source');ids.add(d.id);assert(allowed.has(d.documentType));
  assert(d.availablePages.length>0);const exported=[];
  for(const b of d.blocks){
   assert(new RegExp('^blocks/'+d.id+'-[1-9][0-9]*\\.pdf$').test(b.file));assert(/^[a-f0-9]{64}$/.test(b.sha256));
   const body=await download(host+b.file,b.sha256);assert.equal(body.length,b.bytes);
   for(let n=b.first;n<=b.last;n++)exported.push(n);blocks++;
  }
  assert.deepEqual(exported,d.availablePages);d.assetBase=host;
 }
 const seen=new Set(index.pages.map(p=>p.visualHash).filter(Boolean));
 for(const p of add.pages){assert(Number.isInteger(p.doc)&&p.doc>=0&&p.doc<add.docs.length);assert(add.docs[p.doc].availablePages.includes(p.page));assert(p.text.trim().length>=30);assert(/^[a-f0-9]{64}$/.test(p.visualHash));assert(!seen.has(p.visualHash),'Duplicate visual page');seen.add(p.visualHash);p.doc+=oldDocs;}
 index.docs.push(...add.docs);index.pages.push(...add.pages);
 const core=require(path.resolve('panchayatai/reference-search.js'));index.terms=Object.create(null);
 for(let i=0;i<index.pages.length;i++){const p=index.pages[i],d=index.docs[p.doc];for(const t of core.tokens(p.text+' '+d.title+' '+(d.officialNumber||''),Infinity))(index.terms[t]??=[]).push(i);}
 assert(core.search(index,'???? ???????? ?????????').length>0);assert(core.search(index,'RRC ?????? ??? ???????').some(h=>add.docs.some(d=>d.id===h.id)));
 const out=Buffer.from(JSON.stringify(index));assert(out.length<24*1024*1024);
 const sha=hash(out),name='search-'+sha.slice(0,16)+'.json';fs.writeFileSync(root+'/'+name,out);
 // Retain the currently published index for clients already reading that catalog.
 for(const file of fs.readdirSync(root))if(/^search-[a-f0-9]{16}\.json$/.test(file)&&file!==name&&file!==catalog.index)fs.unlinkSync(root+'/'+file);
 Object.assign(catalog,{version:sha.slice(0,16),index:name,indexSha256:sha,documentCount:index.docs.length,pageCount:index.pages.length,incompleteArchive:true,supplementReviewedOn:'2026-11-23',additionalPdfHost:host});
 fs.writeFileSync(root+'/catalog.json',JSON.stringify(catalog));
 const size=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>{if(e.name==='.git')return n;const p=path.join(dir,e.name);return n+(e.isDirectory()?size(p):fs.statSync(p).size);},0);
 const siteBytes=size('.');assert(siteBytes<950*1024*1024,'Hosting size limit: '+siteBytes);
 console.log(JSON.stringify({documents:index.docs.length,pages:index.pages.length,newDocuments:add.docs.length,newPages:add.pages.length,verifiedRemoteBlocks:blocks,version:catalog.version,siteBytes}));
}
main().catch(e=>{console.error(e);process.exitCode=1});