import {dependency,deadline,pdfReader,ocrOptions} from './dependencies.js';
// Credentials identifying the existing TechGaon Firebase web app are public.
// No service account, AI key, payment secret or admin password is bundled here.
const config={apiKey:'AIzaSyCTemhSPOGUWqESTBu3ebzfQZGJv2XyMWg',authDomain:'petpyaar-a3ea6.firebaseapp.com',projectId:'petpyaar-a3ea6',appId:'1:938080790202:web:0da609eac45f9d54bf0483'};
let auth,authSDK,loading;
async function loadAuth(){if(loading)return loading;loading=(async()=>{const [app,sdk]=await Promise.all([dependency('app'),dependency('auth')]);authSDK=sdk;const instance=app.getApps().find(a=>a.name==='panchayatai')||app.initializeApp(config,'panchayatai');auth=sdk.getAuth(instance);sdk.onAuthStateChanged(auth,u=>{window.paUser=u;if(u)window.paSetIdentity?.({uid:u.uid,name:u.displayName||'',email:u.email||'',phone:(u.phoneNumber||'').replace(/^\+91/,'')});else window.paSetIdentity?.(null)});await sdk.setPersistence(auth,sdk.browserSessionPersistence);return auth})().catch(e=>{loading=null;throw e});return loading}
window.paGoogleSignIn=async()=>{const b=document.querySelector('#google');if(b)b.disabled=true;try{await deadline(loadAuth(),20000,'Google sign-in could not load. Please check your connection and retry.');const provider=new authSDK.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});const result=await deadline(authSDK.signInWithPopup(auth,provider),90000,'Google sign-in was not completed. Close any old sign-in window before retrying.');const u=result.user;window.paUser=u;window.paSetIdentity?.({uid:u.uid,name:u.displayName||'',email:u.email||'',phone:(u.phoneNumber||'').replace(/^\+91/,'')});document.querySelector('#modal').close();window.paGo?.('profile')}catch(e){const messages={'auth/unauthorized-domain':'Firebase में techgaon.in को Authorized domain में जोड़ना बाकी है।','auth/operation-not-allowed':'Firebase में Google sign-in provider चालू करना बाकी है।','auth/popup-blocked':'ब्राउज़र ने Google की विंडो रोकी है। Popup की अनुमति देकर दोबारा क्लिक करें।','auth/popup-closed-by-user':'Google लॉग इन बंद किया गया।'};window.paToast?.(messages[e.code]||'Google लॉग इन पूरा नहीं हुआ। कृपया दोबारा कोशिश करें।')}finally{if(b)b.disabled=false}};
window.paSignOut=async()=>{if(auth)await authSDK.signOut(auth);window.paUser=null;window.paSetIdentity?.(null);window.paGo?.('home')};
const decoder=new TextDecoder();
async function docxText(file){const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer);let p=bytes.length-22;while(p>=Math.max(0,bytes.length-65557)&&v.getUint32(p,true)!==0x06054b50)p--;if(p<0)throw Error('DOCX पढ़ा नहीं जा सका।');let c=v.getUint32(p+16,true),count=v.getUint16(p+10,true);for(let i=0;i<count;i++){if(v.getUint32(c,true)!==0x02014b50)break;const method=v.getUint16(c+10,true),size=v.getUint32(c+20,true),uncompressed=v.getUint32(c+24,true),nl=v.getUint16(c+28,true),xl=v.getUint16(c+30,true),cl=v.getUint16(c+32,true),name=decoder.decode(bytes.subarray(c+46,c+46+nl)),offset=v.getUint32(c+42,true);if(name==='word/document.xml'){if(uncompressed>15000000)throw Error('DOCX का पाठ बहुत बड़ा है।');const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true),compressed=bytes.slice(start,start+size);let data;if(method===0)data=compressed;else if(method===8){const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));data=new Uint8Array(await new Response(stream).arrayBuffer())}else throw Error('यह DOCX compression समर्थित नहीं है।');const xml=new DOMParser().parseFromString(decoder.decode(data),'application/xml');return [...xml.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).join('\n')}c+=46+nl+xl+cl}throw Error('DOCX में document.xml नहीं मिला।')}
let ocrWorker,reading=false,cancelRead=false;
window.paCancelReading=()=>{cancelRead=true};
async function recognize(image,onProgress){
  if(!ocrWorker){
    onProgress('Loading Hindi + English OCR (first use may take a minute)…');
    const sdk=await dependency('ocr');
    ocrWorker=await deadline(sdk.createWorker(['hin','eng'],1,{...await ocrOptions(),logger:m=>{if(m.status==='recognizing text')onProgress('OCR: '+Math.round(m.progress*100)+'%')}}),120000,'OCR could not load. Please check your connection and retry.');
  }
  if(cancelRead)throw Error('Reading cancelled.');
  const {data}=await ocrWorker.recognize(image);
  return data;
}
window.paReadFile=async(file,onProgress=()=>{})=>{
  if(reading)throw Error('Another document is being read. Wait for it to finish.');
  if(file.size>25*1024*1024)throw Error('Maximum file size: 25 MB.');
  reading=true;cancelRead=false;
  let pdf;
  try{
    onProgress('Reading '+file.name+'…');
    if(/\.txt$/i.test(file.name))return (await file.text()).slice(0,100000);
    if(/\.docx$/i.test(file.name))return (await docxText(file)).slice(0,100000);
    if(file.type.startsWith('image/')){
      const data=await recognize(file,onProgress);
      if(data.confidence<65)onProgress('Low-confidence OCR. Check the extracted text carefully.');
      return '[OCR; review against the image; confidence '+Math.round(data.confidence)+'%]\n'+data.text.slice(0,100000);
    }
    if(!/\.pdf$/i.test(file.name))throw Error('Choose PDF, DOCX, TXT or an image.');
    const sdk=await pdfReader();
    pdf=await sdk.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:new URL('vendor/cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/standard_fonts/',document.baseURI).href}).promise;
    const start=Math.max(1,Number(document.querySelector('#read-from')?.value)||1);
    const requestedEnd=Number(document.querySelector('#read-to')?.value)||Math.min(pdf.numPages,start+49);
    const end=Math.min(pdf.numPages,requestedEnd);
    if(start>pdf.numPages||end<start||end-start>=50)throw Error('Choose a valid range of up to 50 pages. This PDF has '+pdf.numPages+' pages.');
    const lines=['[Document: '+file.name+'; pages '+start+'–'+end+' of '+pdf.numPages+']'];
    if(start>1||end<pdf.numPages)lines.push('[PARTIAL EXTRACTION: other pages have not been read.]');
    for(let n=start;n<=end;n++){
      if(cancelRead)throw Error('Reading cancelled.');
      onProgress('PDF page '+n+'/'+pdf.numPages);
      const page=await pdf.getPage(n),content=await page.getTextContent();
      let text=content.items.map(i=>(i.str||'')+(i.hasEOL?'\n':' ')).join('');
      const bad=text.replace(/\s/g,'').length<35||text.split('\ufffd').length>Math.max(5,text.length*.1);
      let provenance='extracted text';
      if(bad){
        const initial=page.getViewport({scale:1});
        const scale=Math.min(2.2,Math.sqrt(4000000/(initial.width*initial.height)));
        const vp=page.getViewport({scale}),canvas=document.createElement('canvas');
        canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
        try{
          await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
          const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
          const data=await recognize(image,t=>onProgress('Page '+n+': '+t));
          text=data.text;provenance='OCR; confidence '+Math.round(data.confidence)+'%; review required';
        }finally{canvas.width=0;canvas.height=0}
      }
      lines.push('\n[Page '+n+'; '+provenance+']\n'+text);
      page.cleanup();
      if(lines.join('\n').length>100000){lines.push('[TEXT LIMIT: remaining selected pages have not been read.]');break}
    }
    if(cancelRead)throw Error('Reading cancelled.');
    return lines.join('\n').slice(0,105000);
  }finally{if(pdf)await pdf.destroy();reading=false}
};

