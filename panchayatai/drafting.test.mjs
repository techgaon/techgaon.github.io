import test from 'node:test';
import assert from 'node:assert/strict';
import {context,retrieve,request,render,validate} from './drafting-core.mjs';
import {corpus} from './drafting-corpus.mjs';
const b={kind:'नोटिस',points:'ग्राम पंचायत रामपुर की तरफ से सफाईकर्मी दिनेश को दो दिन अनुपस्थित रहने और ग्रामीण शिकायत पर नोटिस बनाओ',profile:{role:'gpa',name:'[सचिव का नाम]',gps:['दूसरी पंचायत','तीसरी पंचायत']}};
const payload=()=>({subject:'अनुपस्थिति पर स्पष्टीकरण',recipient:'दिनेश, सफाईकर्मी',gpOverride:'रामपुर',paragraphs:['अपना स्पष्टीकरण प्रस्तुत करें।'],attachments:[],copies:[],missing:['अनुपस्थिति की तिथियाँ','उत्तर की समय-सीमा'],evidence:[{quote:'दो दिन अनुपस्थित',supports:'अनुपस्थिति'}],staff:{name:'दिनेश',post:'सफाईकर्मी',absence:'दो दिन अनुपस्थित रहने',complaint:'ग्रामीण शिकायत',work:''}});
test('all 53 sources accounted for without publishing excluded private records',()=>{
 const ids=new Set(corpus.flatMap(t=>t.sourceIds));
 for(let i=1;i<=53;i++)assert.equal(ids.has(`SRC-${String(i).padStart(3,'0')}`),![8,23,33].includes(i));
 assert.equal(corpus.length,17);
});
test('multi GP has no silent first GP; explicit selection and one GP work',()=>{
 assert.equal(context(b).gp,'[ग्राम पंचायत भरें]');
 assert.equal(context({...b,gp:'रामपुर'}).gp,'रामपुर');
 assert.equal(context({profile:{gps:['एक पंचायत']}}).gp,'एक पंचायत');
});
test('staff notice retrieves actual historical notice abstractions',()=>assert.equal(retrieve(b)[0].id,'staff-notice'));
test('short notice preserves facts and leaves unknown mandatory details blank',()=>{
 const result=render(payload(),b);
 for(const text of ['रामपुर','दिनेश','दो दिन अनुपस्थित रहने','ग्रामीण शिकायत','[तिथियाँ भरें]','[निर्गमन दिनांक भरें]','[उत्तर की समय-सीमा भरें]','पंचायत सचिव (ग्राम पंचायत अधिकारी)'])assert.ok(result.html.includes(text),text);
 assert.ok(!/2025|2026|तीन दिवस|वेतन|निरीक्षण|बर्खास्त/.test(result.html));
 assert.equal(result.review.required,true);
});
test('staff notice ignores generative allegations in main body',()=>{
 const p=payload();p.paragraphs=['निरीक्षण में दोष सिद्ध हुआ।'];
 assert.ok(!render(p,b).html.includes('दोष सिद्ध'));
});
test('sahayak and resident do not acquire secretary notice power',()=>{
 for(const role of ['sahayak','resident','clerk']){
 const html=render(payload(),{...b,profile:{role}}).html;
 assert.ok(html.includes('सक्षम अधिकारी'));assert.ok(!html.includes('अपना तथ्यात्मक स्पष्टीकरण'));assert.ok(!html.includes('पंचायत सचिव'));
 }
});
test('assistant work notice accepts only request quotes',()=>{
 const req={...b,points:'पंचायत सहायक द्वारा काम न किए जाने का नोटिस बनाओ'};
 const p=payload();p.gpOverride='';p.evidence=[];p.staff={name:'',post:'पंचायत सहायक',work:'काम न किए जाने'};
 assert.ok(render(p,req).html.includes('[कर्मी का नाम भरें]'));
});
test('invented GP, evidence, dates, names, deadlines fail closed',()=>{
 for(const update of [{gpOverride:'मनगढ़ंतपुर'},{evidence:[{quote:'काल्पनिक शिकायत',supports:'शिकायत'}]},{paragraphs:['दिनांक 01/01/2030']},{staff:{...payload().staff,name:'अन्य नाम'}},{staff:{...payload().staff,deadline:'तीन दिन'}}])assert.throws(()=>render({...payload(),...update},b));
});
test('unsupported legal or punitive statements rejected',()=>{
 for(const text of ['वेतन रोक दिया जाएगा।','वसूली होगी।','प्राथमिकी दर्ज होगी।','शासनादेश के अनुसार।','बर्खास्त किया जाएगा।'])assert.throws(()=>render({...payload(),paragraphs:[text]},b));
});
test('malformed lists, empty results and invalid staff slots rejected',()=>{
 assert.throws(()=>render({...payload(),copies:'ADO'},b));
 assert.throws(()=>render({...payload(),paragraphs:[]},b));
 assert.throws(()=>render({...payload(),staff:{name:{bad:true}}},b));
});
test('HTML is escaped, including single quote attributes and SVG',()=>{
 const req={kind:'पत्र',points:'सामान्य पत्र',profile:{role:'gpa',name:'<img src=x onerror=alert(1)>'}};
 const p={subject:'<svg onload=x>',recipient:'<iframe>',paragraphs:['<script>alert(1)</script>'],evidence:[]};
 // Unsupported number guard also applies to active-content payloads.
 assert.throws(()=>render(p,req));p.paragraphs=['<script>alert(x)</script>'];
 const html=render(p,req).html;assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;svg'));
});
test('binary attachment is explicitly marked as needing separate review',()=>{
 assert.equal(render(payload(),{...b,att:[{name:'scan.pdf',data:'sample',mime:'application/pdf'}]}).review.attachmentReview,true);
});
test('district officers have district heading; certificates omit service address',()=>{
 const req={kind:'प्रमाणपत्र',points:'अभिलेख प्रमाणपत्र',profile:{role:'dpro',district:'[जनपद]'}};
 const p={subject:'प्रमाणपत्र',paragraphs:['[अभिलेख सत्यापन के बाद तथ्य भरें]'],evidence:[]};
 const html=render(p,req).html;assert.ok(!html.includes('सेवा में'));assert.ok(!html.includes('विकास खण्ड'));assert.ok(html.includes('जिला पंचायत राज अधिकारी'));
});
test('generic model prompt contains no automatic date and separates template from authority',()=>{
 const prepared=request(b);assert.ok(prepared.system.includes('कानूनी प्रमाण नहीं'));assert.ok(prepared.system.includes('आज की तारीख'));assert.ok(!prepared.prompt.includes(new Date().toISOString().slice(0,10)));
});
test('numeric facts use current instruction not template history',()=>{
 const p={subject:'बैंक विवरण',recipient:'शाखा प्रबंधक',paragraphs:['वर्ष 2024 का विवरण दें।'],evidence:[]};
 assert.throws(()=>validate(p,{points:'बैंक का स्टेटमेंट दें'}));
 assert.doesNotThrow(()=>validate(p,{points:'वर्ष 2024 का बैंक स्टेटमेंट दें'}));
});
test('copies require explicit current instruction, never sample recipients',()=>{
 assert.throws(()=>render({...payload(),copies:['खंड विकास अधिकारी']},b));
});
