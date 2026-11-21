/* Panchayat AI role-aware work dashboard and admin-driven homepage content. */
(() => {
 "use strict";
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const options={
  chat:["✦","AI से पूछें","पंचायत नियम व प्रक्रिया","chat",null],
  draft:["✉","नया पत्र","पत्र व नोटिस","draft",null],
  tools:["▦","AI Tools","फाइल व टेक्स्ट","tools",null],
  estimate:["▤","Estimate / MB","गणना के Tools","estimate",null],
  history:["▱","पुराने Drafts","सुरक्षित दस्तावेज़","history",null],
  rti:["ⓘ","RTI","सूचना अधिकार","rti",null],
  notice:["☷","कारण बताओ नोटिस","नोटिस बनाएँ",null,"notice"],
  spasht:["✍","स्पष्टीकरण","नोटिस का उत्तर",null,"spasht"],
  aakhya:["▣","जाँच आख्या","आख्या / रिपोर्ट",null,"aakhya"],
  prastav:["✦","पंचायत प्रस्ताव","ग्राम पंचायत",null,"prastav"],
  karyavahi:["▤","बैठक कार्यवाही","बैठक कार्यवृत्त",null,"karyavahi"]
 };
 const byRole={
  gpa:["notice","spasht","aakhya","draft"],
  gva:["spasht","aakhya","draft","rti"],
  ado:["aakhya","notice","draft","rti"],
  bdo:["aakhya","draft","estimate","rti"],
  dpro:["notice","draft","rti","estimate"],
  adpro:["aakhya","notice","draft","rti"],
  ddo:["aakhya","draft","rti","estimate"],
  pradhan:["prastav","karyavahi","draft","chat"],
  prashasak:["prastav","karyavahi","draft","chat"],
  sahayak:["aakhya","chat","draft","tools"],
  clerk:["draft","spasht","history","chat"],
  resident:["chat","draft","rti","tools"],
  other_staff:["draft","spasht","chat","tools"]
 };
 function actionHTML(id){
   const o=options[id];if(!o)return "";
   return '<button type="button"'+(o[4]?' data-draft="'+o[4]+'"':' data-go="'+o[3]+'"')+
     '><span class="pai-dash-icon" aria-hidden="true">'+o[0]+'</span><span>'+
     '<span class="pai-dash-label">'+esc(o[1])+'</span><small>'+esc(o[2])+'</small></span></button>';
 }
 function mount(home,{profile,user,drafts,roleName,design,history,saved}={}){
   if(!home)return;
   const conf=design||{};
   const heroLabel=home.querySelector(".hero-eyebrow");
   if(heroLabel&&conf.label)heroLabel.textContent=String(conf.label).slice(0,45);
   if(!user){
     if(conf.title)home.querySelector(".hero h1").textContent=String(conf.title).slice(0,70);
     if(conf.subtitle)home.querySelector(".hero p").textContent=String(conf.subtitle).slice(0,180);
   } else if(conf.subtitle){
     const desc=home.querySelector(".hero p");
     if(desc)desc.textContent+=" · "+String(conf.subtitle).slice(0,180);
   }
   if(conf.showNews===false)home.querySelector('.home-news-estimate a[href*="karmcharinews"]')?.remove();
   if(conf.showEstimate===false)home.querySelector(".home-news-estimate .home-estimate")?.remove();
   if(conf.showPlus===false)home.querySelector(".home-final-pair .plus-tile")?.remove();
   for(const row of home.querySelectorAll(".home-news-estimate,.home-final-pair")){
     if(row.children.length===0)row.remove();
     else if(row.children.length===1)row.style.gridTemplateColumns="minmax(0,1fr)";
   }
   if(!profile || !user)return;
   const valid=new Set((drafts||[]).map(d=>d.k));
   const initial=[conf.featured||"chat",...(byRole[profile.role]||byRole.resident),"chat","draft","tools","estimate"];
   const actions=[...new Set(initial)].filter(id=>
     options[id] && (!options[id][4] || valid.has(options[id][4]))).slice(0,4);
   const last=(history||[]).find(h=>options[h.view]||Object.values(options).some(o=>o[4]===h.draft));
   const previous=last&&(last.draft?Object.keys(options).find(k=>options[k][4]===last.draft):last.view);
   const recent=previous&&options[previous]?
     '<button type="button"'+(options[previous][4]?' data-draft="'+options[previous][4]+'"':' data-go="'+options[previous][3]+'"')+
     '>↗ '+esc(options[previous][1])+' फिर खोलें</button>':
     '<button type="button" data-go="draft">पहला Draft बनाएँ →</button>';
   const locations=[profile.block,profile.district,...(profile.gps||[]).slice(0,1)].filter(Boolean);
   const tags=locations.map(l=>'<span>'+esc(l)+'</span>').join("");
   const section=document.createElement("section");
   section.className="pai-dashboard";
   section.setAttribute("aria-label","आपका Smart Dashboard");
   section.innerHTML='<div class="pai-dash-top"><div><span class="pai-dash-kicker">MY WORKSPACE</span>'+
     '<h2>आपका कार्य डैशबोर्ड</h2></div><span class="pai-dash-status">● तैयार</span></div>'+
     '<p class="pai-dash-intro">'+esc(roleName||"पंचायत उपयोगकर्ता")+
     ' के लिए खास सुविधाएँ · '+(Number(saved)||0)+' सुरक्षित Drafts</p>'+
     (tags?'<div class="pai-dash-context">'+tags+'</div>':"")+
     '<div class="pai-dash-shortcuts">'+actions.map(actionHTML).join("")+'</div>'+
     '<div class="pai-dash-recent"><span>हाल में इस्तेमाल की गई सुविधा</span>'+recent+'</div></section>';
   const hero=home.querySelector(".hero");
   hero?.insertAdjacentElement("afterend",section);
 }
 window.PAI_DASH={mount};
})();
