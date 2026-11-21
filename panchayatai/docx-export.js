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
     node.style.textDecoration.includes("underline"),size:format.size||24};
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
   return new d.Paragraph({children:children.length?children:[new d.TextRun({text:""})],
     alignment:alignment(n,d),spacing:{after:130,line:330},
     keepNext:/^h[1-6]$/.test(n.tagName?.toLowerCase()||"")});
 }
 function elements(n,d){
   if(n.nodeType===3){
     const s=n.nodeValue?.trim();return s?[new d.Paragraph({children:[new d.TextRun({text:s,font:FONT,size:activeHalfPoints})]})]:[];
   }
   if(n.nodeType!==1)return [];
   const tag=n.tagName.toLowerCase();
   if(["p","h1","h2","h3","h4"].includes(tag))return [paragraph(n,d)];
   if(tag==="ul"||tag==="ol")return Array.from(n.children).filter(c=>c.tagName==="LI").map((li,i)=>
     new d.Paragraph({children:[new d.TextRun({text:tag==="ol"?(i+1)+". ":"• ",font:FONT,size:activeHalfPoints}),...runs(li,d)],
       indent:{left:400,hanging:220},spacing:{after:105,line:330}}));
   if(tag==="table"){
     const rows=Array.from(n.querySelectorAll("tr")).slice(0,150).map(tr=>
       new d.TableRow({children:Array.from(tr.children).filter(c=>/^(TD|TH)$/.test(c.tagName)).map(cell=>
         new d.TableCell({children:[new d.Paragraph({children:[new d.TextRun({
           text:text(cell).trim(),bold:cell.tagName==="TH",font:FONT,size:22})]} )],
           margins:{top:100,bottom:100,left:110,right:110}}))}));
     return rows.length?[new d.Table({rows,width:{size:100,type:d.WidthType.PERCENTAGE}})]:[];
   }
   if(tag==="hr")return [new d.Paragraph({border:{bottom:{color:"B0BED3",size:4,space:1}}})];
   if(["div","section","header","article"].includes(tag)){
     const list=Array.from(n.childNodes).flatMap(ch=>elements(ch,d));
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
 async function exportPaper(paper,filename){
   const d=await loadDocx();
   if(!d?.Document||!d?.Packer||!d?.Paragraph)
     throw Error("DOCX लाइब्रेरी नहीं मिली। Internet जाँचें और पेज Reload करें।");
   if(!paper?.textContent?.trim())throw Error("पहले पत्र तैयार करें।");
   const selected=Number(paper.dataset.docSize || 12);
   activeHalfPoints=Number.isFinite(selected)?Math.round(Math.min(16,Math.max(10,selected))*2):24;
   const children=Array.from(paper.childNodes).flatMap(n=>elements(n,d));
   if(!children.length)throw Error("Word फाइल के लिए कोई टेक्स्ट नहीं मिला।");
   const doc=new d.Document({
     creator:"Panchayat AI — TechGaon AI Services",title:filename,
     styles:{default:{document:{run:{font:FONT,size:activeHalfPoints},
       paragraph:{spacing:{line:330,after:130}}}}},
     sections:[{properties:{page:{size:{width:11906,height:16838},
       margin:{top:1134,right:1134,bottom:1134,left:1134}}},children}]
   });
   const blob=await d.Packer.toBlob(doc);
   if(blob.size<1200)throw Error("DOCX फ़ाइल सही नहीं बनी।");
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download=(filename||"Panchayat-AI-Document").replace(/\.docx$/i,"")+".docx";
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   return {size:blob.size};
 }
 window.PAI_DOCX={exportPaper};
})();
