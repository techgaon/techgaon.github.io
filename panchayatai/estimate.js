/* Panchayat AI — Construction materials and cost estimate (client-side) */
(() => {
"use strict";
const TYPES={
 brick:["Brick Masonry","volume"],pcc:["PCC Concrete","volume"],rcc:["RCC Concrete","volume"],
 plaster:["Plastering","area"],paver:["Interlocking Paver","area"],tile:["Floor Tiles","area"],
 soling:["Aggregate Soling","volume"],earth:["Earthwork Excavation / Filling","volume"],mortar:["Cement Mortar","volume"]
};
const MATERIAL={cement:["Cement","50 kg bag"],sand:["Sand","m³"],aggregate:["Aggregate","m³"],bricks:["Bricks","pcs"],pavers:["Paver blocks","pcs"],tiles:["Tiles","pcs"],steel:["Steel","kg"]};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f=x=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:3}).format(x);
const currency=x=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(x);
const good=(raw,label,zero=false)=>{const x=Number(raw);if(raw===""||!Number.isFinite(x)||x<0||(!zero&&x===0)||x>1e8)throw Error(label+" must be a valid number.");return x;};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{}};
function calculate(v){
 const type=TYPES[v.type];
 if(!type)throw Error("Choose a work type.");
 const area=type[1]==="area";
 if(!["m","ft"].includes(v.unit))throw Error("Choose a length/width unit.");
 const scale=v.unit==="ft"?.3048:1;
 const hUnit=v.hunit||v.unit;
 const heightFactor={m:1,cm:0.01,mm:0.001,ft:0.3048}[hUnit];
 if(!heightFactor)throw Error("Choose a thickness/depth unit.");
 const count=good(v.count,"Count");
 if(!Number.isInteger(count)||count>10000)throw Error("Count must be an integer from 1 to 10,000.");
 const l=good(v.l,"Length"),b=good(v.b,"Width"),h=area?1:good(v.h,"Thickness/Height");
 const gross=count*(l*scale)*(b*scale)*(area?1:h*heightFactor);
 const cut=good(v.cut,"Deduction",true)*Math.pow(scale,area?2:3);
 if(!Number.isFinite(gross)||gross<=0||gross>1e9||cut>=gross)throw Error("The measurement is invalid or the deduction is too large.");
 const qty=gross-cut;
 const mat={},notes=[];
 function mixed(wet,ratio,dryFactor){
  const parts=String(ratio).split(":").map(Number),sum=parts.reduce((a,b)=>a+b,0);
  if(parts.some(x=>!Number.isFinite(x)||x<=0)||!sum||parts.length<2||parts.length>3)throw Error("Invalid mix ratio.");
  const dry=wet*dryFactor;
  mat.cement=(mat.cement||0)+dry*(parts[0]/sum)*1440/50;
  mat.sand=(mat.sand||0)+dry*(parts[1]/sum);
  if(parts.length===3)mat.aggregate=(mat.aggregate||0)+dry*(parts[2]/sum);
 }
 if(v.type==="pcc"||v.type==="rcc"){
  mixed(qty,v.cmix,1.54);
  if(v.type==="rcc"){const kg=good(v.steel,"Steel kg/m³",true);if(kg>0)mat.steel=qty*kg;}
  notes.push("Dry volume factor: 1.54. RCC mix and steel must follow approved structural design and BOQ.");
 }else if(v.type==="brick"){
  const per=good(v.brickper,"Bricks per m³");
  const mortarShare=good(v.mortarShare??"0.23","Mortar ratio",true);
  if(mortarShare>=1)throw Error("Mortar ratio must be between 0 and 1.");
  const wastage=good(v.brickWaste??"0","Brick wastage (%)",true);
  if(wastage>50)throw Error("Brick wastage cannot exceed 50%.");
  mat.bricks=Math.ceil(qty*per*(1+wastage/100));
  mixed(qty*mortarShare,v.mmix,1.33);
  notes.push("Brick and mortar quantities are indicative; check actual brick dimensions and joint thickness.");
 }else if(v.type==="plaster"||v.type==="mortar"){
  mixed(v.type==="plaster"?qty*good(v.thickness,"Plastering Thickness (mm)")/1000:qty,v.mmix,1.33);
  notes.push("Mortar dry-volume factor: 1.33. Verify actual surface and deductions.");
 }else if(v.type==="paver"||v.type==="tile"){
  const pieceArea=good(v.piecel,"Tile length")*good(v.pieceb,"Tile width")/1000000;
  const waste=good(v.waste,"Wastage",true);
  if(waste>50)throw Error("Wastage must be between 0% and 50%.");
  mat[v.type==="paver"?"pavers":"tiles"]=Math.ceil(qty*(1+waste/100)/pieceArea);
  if(v.type==="paver")mat.sand=qty*good(v.bedding,"Bedding (mm)",true)/1000;
  notes.push("Piece count includes cutting waste; bedding, adhesive, grout and other layers may be separate.");
 }else if(v.type==="soling"){
  mat.aggregate=qty;notes.push("Volume is measured in place; loose aggregate purchase quantities may differ.");
 }else notes.push("Earthwork lead/lift, bulking and compaction adjustments are excluded.");
 const rate=v.rate===""||v.rate==null?null:good(v.rate,"Work rate",true);
 return {type:v.type,title:type[0],name:String(v.name||"").slice(0,150),dim:String(count)+" × "+l+" × "+b+" "+v.unit+(area?"":" × "+h+" "+hUnit),
  unit:area?"m²":"m³",qty,gross,cut,mat,notes,rate};
}
const FIELDS=[
 ["name","Work description (optional)","text","e.g. Community hall wall"],
 ["unit","Unit","select",[{value:"m",text:"Metre"},{value:"ft",text:"Feet"}]],
 ["count","Count (No.)","number","1"],
 ["l","Length","number",""],
 ["b","Width / Height","number",""],
 ["h","Thickness / Depth","number",""],
 ["hunit","Thickness/depth unit","select",[{value:"m",text:"Metre"},{value:"cm",text:"Centimetre"},{value:"mm",text:"Millimetre"},{value:"ft",text:"Feet"}]],
 ["cut","Deduction (selected unit)","number","0"],
 ["cmix","Concrete Mix (cement:sand:aggregate)","select",["1:4:8","1:3:6","1:2:4","1:1.5:3"]],
 ["mmix","Mortar Mix (cement:sand)","select",["1:4","1:5","1:6","1:8"]],
 ["thickness","Plastering Thickness (mm)","number","12"],
 ["brickper","Bricks per m³ (pieces)","number","500"],
 ["mortarShare","Wet mortar per m³ masonry (m³)","number","0.23"],
 ["brickWaste","Brick wastage (%)","number","5"],
 ["piecel","Block/tile Length (mm)","number","200"],
 ["pieceb","Block/tile Width (mm)","number","100"],
 ["waste","Cutting/breakage (%)","number","5"],
 ["bedding","Paver sand bedding (mm)","number","30"],
 ["steel","Steel kg/m³ (engineering design)","number","0"],
 ["rate","Work rate ₹/Unit (optional, approved SOR)","number",""]
];
function mount(el){
 const storedRates=(()=>{try{return JSON.parse(localStorage.getItem("pai_mb_draft_rates"))||{};}catch{return {};}})();
 const rates=storedRates&&typeof storedRates==="object"?storedRates:{};
 let current=null,exportBusy=false;
 const selectField=(key,label,options)=>
  '<label data-field="'+key+'"><span>'+esc(label)+'</span><select data-key="'+key+'">'+options.map(o=>
   '<option value="'+esc(o.value??o)+'"'+((key==="cmix"&&o==="1:2:4")||(key==="mmix"&&o==="1:6")?' selected':'')+'>'+esc(o.text??o)+'</option>').join("")+'</select></label>';
 const renderField=([key,label,type,def])=>{
  if(type==="select")return selectField(key,label,def);
  const preset=["1","0","12","500","200","100","5","30","0.23"].includes(def)?def:"";
  return '<label data-field="'+key+'"><span>'+esc(label)+'</span><input data-key="'+key+'" type="'+type+'"'+(type==="number"?' min="0" step="any" inputmode="decimal"':'')+' value="'+esc(preset)+'" placeholder="'+esc(def)+'"></label>';
 };
 el.innerHTML=
  '<section class="card mb-head"><span class="mb-logo">📐</span><div><h2>Estimate Calculator</h2><p>Calculate materials and approximate costs for construction works.</p></div></section>'+
  '<div class="mb-steps"><span>① Select work</span><span>② Enter sizes</span><span>③ Get estimate</span></div>'+
  '<section class="card mb-editor"><h3>Work Measurements</h3><label for="mb-type">Work type</label><select id="mb-type">'+
  Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'">'+esc(v[0])+'</option>').join("")+'</select>'+
  '<div id="mb-fields">'+FIELDS.map(renderField).join("")+'</div>'+
  '<div class="btn-row"><button type="button" id="mb-example" class="btn alt">✨ Sample values</button><button type="button" id="mb-run" class="btn">Calculate Estimate</button></div>'+
  '<p id="mb-notice" role="status" aria-live="polite" class="mb-notice"></p></section>'+
  '<section class="card mb-result-box"><h3>Estimate Ready</h3><div id="mb-answer"><p class="hint">Enter measurements and tap Calculate Estimate.</p></div>'+
  '<div class="btn-row mb-export-actions" id="mb-export-actions" hidden>'+
  '<button id="estimate-word" type="button" class="btn alt">⬇ Word</button><button id="estimate-pdf" type="button" class="btn alt">⬇ PDF</button>'+
  '<button id="estimate-whatsapp" type="button" class="btn mb-whatsapp">🟢 WhatsApp</button></div>'+
  '<details class="mb-rates"><summary>Material rates (optional)</summary><div class="mb-rate-grid">'+
  Object.entries(MATERIAL).map(([k,v])=>'<label>'+esc(v[0])+' (₹/'+esc(v[1])+')<input type="number" min="0" step="any" data-material="'+k+'" placeholder="Enter rate"></label>').join("")+'</div></details></section>';
 const q=selector=>el.querySelector(selector),inputs=Object.fromEntries(FIELDS.map(([key])=>[key,q('[data-key="'+key+'"]')]));
 const values=()=>Object.fromEntries(Object.entries(inputs).map(([key,node])=>[key,node.value]));
 const alert=text=>q("#mb-notice").textContent=text;
 function reset(){
  current=null;q("#mb-export-actions").hidden=true;
  q("#mb-answer").innerHTML='<p class="hint">Enter measurements and tap Calculate Estimate.</p>';
 }
 function adapt(){
  const kind=q("#mb-type").value,area=TYPES[kind][1]==="area";
  const visible={
   h:!area,hunit:!area,cmix:kind==="pcc"||kind==="rcc",mmix:["brick","plaster","mortar"].includes(kind),
   thickness:kind==="plaster",brickper:kind==="brick",mortarShare:kind==="brick",brickWaste:kind==="brick",
   piecel:kind==="paver"||kind==="tile",pieceb:kind==="paver"||kind==="tile",
   waste:kind==="paver"||kind==="tile",bedding:kind==="paver",steel:kind==="rcc"
  };
  for(const [key,on] of Object.entries(visible))q('[data-field="'+key+'"]').classList.toggle("hidden",!on);
  q('[data-field="cut"] span').textContent="Deduction ("+(inputs.unit.value==="ft"?"ft":"m")+(area?"²":"³")+")";
  q('[data-field="rate"] span').textContent="Work rate ₹/"+(area?"m²":"m³")+" (optional)";
  if(!area&&inputs.unit.dataset.previous!==inputs.unit.value){inputs.hunit.value=inputs.unit.value;inputs.unit.dataset.previous=inputs.unit.value;}
  if(kind==="tile"&&inputs.piecel.value==="200"&&inputs.pieceb.value==="100"){inputs.piecel.value="600";inputs.pieceb.value="600";}
  if(kind==="paver"&&inputs.piecel.value==="600"&&inputs.pieceb.value==="600"){inputs.piecel.value="200";inputs.pieceb.value="100";}
  reset();
 }
 function materialPrices(){
  if(!current)return {cost:0,count:0};
  let cost=0,count=0;
  for(const [name,amount] of Object.entries(current.mat)){
   const raw=rates[name];
   if(raw===undefined||raw==="")continue;
   cost+=amount*good(raw,"Material rate",true);count++;
  }
  return {cost,count};
 }
 function formattedLines(){
  if(!current)return [];
  const x=current,pricing=materialPrices();
  return [
   ["Work",x.name||x.title],
   ["Work type",x.title],["Measurements",x.dim],["Gross quantity",f(x.gross)+" "+x.unit],
   ["Deduction",f(x.cut)+" "+x.unit],["Net measured quantity",f(x.qty)+" "+x.unit],
   ...Object.entries(x.mat).map(([name,quantity])=>[MATERIAL[name][0]+" ("+MATERIAL[name][1]+")",f(quantity)]),
   ...(pricing.count?[["Estimated material cost"+(pricing.count<Object.keys(x.mat).length?" (partial)":""),currency(pricing.cost)]]:[]),
   ...(x.rate!==null?[["Entered work rate",currency(x.rate)+" / "+x.unit],["Estimated work amount",currency(x.qty*x.rate)]]:[])
  ];
 }
 function estimateText(){
  if(!current)return "";
  return ["Panchayat AI — Construction Estimate",
   "Date: "+new Date().toLocaleDateString("en-IN"),
   ...formattedLines().map(([name,value])=>name+": "+value),
   "Notes: "+current.notes.join(" "),
   "Indicative calculation only. Check actual dimensions, approved SOR and structural design before payment."
  ].join("\n");
 }
 function estimateHtml(){
  const rows=formattedLines().map(([key,value])=>'<tr><th>'+esc(key)+'</th><td>'+esc(value)+'</td></tr>').join("");
  return '<article class="mb-export-document"><h1>Construction Estimate</h1><p>Panchayat AI · '+esc(new Date().toLocaleDateString("en-IN"))+'</p>'+
   '<table><tbody>'+rows+'</tbody></table><p>'+esc(current.notes.join(" "))+'</p>'+
   '<p class="mb-disclaimer">Indicative calculation only. Verify site measurements, approved SOR, BOQ and engineering specifications.</p></article>';
 }
 function report(){
  const x=current;
  const entries=[["Measured quantity",f(x.qty)+" "+x.unit],...Object.entries(x.mat).map(([key,value])=>[MATERIAL[key][0]+" ("+MATERIAL[key][1]+")",f(value)])];
  const price=materialPrices();
  q("#mb-answer").innerHTML='<div class="mb-figures">'+entries.map(([name,value],i)=>
   '<div class="mb-figure" style="--index:'+i+'"><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong></div>').join("")+'</div>'+
   '<p class="hint">Gross: '+esc(f(x.gross)+" "+x.unit)+'; Deduction: '+esc(f(x.cut)+" "+x.unit)+'</p>'+
   (price.count?'<p><strong>'+(price.count<Object.keys(x.mat).length?"Partial material cost":"Material cost")+': '+esc(currency(price.cost))+'</strong></p>':"")+
   (x.rate!==null?'<p><strong>Work amount: '+esc(currency(x.rate*x.qty))+'</strong></p>':"")+
   '<p class="hint">'+esc(x.notes.join(" "))+'</p>';
  q("#mb-export-actions").hidden=false;
 }
 function compute(){
  try{current=calculate({type:q("#mb-type").value,...values()});report();alert("✓ Estimate calculated. Download or share below.");}
  catch(error){reset();alert("⚠ "+error.message);}
 }
 function saveFile(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 async function makeWordBlob(){
  if(!window.docx?.Packer){
   await new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";
    script.onload=resolve;script.onerror=()=>reject(new Error("Word library could not load. Check your connection."));
    document.head.appendChild(script);
   });
  }
  const d=window.docx;
  if(!d?.Packer)throw Error("Word exporter is not available.");
  const paras=[new d.Paragraph({text:"Construction Estimate",heading:d.HeadingLevel.HEADING_1}),
    new d.Paragraph({text:"Panchayat AI · "+new Date().toLocaleDateString("en-IN")}),
    ...formattedLines().map(([name,value])=>new d.Paragraph({children:[
      new d.TextRun({text:name+": ",bold:true}),new d.TextRun(String(value))]})),
    new d.Paragraph({text:current.notes.join(" ")}),
    new d.Paragraph({text:"Indicative estimate only. Verify site measurements and applicable SOR."})
  ];
  return d.Packer.toBlob(new d.Document({sections:[{children:paras}]}));
 }
 async function makePdfBlob(){
  if(typeof window.html2pdf!=="function")throw Error("PDF converter could not load. Please reload the page.");
  const holder=document.createElement("div");
  holder.className="mb-export-holder";
  holder.innerHTML=estimateHtml();
  document.body.appendChild(holder);
  try{
   if(document.fonts?.ready)await document.fonts.ready;
   const blob=await window.html2pdf().set({
    margin:[12,13,12,13],filename:"Panchayat-AI-Estimate.pdf",
    image:{type:"jpeg",quality:.96},html2canvas:{scale:2,useCORS:false,backgroundColor:"#fff"},
    jsPDF:{format:"a4",unit:"mm",orientation:"portrait"},pagebreak:{mode:["css","legacy"]}
   }).from(holder.firstElementChild).outputPdf("blob");
   if(!blob?.size)throw Error("The PDF was empty.");
   return blob;
  }finally{holder.remove();}
 }
 async function perform(action,callback){
  if(!current||exportBusy)return;
  exportBusy=true;
  const btn=q("#estimate-"+action);
  btn.disabled=true;
  const original=btn.textContent;
  btn.textContent="Preparing…";
  try{await callback();alert("✓ "+(action==="whatsapp"?"Share option opened.":"File is ready."));}
  catch(error){if(error?.name!=="AbortError")alert("⚠ "+(error.message||"Export failed. Retry."));}
  finally{exportBusy=false;btn.disabled=false;btn.textContent=original;}
 }
 q("#mb-type").onchange=adapt;
 inputs.unit.onchange=adapt;
 Object.values(inputs).forEach(input=>input.addEventListener("input",()=>{if(current){reset();alert("Measurements changed. Recalculate the estimate.");}}));
 q("#mb-example").onclick=()=>{
  const kind=q("#mb-type").value,example=TYPES[kind][1]==="area"?[8,3,""]:[5,3,15];
  [inputs.l,inputs.b,inputs.h].forEach((node,i)=>node.value=example[i]);
  inputs.count.value="1";inputs.cut.value="0";inputs.hunit.value="cm";
  reset();alert("Sample dimensions applied. Update them with actual measurements.");
 };
 q("#mb-run").onclick=compute;
 q("#estimate-word").onclick=()=>perform("word",async()=>saveFile(await makeWordBlob(),"Panchayat-AI-Estimate.docx"));
 q("#estimate-pdf").onclick=()=>perform("pdf",async()=>saveFile(await makePdfBlob(),"Panchayat-AI-Estimate.pdf"));
 q("#estimate-whatsapp").onclick=()=>perform("whatsapp",async()=>{
  const text=estimateText();
  if(navigator.share&&typeof File==="function"){
   try{
    const blob=await makePdfBlob();
    const file=new File([blob],"Panchayat-AI-Estimate.pdf",{type:"application/pdf"});
    if(!navigator.canShare||navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:"Panchayat AI Estimate",text:"Construction estimate PDF"});
      return;
    }
   }catch(error){if(error?.name==="AbortError")throw error;}
  }
  const share="https://wa.me/?text="+encodeURIComponent(text.slice(0,7000));
  const link=document.createElement("a");link.href=share;link.target="_blank";link.rel="noopener noreferrer";
  document.body.appendChild(link);link.click();link.remove();
 });
 q(".mb-rate-grid").querySelectorAll("[data-material]").forEach(input=>{
  input.value=rates[input.dataset.material]??"";
  input.onchange=()=>{
   const value=input.value.trim();
   if(value!==""&&(!Number.isFinite(Number(value))||Number(value)<0)){alert("Enter a valid material rate.");return;}
   rates[input.dataset.material]=value;
   try{localStorage.setItem("pai_mb_draft_rates",JSON.stringify(rates));}catch{}
   if(current){try{report();}catch(error){alert("⚠ "+error.message);}}
  };
 });
 adapt();
}
window.PAI_ESTIMATE={mount,calculate};
})();