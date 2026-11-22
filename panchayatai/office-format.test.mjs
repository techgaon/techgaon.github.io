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


test('saved correspondence address appears once under signer and never repeats office location',()=>{
 const address='ग्राम कमेला, पोस्ट कमेला, विकास खण्ड हैदरगढ़, जनपद बाराबंकी, 225124';
 const out=render(payload,{...base,profile:{...profile,addressHindi:address}});
 assert.equal(out.html.split(address).length,2);
 assert(out.html.includes('>भवदीय<br>'));
 assert(!out.review.missing.includes('प्रेषक का पूरा पत्राचार पता (प्रोफ़ाइल में भरें)'));
 const personal=render(payload,{...base,profile:{...profile,addressHindi:address},points:'ADO ko meri chhutti ke liye aavedan patra banao'});
 assert(personal.html.includes(address));
 const other=render(payload,{...base,profile:{...profile,addressHindi:address},points:'ग्रामवासी राहुल की ओर से BDO को सफाई के लिए आवेदन बनाओ'});
 assert(!other.html.includes(address));
});
test('personal request with no saved mailing address is flagged rather than inventing one',()=>{
 const out=render(payload,{...base,points:'ADO ko meri chhutti ke liye aavedan patra banao'});
 assert(out.review.missing.includes('प्रेषक का पूरा पत्राचार पता (प्रोफ़ाइल में भरें)'));
});

test('plain secretary letter to ADO does not inherit office heading',()=>{
 for(const role of ['gpa','gva']){
  const b={...base,profile:{...profile,role},points:'sachiv ki taraf se ADO ko safai ke liye samanya patra banao'};
  const h=render({...payload,recipient:'सहायक विकास अधिकारी (पंचायत)'},b).html;
  assert(h.startsWith('<p>सेवा में,'));assert(!h.includes('data-pai-office-header'));assert(h.includes('>भवदीय<br>'));
 }
});
test('explicit office letter shows GP, block and district for secretary and pradhan',()=>{
 for(const role of ['gpa','gva','pradhan']){
  const b={...base,profile:{...profile,role},points:'gram panchayat karyalay ki taraf se ADO ko patra banao'};
  const h=render({...payload,recipient:'सहायक विकास अधिकारी (पंचायत)'},b).html;
  assert(h.startsWith('<div data-pai-office-header="1">'),h);
  assert(h.includes('<strong>कार्यालय ग्राम पंचायत — कमेला</strong>'));
  assert(h.includes('<p style="text-align:center">विकास खण्ड — हैदरगढ़</p>'));
  assert(h.includes('<p style="text-align:center">जनपद — बाराबंकी</p>'));
  assert(h.includes('style="text-align:justify"'));
 }
});
test('office title uses selected GP and never guesses the first GP',()=>{
 const b={...base,gp:'संडवा',profile:{...profile,gps:['कमेला','संडवा'],gpsHindi:{'संडवा':'संडवा'}},points:'ग्राम पंचायत कार्यालय की ओर से एडीओ को पत्र बनाएँ'};
 const h=render({...payload,recipient:'सहायक विकास अधिकारी (पंचायत)'},b).html;
 assert(h.includes('कार्यालय ग्राम पंचायत — संडवा'));assert(!h.includes('कार्यालय ग्राम पंचायत — कमेला'));
});
test('plain A4 and leave requests never become GP office letters',()=>{
 const h=render(payload,{...base,points:'ADO ko sade A4 par patra banao'}).html;
 assert(h.startsWith('<p>सेवा में,'));
 const leave=render(payload,{...base,points:'ADO ko meri chhutti ke liye application GP karyalay se'}).html;
 assert(!leave.includes('data-pai-office-header'));assert(leave.includes('>प्रार्थी<br>'));
});
