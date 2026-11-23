const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{test}=require('node:test');
const code=fs.readFileSync('panchayatai/reference-static-client.js','utf8');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(assetBase,corrupt=false){
 const body=Buffer.from('reviewed PDF fixture'),id='1'.repeat(24),block={file:'blocks/'+id+'-1.pdf',first:1,last:1,sha256:hash(body),bytes:body.length};
 const doc={id,title:'Public order',documentType:'go',pageCount:1,availablePages:[1],blocks:[block]};
 if(assetBase!==undefined)doc.assetBase=assetBase;
 const index=Buffer.from(JSON.stringify({schema:1,docs:[doc],pages:[{doc:0,page:1,text:'Public government instruction'}],terms:{}}));
 const indexName='search-'+hash(index).slice(0,16)+'.json';
 const catalog=Buffer.from(JSON.stringify({schema:1,index:indexName,indexSha256:hash(index),documentCount:1,pageCount:1}));
 const calls=[],elements=[];let loadedPDF=0;
 class BrowserURL extends URL{static createObjectURL(){return 'blob:fixture'}static revokeObjectURL(){}}
 const output={copyPages:async()=>[{}],addPage(){},setTitle(){},setSubject(){},save:async()=>new Uint8Array([1,2,3])};
 const window={PAI_CONFIG:{referenceCatalog:'https://techgaon.in/panchayatai/go-corpus/catalog.json'},PAI_REFERENCE_SEARCH:{search:()=>[{id,pages:[1]}]},PDFLib:{PDFDocument:{create:async()=>output,load:async()=>{loadedPDF++;return {}}}}};
 const context={window,location:{href:'https://techgaon.in/panchayatai/'},crypto:crypto.webcrypto,URL:BrowserURL,Blob,TextDecoder,AbortSignal,setTimeout:()=>0,
 document:{createElement:()=>({click(){elements.push(this)},remove(){}}),body:{append(){}}},
 fetch:async(url,options)=>{url=String(url);calls.push({url,options});let bytes;
 if(url.endsWith('/catalog.json'))bytes=catalog;
 else if(url.endsWith('/'+indexName))bytes=index;
 else bytes=corrupt?Buffer.from('corrupt PDF'):body;
 return {ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
 }};
 vm.runInNewContext(code,context);
 return {api:window.PAI_REFERENCES,calls,elements,get loadedPDF(){return loadedPDF},id,block};
}
test('existing documents keep their original server paths',async()=>{
 const f=await fixture();await f.api.download({id:f.id,pages:[1]});
 assert.equal(f.calls.at(-1).url,'https://techgaon.in/panchayatai/go-corpus/'+f.block.file);
 assert.equal(f.loadedPDF,1);assert.equal(f.elements.length,1);
});
test('additional public documents download from the approved PDF host with no credentials',async()=>{
 const f=await fixture('https://techgaon-panchayat-orders.pages.dev/');
 const hits=await f.api.search('public instruction');assert.equal(hits[0].passages[0].text,'Public government instruction');
 await f.api.download(hits[0]);
 assert.equal(f.calls.at(-1).url,'https://techgaon-panchayat-orders.pages.dev/'+f.block.file);
 assert.equal(f.calls.at(-1).options.credentials,'omit');assert.equal(f.loadedPDF,1);
});
test('unexpected asset origins and credentials are rejected before any PDF request',async()=>{
 for(const base of ['https://example.org/','http://techgaon-panchayat-orders.pages.dev/','https://user:secret@techgaon-panchayat-orders.pages.dev/','https://techgaon-panchayat-orders.pages.dev/?token=secret']){
  const f=await fixture(base);await assert.rejects(f.api.load());assert.equal(f.calls.length,2);assert.equal(f.loadedPDF,0);
 }
});
test('corrupted remote PDF bytes fail integrity checks before PDF parsing',async()=>{
 const f=await fixture('https://techgaon-panchayat-orders.pages.dev/',true);
 await assert.rejects(f.api.download({id:f.id,pages:[1]}));assert.equal(f.loadedPDF,0);
});
test('path traversal cannot escape a document block',async()=>{
 const f=await fixture();const data=await f.api.load();
 assert.throws(()=>f.api.assetURL(data.index.docs[0],{file:'../private.pdf'},data));
});
