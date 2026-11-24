/* Panchayat AI — local Excel conversion helpers. Input files stay in this browser. */
(() => {
  "use strict";
  const XLSX_CDN="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
  const MIME="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const MAX_SHEETS=25,MAX_ROWS=2500,MAX_COLS=45,MAX_CELLS=35000;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clean=s=>String(s??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"").normalize("NFC");
  const update=(fn,msg,pct)=>typeof fn==="function"&&fn(msg,pct);
  const guard=(sheets)=>{
    if(sheets.length>MAX_SHEETS)throw Error("एक बार में अधिकतम "+MAX_SHEETS+" Sheets/Pages बदलें।");
    let cells=0;
    for(const s of sheets){
      if(s.rows.length>MAX_ROWS)throw Error("'"+s.name+"' में "+MAX_ROWS+" से अधिक Rows हैं। छोटे हिस्सों में Convert करें।");
      for(const row of s.rows){
        if(row.length>MAX_COLS)throw Error("'"+s.name+"' में "+MAX_COLS+" से अधिक Columns हैं।");
        cells+=row.length;
        if(cells>MAX_CELLS)throw Error("यह फ़ाइल बड़ी है। एक बार में "+MAX_CELLS+" तक Cells बदलें।");
      }
    }
    return sheets;
  };
  function uniqueSheetName(wb,name){
    const base=clean(name).replace(/[:\\/?*\[\]]/g," ").trim().slice(0,31)||"Sheet";
    let title=base,num=2;
    while(wb.SheetNames.includes(title)){
      const suffix=" "+num++;
      title=base.slice(0,31-suffix.length)+suffix;
    }
    return title;
  }
  async function loadXlsx(helpers){
    if(!window.XLSX?.utils?.aoa_to_sheet){
      await helpers.loadScript(XLSX_CDN,()=>Boolean(window.XLSX?.utils?.aoa_to_sheet));
    }
    return window.XLSX;
  }
  function workbookFromTables(XLSX,tables){
    const wb=XLSX.utils.book_new();
    for(const table of guard(tables)){
      const rows=table.rows.map(row=>row.map(value=>({t:"s",v:clean(value)})));
      const ws=XLSX.utils.aoa_to_sheet(rows.length?rows:[[{t:"s",v:""}]]);
      ws["!cols"]=Array.from({length:Math.min(20,Math.max(...table.rows.map(r=>r.length),1))},()=>({wch:19}));
      XLSX.utils.book_append_sheet(wb,ws,uniqueSheetName(wb,table.name));
    }
    if(!wb.SheetNames.length)throw Error("कोई Table या पढ़ने योग्य Text नहीं मिला।");
    const bytes=XLSX.write(wb,{bookType:"xlsx",type:"array",compression:true});
    return new Blob([bytes],{type:MIME});
  }
  function getWordTables(html){
    const dom=new DOMParser().parseFromString(html,"text/html");
    const tables=[];
    for(const table of Array.from(dom.querySelectorAll("table"))){
      if(table.parentElement?.closest("table"))continue;
      const rows=[];
      for(const row of Array.from(table.rows)){
        const cells=Array.from(row.cells).map(cell=>clean(cell.textContent).replace(/[ \t]+/g," ").trim());
        if(cells.some(Boolean))rows.push(cells);
      }
      if(rows.length)tables.push({name:"Table "+(tables.length+1),rows});
    }
    const notes=Array.from(dom.body.querySelectorAll("h1,h2,h3,h4,p,li,blockquote"))
      .filter(el=>!el.closest("table"))
      .map(el=>clean(el.textContent).trim()).filter(Boolean);
    if(notes.length)tables.push({name:"Word Text",rows:notes.map(text=>[text])});
    return guard(tables);
  }
  async function wordToExcel(file,helpers,progress,loaded){
    const X=await loadXlsx(helpers);
    if(!window.mammoth)await helpers.loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
      ()=>Boolean(window.mammoth?.convertToHtml));
    update(progress,"Word Table/Text पढ़ रहे हैं…",20);
    const r=await window.mammoth.convertToHtml({arrayBuffer:loaded||await file.arrayBuffer()});
    const tables=getWordTables(r.value);
    update(progress,"Excel Workbook तैयार हो रहा है…",70);
    return {blob:workbookFromTables(X,tables),ext:".xlsx",
      note:"Word की Tables अलग Sheets में रखी गई हैं; बिना Table वाले Word में Text एक Column में रखा जाता है।"};
  }
  function pdfLines(items){
    const parts=items.filter(x=>typeof x.str==="string"&&x.str.trim()&&x.transform)
      .map(x=>({x:x.transform[4],y:x.transform[5],w:x.width||0,s:clean(x.str).trim()}))
      .filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y))
      .sort((a,b)=>b.y-a.y||a.x-b.x);
    const lines=[];
    for(const item of parts){
      let line=lines.find(row=>Math.abs(row.y-item.y)<3.2);
      if(!line){line={y:item.y,parts:[]};lines.push(line);}
      line.parts.push(item);
    }
    lines.sort((a,b)=>b.y-a.y);
    return lines.map(line=>{
      const parts=line.parts.sort((a,b)=>a.x-b.x);
      const cells=[];let text="",lastEnd=0;
      for(const part of parts){
        if(text&&part.x-lastEnd>19){cells.push(text.trim());text="";}
        else if(text&&part.x-lastEnd>2)text+=" ";
        text+=part.s;lastEnd=Math.max(lastEnd,part.x+part.w);
      }
      if(text.trim())cells.push(text.trim());
      return cells;
    }).filter(cells=>cells.some(Boolean));
  }
  function ocrPages(full){
    const pages={};
    for(const block of String(full).split(/(?=^पृष्ठ\s+\d+\s*\n)/m)){
      const m=block.match(/^पृष्ठ\s+(\d+)\s*\n([\s\S]*)$/);
      if(!m)continue;
      const text=m[2].replace(/\[इस पृष्ठ का टेक्स्ट पढ़ा नहीं जा सका\]/g,"").trim();
      if(text)pages[Number(m[1])]=text.split(/\n/).map(x=>x.trim()).filter(Boolean).map(x=>[x]);
    }
    return pages;
  }
  async function pdfToExcel(file,helpers,progress,loaded,forceOcr=false){
    const X=await loadXlsx(helpers);
    const pdfjs=await helpers.loadPdfjs();
    const original=loaded||await file.arrayBuffer();
    const doc=await pdfjs.getDocument({data:new Uint8Array(original.slice(0))}).promise;
    const sheets=[];let needsOCR=false;
    try{
      if(doc.numPages>MAX_SHEETS)throw Error("PDF में "+MAX_SHEETS+" से अधिक Pages हैं। पहले PDF को छोटे हिस्सों में बाँटें।");
      for(let i=1;i<=doc.numPages;i++){
        update(progress,"Reading PDF page "+i+"/"+doc.numPages,5+65*i/doc.numPages);
        const page=await doc.getPage(i);
        const content=await page.getTextContent();
        const rows=pdfLines(content.items);
        if(!rows.length||forceOcr)needsOCR=true;
        sheets.push({name:"Page "+i,rows:forceOcr?[]:rows});
        page.cleanup();
      }
    }finally{await doc.destroy();}
    if(needsOCR){
      update(progress,"Scanned pages: Hindi/English OCR…",73);
      const ocr=ocrPages(await helpers.textFromPdf(file,progress,original.slice(0),forceOcr));
      for(let i=0;i<sheets.length;i++){
        if(!sheets[i].rows.length)sheets[i].rows=ocr[i+1]||[];
      }
    }
    const populated=sheets.filter(x=>x.rows.length);
    if(!populated.length)throw Error("PDF में कोई पढ़ने योग्य Table/Text नहीं मिला।");
    update(progress,"Excel Workbook बना रहे हैं…",90);
    return {blob:workbookFromTables(X,populated),ext:".xlsx",
      note:"PDF से Text की स्थिति के आधार पर Columns पहचाने गए हैं। Scanned PDF में OCR Text एक Column में आ सकता है; original layout की guarantee नहीं है।"};
  }
  function readWorkbook(X,loaded){
    const data=new Uint8Array(loaded);
    const wb=X.read(data,{type:"array",cellDates:false,cellFormula:false});
    const sheets=wb.SheetNames.map(name=>{
      const rows=X.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:"",raw:false,blankrows:false})
        .map(row=>row.map(cell=>clean(cell)));
      return {name,rows};
    }).filter(x=>x.rows.some(r=>r.some(Boolean)));
    if(!sheets.length)throw Error("Excel में कोई भरी हुई Sheet नहीं मिली।");
    return guard(sheets);
  }
  async function excelToPdf(file,helpers,progress,loaded){
    const X=await loadXlsx(helpers);
    update(progress,"Excel Sheets पढ़ रहे हैं…",15);
    const sheets=readWorkbook(X,loaded||await file.arrayBuffer());
    if(sheets.some(s=>s.rows.length>400))throw Error("बड़े Excel से PDF बनाने के लिए प्रति Sheet अधिकतम 400 Rows रखें।");
    if(sheets.some(s=>s.rows.some(row=>row.length>22)))
      throw Error("PDF बनाने के लिए 22 से अधिक Columns वाली Sheet को छोटे हिस्सों में बाँटें।");
    if(!window.html2pdf)await helpers.loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
      ()=>Boolean(window.html2pdf));
    const root=document.createElement("div");
    root.className="pai-export-stage pai-excel-print";
    root.style.cssText="position:fixed;left:0;top:0;width:1120px;background:#fff;color:#223247;padding:18px;z-index:-1;pointer-events:none;font-family:Noto Sans Devanagari,Arial,sans-serif;font-size:12px";
    for(let index=0;index<sheets.length;index++){
      const sheet=sheets[index];
      const section=document.createElement("section");
      section.style.cssText="margin-bottom:24px;"+(index<sheets.length-1?"page-break-after:always;":"");
      const maxCols=Math.max(...sheet.rows.map(r=>r.length),1);
      section.innerHTML='<h2 style="font-size:20px;color:#243c65;margin:12px 0">'+esc(sheet.name)+'</h2>'+
        '<table style="border-collapse:collapse;width:100%;table-layout:fixed">'+
        sheet.rows.map((row,idx)=>'<tr style="page-break-inside:avoid">'+Array.from({length:maxCols},(_,i)=>
          '<td style="border:1px solid #bdcbd8;padding:5px 7px;word-break:break-word;vertical-align:top;background:'+
          (idx===0?"#e9f2fc":"#ffffff")+'">'+esc(row[i]??"")+'</td>').join("")+'</tr>').join("")+'</table>';
      root.appendChild(section);
    }
    document.body.appendChild(root);
    try{
      update(progress,"PDF pages तैयार किए जा रहे हैं…",65);
      if(document.fonts?.ready)await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const result=await window.html2pdf().set({
        margin:[10,9,10,9],filename:"spreadsheet.pdf",image:{type:"jpeg",quality:.95},
        html2canvas:{scale:1.5,backgroundColor:"#ffffff",useCORS:false},
        jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},
        pagebreak:{mode:["css","legacy"]}
      }).from(root).outputPdf("blob");
      if(!result||result.size<500)throw Error("PDF बन नहीं सका।");
      return {blob:result,ext:".pdf",
        note:"Excel की दिखाई देने वाली Cell Values को PDF Table में रखा गया है; Formulas, Charts, merged cells या मूल Page Layout पूरी तरह सुरक्षित नहीं रहते।"};
    }finally{root.remove();}
  }
  async function excelToWord(file,helpers,progress,loaded){
    const X=await loadXlsx(helpers);
    const d=await helpers.loadDocx();
    update(progress,"Excel Sheets पढ़ रहे हैं…",20);
    const sheets=readWorkbook(X,loaded||await file.arrayBuffer());
    if(sheets.some(s=>s.rows.length>800))throw Error("Excel to Word के लिए प्रति Sheet अधिकतम 800 Rows रखें।");
    if(sheets.some(s=>s.rows.some(row=>row.length>14)))
      throw Error("Word Tables के लिए अधिकतम 14 Columns वाली Sheet चुनें।");
    const parts=[];
    sheets.forEach((sheet,index)=>{
      parts.push(new d.Paragraph({
        pageBreakBefore:index>0,
        children:[new d.TextRun({text:sheet.name,bold:true,size:28,font:"Nirmala UI"})],
        spacing:{after:150}
      }));
      const width=Math.max(...sheet.rows.map(row=>row.length),1);
      const tableRows=sheet.rows.map((row,index)=>new d.TableRow({children:
        Array.from({length:width},(_,col)=>new d.TableCell({children:[
          new d.Paragraph({children:[new d.TextRun({
            text:clean(row[col]??"")||" ",
            font:"Nirmala UI",size:18,bold:index===0
          })]})
        ]}))
      }));
      parts.push(new d.Table({rows:tableRows,width:{size:100,type:d.WidthType.PERCENTAGE}}));
    });
    update(progress,"Word Document बना रहे हैं…",85);
    const document=new d.Document({sections:[{properties:{page:{size:{orientation:"landscape"},margin:{top:900,right:850,bottom:900,left:850}}},children:parts}]});
    const blob=await d.Packer.toBlob(document);
    return {blob,ext:".docx",
      note:"Excel Sheets को Word Tables में बदला गया है। Formula editing, Charts और advanced cell formatting अलग से सुरक्षित नहीं रहते।"};
  }
  async function convert(task,file,helpers,progress,loaded,forceOcr=false){
    if(task==="word-excel")return wordToExcel(file,helpers,progress,loaded);
    if(task==="pdf-excel")return pdfToExcel(file,helpers,progress,loaded,forceOcr);
    if(task==="excel-pdf")return excelToPdf(file,helpers,progress,loaded);
    if(task==="excel-word")return excelToWord(file,helpers,progress,loaded);
    throw Error("Unsupported Excel conversion.");
  }
  window.PAI_EXCEL_CONVERT={convert,getWordTables,pdfLines};
})();