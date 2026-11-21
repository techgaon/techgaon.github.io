/* Reusable conversation document: edits, local save, A4 file creation and sharing. */
(() => {
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>'};
 function sanitize(html){
  const tpl=document.createElement('template');tpl.innerHTML=String(html||'');
  const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','UL','OL','LI','TABLE','THEAD','TBODY','TR','TD','TH','H1','H2','H3','HR','SPAN']);
  for(const el of Array.from(tpl.content.querySelectorAll('*')).reverse()){
   if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','IMG','LINK','META'].includes(el.tagName)){el.remove();continue;}
   if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);continue;}
   const align=el.style.textAlign,bold=el.style.fontWeight,italics=el.style.fontStyle;
   const span=el.getAttribute('colspan'),rowspan=el.getAttribute('rowspan');
   for(const a of Array.from(el.attributes))el.removeAttribute(a.name);
   if(['left','right','center','justify'].includes(align))el.style.textAlign=align;
   if(['bold','600','700','800'].includes(bold))el.style.fontWeight=bold;
   if(italics==='italic')el.style.fontStyle='italic';
   if(/^(?:[1-9]|[1-4][0-9])$/.test(span||''))el.setAttribute('colspan',span);
   if(/^(?:[1-9]|[1-4][0-9])$/.test(rowspan||''))el.setAttribute('rowspan',rowspan);
  }
  return tpl.innerHTML;
 }
 function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();return url;
 }
 function exportPaper(paper){
  const clone=document.createElement('div');clone.innerHTML=sanitize(paper.innerHTML);
  clone.dataset.docSize=paper.dataset.docSize||'12';
  clone.style.cssText="box-sizing:border-box;width:170mm;max-width:none;margin:0;padding:0;color:#111;background:#fff;font-family:'Noto Sans Devanagari','Nirmala UI',sans-serif;font-size:"+clone.dataset.docSize+"pt;line-height:1.65;letter-spacing:normal;word-spacing:normal;overflow-wrap:anywhere;text-align:left";
  clone.querySelectorAll('*').forEach(el=>{el.style.letterSpacing='normal';el.style.wordSpacing='normal';});
  clone.querySelectorAll('p').forEach(p=>{p.style.margin='0 0 10pt';p.style.breakInside='avoid';});
  clone.querySelectorAll('table').forEach(t=>{t.style.cssText='width:100%;border-collapse:collapse;table-layout:fixed';});
  clone.querySelectorAll('td,th').forEach(c=>{c.style.border='1px solid #ccc';c.style.padding='5px';});
  return clone;
 }
 async function pdfBlob(paper,onProgress=()=>{}){
  if(typeof window.html2pdf!=='function')throw Error('PDF सुविधा लोड नहीं हुई। इंटरनेट जाँचकर फिर प्रयास करें।');
  onProgress(10);if(document.fonts?.ready)await document.fonts.ready;
  const clone=exportPaper(paper),host=document.createElement('div');
  host.style.cssText='position:absolute;left:0;top:0;z-index:-9999;pointer-events:none;width:170mm;background:#fff';host.appendChild(clone);document.body.appendChild(host);
  try{
   onProgress(25);
   const worker=window.html2pdf().set({margin:[20,20,20,20],image:{type:'jpeg',quality:.98},html2canvas:{scale:2,backgroundColor:'#ffffff',scrollX:0,scrollY:0,useCORS:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy'],avoid:['tr','p','li']}}).from(clone).toCanvas();
   await worker;onProgress(65);await worker.toPdf();
   const pdf=await worker.get('pdf');if(!pdf.internal.getNumberOfPages())throw Error('PDF खाली है।');
   onProgress(90);const bytes=pdf.output('arraybuffer');if(bytes.byteLength<900)throw Error('PDF सही नहीं बन सकी।');
   return new Blob([bytes],{type:'application/pdf'});
  }finally{host.remove();}
 }
 function mount(container,{html='',kind='पत्र',review=null,size=12,dirty=false,onChange=()=>{},onSave=()=>{},toast=()=>{}}={}){
  const card=document.createElement('article');card.className='inline-draft-card';
  card.innerHTML='<div class="inline-draft-top"><b>'+escape(kind)+'</b><div class="inline-draft-actions">'+
   '<button type="button" class="inline-draft-icon" data-copy aria-label="पत्र कॉपी करें" title="कॉपी"><svg viewBox="0 0 24 24">'+icons.copy+'</svg></button>'+
   '<button type="button" class="inline-draft-icon" data-edit aria-label="पत्र संपादित करें" aria-pressed="false" title="संपादन"><svg viewBox="0 0 24 24">'+icons.edit+'</svg></button></div></div>'+
   '<div class="inline-draft-paper" role="document" aria-label="पूरा पत्र" contenteditable="false"></div>'+
   '<button class="btn draft-save" type="button" data-save hidden>सहेजें</button>'+
   '<div class="inline-draft-review"><details><summary>जारी करने से पहले विवरण जाँचें</summary><p>नाम, पद, पंचायत, तारीख, तथ्य, अभिलेख और समय-सीमा जाँचकर ही पत्र जारी करें।</p>'+((review?.missing||[]).length?'<p>'+escape(review.missing.join('; '))+'</p>':'')+(review?.attachmentReview?'<p>फोटो/PDF के तथ्यों का मूल से मिलान करें।</p>':'')+'</details><label><input type="checkbox" data-reviewed> मैंने पत्र के विवरण जाँच लिए हैं।</label></div>'+
   '<div class="inline-draft-files">'+['docx','pdf'].map(type=>'<div class="inline-file" data-type="'+type+'"><button class="btn alt" data-download="'+type+'" type="button">↓ '+(type==='docx'?'Word':'PDF')+'</button><div class="inline-file-status" role="status" aria-live="polite"></div><progress class="inline-file-progress" max="100" value="0" hidden aria-label="फाइल तैयार होने की प्रगति"></progress><div class="inline-file-options" hidden><button type="button" data-open="'+type+'">खोलें ↗</button><button type="button" data-share="'+type+'">WhatsApp ↗</button></div></div>').join('')+'</div>';
  container.appendChild(card);
  const paper=card.querySelector('.inline-draft-paper');paper.innerHTML=sanitize(html);paper.dataset.docSize=String([11,12,13,14].includes(Number(size))?Number(size):12);
  const saved=card.querySelector('[data-save]'),checked=card.querySelector('[data-reviewed]'),files={};
  saved.hidden=!dirty;
  let baseline=sanitize(paper.innerHTML),revision=0,disposed=false;
  const urls=[];
  const lock=()=>{card.querySelectorAll('[data-download]').forEach(b=>b.disabled=!checked.checked||!!files[b.dataset.download]?.busy);};lock();
  checked.onchange=lock;
  function changed(){
   if(disposed)return;
   const current=sanitize(paper.innerHTML);if(current===baseline)return;
   revision++;baseline=current;checked.checked=false;
   saved.hidden=false;saved.disabled=false;saved.textContent='सहेजें';
   for(const type of ['pdf','docx']){if(files[type]?.url)URL.revokeObjectURL(files[type].url);delete files[type];const box=card.querySelector('[data-type="'+type+'"]');box.querySelector('.inline-file-options').hidden=true;box.querySelector('progress').hidden=true;box.querySelector('.inline-file-status').textContent='';box.querySelector('.inline-file-status').classList.remove('success');box.querySelector('[data-download]').textContent='↓ '+(type==='pdf'?'PDF':'Word');}
   lock();onChange({html:current,size:Number(paper.dataset.docSize)});
  }
  paper.addEventListener('input',changed);
  // Plain-text paste prevents hidden web markup from entering office documents.
  paper.addEventListener('paste',e=>{if(paper.contentEditable!=='true')return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');});
  card.querySelector('[data-edit]').onclick=e=>{const on=paper.contentEditable!=='true';paper.contentEditable=String(on);paper.setAttribute('role',on?'textbox':'document');paper.setAttribute('aria-label',on?'पत्र का संपादन':'पूरा पत्र');e.currentTarget.setAttribute('aria-pressed',String(on));if(on)paper.focus();};
  card.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(paper.innerText);toast('कॉपी किया ✓');}catch{toast('कॉपी करने के लिए पत्र का टेक्स्ट चुनें।');}};
  saved.onclick=async()=>{saved.disabled=true;try{await onSave({html:sanitize(paper.innerHTML),size:Number(paper.dataset.docSize)});saved.textContent='सहेजा गया ✓';}catch(e){toast(e.message||'सहेजा नहीं जा सका।');saved.disabled=false;}};
  for(const type of ['pdf','docx']){
   const box=card.querySelector('[data-type="'+type+'"]'),btn=box.querySelector('[data-download]'),status=box.querySelector('.inline-file-status'),progress=box.querySelector('progress');
   const stage=n=>{progress.hidden=false;progress.value=n;status.classList.remove('success');status.textContent='तैयार हो रहा है · '+n+'%';};
   btn.onclick=async()=>{
    if(!checked.checked)return;
    const startRevision=revision,job={busy:true};files[type]=job;lock();stage(0);
    const snapshot=exportPaper(paper),name='Panchayat-AI-'+String(kind).replace(/[^\p{L}\p{N}-]/gu,'-')+'-'+new Date().toISOString().slice(0,10)+'.'+type;
    try{
     if(type==='docx'&&!window.PAI_DOCX?.createBlob)throw Error('Word सुविधा लोड नहीं हुई। इंटरनेट जाँचकर फिर प्रयास करें।');
     const blob=type==='pdf'?await pdfBlob(snapshot,n=>{if(revision===startRevision)stage(n);}):await window.PAI_DOCX.createBlob(snapshot,name,n=>{if(revision===startRevision)stage(n);});
     if(disposed||revision!==startRevision||!checked.checked){if(revision===startRevision)status.textContent='पत्र बदल गया है। फिर जाँचकर डाउनलोड करें।';return;}
     const file=new File([blob],name,{type:type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
     const url=download(file,name);urls.push(url);files[type]={file,url,busy:false,revision};progress.value=100;
     status.textContent='✓ 100% · Downloaded';status.classList.add('success');status.title='फाइल तैयार करके ब्राउज़र को डाउनलोड के लिए भेज दी गई है।';btn.textContent='↓ फिर डाउनलोड करें';box.querySelector('.inline-file-options').hidden=false;
    }catch(e){if(revision===startRevision){status.textContent=e.message||'डाउनलोड नहीं हुआ। फिर कोशिश करें।';progress.hidden=true;delete files[type];}}
    finally{if(files[type]===job)delete files[type];lock();}
   };
   box.querySelector('[data-open]').onclick=()=>{const f=files[type];if(!f?.url||f.revision!==revision)return;const a=document.createElement('a');a.href=f.url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();};
   box.querySelector('[data-share]').onclick=async()=>{
    const f=files[type];if(!f?.file||f.revision!==revision)return;
    if(navigator.share&&navigator.canShare?.({files:[f.file]})){
     try{await navigator.share({files:[f.file],title:kind});return;}catch(e){if(e.name==='AbortError')return;}
    }
    toast('इस ब्राउज़र में फाइल सीधे साझा नहीं हो सकती। डाउनलोड की फाइल WhatsApp में अटैच करें।');
    const a=document.createElement('a');a.href='https://wa.me/';a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();
   };
  }
  return {card,paper,dispose(){disposed=true;urls.forEach(url=>URL.revokeObjectURL(url));}};
 }
 window.PAI_DRAFT_CARD={mount,sanitize,pdfBlob,exportPaper};
})();
