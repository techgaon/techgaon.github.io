/* Panchayat AI — dedicated writing workspace, not general AI chat */
(() => {
 "use strict";
 const $=(s,p=document)=>p.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const idleAiButton='<span class="pai-ai-sparkle" aria-hidden="true">✦</span><span>Genrate letter Via AI</span>';
 const englishDocumentKind=code=>({
   patra:"letter",notice:"notice",spasht:"explanation",aakhya:"report",
   aadesh:"order",igrs:"report",prarthna:"application",shikayat:"complaint",
   samiksha:"review",tippani:"note",anusmarak:"reminder",chetavni:"warning"
 }[code]||"draft");
 const loadingAiButton=(kind,percent)=>'<span class="pai-ai-spinner" aria-hidden="true"></span><span>AI is generating your '+esc(kind)+'... '+percent+'%</span>';
 const examples={
   patra:["ADO पंचायत को ग्राम पंचायत की सफाई व्यवस्था के संबंध में पत्र बनाओ","BDO को आवश्यक अभिलेख उपलब्ध कराने हेतु पत्र बनाओ","ADO panchayat ko safai vyavastha ke sambandh me patra banao","BDO ko zaroori abhilekh uplabdh karane hetu patra banao"],
   notice:["ग्राम पंचायत में सार्वजनिक रास्ते पर निर्माण सामग्री रखने के संबंध में नोटिस बनाओ"],
   spasht:["प्राप्त नोटिस में लगाए गए आरोपों का क्रमवार स्पष्टीकरण तैयार करो","Notice me lagaye gaye aaropon ka point wise jawab banao","BDO ke notice ka spashtikaran taiyar karo"],
   aakhya:["DPRO को जन्म पंजीकरण से जुड़ी जाँच आख्या बनाओ"],
   aadesh:["ग्राम पंचायत कार्यालय से संबंधित कार्यालय आदेश तैयार करो"]
 };

 const roleExamples={
   pradhan:{
     patra:["Gramvasi Rahul ki taraf se BDO ko uske mohalle ki safai ke sambandh me patra banao",
       "BDO को ग्राम पंचायत में पेयजल की समस्या के संबंध में सामान्य पत्र बनाओ",
       "मेरे लेटरहेड पर ADO पंचायत को विकास कार्य के संबंध में पत्र बनाओ"],
     notice:["सार्वजनिक स्थान पर निर्माण सामग्री रखने के संबंध में तथ्यात्मक नोटिस का मसौदा बनाओ"],
     spasht:["प्राप्त नोटिस में लगाए गए आरोपों का क्रमवार जवाब तैयार करो"]
   },
   gpa:{
     patra:["ADO ko meri chhutti ke liye vyaktigat aavedan patra banao",
       "ADO पंचायत को ग्राम पंचायत की सफाई व्यवस्था के संबंध में कार्यालयी पत्र बनाओ",
       "ग्रामवासी राहुल की ओर से BDO को मोहल्ले की सफाई के लिए आवेदन बनाओ"],
     notice:["सफाईकर्मी से कार्य के संबंध में तथ्यात्मक स्पष्टीकरण माँगने हेतु नोटिस बनाओ"],
     spasht:["BDO ke notice ka point wise spashtikaran taiyar karo"]
   },
   gva:{
     patra:["ADO ko mere vyaktigat avakash hetu aavedan patra banao",
       "BDO को ग्राम पंचायत के अभिलेख संबंधी कार्यालयी पत्र बनाओ"],
     notice:["सफाईकर्मी से कार्य संबंधी जानकारी माँगने का नोटिस बनाओ"]
   },
   prashasak:{patra:["BDO को ग्राम पंचायत की पेयजल व्यवस्था के संबंध में कार्यालयी पत्र बनाओ",
     "ग्रामवासी राहुल की ओर से BDO को सफाई के संबंध में आवेदन बनाओ"]},
   sahayak:{patra:["BDO को मेरे व्यक्तिगत अवकाश हेतु आवेदन बनाओ",
     "सचिव को पंचायत कार्यालय के दस्तावेज उपलब्ध कराने का आवेदन बनाओ"]},
   ado:{patra:["BDO को पंचायतों की समीक्षा बैठक के संबंध में पत्र बनाओ",
     "मेरी छुट्टी के लिए BDO को व्यक्तिगत आवेदन बनाओ"]},
   bdo:{patra:["DPRO को ग्राम पंचायत की सफाई व्यवस्था के संबंध में पत्र बनाओ",
     "मेरी छुट्टी के लिए संबंधित अधिकारी को व्यक्तिगत आवेदन बनाओ"]},
   dpro:{patra:["CDO को स्वच्छता कार्यों की प्रगति के संबंध में पत्र बनाओ",
     "मेरे व्यक्तिगत अवकाश हेतु संबंधित अधिकारी को आवेदन बनाओ"]},
   adpro:{patra:["DPRO को पंचायत अभिलेखों की जानकारी देने के संबंध में पत्र बनाओ",
     "मेरे व्यक्तिगत अवकाश हेतु आवेदन बनाओ"]},
   ddo:{patra:["CDO को विकास कार्यों की समीक्षा के संबंध में पत्र बनाओ",
     "मेरे व्यक्तिगत अवकाश हेतु आवेदन बनाओ"]},
   clerk:{patra:["मेरे व्यक्तिगत अवकाश के लिए सक्षम अधिकारी को आवेदन बनाओ",
     "कार्यालय में अभिलेख उपलब्ध कराने के संबंध में पत्र बनाओ"]},
   resident:{patra:["BDO ko mere mohalle ki safai ke sambandh me aavedan banao",
     "ग्राम प्रधान को सार्वजनिक रास्ते की सफाई के लिए प्रार्थना पत्र बनाओ"]},
   other_staff:{patra:["मेरी छुट्टी के लिए संबंधित अधिकारी को व्यक्तिगत आवेदन बनाओ",
     "विभाग से आवश्यक अभिलेख उपलब्ध कराने हेतु पत्र बनाओ"]}
 };
 const suggestionsFor=(role,type)=>{
   const specific=roleExamples[role]?.[type];
   if(specific?.length)return specific;
   const nonIssuers=["resident","sahayak","clerk","other_staff"];
   if(type==="notice"&&nonIssuers.includes(role))
     return ["संबंधित सक्षम अधिकारी से सार्वजनिक स्थान पर बाधा के संबंध में नोटिस जारी करने हेतु आवेदन बनाओ",
       "ग्राम पंचायत में सफाई समस्या पर सक्षम अधिकारी को कार्रवाई हेतु शिकायत लिखो"];
   if(type==="spasht")
     return role==="resident"
       ? ["मुझे मिले नोटिस का तथ्यात्मक और विनम्र जवाब तैयार करो","Notice ka point wise jawab banao"]
       : ["मेरे पद से संबंधित प्राप्त नोटिस का तथ्यात्मक स्पष्टीकरण बनाओ","Bina galat tathya jode notice ka jawab taiyar karo"];
   if(type==="aakhya")
     return nonIssuers.includes(role)
       ? ["सक्षम अधिकारी को उपलब्ध तथ्यों के आधार पर सामान्य सूचना रिपोर्ट बनाओ"]
       : ["उपलब्ध अभिलेखों के आधार पर अधिकारी को तथ्यात्मक जाँच आख्या बनाओ"];
   if(type==="aadesh")
     return nonIssuers.includes(role)
       ? ["सक्षम अधिकारी को आवश्यक कार्यालय आदेश जारी कराने हेतु आवेदन बनाओ"]
       : ["कार्यालय के कार्य वितरण के संबंध में आदेश का मसौदा बनाओ"];
   if(type==="patra")return examples.patra;
   return examples[type]||["उपलब्ध तथ्यों के आधार पर संबंधित अधिकारी को पत्र तैयार करो"];
 };

 function mount(el,{kind,code,description,profile,user,api,letterhead,toast,save,previous=null}={}){
   if(!user||!profile)throw Error("Profile Login आवश्यक है");
   const title=String(kind||"पत्र"),type=String(code||"patra"),name=profile.nameHindi||profile.name||"";
   const gps=Array.isArray(profile.gps)?profile.gps.filter(Boolean):[];
   // Only the response to a received notice needs supporting file upload.
   const allowNoticeReplyUpload=type==="spasht"||type==="igrs";
   const igrs=type==="igrs";
   el.innerHTML='<section class="pai-writing-workspace" aria-label="सरकारी पत्र Draft Workspace">'+
     '<header class="pai-writing-heading"><span class="pai-writing-symbol" aria-hidden="true">✍</span>'+
     '<div><small>OFFICIAL DRAFT STUDIO</small><h2>'+esc(title)+' बनाएँ</h2><p>'+esc(description||"पूरे सरकारी प्रारूप में मसौदा तैयार करें")+'</p></div></header>'+
     '<section class="card pai-writing-form">'+
     '<p class="pai-writing-hint">लॉगिन प्रोफ़ाइल: <b>'+esc(name)+'</b> · '+esc(profile.sign||"पंचायत कार्यालय")+'<small style="display:block;font-weight:400">वास्तविक प्रेषक आपके निर्देश के अनुसार तय होगा।</small></p>'+
     '<label for="paiMatter">किस विषय पर '+esc(title)+' लिखना है?</label>'+
     '<textarea id="paiMatter" rows="5" maxlength="7000" placeholder="उदाहरण: ADO पंचायत को सफाई व्यवस्था की रिपोर्ट भेजने के लिए पत्र बनाओ।"></textarea>'+
     (gps.length?'<label for="paiSelectGp">संबंधित ग्राम पंचायत</label><select id="paiSelectGp">'+
       (gps.length!==1?'<option value="">— ग्राम पंचायत चुनें —</option>':"")+
       gps.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join("")+'</select>':"")+
     '<div class="pai-writing-suggestions">'+(suggestionsFor(profile.role,type)).map(v=>
       '<button type="button" class="pai-writing-example">'+esc(v)+'</button>').join("")+'</div>'+
     (allowNoticeReplyUpload?
       '<div class="pai-writing-attach"><label for="paiWritingFile">Upload File</label>'+
       '<input id="paiWritingFile" type="file" accept=".docx,.pdf,image/jpeg,image/png" multiple>'+
       '<span id="paiFilesInfo" class="hint">Upload Word, PDF or Photo for reference (optional).</span></div>':"")+
     '<div class="pai-writing-actions"><button id="paiWrite" class="btn pai-ai-generate" type="button">'+idleAiButton+'</button></div>'+
     '<div class="pai-draft-generation-progress" id="paiDraftGenerationProgress" hidden><div class="pai-draft-progress-info"><span>Estimated progress</span><strong id="paiDraftProgressValue">0%</strong></div><progress id="paiDraftProgressBar" max="100" value="0" aria-label="Estimated AI draft generation progress"></progress></div>'+
     '<p id="paiWriteStatus" class="hint" role="status" aria-live="polite"></p></section>'+
     '<section id="paiWritingOutput" aria-live="polite"></section></section>';
   const matter=$("#paiMatter",el),submit=$("#paiWrite",el),status=$("#paiWriteStatus",el);
   const target=$("#paiWritingOutput",el),input=$("#paiWritingFile",el);
   const documentKind=englishDocumentKind(type),progressPanel=$("#paiDraftGenerationProgress",el),progressBar=$("#paiDraftProgressBar",el),progressValue=$("#paiDraftProgressValue",el);
   if(previous?.question)matter.value=previous.question;
   el.querySelectorAll(".pai-writing-example").forEach(btn=>btn.onclick=()=>{matter.value=btn.textContent;matter.focus()});
   if(igrs){$("#paiWritingFile",el).previousElementSibling.textContent="IGRS शिकायत upload करें";matter.placeholder="शिकायत पर हुई वास्तविक जाँच, कार्रवाई, अभिलेख और बाकी कार्य लिखें।";el.querySelector(".pai-writing-suggestions").innerHTML="<p class=\"hint\">पहले शिकायत upload करें, फिर वास्तविक कार्रवाई बताएँ। नीचे बना मसौदा इसी स्थान पर Edit, Save और Word/PDF कर सकते हैं।</p>";}
   const chosenFiles=[];
   if(input) input.onchange=()=>{
     chosenFiles.splice(0,chosenFiles.length,...Array.from(input.files||[]).slice(0,3));
     $("#paiFilesInfo",el).textContent=chosenFiles.length?
       chosenFiles.map(x=>x.name).join(" · "):"No file chosen";
   };
   async function asAttachment(file){
     if(igrs){
       if(!window.PAI_TOOLS?.readDocument)throw Error("दस्तावेज पढ़ने की सुविधा उपलब्ध नहीं है।");
       const text=await window.PAI_TOOLS.readDocument(file,m=>{status.textContent=m;});
       if(!String(text).trim())throw Error("फाइल का पाठ स्पष्ट नहीं मिला। दूसरी फाइल चुनें।");
       return {name:file.name,text:String(text).slice(0,45000)};
     }
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
     if(!request&&!revise&&!igrs){status.textContent="पहले पत्र का विषय बताएँ।";matter.focus();return;}
     let completed=false,percent=0;
     submit.disabled=true;submit.classList.add("is-loading");submit.setAttribute("aria-busy","true");
     progressPanel.hidden=false;
     const updateProgress=value=>{
       percent=Math.max(percent,Math.min(100,Math.round(value)));
       progressBar.value=percent;progressValue.textContent=percent+"%";
       submit.innerHTML=loadingAiButton(documentKind,percent);
     };
     const startedAt=Date.now();
     updateProgress(5);
     // The AI endpoint does not expose token-level progress. Percentage is
     // therefore explicitly estimated, and never reaches 100% before success.
     const timer=setInterval(()=>{
       const elapsed=Date.now()-startedAt;
       updateProgress(Math.min(92,5+88*(1-Math.exp(-elapsed/18000))));
     },400);
     status.textContent="Reviewing your instructions and preparing the draft...";
     try{
       if(view){view.dispose();view=null;}
       target.innerHTML="";
       const attachments=await Promise.all(chosenFiles.map(asAttachment));
       updateProgress(22);
       if(igrs&&revise&&last?.sourceAttachments)attachments.push(...last.sourceAttachments);
       if(revise&&last){
         attachments.unshift({name:"पिछले पत्र का मसौदा",text:last.html.replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]*>/g," ").slice(0,28000)});
       }
       if(igrs&&!attachments.length&&!revise)throw Error("पहले IGRS शिकायत की PDF/Word/फोटो upload करें।");
       const points=String(request||last?.question||"")+(igrs?"\nIGRS निस्तारण आख्या: संलग्न शिकायत के बिंदुवार उत्तर दें। केवल बताई गई जाँच और कार्रवाई लिखें; समाधान/निरीक्षण/शिकायतकर्ता की संतुष्टि न गढ़ें। कार्रवाई का विवरण न हो तो मसौदे को पूर्ण निस्तारण न बताएं।":"");
       const stationery=letterhead?.mode?.(profile,points,title)||"plain";
       const gp=$("#paiSelectGp",el)?.value||"";
       const result=await api("/draft",{kind:title,profile,points,gp,att:attachments,stationery,refs:[]});
       updateProgress(95);
       last={kind:title,question:points,...result,sourceAttachments:igrs?attachments.filter(a=>a.name!=="पिछले पत्र का मसौदा"):[],stationery,id:crypto.randomUUID()};
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
       status.textContent=(result.fallback?"✓ Draft ready. Generated with "+(result.provider||"Free AI")+"; please review the details. ":"✓ Draft ready. ")+ "नीचे Preview देखें, ज़रूरत हो तो Edit करें और फिर Save/Word/PDF करें।";
       completed=true;updateProgress(100);
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
     finally{clearInterval(timer);if(!completed)progressPanel.hidden=true;submit.disabled=false;submit.classList.remove("is-loading");submit.removeAttribute("aria-busy");submit.innerHTML=idleAiButton;}
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
