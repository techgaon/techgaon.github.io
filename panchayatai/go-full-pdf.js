/* Full original GO pages with navigable header and highlighted search references.
   Indexed originals are not rewritten; layout adds separate header/footer margins. */
(()=>{
"use strict";
const TOP=78, BOTTOM=34, MAX_BYTES=85*1024*1024;
const objectUrls=new Set();
const escape=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(emit,text){if(typeof emit==="function")emit(text);}
function canvasPng(text,variant="regular"){
 const canvas=document.createElement("canvas");canvas.width=1400;canvas.height=138;
 const ctx=canvas.getContext("2d"),important=variant==="main";
 ctx.fillStyle=important?"#fff0a5":"#f4f8fe";ctx.fillRect(0,0,1400,138);
 ctx.strokeStyle=important?"#e0ad22":"#b9d1e9";ctx.lineWidth=3;ctx.strokeRect(2,2,1396,134);
 ctx.fillStyle="#17416d";ctx.font='bold 48px "Noto Sans Devanagari","Nirmala UI",sans-serif';
 ctx.textBaseline="middle";ctx.fillText(text,38,67,1320);
 const data=canvas.toDataURL("image/png").split(",")[1];
 return Uint8Array.from(atob(data),c=>c.charCodeAt(0));
}
async function loadPdf(){
 const lib=window.PDFLib||await import("./vendor/pdflib.js");
 if(!lib?.PDFDocument)throw Error("PDF बनाने की सुविधा उपलब्ध नहीं है।");
 return lib;
}
async function verify(url,sha){
 const response=await fetch(url,{credentials:"omit",signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error("मूल PDF का एक भाग उपलब्ध नहीं है।");
 const data=await response.arrayBuffer();
 if(data.byteLength>25*1024*1024)throw Error("मूल PDF भाग अनुमत आकार से बड़ा है।");
 if(/^[a-f0-9]{64}$/.test(sha||"")){
  const bytes=await crypto.subtle.digest("SHA-256",data);
  const hex=[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,"0")).join("");
  if(hex!==sha)throw Error("मूल PDF भाग की SHA-256 जाँच असफल हुई।");
 }
 return data;
}
function addGoTo(output,page,target,lib,y){
 // Internal PDF destination: works offline in compatible PDF readers.
 const annot=output.context.obj({
  Type:lib.PDFName.of("Annot"),Subtype:lib.PDFName.of("Link"),
  Rect:[16,y,page.getWidth()-16,y+TOP-12],Border:[0,0,0],
  Dest:[target.ref,lib.PDFName.of("Fit")]
 });
 page.node.addAnnot(output.context.register(annot));
}
function termsFor(query){
 if(window.PAI_REFERENCE_SEARCH?.tokens)
  return window.PAI_REFERENCE_SEARCH.tokens(query).filter(x=>x.length>=3).slice(0,8);
 return String(query||"").split(/\s+/).filter(x=>x.length>=3).slice(0,8);
}
async function nativeHighlights(blockBytes,localIndex,original,outputPage,query,lib){
 const terms=termsFor(query);if(!terms.length)return 0;
 try{
  const pdfjs=await import("./vendor/pdf.js");
  pdfjs.GlobalWorkerOptions.workerSrc=new URL("./vendor/pdf.worker.min.mjs",document.baseURI).href;
  const task=pdfjs.getDocument({data:new Uint8Array(blockBytes.slice(0))});
  try{
   const p=await task.promise.then(d=>d.getPage(localIndex+1));
   if(p.rotate%360!==0)return 0;
   const content=await p.getTextContent(),matches=[];
   for(const item of content.items||[]){
    const raw=String(item.str||"").normalize("NFKC").toLowerCase();
    if(!raw||!terms.some(t=>raw.includes(t.toLowerCase())))continue;
    const t=item.transform||[],x=t[4],y=t[5],w=item.width||0,h=Math.max(8,item.height||10);
    if(![x,y,w,h].every(Number.isFinite)||w<2||x<0||y<0||x+w>original.width+2)continue;
    matches.push({x,y,w,h});if(matches.length>=10)break;
   }
   for(const m of matches)outputPage.drawRectangle({x:m.x,y:m.y+BOTTOM-2,width:m.w,height:m.h+4,
    color:lib.rgb(1,.82,.03),opacity:.32,borderOpacity:0});
   return matches.length;
  }finally{await task.destroy().catch(()=>{});}
 }catch(e){console.warn("Native text highlight skipped; page navigation retained",e);return 0;}
}
async function create(hit,query=hit?.query||"",onStatus=()=>{}){
 if(!hit?.id)throw Error("पहले शासनादेश चुनें।");
 const data=await window.PAI_REFERENCES.load();
 const doc=data?.index?.docs?.find(d=>d.id===hit.id);
 if(!doc)throw Error("यह शासनादेश सत्यापित दस्तावेज संग्रह में नहीं है।");
 const available=[...new Set(doc.availablePages||[])].filter(Number.isInteger).sort((a,b)=>a-b);
 if(!available.length)throw Error("शासनादेश के पृष्ठ उपलब्ध नहीं हैं।");
 const total=Number(doc.pageCount||doc.pagesCount||0);
 const incomplete=total>0&&available.length<total;
 const lib=await loadPdf(),output=await lib.PDFDocument.create();
 output.setTitle(String(doc.title||"Panchayat AI – Government Order").slice(0,240));
 output.setSubject("Original document pages with a separate Panchayat AI navigation header and footer");
 const relevant=[...new Set(hit.pages||[])].filter(p=>available.includes(p));
 const targetPage=relevant[0]||available[0],relevantSet=new Set(relevant);
 const banner=await output.embedPng(canvasPng("मुख्य content पर जाने के लिए यहाँ क्लिक करें"));
 const markedBanner=await output.embedPng(canvasPng("मुख्य content पर जाने के लिए यहाँ क्लिक करें","main"));
 const entries=[],sourceCache=new Map(),pagesByBlock=new Map();
 for(const pageNo of available){
  const block=(doc.blocks||[]).find(b=>pageNo>=b.first&&pageNo<=b.last);
  if(!block||!/^blocks\/[a-f0-9]{24}-[1-9]\d*\.pdf$/.test(block.file)||!/^[a-f0-9]{64}$/.test(block.sha256))
   throw Error("मूल दस्तावेज का पृष्ठ "+pageNo+" संग्रह में उपलब्ध नहीं है।");
  if(!pagesByBlock.has(block.file))pagesByBlock.set(block.file,{block,pages:[]});
  pagesByBlock.get(block.file).pages.push(pageNo);
 }
 let processed=0;
 for(const {block,pages} of pagesByBlock.values()){
  status(onStatus,"मूल GO के पृष्ठ तैयार हो रहे हैं: "+processed+"/"+available.length);
  const bytes=await verify(new URL(block.file,data.url),block.sha256);
  sourceCache.set(block.file,bytes);
  const offsets=pages.map(p=>p-block.first),embeds=await output.embedPdf(bytes,offsets);
  for(let i=0;i<pages.length;i++){
   const pageNo=pages[i],original=embeds[i];
   const width=original.width,height=original.height;
   if(!(width>100&&height>100))throw Error("पृष्ठ का आकार अमान्य है।");
   const page=output.addPage([width,height+TOP+BOTTOM]);
   page.drawPage(original,{x:0,y:BOTTOM,width,height});
   page.drawImage(relevantSet.has(pageNo)?markedBanner:banner,{x:15,y:height+BOTTOM+12,width:width-30,height:TOP-24});
   page.drawLine({start:{x:15,y:BOTTOM-4},end:{x:width-15,y:BOTTOM-4},color:lib.rgb(.75,.81,.88),thickness:1});
   const regular=await output.embedFont(lib.StandardFonts.Helvetica);
   page.drawText("Panchayat AI | Original GO | Page "+pageNo+" of "+(total||available.length),{
    x:20,y:12,size:9,font:regular,color:lib.rgb(.3,.38,.48)});
   if(relevantSet.has(pageNo)){
    page.drawRectangle({x:3,y:BOTTOM,width:8,height,color:lib.rgb(1,.77,.05)});
    await nativeHighlights(bytes,offsets[i],original,page,query,lib);
   }
   entries.push({page,pageNo});processed++;
  }
 }
 const ordered=new Map(entries.map(e=>[e.pageNo,e]));
 const sorted=available.map(p=>ordered.get(p));
 // Each original page stays visually intact and receives a separate navigation margin.
 const target=ordered.get(targetPage)?.page;
 if(!target)throw Error("मुख्य पृष्ठ उपलब्ध नहीं है।");
 for(const {page} of entries)addGoTo(output,page,target,lib,page.getHeight()-TOP);
 if(incomplete)output.setKeywords(["Indexed GO: some original pages are missing; check source archive"]);
 status(onStatus,"PDF तैयार है — "+available.length+" पृष्ठ");
 const bytes=await output.save({useObjectStreams:true});
 if(bytes.byteLength>MAX_BYTES)throw Error("यह GO मोबाइल पर तैयार करने के लिए बहुत बड़ा है। छोटे भागों में डाउनलोड करें।");
 return {blob:new Blob([bytes],{type:"application/pdf"}),count:available.length,total:total||available.length,
  incomplete,highlighted:relevant.length,targetPage};
}
function show(blob,meta,hit){
 const url=URL.createObjectURL(blob);objectUrls.add(url);
 const dialog=document.createElement("dialog");dialog.className="pai-full-go-dialog";
 const name=String(hit.title||"Government Order").slice(0,180);
 dialog.innerHTML='<div class="pai-full-go-modal"><header><strong>'+escape(name)+'</strong><button class="btn alt" type="button" data-close>बंद करें</button></header>'+
  '<p class="hint">मूल GO के '+meta.count+' पृष्ठ'+(meta.incomplete?' · मूल संग्रह में कुछ पृष्ठ उपलब्ध नहीं हैं':'')+
  ' · पीले संकेत वाले पृष्ठ मुख्य परिणाम हैं। ऊपर दिया लिंक PDF के भीतर उन पृष्ठों पर पहुँचाता है।</p>'+
  '<div class="pai-full-go-actions"><a class="btn" download="PanchayatAI-Full-GO.pdf" href="'+url+'">Download Pdf</a>'+
  '<a class="btn alt" href="'+url+'" target="_blank" rel="noopener noreferrer">View Pdf</a></div>'+
  '<iframe title="GO PDF Preview" src="'+url+'#page='+Math.max(1,meta.targetPage)+'"></iframe></div>';
 document.body.append(dialog);
 const close=()=>{dialog.close();dialog.remove();objectUrls.delete(url);setTimeout(()=>URL.revokeObjectURL(url),120000);};
 dialog.querySelector("[data-close]").onclick=close;
 dialog.addEventListener("cancel",e=>{e.preventDefault();close();});
 dialog.showModal();
 return url;
}
async function open(hit,query,onStatus){const meta=await create(hit,query,onStatus);show(meta.blob,meta,hit);return meta;}
window.PAI_FULL_GO={create,open};
})();
