import './ai.js';
import './cloud.js';
const $=s=>document.querySelector(s);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canonical=s=>String(s||'').trim().toUpperCase().replace(/\s+/g,' ');
const owner=()=>window.paUser?.uid||'local';
const historyKey=()=> 'pa-chat-'+owner();
function chatHistory(){try{return JSON.parse(localStorage.getItem(historyKey())||'[]')}catch{return []}}
function remember(question,result){
  const items=chatHistory();items.unshift({id:crypto.randomUUID(),question,text:result.text,citations:result.citations,at:new Date().toISOString()});
  try{localStorage.setItem(historyKey(),JSON.stringify(items.slice(0,40)))}catch{window.paToast?.('Browser storage is full. Download your documents before clearing storage.')}
}
function showAI(question,result,target){
  if(!target?.isConnected)return;
  target.innerHTML='<article class="answer ai-result"><span class="tag">AI explanation · हिन्दी</span><div class="ai-text"></div><p class="hint">Check the cited original pages before issuing a letter or taking action.</p><div class="actions"><button id="copy-answer" class="outline">Copy answer</button><button id="answer-to-draft" class="outline">Use in draft</button></div></article>';
  target.querySelector('.ai-text').textContent=result.text;
  $('#copy-answer').onclick=()=>navigator.clipboard.writeText(result.text).then(()=>window.paToast?.('Answer copied.')).catch(()=>window.paToast?.('Select the answer text and copy it.'));
  $('#answer-to-draft').onclick=()=>{window.paSetDraft?.(result.text);window.paGo?.('draft')};
  if(result.citations?.length){
    const sources=document.createElement('div');sources.className='card';
    sources.innerHTML='<h3>Cited source pages</h3>'+result.citations.map(c=>'<p>'+safe(c.id)+' · page '+c.page+' · '+safe(c.title)+'</p>').join('')+'<button id="compile-citations">Download cited pages (one PDF)</button>';
    target.append(sources);sources.querySelector('button').onclick=()=>window.paCompileReferences?.(result.citations);
  }
}
let asking=false;
async function askAI(){
  if(asking)return;
  const q=$('#question')?.value.trim(),target=$('#answers'),b=$('#ask-ai');
  if(!q)return window.paToast?.('कृपया अपना प्रश्न लिखें।');
  asking=true;b.disabled=true;target.innerHTML='<div class="answer" role="status">Finding relevant source pages…</div>';
  try{
    const config=await window.paAI.configuration();
    if(!config.ai.enabled||!config.ai.appCheckSiteKey)throw Error('AI activation is pending in the owner’s Firebase project. You can search source pages and prepare templates now.');
    const passages=await window.paFindPassages(q);
    if(!target.isConnected)return;
    target.textContent='Preparing an answer in Hindi with source citations…';
    const include=$('#ai-attachments')?.checked;
    const attachments=include?($('#extracted')?.value||''):'';
    const result=await window.paAI.generate(q,passages,attachments);
    showAI(q,result,target);remember(q,result);
  }catch(error){if(target.isConnected){target.innerHTML='<div class="notice" role="status">'+safe(error.message)+'</div><button id="source-fallback" class="outline">Search source pages</button>';$('#source-fallback').onclick=()=>window.paDatabaseAnswer(q)}}
  finally{asking=false;if(b?.isConnected)b.disabled=false}
}
async function draftAI(){
  const form=$('#draftform'),button=$('#ai-draft'),error=$('#draft-error');
  if(!form.reportValidity())return;
  button.disabled=true;error.textContent='Preparing an editable Hindi draft…';
  try{
    const f=Object.fromEntries(new FormData(form)),p=window.paProfile?.()||{};
    const passages=await window.paFindPassages([f.subject,f.reference].filter(Boolean).join(' '));
    const question='नीचे दिए गए विवरण पर '+f.type+' का औपचारिक कार्यालयी मसौदा तैयार करें। तारीख '+new Date().toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata'})+' है। नियम संबंधी निष्कर्ष केवल दिए गए संदर्भ से लिखें।\n'+JSON.stringify({document:f,signatory:{name:p.name,designation:p.role,district:p.district,block:p.block}});
    const result=await window.paAI.generate(question,passages,'','draft');
    if(!form.isConnected)return;
    window.paSetDraft(result.text);error.textContent='Draft ready. Review the facts and citations before issue.';
  }catch(e){if(error.isConnected)error.textContent=e.message}
  finally{if(button.isConnected)button.disabled=false}
}
let directory;
const districtCache=new Map();
async function locations(){
  if(directory)return directory;
  const r=await fetch('locations/districts.json',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Official directory has not been published yet.');return directory=await r.json();
}
async function profileLocations(){
  const form=$('#profileform');if(!form||form.dataset.locations)return;form.dataset.locations='loading';
  const district=form.elements.district,block=form.elements.block,gps=form.elements.gps;
  const status=document.createElement('p');status.className='hint';status.id='directory-status';status.textContent='Loading official district directory…';form.append(status);
  try{
    const data=await locations();if(!form.isConnected)return;
    form.insertAdjacentHTML('beforeend','<datalist id="pa-districts">'+data.districts.map(d=>'<option value="'+safe(d.name)+'"></option>').join('')+'</datalist><datalist id="pa-blocks"></datalist><input type="hidden" name="locationSource"><input type="hidden" name="gpLGDCodes">');
    const picker=document.createElement('div');picker.className='formgrid';picker.innerHTML='<label class="full">Add from official Gram Panchayats<select id="pa-gp-picker"><option value="">Choose district and block first</option></select></label><button type="button" id="pa-add-gp" class="outline">Add selected Panchayat</button>';
    $('#gpfield').append(picker);
    let current,loadId=0;
    function syncGP(){
      const rows=(current?.panchayats||[]).filter(p=>canonical(p.block)===canonical(block.value));
      $('#pa-gp-picker').innerHTML='<option value="">Select Gram Panchayat</option>'+rows.map(p=>'<option value="'+safe(p.name)+'">'+safe(p.name)+(p.lgd?' · LGD '+safe(p.lgd):' · code unavailable')+'</option>').join('');
      const entered=gps.value.split(/[,\n]+/).map(canonical).filter(Boolean),matched=rows.filter(p=>entered.includes(canonical(p.name)));
      form.elements.gpLGDCodes.value=JSON.stringify(matched.map(p=>({name:p.name,lgd:p.lgd})));
      form.elements.locationSource.value=current&&matched.length===entered.length&&entered.length?current.source:'';
      status.textContent=current?'Official PB3 snapshot: '+current.panchayats.length+' GP records in '+current.district+'. Retrieved '+new Date(current.retrievedAt).toLocaleDateString('en-GB')+'. '+(entered.length&&matched.length!==entered.length?'Some typed names are outside this block’s imported list. Verify before saving.':'GP codes are matched within the selected block.'):'District list loaded. Detailed directory refresh is pending; manually entered blocks/GPs are unverified.';
    }
    async function loadDistrict(reset){
      const request=++loadId;current=null;
      if(reset){block.value='';gps.value=''}
      const d=data.districts.find(d=>canonical(d.name)===canonical(district.value));
      if(!d){syncGP();return}
      district.value=d.name;status.textContent='Loading '+d.name+'…';
      try{
        let loaded=districtCache.get(d.code);
        if(!loaded){const r=await fetch('locations/'+d.code+'.json',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('District import pending');loaded=await r.json();districtCache.set(d.code,loaded)}
        if(request!==loadId||!form.isConnected)return;current=loaded;
        $('#pa-blocks').innerHTML=[...new Set(current.panchayats.map(p=>p.block))].sort().map(b=>'<option value="'+safe(b)+'"></option>').join('');
      }catch{if(request!==loadId||!form.isConnected)return;$('#pa-blocks').innerHTML=''}
      syncGP();
    }
    district.addEventListener('change',()=>loadDistrict(true));
    district.addEventListener('input',()=>{if(data.districts.some(d=>canonical(d.name)===canonical(district.value)))loadDistrict(true)});
    block.addEventListener('change',()=>{gps.value='';syncGP()});block.addEventListener('input',syncGP);gps.addEventListener('input',syncGP);
    $('#pa-add-gp').onclick=()=>{const value=$('#pa-gp-picker').value;if(!value)return;const values=[...new Set(gps.value.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).concat(value))];const multi=/ग्राम पंचायत अधिकारी|ग्राम विकास अधिकारी/.test(form.elements.role.value);if(values.length>(multi?20:1))return window.paToast?.(multi?'Maximum 20 Panchayats.':'This role supports one Panchayat.');gps.value=values.join(', ');syncGP()};
    form.dataset.locations='ready';await loadDistrict(false);
  }catch(e){if(status.isConnected)status.textContent=e.message+' You can enter your office manually.'}
}
function readingControls(){
  const list=$('#filelist');if(!list||$('#read-from'))return;
  const controls=document.createElement('details');controls.className='reading-options';controls.innerHTML='<summary>PDF page range (up to 50 pages at a time)</summary><div class="formgrid"><label>From page<input id="read-from" type="number" min="1" value="1"></label><label>To page<input id="read-to" type="number" min="1" placeholder="First 50 pages by default"></label></div><p class="hint">Only the selected range is read. OCR runs on this device; attachments stay local until you choose to include reviewed text with an AI request.</p>';
  list.before(controls);
  if(!$('#extractedbox'))list.insertAdjacentHTML('afterend','<button type="button" id="cancel-reading" class="outline" hidden>Cancel reading</button><details id="extractedbox" hidden><summary>Review extracted text</summary><textarea id="extracted" style="min-height:160px"></textarea><button type="button" id="use-reviewed" class="outline">Add reviewed text to facts</button></details>');
  if($('#use-reviewed'))$('#use-reviewed').onclick=()=>{const f=$('[name=facts]');if(f)f.value+=(f.value?'\n\n':'')+$('#extracted').value};
  if($('#extracted'))$('#extracted').readOnly=false;
}
async function routeExtras(){
  if($('#ask-ai'))$('#ask-ai').onclick=askAI;
  if($('#question')&&!$('#ai-attachments'))$('#question').after(Object.assign(document.createElement('label'),{className:'ai-consent',innerHTML:'<input type="checkbox" id="ai-attachments"> Include reviewed attachment text with this AI request'}));
  if($('#ai-draft'))$('#ai-draft').onclick=draftAI;
  readingControls();
  if($('#profileform'))await profileLocations();
  if(window.paCurrentPage?.()==='history'){
    const section=document.createElement('section');section.innerHTML='<h2>AI conversations on this device</h2>';
    for(const item of chatHistory()){
      const card=document.createElement('article');card.className='source';card.innerHTML='<h3>'+safe(item.question)+'</h3><p class="hint">'+safe(new Date(item.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))+'</p><details><summary>View answer</summary><div class="ai-text">'+safe(item.text)+'</div></details>';
      section.append(card);
    }
    if(!chatHistory().length)section.insertAdjacentHTML('beforeend','<p class="muted">No saved AI conversations.</p>');$('#main').append(section);
  }
  if(window.paCurrentPage?.()==='profile'&&window.paUser){const button=document.createElement('button');button.className='outline';button.textContent='Sign out of Google';button.onclick=()=>window.paSignOut?.();$('#main').append(button)}
  if(window.paCurrentPage?.()==='setup'){
    const area=$('#main');area.innerHTML='<h1>Service Status</h1><div class="card"><h3>Available</h3><p>English interface, Hindi document templates, editable drafts, DOCX export, local history and source-page search. Uploaded PDFs support text extraction and Hindi + English OCR, including mixed scanned/text pages, with explicit page-range limits.</p><h3>Official directory</h3><p>75 districts from the UP Panchayati Raj department. Detailed block/GP imports show their source and retrieval date. Unimported or manually typed entries are labelled unverified.</p><h3>References</h3><p>Compile selected original pages into one PDF. Downloads require a verified source checksum and a located passage for yellow highlighting. No full-collection download button is offered.</p><h3>AI connection</h3><p id="ai-service-state">Checking configuration…</p><h3>Google sign-in</h3><p>Uses the existing TechGaon Firebase project. The Google provider and techgaon.in authorized domain must be enabled by the project owner. Connection failures allow retry.</p><h3>News</h3><p>Source-linked headlines refresh through the existing scheduled workflow. Headlines are not government orders.</p><h3>Outside this update</h3><p>Admin and UPI payment verification are excluded at your request. Cloud profile/history storage and a complete OCR pass over the entire government-document collection require separate service/data activation.</p></div>';
    try{const config=await window.paAI.configuration();if($('#ai-service-state'))$('#ai-service-state').textContent=config.ai.enabled&&config.ai.appCheckSiteKey?'Firebase AI Logic is configured. A successful answer confirms service availability.':'Code is integrated; activation is pending: Firebase AI Logic + production App Check site key. AI responses are not advertised as live.'}catch(e){if($('#ai-service-state'))$('#ai-service-state').textContent=e.message}
  }
}
window.addEventListener('pa:route',routeExtras);routeExtras();
