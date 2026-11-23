/* Panchayat AI — GST Calculator and GST No Detail (client-side, no paid API) */
(() => {
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const inr=x=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(x);
const r2=x=>Math.round((x+Number.EPSILON)*100)/100;
const CSS=`
.gst-wrap{max-width:560px;margin:0 auto}
.gst-wrap h2{margin:.2em 0 .6em}
.gst-box{background:#fff;border:1px solid #dfe7e3;border-radius:14px;padding:14px;margin:0 0 12px}
.gst-box label{display:block;font-weight:600;margin:.2em 0 .35em}
.gst-in{width:100%;box-sizing:border-box;font-size:20px;padding:12px;border:1.5px solid #b9cfc5;border-radius:10px}
.gst-in.code{text-transform:uppercase;letter-spacing:2px;font-family:ui-monospace,Consolas,monospace}
.gst-chips{display:flex;flex-wrap:wrap;gap:8px}
.gst-chip{border:1.5px solid #13513a;background:#fff;color:#13513a;border-radius:999px;padding:8px 14px;font-weight:600;cursor:pointer}
.gst-chip.on{background:#13513a;color:#fff}
.gst-seg{display:flex;border:1.5px solid #13513a;border-radius:10px;overflow:hidden}
.gst-seg button{flex:1;padding:10px;border:0;background:#fff;color:#13513a;font-weight:600;cursor:pointer}
.gst-seg button.on{background:#13513a;color:#fff}
.gst-res table{width:100%;border-collapse:collapse;font-size:16px}
.gst-res td{padding:8px 4px;border-bottom:1px solid #eef2f0}
.gst-res td:last-child{text-align:right;font-weight:600}
.gst-res tr.tot td{font-size:19px;border-bottom:0;color:#13513a}
.gst-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gst-big{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 8px;border:1.5px dashed #13513a;border-radius:14px;background:#f4faf7;color:#13513a;font-weight:700;font-size:16px;cursor:pointer}
.gst-big span{font-size:30px}
.gst-ok{color:#11743f;font-weight:700}.gst-bad{color:#b42318;font-weight:700}
.gst-note{font-size:13px;color:#5d6b65;margin:.5em 0 0}
.gst-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.gst-act .btn{flex:1}
`;
function style(){if(document.getElementById("gst-css"))return;const s=document.createElement("style");s.id="gst-css";s.textContent=CSS;document.head.appendChild(s);}
async function copy(t){try{await navigator.clipboard.writeText(t);return true;}catch{return false;}}
function calculate(amount,rate,mode="add",sup="intra"){
 if(!Number.isFinite(amount)||amount<0||amount>1e12||!Number.isFinite(rate)||rate<0||rate>100)return null;
 if(!["add","remove"].includes(mode)||!["intra","inter"].includes(sup))return null;
 const base=r2(mode==="remove"?amount/(1+rate/100):amount);
 const total=mode==="remove"?r2(amount):r2(base*(1+rate/100));
 const gst=r2(total-base),cgst=sup==="intra"?r2(gst/2):0;
 return {base,total,gst,cgst,sgst:sup==="intra"?r2(gst-cgst):0,igst:sup==="inter"?gst:0};
}

/* ---------------- GST Calculator ---------------- */
function mountCalc(el){
 style();
 const st={rate:18,mode:"add",sup:"intra"};
 el.innerHTML='<div class="gst-wrap"><h2>🧮 GST Calculator</h2>'+
 '<div class="gst-box"><label for="gst-amt">Amount (₹)</label><input id="gst-amt" class="gst-in" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00"></div>'+
 '<div class="gst-box"><label>GST Rate (%)</label><div class="gst-chips" id="gst-rates">'+
 [0,0.25,1.5,3,5,18,40].map(r=>'<button type="button" class="gst-chip'+(r===18?' on':'')+'" data-r="'+r+'">'+r+'%</button>').join("")+
 '<input id="gst-custom" class="gst-in" style="width:110px;font-size:16px;padding:8px" type="number" inputmode="decimal" min="0" max="100" placeholder="Other %"></div></div>'+
 '<div class="gst-box"><label>Amount is</label><div class="gst-seg" id="gst-mode"><button type="button" data-m="add" class="on">Without GST (+ Add)</button><button type="button" data-m="remove">With GST (− Remove)</button></div>'+
 '<label style="margin-top:12px">Supply</label><div class="gst-seg" id="gst-sup"><button type="button" data-s="intra" class="on">Same State (CGST + SGST)</button><button type="button" data-s="inter">Other State (IGST)</button></div></div>'+
 '<div class="gst-box gst-res" id="gst-out" aria-live="polite"></div>'+
 '<p class="gst-note">वस्तु/सेवा, Invoice Date और लागू अधिसूचना के अनुसार GST Rate चुनें। इस सामान्य Calculator में Cess या विशेष छूट शामिल नहीं हैं।</p></div>';
 const $=q=>el.querySelector(q);
 const calc=()=>{
  const raw=$("#gst-amt").value;
  if(!raw){$("#gst-out").innerHTML='<p class="gst-note">Amount डालें, Calculation यहाँ दिखाई देगी।</p>';return;}
  const figures=calculate(Number(raw),st.rate,st.mode,st.sup);
  if(!figures){$("#gst-out").innerHTML='<p class="gst-bad">सही Amount और GST Rate डालें।</p>';return;}
  const r=st.rate,{base,gst,total,cgst,sgst,igst}=figures;
  const rows=[["Base Amount",inr(base)]];
  if(st.sup==="intra")rows.push(["CGST @ "+(r/2)+"%",inr(cgst)],["SGST @ "+(r/2)+"%",inr(sgst)]);
  else rows.push(["IGST @ "+r+"%",inr(igst)]);
  rows.push(["Total GST",inr(gst)]);
  $("#gst-out").innerHTML='<table>'+rows.map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td></tr>').join("")+
   '<tr class="tot"><td>Total Amount</td><td>'+inr(total)+'</td></tr></table>'+
   '<div class="gst-act"><button class="btn alt" type="button" id="gst-copy">Copy</button><button class="btn alt" type="button" id="gst-clear">Clear</button></div>';
  $("#gst-copy").onclick=async()=>{
    const content=rows.concat([["Total Amount",inr(total)]]).map(x=>x.join(": ")).join("\n");
    $("#gst-copy").textContent=(await copy(content))?"✓ Copied":"Copy blocked";
  };
  $("#gst-clear").onclick=()=>{$("#gst-amt").value="";calc();$("#gst-amt").focus();};
 };
 $("#gst-amt").oninput=calc;
 el.querySelectorAll("#gst-rates .gst-chip").forEach(button=>button.onclick=()=>{
  el.querySelectorAll("#gst-rates .gst-chip").forEach(x=>x.classList.remove("on"));
  button.classList.add("on");$("#gst-custom").value="";st.rate=Number(button.dataset.r);calc();
 });
 $("#gst-custom").oninput=()=>{
  const raw=$("#gst-custom").value.trim(),v=Number(raw);
  if(raw&&Number.isFinite(v)&&v>=0&&v<=100){
    el.querySelectorAll("#gst-rates .gst-chip").forEach(x=>x.classList.remove("on"));st.rate=v;
  } else st.rate=NaN;
  calc();
 };
 el.querySelectorAll("#gst-mode button").forEach(b=>b.onclick=()=>{
  el.querySelectorAll("#gst-mode button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.mode=b.dataset.m;calc();
 });
 el.querySelectorAll("#gst-sup button").forEach(b=>b.onclick=()=>{
  el.querySelectorAll("#gst-sup button").forEach(x=>x.classList.remove("on"));b.classList.add("on");st.sup=b.dataset.s;calc();
 });
 calc();
}

/* ---------------- GSTIN decoding ---------------- */
const STATES={"01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh","05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat","25":"Daman & Diu","26":"Dadra & Nagar Haveli and Daman & Diu","27":"Maharashtra","28":"Andhra Pradesh (Old)","29":"Karnataka","30":"Goa","31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar Islands","36":"Telangana","37":"Andhra Pradesh","38":"Ladakh","97":"Other Territory","99":"Centre Jurisdiction"};
const HOLDER={P:"Individual (Proprietor)",C:"Company",F:"Firm / LLP",H:"Hindu Undivided Family (HUF)",A:"Association of Persons (AOP)",T:"Trust",B:"Body of Individuals (BOI)",L:"Local Authority",J:"Artificial Juridical Person",G:"Government"};
const CH="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function checkChar(g14){let sum=0;for(let i=0;i<14;i++){const v=CH.indexOf(g14[i]);if(v<0)return null;const p=v*(i%2?2:1);sum+=Math.floor(p/36)+(p%36);}return CH[(36-(sum%36))%36];}
const FORMAT=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function decode(g){
 g=String(g||"").toUpperCase().replace(/[^0-9A-Z]/g,"");
 const r={gstin:g,valid:false,errors:[]};
 if(g.length!==15){r.errors.push("GSTIN में 15 अक्षर होने चाहिए (अभी "+g.length+" हैं)।");return r;}
 if(!FORMAT.test(g))r.errors.push("GSTIN का ढाँचा सही नहीं है।");
 const c=checkChar(g.slice(0,14));
 if(c!==g[14])r.errors.push("अंतिम check अंक मेल नहीं खाता — नंबर में टाइपिंग/पढ़ने की गलती हो सकती है।");
 r.stateCode=g.slice(0,2);r.state=STATES[r.stateCode]||"Unknown state code";
 r.pan=g.slice(2,12);r.holder=HOLDER[g[5]]||"Other";r.regNo=g[12];
 r.reserved=g[13]; // Active status, Composition and TDS/TCS cannot be inferred from GSTIN.
 if(!STATES[r.stateCode])r.errors.push("राज्य कोड "+r.stateCode+" मान्य नहीं है।");
 r.valid=r.errors.length===0;return r;
}
// OCR often confuses these; fix by position (digits vs letters)
const TO_DIGIT={O:"0",Q:"0",D:"0",I:"1",L:"1",Z:"2",S:"5",B:"8",G:"6",T:"7"};
const TO_ALPHA={"0":"O","1":"I","2":"Z","5":"S","8":"B","6":"G","7":"T","4":"A"};
const PATTERN="DDAAAAADDDDAXZX";// D digit, A alpha, X any, Z letter
function repair(s){let o="";for(let i=0;i<15;i++){const ch=s[i],p=PATTERN[i];if(p==="D")o+=TO_DIGIT[ch]||ch;else if(p==="A"||p==="Z")o+=TO_ALPHA[ch]||ch;else o+=ch;}return o;}
function findGstins(text){
 const t=String(text||"").toUpperCase().replace(/[^0-9A-Z\n ]/g,"");
 const found=new Map();
 const compact=t.replace(/[ \n]/g,"");
 const scan=s=>{for(let i=0;i+15<=s.length;i++){const w=repair(s.slice(i,i+15));if(FORMAT.test(w)&&checkChar(w.slice(0,14))===w[14]&&STATES[w.slice(0,2)])found.set(w,true);}};
 t.split(/\n/).forEach(l=>scan(l.replace(/ /g,"")));scan(compact);
 return [...found.keys()];
}

/* ---------------- OCR ---------------- */
let tessP=null;
function loadTess(){
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(tessP)return tessP;
 tessP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";s.onload=()=>res(window.Tesseract);s.onerror=()=>{tessP=null;rej(Error("OCR could not load"));};document.head.appendChild(s);});
 return tessP;
}
async function prep(file){
 const url=URL.createObjectURL(file);
 try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
  const max=3200,sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
  const x=c.getContext("2d");x.filter="grayscale(1) contrast(1.4)";x.drawImage(img,0,0,c.width,c.height);return c;}
 finally{URL.revokeObjectURL(url);}
}
async function ocrGstins(file,progress){
 const T=await loadTess();
 const canvas=await prep(file);
 const w=await T.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")progress(Math.round(m.progress*100));}});
 try{await w.setParameters({tessedit_char_whitelist:"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ :-/\n"});
  const {data}=await w.recognize(canvas);return findGstins(data.text);}
 finally{await w.terminate();}
}

/* ---------------- GST No Detail ---------------- */
function mountDetail(el){
 style();
 el.innerHTML=`<div class="gst-wrap"><h2>🔎 GST No Detail</h2>
 <div class="gst-box"><label>Scan or Upload</label><div class="gst-two">
  <label class="gst-big" for="gst-cam"><span>📷</span>Scan</label>
  <label class="gst-big" for="gst-gal"><span>🖼️</span>Upload</label></div>
  <input id="gst-cam" type="file" accept="image/*" capture="environment" hidden>
  <input id="gst-gal" type="file" accept="image/*" hidden>
  <p class="gst-note" id="gst-scan-msg">बिल/रसीद पर लिखा GST नंबर साफ़ दिखे, ऐसी फ़ोटो लें।</p></div>
 <div class="gst-box"><label for="gst-no">Type GST No</label>
  <input id="gst-no" class="gst-in code" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="09ABCDE1234F1Z5">
  <div class="gst-act"><button type="button" class="btn" id="gst-go">See Detail</button></div></div>
 <div id="gst-res"></div></div>`;
 const $=s=>el.querySelector(s);
 const show=g=>{
  const r=decode(g);$("#gst-no").value=r.gstin;
  const rows=[["GSTIN",r.gstin],["State",r.stateCode?`${r.state} (${r.stateCode})`:""],["PAN",r.pan],["Holder Type",r.holder],["Registration No. (same PAN, this state)",r.regNo],["Registration Type",r.kind]].filter(x=>x[1]);
  $("#gst-res").innerHTML=`<div class="gst-box gst-res">
   <p class="${r.valid?"gst-ok":"gst-bad"}">${r.valid?"✓ Valid GSTIN format":"✗ Invalid GSTIN"}</p>
   ${r.errors.length?`<p class="gst-note">${r.errors.map(esc).join("<br>")}</p>`:""}
   ${r.gstin.length===15?`<table>${rows.map(x=>`<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join("")}</table>`:""}
   ${r.valid?`<div class="gst-act"><button type="button" class="btn" id="gst-portal">Full Detail on GST Portal</button><button type="button" class="btn alt" id="gst-cp">📋 Copy</button></div>
   <p class="gst-note">फ़र्म का नाम, पता और स्थिति (Active/Cancelled) GST पोर्टल पर दिखेगी। GSTIN अपने-आप copy हो जाता है — पोर्टल पर Paste करें और Captcha भरकर Search दबाएँ।</p>`:""}</div>`;
  if(r.valid){
   $("#gst-portal").onclick=()=>{copy(r.gstin);location.href="https://services.gst.gov.in/services/searchtp";};
   $("#gst-cp").onclick=()=>{copy(r.gstin);$("#gst-cp").textContent="✓ Copied";};
  }
  $("#gst-res").scrollIntoView({behavior:"smooth",block:"start"});
 };
 $("#gst-go").onclick=()=>show($("#gst-no").value);
 $("#gst-no").onkeydown=e=>{if(e.key==="Enter")show($("#gst-no").value);};
 const pick=async inp=>{
  const f=inp.files&&inp.files[0];inp.value="";if(!f)return;
  const msg=$("#gst-scan-msg");msg.textContent="GST नंबर पढ़ा जा रहा है…";
  try{
   const list=await ocrGstins(f,p=>{msg.textContent="GST नंबर पढ़ा जा रहा है… "+p+"%";});
   if(!list.length){msg.innerHTML='<span class="gst-bad">फ़ोटो में सही GST नंबर नहीं मिला।</span> नज़दीक से, सीधी और साफ़ फ़ोटो लें या नंबर टाइप करें।';return;}
   if(list.length===1){msg.innerHTML='<span class="gst-ok">✓ GST नंबर मिला</span>';show(list[0]);return;}
   msg.innerHTML='<span class="gst-ok">'+list.length+' GST नंबर मिले — एक चुनें:</span><div class="gst-chips" style="margin-top:8px">'+list.map(g=>`<button type="button" class="gst-chip" data-g="${g}">${g}</button>`).join("")+"</div>";
   msg.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>show(b.dataset.g));
  }catch(e){msg.innerHTML='<span class="gst-bad">फ़ोटो पढ़ी नहीं जा सकी।</span> इंटरनेट जाँचें या नंबर टाइप करें।';}
 };
 $("#gst-cam").onchange=e=>pick(e.target);
 $("#gst-gal").onchange=e=>pick(e.target);
}

window.PAI_GST={mountCalc,mountDetail,decode,findGstins,checkChar,calculate};
})();
