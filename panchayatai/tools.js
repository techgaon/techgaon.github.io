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
    const ready=()=>Boolean(window.docx&&window.docx.Packer);
    try{await loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",ready);}
    catch(e){await loadScript("https://unpkg.com/docx@8.5.0/build/index.umd.js",ready);}
    return window.docx;
  }
  async function loadTesseract() {
    const ready=()=>Boolean(window.Tesseract&&window.Tesseract.createWorker);
    try{await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",ready);}
    catch(e){await loadScript("https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js",ready);}
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
    const d=await loadDocx();
    const pages=text.replace(/\r\n?/g,"\n").split(/\n\n(?=पृष्ठ \d+\n)/);
    const paragraphs=[];
    for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
      const lines=pages[pageIndex].split("\n");
      for(let i=0;i<lines.length;i++){
        paragraphs.push(new d.Paragraph({
          pageBreakBefore:pageIndex>0&&i===0,
          children:[new d.TextRun({text:lines[i]||" ",font:"Nirmala UI",size:22})],
          spacing:{after:50,line:300}
        }));
      }
    }
    const document=new d.Document({sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134}}},
      children:paragraphs
    }]});
    return d.Packer.toBlob(document);
  }
  async function ocrWorker(progress) {
    const T=await loadTesseract();
    const local = new URL("./vendor/lang/",document.baseURI).href;
    const options={
      workerPath:new URL("./vendor/worker.min.js",document.baseURI).href,
      corePath:new URL("./vendor/core/",document.baseURI).href,
      langPath:local,
      gzip:true,
      logger:m=>{
        if(m && m.status==="recognizing text" && Number.isFinite(m.progress)){
          progress("Hindi OCR: "+Math.round(m.progress*100)+"%",m.progress*100);
        }
      }
    };
    let worker;
    try{
      progress("स्थानीय Hindi/English OCR मॉडल लोड हो रहा है…");
      worker=await T.createWorker(["hin","eng"],1,options);
    }catch(e){
      console.warn("Local OCR unavailable; using network fallback",e);
      progress("वैकल्पिक Hindi OCR मॉडल लोड हो रहा है…");
      worker=await T.createWorker(["hin","eng"],1,{...options,langPath:"https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_best@main",gzip:false});
    }
    try{await worker.setParameters({preserve_interword_spaces:"1",user_defined_dpi:"300"});}
    catch(e){console.warn("OCR parameter not available",e);}
    return worker;
  }
  async function readImage(image,progress) {
    let worker=null,prepared=null;
    try{
      if(typeof createImageBitmap==="function"){
        try{
          const bitmap=await createImageBitmap(image);
          const w=bitmap.width,h=bitmap.height;
          const zoom=Math.min(3,Math.max(1,1800/Math.max(1,Math.min(w,2000))),4500/Math.max(w,h));
          if(zoom>1.01||w>4500||h>4500){
            prepared=document.createElement("canvas");
            prepared.width=Math.max(1,Math.round(w*zoom));prepared.height=Math.max(1,Math.round(h*zoom));
            const context=prepared.getContext("2d");
            context.filter="grayscale(1) contrast(1.2)";
            context.drawImage(bitmap,0,0,prepared.width,prepared.height);
          }
          bitmap.close();
        }catch(e){prepared=null;}
      }
      worker=await ocrWorker(progress);
      progress("Reading Hindi and English text…");
      // Literal OCR only. Never caption, interpret, translate, correct or invent text.
      // For photographs without actual writing, Tesseract sometimes returns
      // low-confidence visual noise as characters; do not export that guess.
      const answer=await worker.recognize(prepared||image);
      const text=(answer.data?.text||"").normalize("NFC").trim();
      const confidence=Number(answer.data?.confidence);
      if(!text || (Number.isFinite(confidence) && confidence >= 0 && confidence < 25))return "";
      return text;
    }finally{
      if(worker)await worker.terminate();
      if(prepared){prepared.width=0;prepared.height=0;}
    }
  }
  async function textFromPdf(file,progress,preloaded,forceOcr=false) {
    const pdfjs=await loadPdfjs();
    const data=new Uint8Array(preloaded || await file.arrayBuffer());
    const task=pdfjs.getDocument({data,cMapUrl:new URL("./vendor/cmaps/",document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL("./vendor/standard_fonts/",document.baseURI).href});
    const doc=await task.promise, pages=[];
    let worker=null,currentOcrPage=1;
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
        if(forceOcr||text.replace(/\s/g,"").length<25) {
          currentOcrPage=pageNum;
          if(!worker)worker=await ocrWorker((message,pct)=>progress(message,Number.isFinite(pct)?(currentOcrPage-1+pct/100)*100/doc.numPages:null));
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
        progress("PDF page "+pageNum+"/"+doc.numPages+" complete",pageNum*100/doc.numPages);
      }
      return pages.join("\n\n");
    } finally {
      if(worker)await worker.terminate();
      await doc.destroy();
    }
  }
  async function imageToPdf(file,progress) {
    if(!window.PDFLib)await loadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",()=>Boolean(window.PDFLib));
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
  async function wordToPdf(file,progress,preloaded) {
    if(!window.mammoth)await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js",()=>Boolean(window.mammoth));
    if(!window.html2pdf)await loadScript("https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js",()=>Boolean(window.html2pdf));
    progress("Reading Word paragraphs, images and tables…");
    const result=await window.mammoth.convertToHtml({arrayBuffer:preloaded||await file.arrayBuffer()});
    if(!result.value.trim())throw Error("No readable content found in the DOCX file.");
    const paper=document.createElement("section");
    paper.className="pai-printdoc";
    paper.innerHTML=cleanHtml(result.value);
    const stage=document.createElement("div");
    stage.className="pai-export-stage";
    stage.style.cssText="position:fixed;left:0;top:0;width:794px;z-index:-1;pointer-events:none;background:white";
    stage.appendChild(paper);
    document.body.appendChild(stage);
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      progress("Building A4 PDF pages…");
      const blob=await window.html2pdf().set({
        margin:[14,14,14,14],filename:filename(file)+".pdf",
        image:{type:"jpeg",quality:.96},
        html2canvas:{scale:2,useCORS:false,backgroundColor:"#ffffff",scrollX:0,scrollY:0},
        jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
        pagebreak:{mode:["css","legacy"]}
      }).from(paper).outputPdf("blob");
      if(!blob?.size||blob.size<800)throw Error("PDF conversion returned an empty file.");
      return blob;
    }finally{stage.remove();}
  }
  function mount(el) {
    let type=tasks[0],file=null,loadedBytes=null,serial=0,output=null,outName="",copiedText="",busy=false;
    el.innerHTML=
      '<section class="card pai-tool-header"><h2>🧰 AI Tools</h2>'+
      '<div class="pai-demo-flow" aria-hidden="true"><span>📸</span><b>→</b><span>✨</span><b>→</b><span>📄</span></div>'+
      '<div class="pai-three-steps"><span>① Select</span><span>② Convert</span><span>③ Download</span></div></section>'+
      '<div class="pai-tool-grid" aria-label="Conversion tools">'+tasks.map((t,i)=>
        '<button class="pai-tool-tab" type="button" data-tool="'+t.key+'" style="--step:'+i+'" aria-expanded="false" aria-controls="pai-work-panel">'+
        '<span class="pai-tool-emoji" aria-hidden="true">'+t.icon+'</span><b>'+t.title+'</b></button>'
      ).join("")+'</div>'+
      '<section class="card pai-tool-panel hidden" id="pai-work-panel">'+
      '<div class="pai-work-top"><strong id="pai-tool-title"></strong><button class="pai-close-tool" id="pai-close-tool" type="button" aria-label="Close tool">✕</button></div>'+
      '<div id="pai-image-source" class="pai-pickers"><button class="btn alt" type="button" id="pai-gallery">🖼️ Gallery</button><button class="btn alt" type="button" id="pai-camera">📸 Camera</button></div>'+
      '<div id="pai-document-source" class="pai-pickers hidden"><button class="btn alt" type="button" id="pai-pick-document">📁 Choose File</button></div>'+
      '<input id="pai-image-input" class="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/bmp,image/gif">'+
      '<input id="pai-camera-input" class="hidden" type="file" accept="image/*" capture="environment">'+
      '<input id="pai-document-input" class="hidden" type="file" accept=".pdf,application/pdf">'+
      '<p id="pai-literal-ocr-note" class="pai-status hidden">केवल फोटो में लिखे अक्षर/शब्द ज्यों के त्यों निकाले जाएँगे। फोटो का वर्णन, अर्थ, अनुवाद या अतिरिक्त जानकारी नहीं जोड़ी जाएगी।</p>'+
      '<label id="pai-force-ocr-wrap" class="hidden" style="margin:10px 0"><input type="checkbox" id="pai-force-ocr"> 📖 PDF में टेक्स्ट गलत आने पर सभी पृष्ठ Hindi OCR से पढ़ें (धीमा)</label>'+
      '<p id="pai-file-name" class="pai-filename hidden" role="status"></p>'+
      '<div class="pai-progress hidden" id="pai-file-progress"><div class="pai-progress-line"><b id="pai-file-label">Reading file</b><span id="pai-file-percent">0%</span><span id="pai-file-tick" class="pai-green-tick hidden">✓</span></div><div class="pai-progress-track" role="progressbar" aria-label="File read progress" aria-valuemin="0" aria-valuemax="100" id="pai-file-track"><span id="pai-file-fill"></span></div></div>'+
      '<button id="pai-convert" type="button" class="btn" disabled>Convert</button>'+
      '<div class="pai-progress hidden" id="pai-conversion-progress"><div class="pai-progress-line"><b id="pai-conversion-label">Converting</b><span id="pai-conversion-percent">Working…</span><span id="pai-conversion-tick" class="pai-green-tick hidden">✓</span></div><div class="pai-progress-track" role="progressbar" aria-label="Conversion progress" aria-valuemin="0" aria-valuemax="100" id="pai-conversion-track"><span id="pai-conversion-fill"></span></div></div>'+
      '<p id="pai-tool-status" class="pai-status hidden" role="status" aria-live="polite"></p>'+
      '<div id="pai-result" class="hidden"><div class="pai-result-actions"><button id="pai-download" type="button" class="btn">⬇️ Download</button><button id="pai-copy" type="button" class="btn alt hidden">📋 Copy</button></div><pre id="pai-text-preview" class="pai-text-preview hidden"></pre></div>'+
      '</section>';
    const find=id=>el.querySelector("#"+id);
    const filenameEl=find("pai-file-name"),status=find("pai-tool-status"),convert=find("pai-convert"),result=find("pai-result"),download=find("pai-download"),copy=find("pai-copy"),preview=find("pai-text-preview");
    const setStatus=s=>{status.textContent=s;status.classList.toggle("hidden",!s);};
    function progressBar(kind,pct,label,finished=false){
      const card=find("pai-"+kind+"-progress"),track=find("pai-"+kind+"-track");
      card.classList.remove("hidden");
      find("pai-"+kind+"-label").textContent=label;
      const known=Number.isFinite(pct);
      const value=finished?100:known?Math.max(0,Math.min(99,Math.round(pct))):null;
      find("pai-"+kind+"-percent").textContent=value===null?"Working…":value+"%";
      find("pai-"+kind+"-fill").style.width=value===null?"35%":value+"%";
      track.classList.toggle("pai-progress-unknown",value===null);
      track.classList.toggle("pai-progress-done",finished);
      if(value===null)track.removeAttribute("aria-valuenow");else track.setAttribute("aria-valuenow",String(value));
      find("pai-"+kind+"-tick").classList.toggle("hidden",!finished);
    }
    function clearBars(){for(const k of ["file","conversion"])find("pai-"+k+"-progress").classList.add("hidden");}
    function chooseTask(key){
      if(busy)return;
      const panel=find("pai-work-panel");
      if(!panel.classList.contains("hidden")&&type.key===key){
        closeTool();
        return;
      }
      type=tasks.find(t=>t.key===key)||tasks[0];
      serial++;file=null;loadedBytes=null;output=null;copiedText="";
      clearBars();
      filenameEl.textContent="";
      filenameEl.classList.add("hidden");
      find("pai-tool-title").textContent=type.icon+" "+type.title;
      find("pai-image-source").classList.toggle("hidden",type.type!=="image");
      find("pai-document-source").classList.toggle("hidden",type.type==="image");
      find("pai-literal-ocr-note").classList.toggle("hidden",!["image-text","image-word"].includes(type.key));
      find("pai-document-input").accept=type.type==="pdf"?".pdf,application/pdf":".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      find("pai-force-ocr-wrap").classList.toggle("hidden",type.type!=="pdf");
      find("pai-force-ocr").checked=false;
      el.querySelectorAll("[data-tool]").forEach(button=>{
        const active=button.dataset.tool===key;
        button.classList.toggle("active",active);
        button.setAttribute("aria-expanded",String(active));
      });
      find("pai-image-input").value="";
      find("pai-camera-input").value="";
      find("pai-document-input").value="";
      convert.disabled=true;
      result.classList.add("hidden");
      setStatus("");
      panel.classList.remove("hidden");
    }
    function closeTool(){
      if(busy)return;
      serial++;file=null;loadedBytes=null;output=null;copiedText="";
      clearBars();
      convert.disabled=true;result.classList.add("hidden");
      filenameEl.classList.add("hidden");filenameEl.textContent="";
      setStatus("");
      find("pai-work-panel").classList.add("hidden");
      el.querySelectorAll("[data-tool]").forEach(button=>{
        button.classList.remove("active");
        button.setAttribute("aria-expanded","false");
      });
    }
    function chooseFile(f) {
      if(!f||busy)return;
      const name=(f.name||"").toLowerCase();
      const valid=type.type==="image" ? (/^image\/(jpeg|png|webp|bmp|gif)$/.test(f.type)||/\.(jpg|jpeg|png|webp|bmp|gif)$/.test(name)) :
        type.type==="pdf"?(f.type==="application/pdf"||name.endsWith(".pdf")):name.endsWith(".docx");
      if(!valid){setStatus("इस टूल के लिए सही JPG/PNG/WebP, PDF या DOCX फ़ाइल चुनें।");return;}
      const limit=type.type==="image"?25:50;
      if(!f.size||f.size>limit*1024*1024){setStatus("फ़ाइल 0 से "+limit+" MB के बीच होनी चाहिए।");return;}
      const id=++serial;
      file=null;loadedBytes=null;output=null;result.classList.add("hidden");convert.disabled=true;
      find("pai-conversion-progress").classList.add("hidden");
      filenameEl.textContent=f.name+" ("+(f.size/1048576).toFixed(2)+" MB)";
      filenameEl.classList.remove("hidden");
      progressBar("file",0,"Reading file");setStatus("फ़ाइल पढ़ी जा रही है…");
      const reader=new FileReader();
      reader.onprogress=e=>{
        if(id!==serial)return;
        progressBar("file",e.lengthComputable&&e.total?e.loaded*100/e.total:null,"Reading file");
      };
      reader.onload=()=>{
        if(id!==serial)return;
        file=f;loadedBytes=reader.result;progressBar("file",100,"File ready",true);
        convert.disabled=false;setStatus("✅ File ready. Convert दबाएँ।");
      };
      reader.onerror=()=>{if(id!==serial)return;progressBar("file",null,"File read failed");setStatus("❌ फ़ाइल पढ़ने में त्रुटि।");};
      reader.readAsArrayBuffer(f);
    }
    el.querySelectorAll("[data-tool]").forEach(button=>button.onclick=()=>chooseTask(button.dataset.tool));
    find("pai-close-tool").onclick=closeTool;
    find("pai-gallery").onclick=()=>find("pai-image-input").click();
    find("pai-camera").onclick=()=>find("pai-camera-input").click();
    find("pai-pick-document").onclick=()=>find("pai-document-input").click();
    ["pai-image-input","pai-camera-input","pai-document-input"].forEach(id=>find(id).addEventListener("change",e=>chooseFile(e.target.files[0])));
    convert.onclick=async()=>{
      if(!file||busy)return;
      busy=true;convert.disabled=true;result.classList.add("hidden");status.classList.add("pai-working");progressBar("conversion",null,"Preparing conversion");
      const task=type.key,source=file,stem=filename(source);
      let text="",blob=null,ext="";
      const onProgress=(message,pct)=>{
        setStatus(message);
        if(Number.isFinite(pct))progressBar("conversion",pct,message);
        else{
          const page=String(message).match(/पृष्ठ (\d+)\/(\d+)/);
          if(page&&Number(page[2])>0)progressBar("conversion",(Number(page[1])-1)*100/Number(page[2]),message);
          else progressBar("conversion",null,message);
        }
      };
      try {
        if(task==="image-pdf"){blob=await imageToPdf(source,onProgress);ext=".pdf";}
        if(task==="image-text"||task==="image-word"){text=await readImage(source,onProgress);ext=task==="image-word"?".docx":".txt";}
        if(task==="pdf-text"||task==="pdf-word"){text=await textFromPdf(source,onProgress,loadedBytes,find("pai-force-ocr").checked);ext=task==="pdf-word"?".docx":".txt";}
        if(task==="word-pdf"){blob=await wordToPdf(source,onProgress,loadedBytes);ext=".pdf";}
        if(!blob){
          if(!text.trim())throw new Error("फोटो/फ़ाइल में स्पष्ट पढ़ने योग्य अक्षर नहीं मिले। फोटो का अर्थ या अनुमान लगाकर टेक्स्ट नहीं बनाया जाएगा।");
          onProgress("फ़ाइल बनाई जा रही है…");
          blob=ext===".docx"?await makeWord(text):new Blob(["\uFEFF"+text],{type:"text/plain;charset=utf-8"});
        }
        if(!blob||!blob.size)throw Error("Conversion से खाली फ़ाइल बनी है; दूसरी फ़ाइल से कोशिश करें।");
        output=blob;outName=stem+ext;copiedText=text;
        result.classList.remove("hidden");
        copy.classList.toggle("hidden",!text);
        preview.classList.toggle("hidden",!text);
        if(text)preview.textContent=text.slice(0,20000)+(text.length>20000?"\n\n…आगे का टेक्स्ट डाउनलोड की गई फ़ाइल में है।":"");
        progressBar("conversion",100,"Conversion complete",true);setStatus("✅ तैयार: "+outName+" — Download पर क्लिक करें।");
      }catch(e){output=null;progressBar("conversion",null,"Conversion failed");setStatus("❌ "+reportError(e));console.error("Panchayat conversion failed",e);}
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
