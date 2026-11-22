/* Panchayat AI — dedicated writing workspace, not general AI chat */
(() => {
 "use strict";
 const $=(s,p=document)=>p.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const examples={
   patra:["ADO पंचायत को ग्राम पंचायत की सफाई व्यवस्था के संबंध में पत्र बनाओ","BDO को आवश्यक अभिलेख उपलब्ध कराने हेतु पत्र बनाओ"],
   notice:["ग्राम पंचायत में सार्वजनिक रास्ते पर निर्माण सामग्री रखने के संबंध में नोटिस बनाओ"],
   spasht:["प्राप्त नोटिस में लगाए गए आरोपों का क्रमवार स्पष्टीकरण तैयार करो"],
   aakhya:["DPRO को जन्म पंजीकरण से जुड़ी जाँच आख्या बनाओ"],
   aadesh:["ग्राम पंचायत कार्यालय से संबंधित कार्यालय आदेश तैयार करो"]
 };
 function mount(el,{kind,code,description,profile,user,api,letterhead,toast,save,previous=null}={}){
   if(!user||!profile)throw Error("Profile Login आवश्यक है");
   const title=String(kind||"पत्र"),type=String(code||"patra"),name=profile.nameHindi||profile.name||"";
   const gps=Array.isArray(profile.gps)?profile.gps.filter(Boolean):[];
   el.innerHTML='<section class="pai-writing-workspace" aria-label="सरकारी पत्र Draft Workspace">'+
     '<header class="pai-writing-heading"><span class="pai-writing-symbol" aria-hidden="true">✍</span>'+
     '<div><small>OFFICIAL DRAFT STUDIO</small><h2>'+esc(title)+' बनाएँ</h2><p>'+esc(description||"पूरे सरकारी प्रारूप में मसौदा तैयार करें")+'</p></div></header>'+
     '<section class="card pai-writing-form">'+
     '<p class="pai-writing-hint">प्रेषक: <b>'+esc(name)+'</b> · '+esc(profile.sign||"पंचायत कार्यालय")+'</p>'+
     '<label for="paiMatter">किस विषय पर '+esc(title)+' लिखना है?</label>'+
     '<textarea id="paiMatter" rows="5" maxlength="7000" placeholder="उदाहरण: ADO पंचायत को सफाई व्यवस्था की रिपोर्ट भेजने के लिए पत्र बनाओ।"></textarea>'+
     (gps.length?'<label for="paiSelectGp">संबंधित ग्राम पंचायत</label><select id="paiSelectGp">'+
       (gps.length!==1?'<option value="">— ग्राम पंचायत चुनें —</option>':"")+
       gps.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("")+'</select>':"")+
     '<div class="pai-writing-suggestions">'+(examples[type]||["विषय के संबंध में संक्षिप्त सरकारी मसौदा बनाओ"]).map(v=>
       '<button type="button" class="pai-writing-example">'+esc(v)+'</button>').join("")+'</div>'+
     '<div class="pai-writing-attach"><label for="paiWritingFile">दस्तावेज़ / नोटिस जोड़ें (वैकल्पिक)</label>'+
       '<input id="paiWritingFile" type="file" accept=".docx,.pdf,image/jpeg,image/png" multiple>'+
       '<span id="paiFilesInfo" class="hint">Word, PDF या फोटो से संदर्भ दे सकते हैं।</span></div>'+
     '<div class="pai-writing-actions"><button id="paiWrite" class="btn" type="button">✨ पूरा मसौदा बनाएँ</button>'+
       '<button class="btn alt" type="button" data-go="draft">प्रकार बदलें</button>'+
       '</div>'+

     '<p id="paiWriteStatus" class="hint" role="status" aria-live="polite"></p>'+
     '<p class="hint">Gemini विफल होने पर लिखित प्रश्न और आवश्यक Profile संदर्भ Groq / Cloudflare AI को भेजा जा सकता है। Free Backup में PDF/फोटो का AI विश्लेषण नहीं होता।</p></section>'+
     '<section id="paiWritingOutput" aria-live="polite"></section></section>';
   const matter=$("#paiMatter",el),submit=$("#paiWrite",el),status=$("#paiWriteStatus",el);
   const target=$("#paiWritingOutput",el),input=$("#paiWritingFile",el);
   if(previous?.question)matter.value=previous.question;
   el.querySelectorAll(".pai-writing-example").forEach(btn=>btn.onclick=()=>{matter.value=btn.textContent;matter.focus()});
   const chosenFiles=[];
   input.onchange=()=>{
     chosenFiles.splice(0,...chosenFiles.length,...Array.from(input.files||[]).slice(0,3));
     $("#paiFilesInfo",el).textContent=chosenFiles.length?
       chosenFiles.map(x=>x.name).join(" · "):"फ़ाइल नहीं चुनी";
   };
   async function asAttachment(file){
     if(file.size>5*1024*1024)throw Error("5 MB से छोटी Word/PDF/फोटो फ़ाइल चुनें");
     const n=file.name.slice(0,130);
     if(/\.docx$/i.test(n)){
       if(!window.mammoth?.extractRawText)throw Error("Word पढ़ने की सुविधा उपलब्ध नहीं है");
       const t=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
       return {name:n,text:String(t.value||"").slice(0,30000)};
     }
     if(!["application/pdf","image/png","image/jpeg"].includes(file.type))
       throw Error("केवल Word, PDF, JPEG या PNG संलग्न करें");
     const data=await new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>ok(String(r.result).split(",")[1]);r.readAsDataURL(file)});
     return {name:n,mime:file.type,data};
   }
   let last=null,view=null;
   const create=async(revise=false)=>{
     if(submit.disabled)return;
     const request=matter.value.trim();
     if(!request&&!revise){status.textContent="पहले पत्र का विषय बताएँ।";matter.focus();return;}
     submit.disabled=true;submit.textContent="मसौदा तैयार हो रहा है…";
     status.textContent="आपकी Profile और दस्तावेज़ों के आधार पर पत्र बनाया जा रहा है…";
     try{
       if(view){view.dispose();view=null;}
       target.innerHTML="";
       const attachments=await Promise.all(chosenFiles.map(asAttachment));
       if(revise&&last){
         attachments.unshift({name:"पिछले पत्र का मसौदा",text:last.html.replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]*>/g," ").slice(0,28000)});
       }
       const points=String(request||last?.question||"");
       const stationery=letterhead?.mode?.(profile,points,title)||"plain";
       const gp=$("#paiSelectGp",el)?.value||"";
       const result=await api("/draft",{kind:title,profile,points,gp,att:attachments,stationery,refs:[]});
       last={kind:title,question:points,...result,stationery,id:crypto.randomUUID()};
       const holder=document.createElement("div");target.appendChild(holder);
       if(!window.PAI_DRAFT_CARD?.mount)throw Error("Draft Preview अभी उपलब्ध नहीं है। Reload करें।");
       view=window.PAI_DRAFT_CARD.mount(holder,{
         html:last.html,kind:title,review:result.review,size:12,stationery,
         letterhead:profile.role==="pradhan"?profile.letterhead:null,toast,
         onChange:changed=>{Object.assign(last,changed);},
         onSave:async changed=>{
           Object.assign(last,changed);
           await save({...last,at:Date.now()});
         }
       });
       status.textContent=(result.fallback?"✓ Gemini उपलब्ध नहीं था; "+(result.provider||"Free AI")+" से मसौदा तैयार हुआ। सभी विवरण जाँचें। ":"✓ मसौदा तैयार है। ")+ "नीचे Preview देखें, ज़रूरत हो तो Edit करें और फिर Save/Word/PDF करें।";
       const ref=document.createElement("div");ref.className="pai-writing-revise";
       ref.innerHTML='<label for="paiRevision">मसौदे में कुछ बदलना है?</label>'+
         '<textarea id="paiRevision" rows="2" placeholder="जैसे: दूसरे अनुच्छेद को संक्षिप्त करें"></textarea>'+
         '<button type="button" class="btn alt" id="paiRevise">✨ AI से सुधार कराएँ</button>';
       target.appendChild(ref);
       $("#paiRevise",ref).onclick=async()=>{
         const instruction=$("#paiRevision",ref).value.trim();
         if(!instruction)return toast("सुधार का निर्देश लिखें।");
         matter.value="पिछले मसौदे को संशोधित करो: "+instruction;
         await create(true);
       };
     }catch(e){status.textContent="⚠️ "+(e.message||"पत्र नहीं बना। पुनः प्रयास करें।");}
     finally{submit.disabled=false;submit.textContent="✨ पूरा मसौदा बनाएँ";}
   };
   submit.onclick=()=>create(false);
   if(previous?.html){
     matter.value=previous.question||"इस पत्र में संशोधन करें";
     const holder=document.createElement("div");target.appendChild(holder);
     view=window.PAI_DRAFT_CARD?.mount(holder,{html:previous.html,kind:title,size:previous.size||12,
       stationery:previous.stationery||"plain",letterhead:profile.letterhead,review:previous.review,toast,
       onChange:()=>{},onSave:async changed=>{await save({...previous,...changed,at:Date.now()})}});
   }
   return {destroy:()=>{view?.dispose()}};
 }
 window.PAI_DRAFT_WORKSPACE={mount};
})();
