/* पंचायत AI — six private, browser-side document tools */
(() => {
  "use strict";
  const tasks = [
    {key:"image-text", icon:"📷", title:"Image to Text", note:"फोटो से हिंदी/English टेक्स्ट निकालें", type:"image"},
    {key:"image-word", icon:"📝", title:"Image to Word", note:"फोटो का टेक्स्ट editable Word में", type:"image"},
    {key:"image-pdf", icon:"🗃️", title:"Image to PDF", note:"फोटो को साफ PDF में बदलें", type:"image"},
    {key:"pdf-text", icon:"📄", title:"PDF to Text", note:"PDF से टेक्स्ट निकालें, स्कैन पर OCR", type:"pdf"},
    {key:"pdf-word", icon:"📘", title:"PDF to Word", note:"PDF का टेक्स्ट editable DOCX में", type:"pdf"},
    {key:"word-pdf", icon:"📑", title:"Word to PDF", note:"DOCX दस्तावेज़ को PDF में बदलें", type:"word"}
  ];
  const libraryLoaders = {};
  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    if (!libraryLoaders[src]) libraryLoaders[src] = new Promise((resolve,reject) => {
      const script=document.createElement("script");
      script.src=src; script.async=true;
      script.onload=()=>test()?resolve():reject(new Error("लाइब्रेरी लोड नहीं हुई"));
      script.onerror=()=>reject(new Error("इंटरनेट से आवश्यक लाइब्रेरी लोड नहीं हो सकी"));
      document.head.appendChild(script);
    }).catch(e=>{delete libraryLoaders[src];throw e;});
    return libraryLoaders[src];
  }
  async function loadDocx() {
    await loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",()=>Boolean(window.docx&&window.docx.Packer));
    return window.docx;
  }
  async function loadTesseract() {
    await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",()=>Boolean(window.Tesseract&&window.Tesseract.createWorker));
    return window.Tesseract;
  }
  async function loadPdfjs() {
    const pdfjs=await import("./vendor/pdf.js");
    pdfjs.GlobalWorkerOptions.workerSrc=new URL("./vendor/pdf.worker.min.mjs",document.baseURI).href;
    return pdfjs;
  }
  const filename = f => (f.name || "document").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g,"_").slice(0,90) || "document";
  const reportError = e => e && e.message ? e.message : "फ़ाइल बदलने में समस्या हुई";
  async function makeWord(text) {
    const d=await loadDocx(), lines=text.replace(/\r\n?/g,"\n").split("\n");
    const paragraphs=lines.map(line=>new d.Paragraph({
      children:[new d.TextRun({text:line || " ",font:"Nirmala UI",size:22})],
      spacing:{after:45}
    }));
    const document=new d.Document({sections:[{properties:{},children:paragraphs}]});
    return d.Packer.toBlob(document);
  }
  async function ocrWorker(progress) {
    const T=await loadTesseract();
    progress("हिंदी + English OCR तैयार हो रहा है…");
    return T.createWorker(["hin","eng"],1,{
      workerPath:new URL("./vendor/worker.min.js",document.baseURI).href,
      corePath:new URL("./vendor/core/",document.baseURI).href,
      langPath:new URL("./vendor/lang/",document.baseURI).href,
      gzip:true,
      logger:m=>{if(m && m.status==="recognizing text" && Number.isFinite(m.progress)) progress("OCR: "+Math.round(m.progress*100)+"%");}
    });
  }
  async function readImage(image,progress) {
    let worker;
    try {
      worker=await ocrWorker(progress);
      progress("फोटो से टेक्स्ट पढ़ा जा रहा है…");
      const result=await worker.recognize(image);
      return (result.data.text || "").trim();
    } finally {
      if(worker)await worker.terminate();
    }
  }
  async function textFromPdf(file,progress) {
    const pdfjs=await loadPdfjs();
    const data=new Uint8Array(await file.arrayBuffer());
    const task=pdfjs.getDocument({data,cMapUrl:new URL("./vendor/cmaps/",document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL("./vendor/standard_fonts/",document.baseURI).href});
    const doc=await task.promise, pages=[];
    let worker=null;
    try {
      for(let pageNum=1;pageNum<=doc.numPages;pageNum++) {
        progress("PDF पढ़ रहे हैं: पृष्ठ "+pageNum+"/"+doc.numPages);
        const page=await doc.getPage(pageNum);
        const content=await page.getTextContent();
        let text="",oldY=null;
        for(const item of content.items) {
          if(typeof item.str!=="string")continue;
          const y=item.transform && item.transform[5];
          if(text && Number.isFinite(y) && Number.isFinite(oldY) && Math.abs(y-oldY)>3)text+="\n";
          else if(text && !text.endsWith("\n"))text+=" ";
          text+=item.str;
          if(item.hasEOL)text+="\n";
          if(Number.isFinite(y))oldY=y;
        }
        if(text.replace(/\s/g,"").length<25) {
          if(!worker)worker=await ocrWorker(progress);
          progress("स्कैन पृष्ठ "+pageNum+"/"+doc.numPages+" पर हिंदी OCR…");
          const base=page.getViewport({scale:1});
          const scale=Math.min(2,Math.sqrt(3600000/(base.width*base.height)));
          const vp=page.getViewport({scale:Math.max(1,scale)});
          const canvas=document.createElement("canvas");
          canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
          try {
            await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
            const result=await worker.recognize(canvas);
            text=(result.data.text || "").trim();
          } finally {canvas.width=0;canvas.height=0;}
        }
        pages.push("पृष्ठ "+pageNum+"\n"+(text.trim() || "[इस पृष्ठ का टेक्स्ट पढ़ा नहीं जा सका]"));
        page.cleanup();
      }
      return pages.join("\n\n");
    } finally {
      if(worker)await worker.terminate();
      await doc.destroy();
    }
  }
  async function imageToPdf(file,progress) {
    if(!window.PDFLib)throw new Error("PDF लाइब्रेरी उपलब्ध नहीं है");
    const imageUrl=URL.createObjectURL(file);
    try {
      const img=await new Promise((resolve,reject)=>{
        const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("यह फोटो ब्राउज़र में नहीं खुल पाई"));image.src=imageUrl;
      });
      progress("फोटो को PDF पेज पर सेट कर रहे हैं…");
      const factor=Math.min(1,3000/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
      canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.92));
      canvas.width=0;canvas.height=0;
      if(!jpeg)throw new Error("फोटो PDF के लिए तैयार नहीं हो सकी");
      const pdf=await window.PDFLib.PDFDocument.create();
      const landscape=img.naturalWidth>img.naturalHeight;
      const w=landscape?841.89:595.28, h=landscape?595.28:841.89;
      const page=pdf.addPage([w,h]);
      const embed=await pdf.embedJpg(await jpeg.arrayBuffer());
      const fit=Math.min((w-32)/embed.width,(h-32)/embed.height);
      const iw=embed.width*fit,ih=embed.height*fit;
      page.drawImage(embed,{x:(w-iw)/2,y:(h-ih)/2,width:iw,height:ih});
      return new Blob([await pdf.save()],{type:"application/pdf"});
    } finally {URL.revokeObjectURL(imageUrl);}
  }
  function cleanHtml(html) {
    const doc=new DOMParser().parseFromString(html,"text/html");
    doc.querySelectorAll("script,iframe,object,embed,form,link,style,meta").forEach(el=>el.remove());
    doc.body.querySelectorAll("*").forEach(el=>{
      [...el.attributes].forEach(a=>{
        if(/^on/i.test(a.name)||/^javascript:/i.test(a.value)||
          (a.name==="src" && !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(a.value)))el.removeAttribute(a.name);
      });
    });
    return doc.body.innerHTML;
  }
  async function wordToPdf(file,progress) {
    if(!window.mammoth||!window.html2pdf)throw new Error("Word/PDF लाइब्रेरी लोड नहीं हुई");
    progress("Word के पैराग्राफ, चित्र और टेबल पढ़ रहे हैं…");
    const result=await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
    if(!result.value.trim())throw new Error("DOCX में पढ़ने योग्य सामग्री नहीं मिली");
    const paper=document.createElement("section");
    paper.className="pai-printdoc";
    paper.setAttribute("aria-hidden","true");
    paper.innerHTML=cleanHtml(result.value);
    const offscreen=document.createElement("div");
    offscreen.style.cssText="position:absolute;left:-20000px;top:0;width:794px";
    offscreen.appendChild(paper);
    document.body.appendChild(offscreen);
    try {
      await document.fonts.ready;
      progress("PDF पेज तैयार हो रहे हैं…");
      return await window.html2pdf().set({
        margin:[12,12,12,12],filename:filename(file)+".pdf",
        image:{type:"jpeg",quality:.96},
        html2canvas:{scale:2,useCORS:false,backgroundColor:"#fff"},
        jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
        pagebreak:{mode:["css","legacy"]}
      }).from(paper).outputPdf("blob");
    } finally {offscreen.remove();}
  }
  function mount(el) {
    let type=tasks[0],file=null,output=null,outName="",copiedText="",busy=false;
    el.innerHTML='<section class="card pai-tool-header"><h2>🧰 AI Tools</h2><p>फोटो, PDF और Word की फ़ाइलें बस 3 आसान स्टेप में बदलें।</p><div class="pai-demo-flow" aria-hidden="true"><span>📸</span><b>→</b><span>✨</span><b>→</b><span>📄</span></div><div class="pai-three-steps"><span>① फ़ाइल चुनें</span><span>② Convert करें</span><span>③ Download करें</span></div></section>'+
      '<div class="pai-tool-grid">'+tasks.map(t=>
        '<button class="pai-tool-tab'+(t.key===type.key?' active':'')+'" type="button" style="--step:'+tasks.indexOf(t)+'" data-tool="'+t.key+'"><span class="pai-tool-emoji">'+t.icon+'</span><b>'+t.title+'</b><small>'+t.note+'</small></button>'
      ).join("")+'</div>'+
      '<section class="card pai-tool-panel"><h3 id="pai-tool-title">📷 Image to Text</h3>'+
      '<p id="pai-tool-note" class="hint">फोटो से हिंदी/English टेक्स्ट निकालें</p>'+
      '<div id="pai-image-source" class="pai-pickers"><button class="btn alt" type="button" id="pai-gallery">🖼️ Gallery / Files</button><button class="btn alt" type="button" id="pai-camera">📸 Camera से फोटो</button></div>'+
      '<div id="pai-document-source" class="pai-pickers hidden"><button class="btn alt" type="button" id="pai-pick-document">📁 फ़ाइल चुनें</button></div>'+
      '<input id="pai-image-input" class="hidden" type="file" accept="image/*">'+
      '<input id="pai-camera-input" class="hidden" type="file" accept="image/*" capture="environment">'+
      '<input id="pai-document-input" class="hidden" type="file" accept=".pdf,application/pdf">'+
      '<p id="pai-file-name" class="pai-filename" role="status">अभी कोई फ़ाइल नहीं चुनी गई।</p>'+
      '<button id="pai-convert" type="button" class="btn" disabled>Convert करें</button>'+
      '<p id="pai-tool-status" class="pai-status" role="status" aria-live="polite"></p>'+
      '<div id="pai-result" class="hidden"><div class="pai-result-actions"><button id="pai-download" type="button" class="btn">⬇️ Download</button><button id="pai-copy" type="button" class="btn alt hidden">📋 टेक्स्ट Copy</button></div><pre id="pai-text-preview" class="pai-text-preview hidden"></pre></div>'+
      '</section>';
    const find=id=>el.querySelector("#"+id);
    const filenameEl=find("pai-file-name"),status=find("pai-tool-status"),convert=find("pai-convert"),result=find("pai-result"),download=find("pai-download"),copy=find("pai-copy"),preview=find("pai-text-preview");
    const setStatus=s=>{status.textContent=s;};
    function chooseTask(key) {
      if(busy)return;
      type=tasks.find(t=>t.key===key)||tasks[0];
      file=null;output=null;copiedText="";filenameEl.textContent="अभी कोई फ़ाइल नहीं चुनी गई।";
      find("pai-tool-title").textContent=type.icon+" "+type.title;
      find("pai-tool-note").textContent=type.note;
      find("pai-image-source").classList.toggle("hidden",type.type!=="image");
      find("pai-document-source").classList.toggle("hidden",type.type==="image");
      find("pai-document-input").accept=type.type==="pdf"?".pdf,application/pdf":".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      el.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===key));
      find("pai-image-input").value="";find("pai-camera-input").value="";find("pai-document-input").value="";
      convert.disabled=true;result.classList.add("hidden");setStatus("");
    }
    function chooseFile(f) {
      if(!f||busy)return;
      const extension=(f.name||"").toLowerCase();
      const valid=type.type==="image" ? (f.type.startsWith("image/")||/\.(jpg|jpeg|png|webp|bmp|heic|heif)$/i.test(extension)) :
        type.type==="pdf"?extension.endsWith(".pdf"):extension.endsWith(".docx");
      if(!valid){setStatus("इस टूल के लिए सही "+(type.type==="image"?"फोटो":type.type==="pdf"?"PDF":"DOCX")+" फ़ाइल चुनें।");return;}
      const limit=type.type==="image"?25:50;
      if(f.size>limit*1024*1024){setStatus("फ़ाइल "+limit+" MB से छोटी होनी चाहिए।");return;}
      file=f;output=null;result.classList.add("hidden");preview.classList.add("hidden");
      filenameEl.textContent="चुनी गई: "+f.name+" ("+(f.size/1048576).toFixed(2)+" MB)";
      convert.disabled=false;setStatus("अब Convert करें पर क्लिक करें।");
    }
    el.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>chooseTask(b.dataset.tool)));
    find("pai-gallery").onclick=()=>find("pai-image-input").click();
    find("pai-camera").onclick=()=>find("pai-camera-input").click();
    find("pai-pick-document").onclick=()=>find("pai-document-input").click();
    ["pai-image-input","pai-camera-input","pai-document-input"].forEach(id=>find(id).addEventListener("change",e=>chooseFile(e.target.files[0])));
    convert.onclick=async()=>{
      if(!file||busy)return;
      busy=true;convert.disabled=true;result.classList.add("hidden");status.classList.add("pai-working");
      const task=type.key,source=file,stem=filename(source);
      let text="",blob=null,ext="";
      try {
        if(task==="image-pdf"){blob=await imageToPdf(source,setStatus);ext=".pdf";}
        if(task==="image-text"||task==="image-word"){text=await readImage(source,setStatus);ext=task==="image-word"?".docx":".txt";}
        if(task==="pdf-text"||task==="pdf-word"){text=await textFromPdf(source,setStatus);ext=task==="pdf-word"?".docx":".txt";}
        if(task==="word-pdf"){blob=await wordToPdf(source,setStatus);ext=".pdf";}
        if(!blob){
          if(!text.trim())throw new Error("इस फ़ाइल में पढ़ने योग्य टेक्स्ट नहीं मिला। साफ फोटो या बेहतर स्कैन लगाएँ।");
          setStatus("फ़ाइल बनाई जा रही है…");
          blob=ext===".docx"?await makeWord(text):new Blob(["\uFEFF"+text],{type:"text/plain;charset=utf-8"});
        }
        output=blob;outName=stem+ext;copiedText=text;
        result.classList.remove("hidden");
        copy.classList.toggle("hidden",!text);
        preview.classList.toggle("hidden",!text);
        if(text)preview.textContent=text.slice(0,20000)+(text.length>20000?"\n\n…आगे का टेक्स्ट डाउनलोड की गई फ़ाइल में है।":"");
        setStatus("✅ तैयार: "+outName+" — Download पर क्लिक करें।");
      }catch(e){output=null;setStatus("❌ "+reportError(e));console.error("Panchayat conversion failed",e);}
      finally {busy=false;convert.disabled=!file;status.classList.remove("pai-working");}
    };
    download.onclick=()=>{
      if(!output)return;
      const url=URL.createObjectURL(output),a=document.createElement("a");
      a.href=url;a.download=outName;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    };
    copy.onclick=async()=>{
      if(!copiedText)return;
      try {await navigator.clipboard.writeText(copiedText);setStatus("✅ टेक्स्ट कॉपी कर दिया गया।");}
      catch(e){setStatus("Copy उपलब्ध नहीं है; नीचे का टेक्स्ट चुनकर कॉपी करें।");}
    };
  }
  window.PAI_TOOLS={mount};
})();
