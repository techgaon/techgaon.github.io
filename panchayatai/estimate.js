/* Panchayat AI — Estimate and draft Measurement Book (offline, local browser) */
(() => {
"use strict";
const TYPES={
 brick:["ईंट की चिनाई","volume"],pcc:["PCC Concrete","volume"],rcc:["RCC Concrete","volume"],
 plaster:["प्लास्टर","area"],paver:["इंटरलॉकिंग पेवर","area"],tile:["फ्लोर टाइल्स","area"],
 soling:["गिट्टी सोलिंग","volume"],earth:["मिट्टी खुदाई / भराई","volume"],mortar:["सीमेंट मोर्टार","volume"]
};
const MATERIAL={cement:["सीमेंट","50 kg बैग"],sand:["बालू","m³"],aggregate:["गिट्टी","m³"],bricks:["ईंट","नग"],pavers:["पेवर ब्लॉक","नग"],tiles:["टाइल्स","नग"],steel:["स्टील","kg"]};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f=x=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:3}).format(x);
const currency=x=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(x);
const good=(raw,label,zero=false)=>{const x=Number(raw);if(raw===""||!Number.isFinite(x)||x<0||(!zero&&x===0)||x>1e8)throw Error(label+" सही संख्या में भरें।");return x;};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{}};
function calculate(v){
 const type=TYPES[v.type];
 if(!type)throw Error("काम चुनें");
 const area=type[1]==="area",scale=v.unit==="ft"?.3048:1;
 const count=good(v.count,"संख्या");
 if(!Number.isInteger(count)||count>10000)throw Error("संख्या पूर्णांक में भरें (1–10000)।");
 const l=good(v.l,"लंबाई"),b=good(v.b,"चौड़ाई"),h=area?1:good(v.h,"मोटाई/ऊँचाई");
 const gross=count*l*b*h*Math.pow(scale,area?2:3);
 const cut=good(v.cut,"कटौती",true)*Math.pow(scale,area?2:3);
 if(!Number.isFinite(gross)||gross<=0||cut>=gross)throw Error("कटौती कुल माप से कम होनी चाहिए।");
 const qty=gross-cut;
 const mat={},notes=[];
 function mixed(wet,ratio,dryFactor){
  const parts=ratio.split(":").map(Number),sum=parts.reduce((a,b)=>a+b,0);
  if(parts.some(x=>!Number.isFinite(x)||x<=0)||!sum)throw Error("मिक्स अनुपात गलत है।");
  const dry=wet*dryFactor;
  mat.cement=(mat.cement||0)+dry*(parts[0]/sum)*1440/50;
  mat.sand=(mat.sand||0)+dry*(parts[1]/sum);
  if(parts.length===3)mat.aggregate=(mat.aggregate||0)+dry*(parts[2]/sum);
 }
 if(v.type==="pcc"||v.type==="rcc"){
  mixed(qty,v.cmix,1.54);
  if(v.type==="rcc"){const kg=good(v.steel,"स्टील kg/m³",true);if(kg>0)mat.steel=qty*kg;}
  notes.push("Concrete dry-volume factor 1.54; RCC का mix/steel Structural Design और BOQ से जाँचें।");
 }else if(v.type==="brick"){
  mat.bricks=Math.ceil(qty*good(v.brickper,"प्रति m³ ईंटों की संख्या"));
  mixed(qty*.23,v.mmix,1.33);
  notes.push("Masonry में wet mortar 0.23 m³/m³ प्रारंभिक अनुमान है; ईंट का आकार तथा mortar joints से वास्तविक मात्रा बदलती है।");
 }else if(v.type==="plaster"||v.type==="mortar"){
  mixed(v.type==="plaster"?qty*good(v.thickness,"प्लास्टर मोटाई (mm)")/1000:qty,v.mmix,1.33);
  notes.push("मोर्टार Dry-factor 1.33; वास्तविक सतह एवं कटौती जाँचें।");
 }else if(v.type==="paver"||v.type==="tile"){
  const pieceArea=good(v.piecel,"टाइल लंबाई")*good(v.pieceb,"टाइल चौड़ाई")/1000000;
  const waste=good(v.waste,"Wastage",true);
  if(waste>50)throw Error("Wastage 0–50% रखें।");
  mat[v.type==="paver"?"pavers":"tiles"]=Math.ceil(qty*(1+waste/100)/pieceArea);
  if(v.type==="paver")mat.sand=qty*good(v.bedding,"Bedding (mm)",true)/1000;
  notes.push("Piece count में wastage शामिल है; अन्य layers/adhesive अलग गिनें।");
 }else if(v.type==="soling"){
  mat.aggregate=qty;notes.push("Volume compacted स्थिति का है; loose material अलग हो सकता है।");
 }else notes.push("Earthwork के lead/lift और swell/compaction अलग होंगे।");
 const rate=v.rate===""?null:good(v.rate,"कार्य दर",true);
 return {type:v.type,title:type[0],name:v.name.slice(0,150),dim:String(count)+" × "+l+" × "+b+(area?"":" × "+h)+" "+v.unit,
  unit:area?"m²":"m³",qty,gross,cut,mat,notes,rate};
}
const FIELDS=[
 ["name","विवरण (वैकल्पिक)","text","जैसे: पंचायत भवन की दीवार"],
 ["unit","इकाई","select",[{value:"m",text:"मीटर"},{value:"ft",text:"फीट"}]],
 ["count","संख्या (No.)","number","1"],
 ["l","लंबाई","number",""],
 ["b","चौड़ाई / ऊँचाई","number",""],
 ["h","मोटाई / गहराई","number",""],
 ["cut","कटौती (इकाई अनुसार)","number","0"],
 ["cmix","Concrete Mix (cement:sand:aggregate)","select",["1:4:8","1:3:6","1:2:4","1:1.5:3"]],
 ["mmix","Mortar Mix (cement:sand)","select",["1:4","1:5","1:6","1:8"]],
 ["thickness","प्लास्टर मोटाई (mm)","number","12"],
 ["brickper","1 m³ में ईंट (नग)","number","500"],
 ["piecel","ब्लॉक/टाइल लंबाई (mm)","number","200"],
 ["pieceb","ब्लॉक/टाइल चौड़ाई (mm)","number","100"],
 ["waste","टूटफूट/कटिंग (%)","number","5"],
 ["bedding","पेवर Sand Bedding (mm)","number","30"],
 ["steel","स्टील kg/m³ (अभियंता से तय करें)","number","0"],
 ["rate","कार्य दर ₹/इकाई (वैकल्पिक, SOR अनुसार)","number",""]
];
function mount(el){
 let mb=read("pai_mb_draft_items",[]),rates=read("pai_mb_draft_rates",{});
 if(!Array.isArray(mb))mb=[];
 mb=mb.slice(0,100).filter(x=>x&&TYPES[x.type]&&Number.isFinite(x.qty)&&x.qty>0);
 if(!rates||typeof rates!=="object")rates={};
 let current=null;
 const selectField=(key,label,options)=>{
  return '<label data-field="'+key+'"><span>'+label+'</span><select data-key="'+key+'">'+options.map(o=>
   '<option value="'+esc(o.value??o)+'"'+((key==="cmix"&&o==="1:2:4")||(key==="mmix"&&o==="1:6")?' selected':'')+'>'+esc(o.text??o)+'</option>').join("")+'</select></label>';
 };
 const renderField=([key,label,type,def])=>{
  if(type==="select")return selectField(key,label,def);
  const preset=["1","0","12","500","200","100","5","30"].includes(def)?def:"";
  return '<label data-field="'+key+'"><span>'+label+'</span><input data-key="'+key+'" type="'+type+'"'+(type==="number"?' min="0" step="any" inputmode="decimal"':'')+' value="'+preset+'" placeholder="'+esc(def)+'"></label>';
 };
 el.innerHTML='<section class="card mb-head"><span class="mb-logo">📐</span><div><h2>Estimate & MB Calculator</h2><p>सीमेंट, बालू, गिट्टी, ईंट, कंक्रीट और अन्य कार्यों का अनुमान।</p></div></section>'+
 '<div class="mb-steps"><span>① काम चुनें</span><span>② माप भरें</span><span>③ MB तैयार</span></div>'+
 '<section class="card mb-editor"><h3>कार्य और माप</h3><label for="mb-type">कार्य का प्रकार</label><select id="mb-type">'+
 Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'">'+v[0]+'</option>').join("")+'</select>'+
 '<div id="mb-fields">'+FIELDS.map(renderField).join("")+'</div>'+
 '<div class="btn-row"><button type="button" id="mb-example" class="btn alt">✨ उदाहरण भरें</button><button type="button" id="mb-run" class="btn">गणना करें</button></div>'+
 '<p id="mb-notice" role="status" aria-live="polite" class="mb-notice"></p></section>'+
 '<section class="card mb-result-box"><h3>सामग्री का अनुमान</h3><div id="mb-answer"><p class="hint">माप भरकर गणना करें।</p></div>'+
 '<button id="mb-add" type="button" class="btn" disabled>＋ MB में जोड़ें</button>'+
 '<details class="mb-rates"><summary>स्थानीय सामग्री की दरें भरें (वैकल्पिक)</summary><div class="mb-rate-grid">'+
 Object.entries(MATERIAL).map(([k,v])=>'<label>'+v[0]+' (₹/'+v[1]+')<input type="number" min="0" step="any" data-material="'+k+'" placeholder="अपनी दर"></label>').join("")+'</div></details></section>'+
 '<section class="card mb-book"><h3>Measurement Book (Draft)</h3><div id="mb-items"></div><div class="btn-row">'+
 '<button type="button" id="mb-csv" class="btn alt">⬇️ MB CSV</button><button type="button" id="mb-print" class="btn alt">🖨️ Print / Save PDF</button>'+
 '<button type="button" id="mb-clear" class="btn alt">🗑️ साफ करें</button></div>'+
 '<p class="hint">यह प्रारंभिक कैलकुलेटर है, आधिकारिक MB नहीं। अंतिम माप, SOR, BOQ, डिजाइन और भुगतान संबंधित अधिकृत अभियंता/अधिकारी सत्यापित करें।</p></section>'+
 '<div id="mb-print-sheet"></div>';
 const q=s=>el.querySelector(s),inputs=Object.fromEntries(FIELDS.map(([k])=>[k,q('[data-key="'+k+'"]')]));
 function values(){return Object.fromEntries(Object.entries(inputs).map(([k,x])=>[k,x.value]));}
 function alert(t){q("#mb-notice").textContent=t;}
 function clearPreview(){current=null;q("#mb-add").disabled=true;q("#mb-answer").innerHTML='<p class="hint">माप भरकर गणना करें।</p>';}
 function adapt(){
  const k=q("#mb-type").value,area=TYPES[k][1]==="area";
  const visible={h:!area,cmix:k==="pcc"||k==="rcc",mmix:["brick","plaster","mortar"].includes(k),
   thickness:k==="plaster",brickper:k==="brick",piecel:k==="paver"||k==="tile",pieceb:k==="paver"||k==="tile",
   waste:k==="paver"||k==="tile",bedding:k==="paver",steel:k==="rcc"};
  for(const [key,yes] of Object.entries(visible))q('[data-field="'+key+'"]').classList.toggle("hidden",!yes);
  q('[data-field="cut"] span').textContent="कटौती ("+(inputs.unit.value==="ft"?"ft":"m")+(area?"²":"³")+")";
  q('[data-field="rate"] span').textContent="कार्य दर ₹/"+(area?"m²":"m³")+" (वैकल्पिक, SOR अनुसार)";
  if(k==="tile"&&inputs.piecel.value==="200"&&inputs.pieceb.value==="100"){inputs.piecel.value="600";inputs.pieceb.value="600";}
  if(k==="paver"&&inputs.piecel.value==="600"&&inputs.pieceb.value==="600"){inputs.piecel.value="200";inputs.pieceb.value="100";}
  clearPreview();
 }
 function compute(){
  try{
   current=calculate({type:q("#mb-type").value,...values()});
   const x=current,mats=Object.entries(x.mat),cards=[["मापी गई मात्रा",f(x.qty)+" "+x.unit]].concat(
    mats.map(([k,v])=>[MATERIAL[k][0]+" ("+MATERIAL[k][1]+")",f(v)]));
   let materialCost=0,priced=0;
   mats.forEach(([k,v])=>{if(rates[k]!==undefined&&rates[k]!==""){const rate=good(rates[k],"सामग्री दर",true);materialCost+=rate*v;priced++;}});
   q("#mb-answer").innerHTML='<div class="mb-figures">'+cards.map(([a,b],i)=>
    '<div class="mb-figure" style="--index:'+i+'"><small>'+esc(a)+'</small><strong>'+esc(b)+'</strong></div>').join("")+'</div>'+
    '<p class="hint">Gross: '+f(x.gross)+" "+x.unit+"; कटौती: "+f(x.cut)+" "+x.unit+"</p>"+
    (priced?'<p><b>दर्ज सामग्री दरों की '+(priced<mats.length?'आंशिक ':'')+'लागत: '+currency(materialCost)+'</b></p>':"")+
    (x.rate!==null?'<p><b>कार्य राशि: '+currency(x.rate*x.qty)+'</b></p>':"")+
    '<p class="hint">'+x.notes.map(esc).join(" ")+'</p>';
   q("#mb-add").disabled=false;alert("✅ गणना तैयार। MB में जोड़ सकते हैं।");
  }catch(e){clearPreview();alert("⚠️ "+e.message);}
 }
 function outputSheet(){
  const total=mb.reduce((a,x)=>a+(x.rate===null?0:x.qty*x.rate),0);
  q("#mb-print-sheet").innerHTML='<h1>पंचायत AI — Draft Measurement Book</h1><p>दिनांक: '+
   new Date().toLocaleDateString("en-IN")+'</p><table><thead><tr><th>क्र.</th><th>काम</th><th>माप</th><th>मात्रा</th><th>दर ₹</th><th>राशि ₹</th></tr></thead><tbody>'+
   mb.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.name||x.title)+'</td><td>'+esc(x.dim)+'</td><td>'+f(x.qty)+' '+x.unit+'</td><td>'+(x.rate===null?"—":f(x.rate))+'</td><td>'+(x.rate===null?"—":currency(x.qty*x.rate))+'</td></tr>').join("")+
   '</tbody></table><p><b>दर्ज दरों के अनुसार कुल: '+currency(total)+'</b></p><p>यह आधिकारिक MB नहीं है; माप सत्यापन आवश्यक है।</p>';
 }
 function refreshBook(){
  if(!mb.length){q("#mb-items").innerHTML='<p class="hint">MB खाली है। गणना करके आइटम जोड़ें।</p>';}
  else{
   const total=mb.reduce((a,x)=>a+(x.rate===null?0:x.qty*x.rate),0);
   q("#mb-items").innerHTML='<div class="mb-scroll"><table class="mb-table"><thead><tr><th>क्र.</th><th>कार्य</th><th>मात्रा</th><th>दर ₹</th><th>राशि ₹</th><th></th></tr></thead><tbody>'+
   mb.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(x.name||x.title)+'</b><small>'+esc(x.dim)+'</small></td>'+
    '<td>'+f(x.qty)+' '+x.unit+'</td><td><input type="number" min="0" step="any" aria-label="दर" data-mb-rate="'+i+'" value="'+(x.rate===null?"":x.rate)+'"></td>'+
    '<td>'+(x.rate===null?"—":currency(x.qty*x.rate))+'</td><td><button type="button" class="mb-delete" data-delete="'+i+'" aria-label="हटाएँ">×</button></td></tr>').join("")+
   '</tbody></table></div><p class="mb-total"><b>दर्ज दरों का योग: '+currency(total)+'</b></p>';
   q("#mb-items").querySelectorAll("[data-mb-rate]").forEach(input=>input.onchange=()=>{
    const s=input.value.trim(),v=s===""?null:Number(s);
    if(v!==null&&(!Number.isFinite(v)||v<0)){alert("दर गलत है।");return;}
    mb[Number(input.dataset.mbRate)].rate=v;save("pai_mb_draft_items",mb);refreshBook();
   });
   q("#mb-items").querySelectorAll("[data-delete]").forEach(button=>button.onclick=()=>{
    mb.splice(Number(button.dataset.delete),1);save("pai_mb_draft_items",mb);refreshBook();
   });
  }
  outputSheet();
  ["mb-csv","mb-print","mb-clear"].forEach(id=>q("#"+id).disabled=!mb.length);
 }
 function exportCSV(){
  const all=[["क्रमांक","कार्य","विवरण","माप","मात्रा","इकाई","दर ₹","राशि ₹"],...mb.map((x,i)=>[
   i+1,x.title,x.name,x.dim,x.qty.toFixed(3),x.unit,x.rate===null?"":x.rate,x.rate===null?"":(x.qty*x.rate).toFixed(2)
  ])];
  const cell=x=>{let s=String(x??"");if(/^\s*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const url=URL.createObjectURL(new Blob(["\uFEFF"+all.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="Panchayat-AI-MB.csv";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 q("#mb-type").onchange=adapt;inputs.unit.onchange=adapt;
 Object.values(inputs).forEach(i=>i.addEventListener("input",()=>{if(current){clearPreview();alert("माप बदला है। पुनः गणना करें।");}}));
 q("#mb-example").onclick=()=>{
  const k=q("#mb-type").value,a=TYPES[k][1]==="area"?[8,3,""]:[5,3,.15];
  [inputs.l,inputs.b,inputs.h].forEach((input,i)=>input.value=a[i]);inputs.count.value="1";inputs.cut.value="0";
  clearPreview();alert("उदाहरण भरा है। वास्तविक माप के अनुसार बदलें।");
 };
 q("#mb-run").onclick=compute;
 q("#mb-add").onclick=()=>{
  if(!current)return;if(mb.length>=100){alert("अधिकतम 100 आइटम जोड़ सकते हैं।");return;}
  mb.push({...current});save("pai_mb_draft_items",mb);refreshBook();alert("✅ MB में जोड़ दिया।");
 };
 q("#mb-csv").onclick=exportCSV;
 q("#mb-print").onclick=()=>{if(mb.length)window.print();};
 q("#mb-clear").onclick=()=>{if(mb.length&&confirm("सभी MB प्रविष्टियाँ हटानी हैं?")){mb=[];save("pai_mb_draft_items",mb);refreshBook();}};
 q(".mb-rate-grid").querySelectorAll("[data-material]").forEach(input=>{
  input.value=rates[input.dataset.material]??"";
  input.onchange=()=>{
   const s=input.value.trim();if(s!==""&&(!Number.isFinite(Number(s))||Number(s)<0)){alert("सामग्री दर सही भरें।");return;}
   rates[input.dataset.material]=s;save("pai_mb_draft_rates",rates);if(current)compute();
  };
 });
 adapt();refreshBook();
}
window.PAI_ESTIMATE={mount,calculate};
})();