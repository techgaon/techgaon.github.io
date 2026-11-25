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
.gst-act .btn{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none}
.gst-big{font-family:inherit;transition:background .2s,border-color .2s}
.gst-big:hover,.gst-big:focus-visible{background:#e7f4ed;border-color:#178550;outline-offset:2px}
.gst-big:disabled{opacity:.6;cursor:not-allowed}
.gst-camera-panel{margin-top:12px;border-radius:13px;padding:10px;background:#0d1b28}
.gst-camera-panel[hidden]{display:none!important}
.gst-camera-panel video{display:block;max-width:100%;width:100%;max-height:360px;object-fit:contain;border-radius:8px;background:#000}
.gst-camera-panel .gst-act{margin-top:10px}
.gst-camera-panel .gst-act button{font-size:13px}
.gst-chips{margin-top:8px}
.gst-wrap .gst-box:focus-within{border-color:#75b8a0}
.gst-wrap .gst-res td{overflow-wrap:anywhere;vertical-align:top}
.gst-wrap .gst-res td:last-child{max-width:240px}
.gst-wrap .gst-in:focus{outline:2px solid #78b7a1;outline-offset:1px}
@media(max-width:440px){
 .gst-wrap .gst-seg button{padding:10px 6px;font-size:12px}
 .gst-act{flex-direction:column}.gst-act .btn{width:100%}
}
@media(prefers-color-scheme:dark){
 body.dark .gst-box,body.dark .gst-chip{background:var(--card,#17342b);color:inherit;border-color:var(--bd,#365b4b)}
 body.dark .gst-in,body.dark .gst-seg button{background:var(--card,#17342b);color:inherit}
}

/* GST launcher / catalog */
.gst-landing{padding-top:2px}
.gst-launch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.gst-launch-card{min-width:0;min-height:200px;border:1px solid #cbdde9;border-radius:18px;padding:18px 9px;background:linear-gradient(140deg,#f6fbff,#e8f2ff);color:#174269;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;font:inherit;cursor:pointer;animation:gst-tile-enter .5s ease both;transition:transform .22s ease,box-shadow .22s ease}
.gst-launch-card:nth-child(2){background:linear-gradient(140deg,#fcfbf2,#edf9ee);animation-delay:.1s;color:#205d46}
.gst-launch-card:hover,.gst-launch-card:focus-visible{transform:translateY(-4px);box-shadow:0 10px 22px rgba(30,58,94,.13)}
.gst-launch-art{font-size:42px;line-height:1.3;animation:gst-float 3.6s ease-in-out infinite}
.gst-launch-art img{display:block;width:60px;height:60px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(25,72,125,.16))}
.gst-launch-card strong{font-size:18px}
.gst-launch-card small{font-size:12px;line-height:1.5;color:#4b5e5b}
@keyframes gst-tile-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes gst-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.gst-subhead{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.gst-subhead h2{margin:0;font-size:21px}
.gst-back{width:38px;height:38px;border-radius:12px;border:1px solid #bed0da;background:#f0f7fc;color:#134b73;font-size:24px;cursor:pointer}
.gst-rate-list{display:grid;gap:8px;margin:12px 0}
.gst-rate-entry{display:flex;gap:10px;align-items:center;justify-content:space-between;text-align:left;border:1px solid #d7e4e9;border-radius:12px;background:#fff;padding:12px 14px;width:100%;font:inherit;color:inherit;cursor:pointer}
.gst-rate-entry strong{font-size:14px;display:block;line-height:1.4}
.gst-rate-entry small{display:block;font-size:11px;color:#697b84;margin-top:3px}
.gst-rate-entry>b{flex:none;min-width:48px;color:#176042;font-size:15px}
.gst-rate-entry:hover{border-color:#4b9bba;background:#f5fbff}
.gst-rate-detail{animation:gst-tile-enter .28s ease both;margin-top:14px;border-color:#91b1c1}
.gst-rate-detail h3{margin:8px 0;font-size:17px}
.gst-rate-detail p{font-size:13px;line-height:1.6;margin:6px 0}
.gst-rate-pill{display:inline-block;border-radius:99px;background:#e4f4ea;color:#146344;font-weight:800;padding:6px 10px;font-size:13px}
.gst-rate-foot{font-size:12px;color:#536a76;line-height:1.7;margin:10px 0}
.gst-source{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;padding:11px;border:1px solid #a6c3d1;border-radius:10px;color:#14517c;text-decoration:none;flex:1}
.gst-select,.gst-search{font-size:14px;letter-spacing:normal}
.gst-explorer .gst-box label:not(:first-child){margin-top:12px}
.gst-custom{width:110px!important;max-width:100%;font-size:16px;padding:8px}
.gst-mt{margin-top:12px!important}
.gst-selected-item{padding:10px 12px;border-radius:10px;background:#e9f7ed;color:#175b42;margin:0 0 12px;font-size:13px;font-weight:700}
.gst-whatsapp{background:#158a54!important;color:white!important;white-space:nowrap}
@media(max-width:420px){.gst-launch-card{min-height:170px;padding:15px 7px}.gst-launch-art{font-size:35px}.gst-launch-card strong{font-size:16px}}
@media(prefers-reduced-motion:reduce){.gst-launch-card,.gst-launch-art,.gst-rate-detail{animation:none}.gst-launch-card{transition:none}}

/* New keypad: uses the existing Panchayat AI theme tokens and inherited fonts. */
.gst-ref-calculator{max-width:650px;font-family:inherit;color:var(--ink)}
.gst-ref-calculator button,.gst-ref-calculator input,.gst-ref-calculator select{font-family:inherit}
.gst-ref-screen{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:154px;padding:20px 15px 23px;background:var(--card);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--pai-shadow,0 5px 15px #162e530a)}
.gst-screen-drop{border:1px solid var(--bd);border-radius:15px;background:var(--gl);color:var(--g);min-width:58px;min-height:65px;font-size:36px;cursor:pointer;line-height:1}
.gst-ref-screen-right{flex:1;min-width:0;text-align:right;display:flex;flex-direction:column;gap:7px}
#gst-display-note{font-size:13px;color:var(--mut);font-weight:600}
#gst-display{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:clamp(28px,7.2vw,53px);line-height:1.3;font-weight:700;font-variant-numeric:tabular-nums}
.gst-option-panel{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-top:8px}
.gst-option-panel[hidden]{display:none!important}
.gst-option-panel label{margin:8px 0 4px;color:var(--ink)}
.gst-option-panel input,.gst-option-panel select{width:100%;background:var(--card);color:var(--ink);border:1px solid var(--bd)}
.gst-mode-toggle{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.gst-mode-toggle button{padding:11px;border:1px solid var(--bd);border-radius:12px;background:var(--gl);color:var(--ink);cursor:pointer;font-size:13px}
.gst-mode-toggle button.on{background:var(--g);color:#fff}
.gst-quick-rates{background:var(--gl);margin:12px 0 0;border-radius:var(--r);padding:11px 7px;display:grid;gap:5px}
.gst-percent-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.gst-percent-key{background:transparent;color:var(--ink);font-size:clamp(18px,5.2vw,28px);border:1px solid transparent;border-radius:12px;min-height:64px;cursor:pointer;font-weight:600;font-variant-numeric:tabular-nums}
.gst-percent-key.selected{border-color:var(--g2);background:var(--card);color:var(--g2)}
.gst-percent-key:active,.gst-number-key:active{transform:scale(.96)}
.gst-ref-keypad{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:8px;padding:6px;background:var(--card);border:1px solid var(--bd);border-radius:var(--r)}
.gst-number-key{min-width:0;min-height:69px;border:0;background:transparent;border-radius:12px;font-size:clamp(22px,6vw,34px);font-weight:500;color:var(--ink);cursor:pointer;transition:background .14s ease,transform .12s ease}
.gst-number-key.operator{color:var(--g2);font-weight:700}
.gst-number-key.equals{background:var(--g);color:#fff;font-weight:700}
.gst-number-key:hover{background:var(--gl)}
.gst-number-key.equals:hover{background:var(--g2)}
.gst-entry-error{font-size:13px;color:#bd3030;margin-top:10px}
.gst-receipt{background:var(--card);border:1.5px solid var(--bd);border-radius:24px;padding:clamp(17px,4vw,30px);box-shadow:var(--pai-shadow,0 5px 15px #162e530a);font-family:inherit}
.gst-receipt-head{display:flex;justify-content:space-between;align-items:center;color:var(--mut);font-size:13px;margin-bottom:14px;font-weight:600}
.gst-receipt-rate{padding:6px 10px;border-radius:99px;background:var(--gl);color:var(--g2)}
.gst-receipt-line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 0;color:var(--mut);font-size:clamp(14px,3.4vw,19px)}
.gst-receipt-line b{font-size:clamp(15px,3.5vw,21px);font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.gst-receipt-line span{min-width:0}
.gst-net-line{padding:17px 0 26px;color:var(--ink)}
.gst-net-line strong{font-size:clamp(22px,5vw,32px);text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.gst-round-line{cursor:pointer;margin:0;font-weight:400}
.gst-round-label{display:flex;align-items:center;gap:10px;white-space:nowrap}
.gst-round-label input{width:20px;height:20px;flex:none;accent-color:var(--g2);margin:0}
.gst-receipt-total{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:2px solid var(--bd);margin-top:7px;padding-top:27px;color:var(--g)}
.gst-receipt-total span{font-weight:700;font-size:clamp(16px,3.7vw,23px)}
.gst-receipt-total strong{font-size:clamp(24px,5.3vw,38px);font-weight:800;font-variant-numeric:tabular-nums;text-align:right;overflow-wrap:anywhere}
.gst-result-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.gst-result-actions .btn{min-width:0;font-size:12px;padding:11px 7px;text-decoration:none;display:flex;align-items:center;justify-content:center;text-align:center}
@media(max-width:370px){.gst-ref-screen{min-height:125px}.gst-screen-drop{min-width:47px;min-height:56px}.gst-percent-key{min-height:56px}.gst-number-key{min-height:59px}.gst-result-actions{grid-template-columns:1fr 1fr}.gst-result-actions .gst-whatsapp{grid-column:1/-1}.gst-round-label{white-space:normal}}
@media(prefers-reduced-motion:reduce){.gst-percent-key,.gst-number-key{transition:none}}

/* Scan / Upload and manual GSTIN entry separator (keeps Panchayat AI theme). */
.gst-or-divider{display:flex;align-items:center;gap:13px;color:var(--mut);font-family:inherit;font-size:14px;font-weight:700;margin:10px 4px 15px}
.gst-or-divider::before,.gst-or-divider::after{content:"";height:1px;background:var(--bd);flex:1}
.gst-or-divider span{letter-spacing:.06em}
#gst-no::placeholder{text-transform:none;letter-spacing:normal;font-family:inherit;opacity:.62}
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

/* ---------------- GST Calculator menu / rate explorer ---------------- */
const RATE_GROUPS=["सभी","निर्माण सामग्री","जलापूर्ति व स्वच्छता","बिजली व उपकरण","सेवाएँ","विशेष जाँच"];
const rateItems=()=>Array.isArray(window.PAI_GST_RATES)?window.PAI_GST_RATES:[];
function mountCalc(el){ mountCalculator(el); }
function mountRates(el){
 style();
 let group="सभी",query="",selectedId="";
 el.innerHTML='<div class="gst-wrap gst-explorer">'+
 '<div class="gst-subhead"><button type="button" class="gst-back" id="gst-back-menu" aria-label="Back">←</button><h2>GST दरें जानें</h2></div>'+
 '<div class="gst-box"><label for="gst-rate-group">Category</label><select class="gst-in gst-select" id="gst-rate-group">'+
 RATE_GROUPS.map(x=>'<option>'+esc(x)+'</option>').join("")+'</select>'+
 '<label for="gst-rate-search">Search</label><input id="gst-rate-search" class="gst-in gst-search" type="search" placeholder="ईंट, गिट्टी, मौरंग, Cement, Plumbing…"></div>'+
 '<div id="gst-rate-list" class="gst-rate-list" aria-live="polite"></div>'+
 '<div id="gst-rate-detail" aria-live="polite"></div>'+
 '<p class="gst-rate-foot">दरों का संदर्भ: 22 सितंबर 2025 से लागू बदलाव। अंतिम दर HSN/SAC, Invoice Date और संबंधित Notification से जाँचें।</p></div>';
 const $=q=>el.querySelector(q);
 const normalize=v=>String(v||"").normalize("NFKC").toLocaleLowerCase().trim();
 function select(id){
  const item=rateItems().find(x=>x.id===id);
  if(!item)return;
  selectedId=id;
  const rate=Number.isFinite(item.rate)?item.rate:null;
  $("#gst-rate-detail").innerHTML='<section class="gst-box gst-rate-detail">'+
   '<div class="gst-rate-pill">'+(rate===null?'दर की पुष्टि जरूरी':rate+'% GST')+'</div>'+
   '<h3>'+esc(item.name)+'</h3><p><b>HSN/SAC:</b> '+esc(item.hsn)+'</p>'+
   '<p>'+esc(item.note)+'</p>'+
   '<div class="gst-act"><button type="button" class="btn" id="gst-use-rate">Calculate</button>'+
   '<a class="gst-source" href="'+esc(item.source)+'" target="_blank" rel="noopener noreferrer">Official Source ↗</a></div></section>';
  $("#gst-use-rate").onclick=()=>mountCalculator(el,{rate,manualOnly:rate===null,fromRates:true,item:item.name});
  $("#gst-rate-detail").scrollIntoView({block:"nearest",behavior:"smooth"});
 }
 function draw(){
  const q=normalize(query),items=rateItems().filter(x=>(group==="सभी"||x.group===group)&&
   (!q||normalize([x.name,x.hsn,x.keywords,x.group].join(" ")).includes(q)));
  $("#gst-rate-list").innerHTML=items.length?items.map(x=>
   '<button type="button" class="gst-rate-entry" data-gst-item="'+esc(x.id)+'">'+
   '<span><strong>'+esc(x.name)+'</strong><small>'+esc(x.group)+' · '+esc(x.hsn)+'</small></span>'+
   '<b>'+(Number.isFinite(x.rate)?x.rate+'%':'जाँचें')+'</b></button>').join(""):
   '<div class="gst-box"><p>इस शब्द से कोई सामग्री या सेवा नहीं मिली। दूसरा Keyword लिखें।</p></div>';
  $("#gst-rate-list").querySelectorAll("[data-gst-item]").forEach(button=>button.onclick=()=>select(button.dataset.gstItem));
  if(selectedId&&!items.some(i=>i.id===selectedId)){$("#gst-rate-detail").replaceChildren();selectedId="";}
 }
 $("#gst-back-menu").onclick=()=>{ location.hash="home"; };
 $("#gst-rate-group").onchange=e=>{group=e.target.value;draw();};
 $("#gst-rate-search").oninput=e=>{query=e.target.value;draw();};
 draw();
}
function mountCalculator(el,options={}){
 style();
 const quickRates=[5,18,40];
 const startingRate=Number.isFinite(options.rate)?options.rate:(options.manualOnly?NaN:18);
 const state={entry:"0",rate:startingRate,mode:"add",supply:"intra",
   roundOff:true,operator:"",stored:null,startFresh:false,showResult:false,error:""};
 el.innerHTML='<div class="gst-wrap gst-ref-calculator">'+
  '<div class="gst-subhead gst-keypad-heading"><button type="button" class="gst-back" id="gst-back" aria-label="Back">←</button><h2>Calculate</h2></div>'+
  (options.item?'<p class="gst-selected-item">'+esc(options.item)+'</p>':"")+
  '<div id="gst-calculator-stage"></div></div>';
 const stage=el.querySelector("#gst-calculator-stage");
 const maxAmount=1e12;
 const money=x=>inr(x);
 const formatNumber=raw=>{
  const parts=String(raw).split(".");
  const n=Number(parts[0]||"0");
  const grouped=Number.isFinite(n)?new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n):"0";
  return grouped+(parts.length>1?"."+parts[1]:"");
 };
 const currentAmount=()=>Number(state.entry);
 const validRate=()=>Number.isFinite(state.rate)&&state.rate>=0&&state.rate<=100;
 const roundAmount=total=>Math.round(total);
 const getNumbers=()=>{
  if(!validRate()){state.error="Select a valid GST rate.";return null;}
  const figures=calculate(currentAmount(),state.rate,state.mode,state.supply);
  if(!figures){state.error="Enter a valid amount.";return null;}
  state.error="";return figures;
 };
 const formatSignedAmount=v=>(v>=0?"+":"−")+money(Math.abs(v));
 const buildResult=figures=>{
  const rounded=state.roundOff?roundAmount(figures.total):figures.total;
  const adjustment=r2(rounded-figures.total);
  const taxRows=state.supply==="intra"?
   [["CGST ("+(state.rate/2)+"%)",figures.cgst],["SGST ("+(state.rate/2)+"%)",figures.sgst]]:
   [["IGST ("+state.rate+"%)",figures.igst]];
  const rows=[["Net price",figures.base],...taxRows,["GST total",figures.gst]];
  const plain="GST Calculation\n"+
   (options.item?options.item+"\n":"")+
   "GST Rate: "+state.rate+"% ("+(state.mode==="add"?"Add":"Remove")+")\n"+
   rows.map(x=>x[0]+": "+money(x[1])).join("\n")+"\n"+
   "Round off: "+(state.roundOff?formatSignedAmount(adjustment):"Off")+"\n"+
   "Total price: "+money(rounded);
  return {rounded,adjustment,rows,plain};
 };
 function applyOperator(){
  if(!state.operator||state.stored===null)return;
  const b=Number(state.entry),a=state.stored;
  let v;
  if(state.operator==="+")v=a+b;
  else if(state.operator==="−")v=a-b;
  else if(state.operator==="×")v=a*b;
  else if(state.operator==="÷")v=b===0?NaN:a/b;
  if(!Number.isFinite(v)||v<0||v>maxAmount){
   state.error="This calculation is outside the valid amount range.";
   state.operator="";state.stored=null;return;
  }
  state.entry=String(r2(v));state.operator="";state.stored=null;state.startFresh=true;
  state.error="";
 }
 function handleKey(key){
  if(key==="AC"){
   state.entry="0";state.stored=null;state.operator="";state.error="";state.startFresh=false;
  }else if(key==="⌫"){
   if(state.startFresh){state.entry="0";state.startFresh=false;}
   else state.entry=state.entry.length<=1?"0":state.entry.slice(0,-1);
   state.error="";
  }else if(key==="." || /^[0-9]+$/.test(key)){
   if(state.startFresh){state.entry="0";state.startFresh=false;}
   if(key==="."){
    if(!state.entry.includes("."))state.entry+=".";
   }else{
    const raw=state.entry==="0" ? key.replace(/^0+(?=\d)/,"") : state.entry+key;
    const parts=raw.split(".");
    if(parts[0].length<=12&&(!parts[1]||parts[1].length<=2)&&Number(raw)<=maxAmount)
      state.entry=raw||"0";
   }
   state.error="";
  }else if(key==="%"){
   state.entry=String(r2(currentAmount()/100));state.startFresh=false;
  }else if(["+","−","×","÷"].includes(key)){
   if(state.operator)applyOperator();
   if(state.error){render();return;}
   state.stored=currentAmount();state.operator=key;state.startFresh=true;
  }else if(key==="="){
   if(state.operator)applyOperator();
   if(state.error){render();return;}
   if(!getNumbers()){render();return;}
   state.showResult=true;
  }
  render();
 }
 function render(){
  if(state.showResult){
   const figures=getNumbers();
   if(!figures){state.showResult=false;render();return;}
   const {rounded,adjustment,rows,plain}=buildResult(figures);
   stage.innerHTML='<section class="gst-receipt" aria-label="GST calculation result">'+
    '<div class="gst-receipt-head"><span>GST Calculation</span><span class="gst-receipt-rate">'+
    esc((state.mode==="add"?"+":"−")+state.rate+"%")+'</span></div>'+
    '<div class="gst-receipt-line gst-net-line"><span>Net price</span><strong>'+money(figures.base)+'</strong></div>'+
    (state.supply==="intra"?
      '<div class="gst-receipt-line"><span>CGST ('+(state.rate/2)+'%)</span><b>'+money(figures.cgst)+'</b></div>'+
      '<div class="gst-receipt-line"><span>SGST ('+(state.rate/2)+'%)</span><b>'+money(figures.sgst)+'</b></div>':
      '<div class="gst-receipt-line"><span>IGST ('+state.rate+'%)</span><b>'+money(figures.igst)+'</b></div>')+
    '<label class="gst-receipt-line gst-round-line" for="gst-round">'+
    '<span class="gst-round-label"><input type="checkbox" id="gst-round" '+(state.roundOff?"checked":"")+'><span>Round off</span></span>'+
    '<b>'+(state.roundOff?formatSignedAmount(adjustment):"Off")+'</b></label>'+
    '<div class="gst-receipt-total"><span>Total price</span><strong>'+money(rounded)+'</strong></div>'+
    '</section>'+
    '<div class="gst-result-actions">'+
    '<button type="button" class="btn alt" id="gst-edit">← Edit</button>'+
    '<button type="button" class="btn alt" id="gst-copy">Copy</button>'+
    '<a class="btn gst-whatsapp" id="gst-whatsapp" href="https://wa.me/?text='+encodeURIComponent(plain)+'" target="_blank" rel="noopener noreferrer">WhatsApp Share</a>'+
    '</div>';
   stage.querySelector("#gst-round").onchange=e=>{state.roundOff=e.target.checked;render();};
   stage.querySelector("#gst-edit").onclick=()=>{state.showResult=false;render();};
   stage.querySelector("#gst-copy").onclick=async e=>{
    e.currentTarget.textContent=(await copy(plain))?"✓ Copied":"Copy blocked";
   };
   return;
  }
  const quickRow=(mode)=>quickRates.map(rate=>{
   const selected=state.rate===rate&&state.mode===mode;
   return '<button type="button" class="gst-percent-key'+(selected?" selected":"")+'" data-gst-rate="'+rate+'" data-gst-mode="'+mode+'">'+
    (mode==="add"?"+":"−")+rate+'%</button>';
  }).join("");
  stage.innerHTML='<section class="gst-ref-screen">'+
   '<button type="button" class="gst-screen-drop" id="gst-options-toggle" aria-expanded="false" aria-controls="gst-option-panel" aria-label="Rate and tax options">⌄</button>'+
   '<div class="gst-ref-screen-right"><span id="gst-display-note">'+
     (state.mode==="add"?"Add":"Remove")+' GST · '+(validRate()?state.rate+"%":"Select rate")+
     (state.operator?" · "+state.operator:"")+'</span>'+
   '<output id="gst-display" aria-live="polite">'+formatNumber(state.entry)+'</output></div></section>'+
   '<section class="gst-option-panel" id="gst-option-panel" hidden>'+
   '<label for="gst-manual-rate">Custom GST Rate (%)</label>'+
   '<input id="gst-manual-rate" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="Enter rate" value="'+(validRate()?state.rate:"")+'">'+
   '<label for="gst-supply">Supply Type</label><select id="gst-supply">'+
   '<option value="intra" '+(state.supply==="intra"?"selected":"")+'>Same State — CGST + SGST</option>'+
   '<option value="inter" '+(state.supply==="inter"?"selected":"")+'>Other State — IGST</option>'+
   '</select><div class="gst-mode-toggle"><button type="button" data-gst-switch="add" class="'+(state.mode==="add"?"on":"")+'">Add GST</button>'+
   '<button type="button" data-gst-switch="remove" class="'+(state.mode==="remove"?"on":"")+'">Remove GST</button></div></section>'+
   '<div class="gst-quick-rates" role="group" aria-label="GST rates">'+
   '<div class="gst-percent-row">'+quickRow("add")+'</div>'+
   '<div class="gst-percent-row">'+quickRow("remove")+'</div></div>'+
   '<div class="gst-ref-keypad" role="group" aria-label="Calculator keypad">'+
   [["AC","%","÷","⌫"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["0","00",".","="]]
     .flat().map(key=>
      '<button type="button" class="gst-number-key'+(key==="="?" equals":"")+(/[×÷+−]/.test(key)?" operator":"")+'" data-gst-key="'+esc(key)+'">'+
        esc(key)+'</button>').join("")+
   '</div>'+
   (state.error?'<p class="gst-entry-error" role="alert">'+esc(state.error)+'</p>':"");
  const panel=stage.querySelector("#gst-option-panel");
  const toggle=stage.querySelector("#gst-options-toggle");
  toggle.onclick=()=>{
   panel.hidden=!panel.hidden;
   toggle.setAttribute("aria-expanded",String(!panel.hidden));
  };
  stage.querySelectorAll("[data-gst-rate]").forEach(button=>{
   button.onclick=()=>{
    state.rate=Number(button.dataset.gstRate);
    state.mode=button.dataset.gstMode;
    state.error="";
    render();
   };
  });
  stage.querySelectorAll("[data-gst-key]").forEach(button=>{
   button.onclick=()=>handleKey(button.dataset.gstKey);
  });
  stage.querySelector("#gst-manual-rate").oninput=e=>{
   const raw=e.target.value.trim(),n=Number(raw);
   state.rate=raw&&Number.isFinite(n)&&n>=0&&n<=100?n:NaN;
   state.error="";
   stage.querySelector("#gst-display-note").textContent=
    (state.mode==="add"?"Add":"Remove")+" GST · "+(validRate()?state.rate+"%":"Select rate");
   stage.querySelectorAll(".gst-percent-key").forEach(x=>x.classList.toggle("selected",
    validRate()&&Number(x.dataset.gstRate)===state.rate&&x.dataset.gstMode===state.mode));
  };
  stage.querySelector("#gst-supply").onchange=e=>{state.supply=e.target.value;};
  stage.querySelectorAll("[data-gst-switch]").forEach(button=>{
   button.onclick=()=>{
    state.mode=button.dataset.gstSwitch;
    stage.querySelectorAll("[data-gst-switch]").forEach(x=>x.classList.toggle("on",x===button));
    stage.querySelector("#gst-display-note").textContent=
      (state.mode==="add"?"Add":"Remove")+" GST · "+(validRate()?state.rate+"%":"Select rate");
    stage.querySelectorAll(".gst-percent-key").forEach(x=>x.classList.toggle("selected",
      validRate()&&Number(x.dataset.gstRate)===state.rate&&x.dataset.gstMode===state.mode));
   };
  });
 }
 el.querySelector("#gst-back").onclick=()=>options.fromRates?mountRates(el):(location.hash="home");
 render();
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
 el.innerHTML='<div class="gst-wrap"><h2>🔎 GST No Detail</h2>'+
 '<div class="gst-box"><label>Scan Or Upload</label><div class="gst-two">'+
 '<button type="button" class="gst-big" id="gst-scan"><span>📷</span>Scan</button>'+
 '<button type="button" class="gst-big" id="gst-upload"><span>🖼️</span>Upload</button></div>'+
 '<input id="gst-cam" type="file" accept="image/*" capture="environment" hidden>'+
 '<input id="gst-gal" type="file" accept="image/*" hidden>'+
 '<div id="gst-camera-panel" class="gst-camera-panel" hidden><video id="gst-video" autoplay muted playsinline></video>'+
 '<div class="gst-act"><button type="button" class="btn" id="gst-take">Take Photo</button><button type="button" class="btn alt" id="gst-cancel">Cancel</button></div></div>'+
 '<p class="gst-note" id="gst-scan-msg" role="status" aria-live="polite">बिल या रसीद में GSTIN साफ दिखाई दे, ऐसी Photo लें।</p></div>'+
 '<div class="gst-or-divider" aria-label="or"><span>OR</span></div>'+
 '<div class="gst-box"><label for="gst-no">Type GST No</label>'+
 '<input id="gst-no" class="gst-in code" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="Example: 27AAPFU0939F1ZV">'+
 '<div class="gst-act"><button type="button" class="btn" id="gst-go">See Detail</button><button type="button" class="btn alt" id="gst-reset">Clear</button></div></div>'+
 '<div id="gst-res" aria-live="polite"></div></div>';
 const $=q=>el.querySelector(q);
 let activeStream=null,scanning=false;
 const exampleInput=$("#gst-no");
 const exampleText="Example: 27AAPFU0939F1ZV";
 const reduceMotion=()=>typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 let exampleTimer=null,exampleIndex=0,examplePause=0,exampleDeleting=false,exampleStopped=false;
 function stopExample(){
   if(exampleTimer!==null){clearInterval(exampleTimer);exampleTimer=null;}
 }
 function startExample(){
   stopExample();
   if(exampleStopped||exampleInput.value||document.activeElement===exampleInput||!el.isConnected)return;
   if(reduceMotion()){exampleInput.placeholder=exampleText;return;}
   exampleIndex=0;examplePause=0;exampleDeleting=false;exampleInput.placeholder="";
   exampleTimer=setInterval(()=>{
     if(exampleStopped||!el.isConnected||document.activeElement===exampleInput||exampleInput.value){stopExample();return;}
     if(examplePause>0){examplePause--;return;}
     if(!exampleDeleting){
       exampleIndex=Math.min(exampleText.length,exampleIndex+1);
       exampleInput.placeholder=exampleText.slice(0,exampleIndex);
       if(exampleIndex===exampleText.length){examplePause=14;exampleDeleting=true;}
     }else{
       exampleIndex=Math.max(0,exampleIndex-1);
       exampleInput.placeholder=exampleText.slice(0,exampleIndex);
       if(exampleIndex===0){examplePause=5;exampleDeleting=false;}
     }
   },105);
 }
 exampleInput.addEventListener("focus",()=>{stopExample();exampleInput.placeholder=exampleText;});
 exampleInput.addEventListener("blur",()=>{if(!exampleInput.value)startExample();});
 function stopCamera(){
  if(activeStream){for(const track of activeStream.getTracks())track.stop();activeStream=null;}
  const panel=$("#gst-camera-panel");
  if(panel)panel.hidden=true;
  const video=$("#gst-video");
  if(video)video.srcObject=null;
 }
 // Main app calls cleanup on navigation; a user can always close the camera manually.
 window.PAI_GST.cleanup=()=>{exampleStopped=true;stopExample();stopCamera();};
 const liveLookup=async gstin=>{
  const endpoint=window.PAI_GST_LOOKUP_ENDPOINT;
  if(typeof endpoint!=="string"||!endpoint.trim())return;
  const target=$("#gst-live");
  if(!target)return;
  let uri;
  try{
   uri=new URL(endpoint,location.href);
   if(uri.origin!==location.origin||uri.protocol!=="https:")throw Error("Unsafe API URL");
  }catch{target.textContent="Live GST API configuration सही नहीं है।";return;}
  target.textContent="Official GST details लोड हो रही हैं…";
  try{
   const response=await fetch(uri.href,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({gstin})});
   if(!response.ok)throw Error("Lookup unavailable");
   const raw=await response.json();
   if($("#gst-no").value.trim().toUpperCase()!==gstin||!el.isConnected)return;
   if(!raw||raw.verified!==true||!raw.data||typeof raw.data!=="object")throw Error("Unverified API response");
   const data=raw.data;
   const fields=[
    ["Legal Name",data.legalName],["Trade Name",data.tradeName],["Registration Status",data.status],
    ["Registration Date",data.registrationDate],["Constitution of Business",data.constitution],
    ["Principal Address",data.address],["Taxpayer Type",data.taxpayerType],
    ["State Jurisdiction",data.stateJurisdiction],["Central Jurisdiction",data.centralJurisdiction]
   ].filter(x=>typeof x[1]==="string"&&x[1].trim());
   if(!fields.length)throw Error("Empty API response");
   target.innerHTML='<div class="gst-box gst-res"><b>Verified Taxpayer Details</b><table>'+
    fields.map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td></tr>').join("")+'</table>'+
    '<p class="gst-note">Source: '+esc(typeof raw.source==="string"?raw.source:"Authorised GST provider")+
    (typeof raw.checkedAt==="string"?' · Checked: '+esc(raw.checkedAt):"")+'</p></div>';
  }catch{
   if(target&&el.isConnected)target.innerHTML='<p class="gst-note">Live GST Details अभी उपलब्ध नहीं हैं। नीचे Official GST Portal पर पुष्टि करें।</p>';
  }
 };
 function show(g){
  const r=decode(g),input=$("#gst-no");
  input.value=r.gstin;
  stopCamera();
  const display=$("#gst-res");
  const fields=r.valid?[
   ["GSTIN",r.gstin],["State",r.state+" ("+r.stateCode+")"],["PAN (from GSTIN)",r.pan],
   ["PAN Holder Type (inferred)",r.holder],["State Registration Code",r.regNo]
  ]:[];
  display.innerHTML='<div class="gst-box gst-res">'+
   '<p class="'+(r.valid?'gst-ok':'gst-bad')+'">'+
   (r.valid?'✓ GSTIN format और checksum सही हैं':'✗ GSTIN format/checksum सही नहीं है')+'</p>'+
   (r.errors.length?'<p class="gst-note">'+r.errors.map(esc).join(" ")+'</p>':"")+
   (fields.length?'<table>'+fields.map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td></tr>').join("")+'</table>':"")+
   (r.valid?'<div class="gst-act"><a class="btn" id="gst-portal" href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noopener noreferrer">Full Detail on GST Portal</a>'+
   '<button type="button" class="btn alt" id="gst-cp">Copy GSTIN</button></div>'+
   '<p class="gst-note">Format सही होने का अर्थ यह नहीं कि GST Registration Active है। Legal Name, Trade Name, Address और Status की आधिकारिक जाँच GST Portal पर करें। वहाँ Captcha भरना पड़ सकता है।</p>':"")+
   '</div><div id="gst-live"></div>';
  if(r.valid){
   $("#gst-portal").onclick=async()=>{
    $("#gst-portal").textContent=(await copy(r.gstin))?"GSTIN Copied · Check Portal":"Full Detail on GST Portal";
   };
   $("#gst-cp").onclick=async()=>{$("#gst-cp").textContent=(await copy(r.gstin))?"✓ Copied":"Copy blocked";};
   void liveLookup(r.gstin);
  }
  display.scrollIntoView({behavior:"smooth",block:"start"});
 }
 const pick=async file=>{
  if(!file||scanning)return;
  const msg=$("#gst-scan-msg");
  if(!file.type.startsWith("image/")||file.size>20*1024*1024){
   msg.textContent="केवल 20 MB तक की Image चुनें।";return;
  }
  scanning=true;
  $("#gst-scan").disabled=true;$("#gst-upload").disabled=true;
  msg.textContent="Image से GST नंबर पढ़ा जा रहा है…";
  try{
   const list=await ocrGstins(file,p=>{if(el.isConnected)msg.textContent="GST नंबर पढ़ा जा रहा है… "+p+"%";});
   if(!el.isConnected)return;
   if(!list.length){
    msg.textContent="Image में सही GST नंबर नहीं मिला। नज़दीक से, सीधी और साफ Photo लें या नंबर Type करें।";return;
   }
   if(list.length===1){msg.textContent="✓ GST नंबर मिला";show(list[0]);return;}
   msg.innerHTML='<b>'+list.length+' GST नंबर मिले — एक चुनें:</b><div class="gst-chips">'+
    list.slice(0,8).map(g=>'<button type="button" class="gst-chip" data-g="'+esc(g)+'">'+esc(g)+'</button>').join("")+'</div>';
   msg.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>show(b.dataset.g));
  }catch{if(el.isConnected)msg.textContent="Image पढ़ी नहीं जा सकी। इंटरनेट जाँचें या GSTIN टाइप करें।";}
  finally{
   scanning=false;
   if(el.isConnected){$("#gst-scan").disabled=false;$("#gst-upload").disabled=false;}
  }
 };
 $("#gst-cam").onchange=e=>{const file=e.target.files?.[0];e.target.value="";if(file)void pick(file);};
 $("#gst-gal").onchange=e=>{const file=e.target.files?.[0];e.target.value="";if(file)void pick(file);};
 $("#gst-upload").onclick=()=>$("#gst-gal").click();
 $("#gst-scan").onclick=async()=>{
  stopCamera();
  // Android/iOS: capture="environment" opens the rear camera capture flow.
  if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
   $("#gst-cam").click();return;
  }
  if(!navigator.mediaDevices?.getUserMedia){$("#gst-cam").click();return;}
  try{
   activeStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
   if(!el.isConnected){stopCamera();return;}
   $("#gst-video").srcObject=activeStream;
   $("#gst-camera-panel").hidden=false;
   await $("#gst-video").play().catch(()=>{});
  }catch{
   stopCamera();
   $("#gst-scan-msg").textContent="Camera खोलने की अनुमति नहीं मिली। Scan के लिए Camera Permission दें या Upload चुनें।";
  }
 };
 $("#gst-take").onclick=async()=>{
  const video=$("#gst-video");
  if(!video.videoWidth||!video.videoHeight)return;
  const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0);
  stopCamera();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.95));
  canvas.width=0;canvas.height=0;
  if(blob)void pick(new File([blob],"gst-scan.jpg",{type:"image/jpeg"}));
 };
 $("#gst-cancel").onclick=stopCamera;
 $("#gst-go").onclick=()=>show($("#gst-no").value);
 $("#gst-no").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();show(e.target.value);}};
 $("#gst-no").oninput=()=>{stopExample();$("#gst-res").replaceChildren();};
 $("#gst-reset").onclick=()=>{stopCamera();stopExample();$("#gst-no").value="";$("#gst-res").replaceChildren();$("#gst-no").focus();};
 startExample();
}

window.PAI_GST={mountCalc,mountCalculator,mountRates,mountDetail,decode,findGstins,checkChar,calculate};
})();