// Minimal valid OOXML package, stored ZIP entries. Text is XML-escaped.
const x=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function crc32(b){let c=0xffffffff;for(const n of b){c^=n;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function zip(files){const te=new TextEncoder(),parts=[],directory=[];let offset=0;for(const [name,text]of Object.entries(files)){const n=te.encode(name),b=te.encode(text),crc=crc32(b),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,b.length,true);v.setUint32(22,b.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,b);const d=new Uint8Array(46+n.length),w=new DataView(d.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint32(16,crc,true);w.setUint32(20,b.length,true);w.setUint32(24,b.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);d.set(n,46);directory.push(d);offset+=h.length+b.length}const size=directory.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,directory.length,true);e.setUint16(10,directory.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
window.paDocx=text=>{const ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',r=t=>`<w:r><w:rPr><w:rFonts w:ascii="Nirmala UI" w:hAnsi="Nirmala UI" w:cs="Nirmala UI"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`,rels=(items)=>`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;const files={'[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>','_rels/.rels':rels('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'),'word/document.xml':`<?xml version="1.0" encoding="UTF-8"?><w:document ${ns}><w:body>${text.split('\n').map(t=>`<w:p>${r(t)}</w:p>`).join('')}<w:sectPr><w:footerReference w:type="default" r:id="footer"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="900" w:bottom="1100" w:left="900" w:footer="500"/></w:sectPr></w:body></w:document>`,'word/_rels/document.xml.rels':rels('<Relationship Id="footer" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'),'word/footer1.xml':`<?xml version="1.0" encoding="UTF-8"?><w:ftr ${ns}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="10000"/></w:tabs></w:pPr><w:hyperlink r:id="tech">${r('TechGaon AI Services')}</w:hyperlink><w:r><w:tab/></w:r><w:hyperlink r:id="app">${r('PANCHAYT AI')}</w:hyperlink></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>`,'word/_rels/footer1.xml.rels':rels('<Relationship Id="tech" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://techgaon.in/" TargetMode="External"/><Relationship Id="app" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://techgaon.in/panchayatai/" TargetMode="External"/>')};const url=URL.createObjectURL(zip(files)),a=document.createElement('a');a.href=url;a.download='Panchayt-AI-Patra.docx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)};

loadAuth().catch(()=>{});
