/* Panchayat AI — genuine A4 OOXML .docx generator (browser docx UMD). */
(() => {
 "use strict";
 const FONT="Noto Sans Devanagari";
 let activeHalfPoints=24;
 const text=n=>String(n?.textContent||"").replace(/\u00a0/g," ");
 function runs(node,d,format={}){
   if(node.nodeType===3){
     const t=node.nodeValue?.replace(/\u00a0/g," ")||"";
     return t?[new d.TextRun({text:t,bold:!!format.bold,italics:!!format.italic,
       underline:format.underline?{}:undefined,font:FONT,size:format.size||activeHalfPoints})]:[];
   }
   if(node.nodeType!==1)return [];
   const tag=node.tagName.toLowerCase();
   if(tag==="br")return [new d.TextRun({break:1})];
   if(["script","style","button"].includes(tag))return [];
   const f={bold:format.bold||["b","strong"].includes(tag)||node.style.fontWeight==="bold"||
     Number(node.style.fontWeight)>=600,italic:format.italic||["i","em"].includes(tag)||
     node.style.fontStyle==="italic",underline:format.underline||tag==="u"||
     node.style.textDecoration.includes("underline"),size:format.size||activeHalfPoints};
   if(/^h[1-6]$/.test(tag))f.size=tag==="h1"?30:tag==="h2"?27:24;
   return Array.from(node.childNodes).flatMap(c=>runs(c,d,f));
 }
 function alignment(n,d){
   const a=(n.style?.textAlign||n.getAttribute?.("align")||"").toLowerCase();
   return a==="center"?d.AlignmentType.CENTER:a==="right"||a==="end"?d.AlignmentType.RIGHT:
     a==="justify"?d.AlignmentType.JUSTIFIED:d.AlignmentType.LEFT;
 }
 function paragraph(n,d){
   const children=runs(n,d);
   const tag=n.tagName?.toLowerCase()||"",heading=/^h[1-6]$/.test(tag);
   const isOffice=n.closest?.('[data-pai-office-header="1"]');
   const isSignature=n.closest?.('table[data-pai-signature="1"]');
   return new d.Paragraph({children:children.length?children:[new d.TextRun({text:""})],
     alignment:alignment(n,d),spacing:{after:isOffice?50:isSignature?80:110,line:Math.round(activeHalfPoints*15)},
     widowControl:true,keepLines:heading||Boolean(isSignature),keepNext:heading});
 }
 function elements(n,d){
   if(n.nodeType===3){
     const s=n.nodeValue?.trim();return s?[new d.Paragraph({children:[new d.TextRun({text:s,font:FONT,size:activeHalfPoints})]})]:[];
   }
   if(n.nodeType!==1)return [];
   const tag=n.tagName.toLowerCase();
   if(tag==="img"){
     const src=n.getAttribute("src")||"";
     if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)||src.length>200000)return [];
     try{
       const raw=atob(src.slice("data:image/jpeg;base64,".length));
       const data=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
       const originalWidth=Number(n.dataset.paiWidth)||1000;
       const originalHeight=Number(n.dataset.paiHeight)||Math.round(originalWidth*.33);
       const width=575,height=Math.max(38,Math.min(310,Math.round(width*originalHeight/originalWidth)));
       return [new d.Paragraph({children:[new d.ImageRun({data,type:"jpg",transformation:{width,height}})],
         alignment:d.AlignmentType.CENTER,spacing:{after:130}})];
     }catch(error){console.warn("Unable to include uploaded letterhead",error);return [];}
   }
   if(["p","h1","h2","h3","h4"].includes(tag))return [paragraph(n,d)];
   if(tag==="ul"||tag==="ol")return Array.from(n.children).filter(c=>c.tagName==="LI").map((li,i)=>
     new d.Paragraph({children:[new d.TextRun({text:tag==="ol"?(i+1)+". ":"• ",font:FONT,size:activeHalfPoints}),...runs(li,d)],
       indent:{left:400,hanging:220},spacing:{after:105,line:330}}));
   if(tag==="table"){
     const signature=n.getAttribute('data-pai-signature')==='1';
     const border={style:signature?d.BorderStyle.NONE:d.BorderStyle.SINGLE,size:signature?0:4,color:signature?'FFFFFF':'CCCCCC'};
     const rows=Array.from(n.querySelectorAll("tr")).slice(0,150).map(tr=>
       new d.TableRow({cantSplit:true,children:Array.from(tr.children).filter(c=>/^(TD|TH)$/.test(c.tagName)).map(cell=>
         new d.TableCell({children:[paragraph(cell,d)],width:{size:50,type:d.WidthType.PERCENTAGE},
           borders:{top:border,bottom:border,left:border,right:border},
           margins:{top:80,bottom:80,left:signature?0:110,right:signature?0:110}}))}));
     return rows.length?[new d.Table({rows,width:{size:100,type:d.WidthType.PERCENTAGE},
       borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border}})]:[];
   }
   if(tag==="hr")return [new d.Paragraph({border:{bottom:{color:"B0BED3",size:4,space:1}}})];
   if(["div","section","header","article"].includes(tag)){
     const list=Array.from(n.childNodes).flatMap(ch=>elements(ch,d));
     if(n.getAttribute('data-pai-office-header')==='1'&&list.length)
       list.push(new d.Paragraph({border:{bottom:{color:"4B6179",size:6,space:5}},spacing:{after:160}}));
     return list.length?list:(text(n).trim()?[paragraph(n,d)]:[]);
   }
   return text(n).trim()?[paragraph(n,d)]:[];
 }
 async function loadDocx(){
   if(window.docx?.Document)return window.docx;
   const sources=[
     "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.umd.cjs",
     "https://unpkg.com/docx@9.5.1/dist/index.umd.cjs"
   ];
   for(const source of sources){
     try{
       await new Promise((resolve,reject)=>{
         const script=document.createElement("script");
         script.src=source;script.async=true;
         script.onload=resolve;script.onerror=()=>reject(new Error("DOCX CDN unreachable"));
         document.head.appendChild(script);
       });
       if(window.docx?.Document)return window.docx;
     }catch(e){console.warn("DOCX library source failed",source,e);}
   }
   throw Error("DOCX लाइब्रेरी लोड नहीं हुई। Internet जाँचकर फिर कोशिश करें।");
 }
 async function createBlob(paper,filename,onProgress=()=>{}){
   onProgress(10);
   const d=await loadDocx();
   onProgress(30);
   if(!d?.Document||!d?.Packer||!d?.Paragraph)
     throw Error("DOCX लाइब्रेरी नहीं मिली। Internet जाँचें और पेज Reload करें।");
   if(!paper?.textContent?.trim())throw Error("पहले पत्र तैयार करें।");
   const selected=Number(paper.dataset.docSize || 12);
   activeHalfPoints=Number.isFinite(selected)?Math.round(Math.min(16,Math.max(10,selected))*2):24;
   // Decode the already locally-compressed uploaded letterhead so Word keeps
   // its correct aspect ratio rather than stretching it.
   for(const img of paper.querySelectorAll("img.pai-lh-upload-image")){
     const src=img.getAttribute("src")||"";
     if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src))continue;
     try {
       const picture=new Image();picture.src=src;await picture.decode();
       img.dataset.paiWidth=String(picture.naturalWidth||1000);
       img.dataset.paiHeight=String(picture.naturalHeight||330);
     }catch(e){console.warn("Letterhead image dimensions unavailable",e);}
   }
   const children=Array.from(paper.childNodes).flatMap(n=>elements(n,d));
   if(!children.length)throw Error("Word फाइल के लिए कोई टेक्स्ट नहीं मिला।");
   const doc=new d.Document({
     creator:"Panchayat AI — TechGaon AI Services",title:filename,
     styles:{default:{document:{run:{font:FONT,size:activeHalfPoints},
       paragraph:{spacing:{line:330,after:130}}}}},
     sections:[{properties:{page:{size:{width:11906,height:16838},
       margin:{top:1134,right:1134,bottom:1134,left:1134}}},children}]
   });
   onProgress(65);
   const blob=await d.Packer.toBlob(doc);
   if(blob.size<1200)throw Error("DOCX फ़ाइल सही नहीं बनी।");
   onProgress(90);
   return blob;
 }
 async function exportPaper(paper,filename){
   const blob=await createBlob(paper,filename);
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download=(filename||"Panchayat-AI-Document").replace(/\.docx$/i,"")+".docx";
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   return {size:blob.size};
 }
 window.PAI_DOCX={exportPaper,createBlob};
})();
