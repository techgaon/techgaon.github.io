const fs=require('fs'),path=require('path'),assert=require('assert'),http=require('http');
const root=process.env.GITHUB_WORKSPACE,p=path.join(root,'panchayatai');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),jsQR=require('jsqr'),JSZip=require('jszip'),{PDFDocument}=require('pdf-lib');
(async()=>{
 const {render}=await import('file://'+p+'/drafting-core.mjs');
 const input={kind:'पत्र',points:'BDO ko safai ke liye patra',promptAt:'2026-11-22T06:00:00Z',profile:{role:'gpa',nameHindi:'परीक्षण सचिव',gps:['कमेला'],blockHindi:'हैदरगढ़',districtHindi:'बाराबंकी'}};
 const html=render({subject:'सफाई व्यवस्था',recipient:'खण्ड विकास अधिकारी',paragraphs:['ग्राम पंचायत की सफाई व्यवस्था हेतु अनुरोध है।','उपलब्ध जानकारी के अनुसार आवश्यक कार्यवाही करने का कष्ट करें।'],evidence:[]},input).html;
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://local').pathname;
  if(pathname.endsWith('office-test-harness.html')){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><body></body></html>');}
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',(target.endsWith('.js')||target.endsWith('.mjs'))?'text/javascript':'application/octet-stream');fs.createReadStream(target).pipe(res);
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:1000}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/panchayatai/office-test-harness.html');
 await page.setContent('<!doctype html><html><head></head><body><div id="paper"></div><div id="qr"></div></body></html>');
 const fontCandidates=['/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf','/usr/share/fonts/truetype/noto/NotoSansDevanagari[wdth,wght].ttf'];
 const font=fontCandidates.find(f=>fs.existsSync(f));
 if(font)await page.addStyleTag({content:'@font-face{font-family:"Noto Sans Devanagari";src:url(data:font/ttf;base64,'+fs.readFileSync(font).toString('base64')+')}body{font-family:"Noto Sans Devanagari",sans-serif}'});
 await page.addScriptTag({path:path.join(p,'draft-card.js')});
 await page.addScriptTag({path:require.resolve('html2pdf.js/dist/html2pdf.bundle.min.js')});
 await page.addScriptTag({path:path.join(path.dirname(require.resolve('docx')),'index.umd.cjs')});
 await page.addScriptTag({path:path.join(p,'docx-export.js')});
 await page.addScriptTag({path:path.join(p,'vendor/qrcode-generator.js')});
 await page.addScriptTag({path:path.join(p,'payment-flow.js')});
 const result=await page.evaluate(async html=>{
  const paper=document.querySelector('#paper');paper.innerHTML=window.PAI_DRAFT_CARD.sanitize(html);paper.dataset.docSize='12';
  const output=window.PAI_DRAFT_CARD.outputDate(paper,'pdf');
  const blank=output.querySelector('[data-pai-date]').textContent;
  const full=paper.querySelector('[data-pai-date]').textContent;
  const pdf=await window.PAI_DRAFT_CARD.pdfBlob(paper);
  const word=await window.PAI_DOCX.createBlob(paper,'test.docx');
  const uri=window.PAI_PAYMENTS.uri('techgaon@upi','TechGaon AI Services',49,'PAITEST','Plus');
  const png=await window.PAI_PAYMENTS.qr(document.querySelector('#qr'),uri);
  let bad=false;try{window.PAI_PAYMENTS.uri('javascript:alert(1)','x',49);}catch{bad=true;}
  return {blank,full,pdf:Array.from(new Uint8Array(await pdf.arrayBuffer())),word:Array.from(new Uint8Array(await word.arrayBuffer())),uri,png,bad};
 },html);
 assert.match(result.blank,/^दिनांक:\s+\/11\/2026$/);assert(!result.blank.includes('_')&&!result.blank.includes('-'));assert.equal(result.full,'दिनांक: 22/11/2026');assert(result.bad);
 const pdf=await PDFDocument.load(Uint8Array.from(result.pdf));assert.equal(pdf.getPageCount(),1);
 assert(Math.abs(pdf.getPage(0).getWidth()-595.28)<2);assert(Math.abs(pdf.getPage(0).getHeight()-841.89)<2);
 const zip=await JSZip.loadAsync(Buffer.from(result.word)),xml=await zip.file('word/document.xml').async('string');
 assert(xml.includes('22/11/2026')&&!xml.includes('__/11/2026'));assert(xml.includes('w:jc w:val="right"'));assert(xml.includes('w:w="11906"')&&xml.includes('w:h="16838"'));
 const bitmap=PNG.sync.read(Buffer.from(result.png.split(',')[1],'base64'));
 const decoded=jsQR(new Uint8ClampedArray(bitmap.data),bitmap.width,bitmap.height);assert(decoded);assert.equal(decoded.data,result.uri);assert.equal(new URL(decoded.data).searchParams.get('am'),'49.00');
 fs.mkdirSync('office-test-artifacts',{recursive:true});fs.writeFileSync('office-test-artifacts/letter.pdf',Buffer.from(result.pdf));fs.writeFileSync('office-test-artifacts/letter.docx',Buffer.from(result.word));
 await page.screenshot({path:'office-test-artifacts/preview.png',fullPage:true});
 const fixture=await PDFDocument.create(),fixturePage=fixture.addPage();fixturePage.drawText('IGRS complaint CASE12345: drainage problem. No inspection completed.');
 const secondPage=fixture.addPage();secondPage.drawText('Pension and local governance approval rule');
 const fixtureBytes=await fixture.save();
 await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/panchayatai/tools.js'});
 await page.addScriptTag({path:path.join(p,'draft-workspace.js')});
 await page.evaluate(html=>{
  const holder=document.createElement('div');holder.id='igrs';document.body.append(holder);
  window.PAI_DRAFT_WORKSPACE.mount(holder,{kind:'IGRS निस्तारण आख्या',code:'igrs',profile:{role:'gpa',nameHindi:'परीक्षण सचिव',gps:['कमेला']},user:{uid:'test-user'},
   api:async(path,body)=>{window.igrsReceived=body;return {html,review:{missing:['वास्तविक कार्रवाई का विवरण']}};},toast:()=>{},save:async()=>{}});
 },html);
 await page.locator('#igrs input[type=file]').setInputFiles({name:'case-native.pdf',mimeType:'application/pdf',buffer:Buffer.from(fixtureBytes)});
 await page.locator('#igrs #paiWrite').click();
 try{await page.waitForFunction(()=>!!window.igrsReceived);}catch(error){console.error('IGRS STATUS:',await page.locator('#igrs #paiWriteStatus').innerText());await page.screenshot({path:'office-test-artifacts/igrs-error.png',fullPage:true});throw error;}
 const received=await page.evaluate(()=>window.igrsReceived);
 assert(received.att[0].text.includes('CASE12345'));assert(received.points.includes('निस्तारण'));
 await page.locator('#igrs [data-edit]').click();
 await page.locator('#igrs .inline-draft-paper').fill('उपलब्ध अभिलेखों के आधार पर संशोधित आख्या।');
 assert((await page.locator('#igrs .inline-draft-paper').innerText()).includes('संशोधित'));
 await page.evaluate(()=>window.PAI_PAYMENTS.notify({name:'Plus',activationId:'test-approval',until:Date.now()+86400000},'test-user'));
 assert(await page.locator('#paiPlusCelebration').isVisible());
 await page.locator('#paiPlusCelebration button').click();
 await page.evaluate(()=>window.PAI_PAYMENTS.notify({name:'Plus',activationId:'test-approval',until:Date.now()+86400000},'test-user'));
 assert.equal(await page.locator('#paiPlusCelebration').count(),0);
 await page.addScriptTag({path:require.resolve('pdf-lib/dist/pdf-lib.min.js')});
 await page.addScriptTag({path:path.join(p,'go-full-pdf.js')});
 const sha256=require('crypto').createHash('sha256').update(Buffer.from(fixtureBytes)).digest('hex');
 const fullGo=await page.evaluate(async({bytes,sha})=>{
   const id='0123456789abcdef01234567',file='blocks/'+id+'-1.pdf';
   const documentInfo={id,title:'Pension governance GO',documentType:'go',pageCount:2,
     availablePages:[1,2],blocks:[{file,first:1,last:2,sha256:sha}]};
   window.PAI_REFERENCES={load:async()=>({
      catalog:{incompleteArchive:false},
      index:{docs:[documentInfo],pages:[{doc:0,page:2,text:'Pension governance approval'}],terms:{}},
      url:location.origin+'/panchayatai/go-corpus/catalog.json'})};
   const nativeFetch=window.fetch.bind(window);
   window.fetch=async(url,options)=>{
      if(String(url).endsWith(file))return new Response(new Uint8Array(bytes),{status:200});
      return nativeFetch(url,options);
   };
   const result=await window.PAI_FULL_GO.create({id,pages:[2],query:'pension'},'pension');
   return {bytes:Array.from(new Uint8Array(await result.blob.arrayBuffer())),
      count:result.count,targetPage:result.targetPage,highlighted:result.highlighted};
 },{bytes:Array.from(new Uint8Array(fixtureBytes)),sha:sha256});
 assert.equal(fullGo.count,2);assert.equal(fullGo.highlighted,1);assert.equal(fullGo.targetPage,2);
 const checkedGo=await PDFDocument.load(Uint8Array.from(fullGo.bytes));
 assert.equal(checkedGo.getPageCount(),2);
 assert(checkedGo.getPage(0).getHeight()>fixturePage.getHeight()+90);
 for(const p of checkedGo.getPages())assert(p.node.Annots(),'All pages must link to the main content page');
 fs.writeFileSync('office-test-artifacts/full-go.pdf',Buffer.from(fullGo.bytes));
 const institutional=render({subject:'सफाई व्यवस्था',recipient:'सहायक विकास अधिकारी (पंचायत)',
   paragraphs:['ग्राम पंचायत में सफाई व्यवस्था सुनिश्चित करने हेतु आवश्यक कार्यवाही का अनुरोध है।'],evidence:[]},
   {...input,points:'ग्राम पंचायत कार्यालय की ओर से ADO को सफाई व्यवस्था पर पत्र बनाएँ'});
 const official=await page.evaluate(async officeHTML=>{
   const paper=document.createElement('div');paper.innerHTML=window.PAI_DRAFT_CARD.sanitize(officeHTML);
   paper.dataset.docSize='13';document.body.appendChild(paper);
   const header=paper.querySelector('[data-pai-office-header="1"]');
   if(!header)throw Error('Institutional heading disappeared during sanitization');
   const aligned=Array.from(header.querySelectorAll('h2,p')).every(e=>e.style.textAlign==='center');
   const word=await window.PAI_DOCX.createBlob(paper,'office.docx');
   const pdf=await window.PAI_DRAFT_CARD.pdfBlob(paper);
   paper.remove();return {aligned,word:Array.from(new Uint8Array(await word.arrayBuffer())),
     pdf:Array.from(new Uint8Array(await pdf.arrayBuffer()))};
 },institutional.html);
 assert(official.aligned,'all GP office heading lines must be centered');
 const officeZip=await JSZip.loadAsync(Buffer.from(official.word));
 const officeXml=await officeZip.file('word/document.xml').async('string');
 assert(officeXml.includes('कार्यालय ग्राम पंचायत'));
 assert(officeXml.includes('विकास खण्ड')&&officeXml.includes('जनपद'));
 assert(officeXml.includes('w:jc w:val="center"'), 'DOCX heading must be centered');
 const officialPdf=await PDFDocument.load(Uint8Array.from(official.pdf));
 assert(officialPdf.getPageCount()>=1&&officialPdf.getPageCount()<=2,'Office letter must fit A4');
 assert(Math.abs(officialPdf.getPage(0).getWidth()-595.28)<2);
 fs.writeFileSync('office-test-artifacts/official-office-letter.pdf',Buffer.from(official.pdf));
 fs.writeFileSync('office-test-artifacts/official-office-letter.docx',Buffer.from(official.word));
 await browser.close();server.close();console.log('PASS: Plain/office intent, centered GP heading, A4 Word/PDF alignment, UPI, IGRS, Plus and full GO.');


})().catch(e=>{console.error(e);process.exit(1);});