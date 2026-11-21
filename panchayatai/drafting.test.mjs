import test from 'node:test';
import assert from 'node:assert/strict';
import {context,retrieve,request,render,validate} from './drafting-core.mjs';
import {corpus,sourceAudit} from './drafting-corpus.mjs';
const b={kind:'नोटिस',points:'ग्राम पंचायत रामपुर की तरफ से सफाईकर्मी दिनेश को दो दिन अनुपस्थित रहने और ग्रामीण शिकायत पर नोटिस बनाओ',profile:{role:'gpa',name:'[सचिव का नाम]',gps:['दूसरी पंचायत','तीसरी पंचायत']}};
const payload=()=>({subject:'अनुपस्थिति पर स्पष्टीकरण',recipient:'दिनेश, सफाईकर्मी',gpOverride:'रामपुर',paragraphs:['अपना स्पष्टीकरण प्रस्तुत करें।'],attachments:[],copies:[],missing:['अनुपस्थिति की तिथियाँ','उत्तर की समय-सीमा'],evidence:[{quote:'दो दिन अनुपस्थित',supports:'अनुपस्थिति'}],staff:{name:'दिनेश',post:'सफाईकर्मी',absence:'दो दिन अनुपस्थित रहने',complaint:'ग्रामीण शिकायत',work:''}});
test('all 53 uploaded documents audited with privacy-safe learning status',()=>{
 assert.equal(sourceAudit.length,53);
 assert.equal(sourceAudit.filter(x=>x.format==='docx').length,41);
 assert.equal(sourceAudit.filter(x=>x.format==='pdf').length,12);
 assert.equal(corpus.length,36);
 const all=new Set(sourceAudit.map(s=>s.id));
 const patterns=new Set(corpus.flatMap(t=>t.sourceIds));
 for(let i=1;i<=53;i++)assert.ok(all.has(`SRC-${String(i).padStart(3,'0')}`));
 assert.equal(sourceAudit.find(x=>x.id==='SRC-006').handling,'excluded_private');
 assert.equal(sourceAudit.find(x=>x.id==='SRC-031').handling,'excluded_private');
 for(const src of sourceAudit.filter(x=>!['excluded_private','layout_only'].includes(x.handling)))
   assert.ok(patterns.has(src.id),src.id);
 for(const src of sourceAudit.filter(x=>x.handling==='excluded_private'))
   assert.ok(!patterns.has(src.id),'No private source in exemplar corpus');
});
test('multi GP has no silent first GP; explicit selection and one GP work',()=>{
 assert.equal(context(b).gp,'');
 assert.equal(context({...b,gp:'रामपुर'}).gp,'रामपुर');
 assert.equal(context({profile:{gps:['एक पंचायत']}}).gp,'एक पंचायत');
});
test('staff notice retrieves sanitised sanitation-worker template',()=>assert.equal(retrieve(b)[0].id,'showcause-sanitation'));
test('short notice preserves facts and leaves unknown mandatory details blank',()=>{
 const result=render(payload(),b);
 for(const text of ['रामपुर','दिनेश','दो दिन अनुपस्थित रहने','ग्रामीण शिकायत','पंचायत सचिव (ग्राम पंचायत अधिकारी)'])assert.ok(result.html.includes(text),text);
 assert.ok(!/2025|2026|तीन दिवस|वेतन|निरीक्षण|बर्खास्त|\[[^\]]+भरें\]/.test(result.html));
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
 assert.ok(!render(p,req).html.includes('[कर्मी का नाम भरें]'));
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

test('minimal ADO letter uses complete profile and no blank placeholders',()=>{
 const req={kind:'पत्र',points:'एडीओ पंचायत को पत्र बनाओ',profile:{role:'gpa',name:'पंकज कुमार',block:'हैदरगढ़',district:'बाराबंकी',gps:['कमेला']}};
 const p={subject:'आवश्यक सूचना प्रेषित करने के संबंध में।',recipient:'सहायक विकास अधिकारी (पंचायत), विकास खण्ड हैदरगढ़, बाराबंकी',paragraphs:['उपरोक्त विषयक आवश्यक सूचना आपके अवलोकनार्थ प्रेषित है।'],evidence:[],missing:[]};
 const result=render(p,req);
 assert.ok(result.html.includes('पंकज कुमार'));
 assert.ok(result.html.includes('सहायक विकास अधिकारी'));
 assert.ok(result.html.includes('हैदरगढ़'));
 assert.ok(!/\[[^\]]+भरें\]/.test(result.html));
 assert.ok(!result.html.includes('____________'));
});
test('pradhan official GP office letter suppresses personal header',()=>{
 const req={kind:'पत्र',points:'ग्राम पंचायत कार्यालय की ओर से BDO को पत्र बनाओ',stationery:'gp_office',
   profile:{role:'pradhan',name:'राधा देवी',district:'बाराबंकी',block:'हैदरगढ़',gps:['कमेला']}};
 const p={subject:'ग्राम पंचायत कार्य संबंधी पत्र',recipient:'खण्ड विकास अधिकारी, हैदरगढ़',paragraphs:['विषयक आवश्यक कार्यवाही करने का कष्ट करें।'],evidence:[]};
 const result=render(p,req);
 assert.ok(result.html.includes('कार्यालय — ग्राम पंचायत कमेला'));
 assert.ok(result.html.includes('राधा देवी'));
 assert.ok(!/\[[^\]]+भरें\]/.test(result.html));
});
test('pradhan own-letterhead draft contains body but not duplicated personal header',()=>{
 const req={kind:'पत्र',points:'बीडीओ को पत्र बनाओ',stationery:'pradhan_letterhead',
  profile:{role:'pradhan',name:'राधा देवी',district:'बाराबंकी',block:'हैदरगढ़',gps:['कमेला']}};
 const p={subject:'विषयक अनुरोध',recipient:'खण्ड विकास अधिकारी, हैदरगढ़',paragraphs:['आवश्यक कार्यवाही की अपेक्षा है।'],evidence:[]};
 const result=render(p,req);
 assert.ok(!result.html.includes('कार्यालय — ग्राम प्रधान'));
 assert.ok(result.html.includes('राधा देवी'));
});

test('53-source corpus contains exact recipient-role-specific patterns',()=>{
 const ids=new Set(corpus.map(x=>x.id));
 for(const id of ['department-ado','department-bdo','department-dpro','rti-reply',
  'disciplinary-reply','birth-inquiry','death-inquiry','showcause-housing',
  'gram-sabha-proceedings','bank-statement','tender-invite'])
  assert.ok(ids.has(id),id);
});
test('brief ADO request retrieves ADO-specific corpus pattern',()=>{
 const r=retrieve({kind:'पत्र',points:'ADO को पत्र बना दो',profile:{role:'gpa'}});
 assert.equal(r[0]?.id,'department-ado');
});
test('training abstractions never embed phone/account/identity from uploaded sources',()=>{
 const content=JSON.stringify(corpus);
 assert.ok(!/\b(?:\d[ -]?){10,18}\b/.test(content));
 assert.ok(!content.includes('चंद्र भानु'));
 assert.ok(!content.includes('नारायण द्विवेदी'));
 assert.ok(!content.includes('राजेश कुमारी'));
});
