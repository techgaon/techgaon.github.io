import test from 'node:test';
import assert from 'node:assert/strict';
import {render,request,promptDate} from './drafting-core.mjs';
const profile={role:'gpa',nameHindi:'परीक्षण सचिव',gps:['कमेला'],blockHindi:'हैदरगढ़',districtHindi:'बाराबंकी'};
const payload={subject:'सफाई व्यवस्था',recipient:'खण्ड विकास अधिकारी',paragraphs:['सफाई व्यवस्था कराने का अनुरोध है।'],evidence:[]};
const base={kind:'पत्र',profile,points:'BDO ko safai vyavastha ke liye patra',promptAt:'2026-11-22T06:00:00Z'};
test('ordinary senders have no upper sender block; signature and date share a row',()=>{
 for(const role of ['resident','pradhan','gpa','gva','sahayak']){
  const h=render({...payload},{...base,profile:{...profile,role}}).html;
  assert(h.startsWith('<p>सेवा में,'));assert(!h.includes('प्रेषक —'));assert(!h.includes('कार्यालय —'));
  assert(h.includes('data-pai-signature="1"'));assert(h.includes('data-pai-date="22/11/2026"'));
  assert(h.includes('style="text-align:left"'));assert(h.includes('style="text-align:right"'));
  assert(h.includes('हैदरगढ़')&&h.includes('बाराबंकी'));
 }
});
test('personal leave uses prarthi and official work uses bhavadiya',()=>{
 assert(render(payload,{...base,points:'ADO ko meri chhutti ke liye aavedan patra banao'}).html.includes('>प्रार्थी<br>'));
 assert(render(payload,base).html.includes('>भवदीय<br>'));
 assert(!render(payload,{...base,points:'ADO ko meri chhutti ke liye aavedan patra banao'}).html.includes('प्रतिलिपि'));
});
test('date is India prompt day and not download day',()=>{
 assert.equal(promptDate('2026-11-22T20:00:00Z'),'23/11/2026');
 assert(render(payload,base).html.includes('22/11/2026'));
});
test('named uploads are included and official copies stay separate from sender',()=>{
 const h=render(payload,{...base,att:[{name:'शिकायत.pdf',text:'सफाई व्यवस्था'}]}).html;
 assert(h.includes('संलग्नक:')&&h.includes('शिकायत.pdf'));
 assert(h.includes('प्रतिलिपि:')&&h.includes('सूचनार्थ'));
 assert(h.indexOf('प्रतिलिपि:')>h.indexOf('data-pai-signature'));
});
test('only explicit government-level format has upper sender',()=>{
 assert(render(payload,{...base,governmentFormat:true}).html.startsWith('<p>कार्यालय'));
 assert(!render(payload,base).html.startsWith('<p>कार्यालय'));
});
test('IGRS prompt never equates a complaint with completed action',()=>{
 const p=request({...base,kind:'IGRS निस्तारण आख्या'});
 assert(p.system.includes('स्वतः निस्तारित न घोषित'));
 assert(p.system.includes('निरीक्षण')&&p.system.includes('बिना साक्ष्य'));
});

test('third-party applicant does not inherit the logged-in officer office address',()=>{
 const out=render(payload,{...base,points:'ग्रामवासी राहुल की ओर से BDO को सफाई के लिए आवेदन बनाओ'});
 assert(out.html.includes('राहुल'));assert(!out.html.includes('हैदरगढ़'));assert(out.review.missing.includes('प्रार्थी का पूरा पता'));
});
