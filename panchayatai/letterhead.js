/* Panchayat AI | Gram Pradhan stationery studio.
 * Per-user Firestore /users/{uid}.letterhead, never public settings.
 * PNG/JPEG/WebP or first page of PDF; upload is locally cropped and compressed.
 * Created/edited header remains compatible with the existing editable draft card.
 */
(() => {
 "use strict";
 const $=(q,el=document)=>el.querySelector(q);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const clean=(s,max=140)=>String(s??"").replace(/[<>\r\n]/g," ").trim().slice(0,max);
 const MAX=190000;
 const validImage=s=>typeof s==="string"&&s.length<MAX&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s);
 const isPradhan=p=>p?.role==="pradhan";
 const defaultFields=p=>({type:"created",color:"#22517d",style:"classic",
    name:p?.nameHindi||p?.name||"",
    gp:p?.gpsHindi?.[p?.gps?.[0]]||p?.gps?.[0]||"",
    block:p?.blockHindi||p?.block||"",district:p?.districtHindi||p?.district||"",
    address:"",phone:p?.phone||"",email:"",motto:"",image:""});
 const sanitize=c=>{
   const out={type:c?.type==="uploaded"?"uploaded":"created",
     style:c?.style==="modern"?"modern":"classic",
     color:/^#[0-9a-fA-F]{6}$/.test(c?.color||"")?c.color:"#22517d"};
   for(const k of ["name","gp","block","district","address","phone","email","motto"])
     out[k]=clean(c?.[k],k==="address"?220:100);
   out.image=validImage(c?.image)?c.image:"";
   if(out.type==="uploaded"&&!out.image)out.type="created";
   return out;
 };
 const mode=(profile,points,kind)=>{
   if(!isPradhan(profile))return "plain";
   const q=String(points||"");
   // Third-party citizen applications and personal leave never use Pradhan stationery.
   const thirdPerson=/(?:ग्रामवासी|ग्रामीण|निवासी|ग्राम\s*निवासी|प्रार्थी)\s+[\p{L}\p{M}\s.]{1,70}?\s+(?:की|के)\s+(?:ओर|तरफ)\s+से|(?:gramvasi|gramwasi|gram\s*nivasi|nivasi|resident)\s+[a-z\s]{1,70}?\s+(?:ki|ke)\s+(?:or|aur|taraf)\s+se/iu.test(q);
   const personalLeave=/(?:छुट्टी|अवकाश|chhutti|chutti|leave|avakash)/iu.test(q)&&/(?:पत्र|आवेदन|प्रार्थना|patra|application|ke\s+liye|के\s+लिए)/iu.test(q);
   if(thirdPerson||personalLeave)return "plain";
   const namedGpOffice=/(?:\bgp\b|gram\s*panchayat)\s+(?:[a-z]+\s+){0,3}(?:karyalay|karyalaya|office)\b|ग्राम\s*पंचायत\s+[\p{L}\p{M}]+\s+कार्यालय/iu.test(q);
   const gpOffice=namedGpOffice||/(?:कार्यालय\s*ग्राम\s*पंचायत|ग्राम\s*पंचायत\s*कार्यालय|ग्राम\s*पंचायत\s*की\s*(?:ओर|तरफ)\s*से|ग्राम\s*पंचायत\s*के\s*नाम\s*से|gp\s*(?:office|ki\s*taraf|ki\s*or)|gram\s*panchayat\s*(?:office|ki\s*taraf|ki\s*or)|साद[ाे]\s*A4|plain\s*A4|सादे\s*कागज)/iu.test(q);
   if(gpOffice)return "gp_office";
   const explicitHead=/(?:मेरे|प्रधान\s*के|ग्राम\s*प्रधान\s*के|अपने)\s*(?:व्यक्तिगत\s*)?लेटरहेड|(?:pradhan|my)\s+letterhead|letterhead\s+(?:par|पर)/iu.test(q);
   return explicitHead&&profile.letterhead?"pradhan_letterhead":"plain";
 };
 const header=c=>{
   c=sanitize(c);
   const place=[c.gp&&"ग्राम पंचायत — "+c.gp,c.block&&"विकास खण्ड — "+c.block,c.district&&"जनपद — "+c.district,c.address].filter(Boolean).join(" · ");
   if(c.type==="uploaded"&&c.image)
     return '<div class="pai-lh-header pai-lh-upload" data-pai-letterhead="yes"><img src="'+c.image+'" alt="ग्राम प्रधान लेटरहेड" class="pai-lh-upload-image"></div>';
   return '<div class="pai-lh-header pai-lh-'+c.style+'" data-pai-letterhead="yes" style="border-bottom:3px solid '+c.color+';color:#243750">'+
     '<div class="pai-lh-created-title" style="text-align:center"><strong style="font-size:22px;color:'+c.color+'">ग्राम प्रधान</strong>'+
     (c.name?'<div style="font-weight:700;font-size:17px">'+esc(c.name)+'</div>':"")+
     (c.gp?'<div style="font-weight:700">ग्राम पंचायत '+esc(c.gp)+'</div>':"")+'</div>'+
     (place?'<p style="text-align:center;margin:5px 0;font-size:12px">'+esc(place)+'</p>':"")+
     (c.phone||c.email?'<p style="text-align:center;margin:4px 0;font-size:12px">'+[c.phone&&"मोबाइल: "+esc(c.phone),c.email&&esc(c.email)].filter(Boolean).join(" | ")+'</p>':"")+
     (c.motto?'<p style="text-align:center;font-size:12px">'+esc(c.motto)+'</p>':"")+'</div>';
 };
 const applyToDraft=(html,profile,points,kind)=>{
   const letterhead=profile?.letterhead;
   const selection=mode(profile,points,kind);
   if(selection!=="pradhan_letterhead"||!letterhead)return {html,stationery:"plain"};
   const tpl=document.createElement("template");tpl.innerHTML=String(html||"");
   const first=tpl.content.firstElementChild;
   // The stationery itself supplies the office identity. Keep the letter body clean.
   if(first?.tagName==="P"&&/^कार्यालय\s*[—:-]/u.test(first.textContent||""))first.remove();
   const frame=document.createElement("div");frame.innerHTML=header(letterhead);
   if(frame.firstElementChild)tpl.content.insertBefore(frame.firstElementChild,tpl.content.firstChild);
   return {html:tpl.innerHTML,stationery:"pradhan_letterhead"};
 };
 function compress(canvas,width,quality=.84){
   const c=document.createElement("canvas"),scale=Math.min(1,width/canvas.width);
   c.width=Math.max(1,Math.round(canvas.width*scale));c.height=Math.max(1,Math.round(canvas.height*scale));
   const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#ffffff";ctx.fillRect(0,0,c.width,c.height);
   ctx.drawImage(canvas,0,0,c.width,c.height);
   let data=c.toDataURL("image/jpeg",quality);
   if(data.length>MAX)data=c.toDataURL("image/jpeg",.65);
   if(data.length>MAX){c.width=Math.max(1,Math.round(c.width*.78));c.height=Math.max(1,Math.round(c.height*.78));
     const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(canvas,0,0,c.width,c.height);
     data=c.toDataURL("image/jpeg",.64);}
   if(!validImage(data))throw Error("लेटरहेड का आकार बहुत बड़ा है। उच्च-रिज़ॉल्यूशन की जगह साधारण JPG/PDF लगाएँ।");
   return data;
 }
 function loadImage(file){
   return new Promise((resolve,reject)=>{
     const img=new Image(),url=URL.createObjectURL(file);
     img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
     img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("Image नहीं खुली"))};
     img.src=url;
   });
 }
 async function pdfCanvas(file){
   if(!window.pdfjsLib){
     await new Promise((ok,no)=>{
       const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
       s.onload=ok;s.onerror=()=>no(Error("PDF Viewer उपलब्ध नहीं। JPG/PNG लगाएँ।"));document.head.appendChild(s);
     });
   }
   const pdf=window.pdfjsLib;
   pdf.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
   const page=await (await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise).getPage(1);
   const viewport=page.getViewport({scale:Math.min(2,1300/page.getViewport({scale:1}).width)});
   const c=document.createElement("canvas");c.width=Math.round(viewport.width);c.height=Math.round(viewport.height);
   await page.render({canvasContext:c.getContext("2d",{alpha:false}),viewport}).promise;
   return c;
 }
 async function fileToHeader(file,crop=34){
   if(!file)throw Error("पहले फ़ाइल चुनें");
   if(file.size>9*1024*1024)throw Error("9 MB से छोटी फ़ाइल चुनें");
   let src;
   if(file.type==="application/pdf")src=await pdfCanvas(file);
   else if(["image/jpeg","image/png","image/webp"].includes(file.type)){
     const img=await loadImage(file);src=document.createElement("canvas");
     src.width=img.naturalWidth;src.height=img.naturalHeight;
     src.getContext("2d").drawImage(img,0,0);
   }else throw Error("JPG, PNG, WebP या PDF फ़ाइल अपलोड करें");
   // For an A4 sheet, take only the letterhead band; for a short logo/banner use whole picture.
   const pageLike=src.height/src.width>1.05;
   const capture=document.createElement("canvas");
   capture.width=src.width;capture.height=pageLike?Math.round(src.height*Math.max(.17,Math.min(.53,crop/100))):src.height;
   capture.getContext("2d").drawImage(src,0,0,src.width,capture.height,0,0,capture.width,capture.height);
   return compress(capture,1100);
 }
 function mount(el,{profile,user,db,onSaved,onSkip,toast=()=>{}}={}){
   if(!isPradhan(profile)){el.innerHTML='<div class="card">यह सुविधा ग्राम प्रधान की Profile के लिए है।</div>';return;}
   let config=sanitize(profile.letterhead||defaultFields(profile));
   let currentFile=null,changed=true;
   el.innerHTML='<div class="pai-lh-studio"><h2>ग्राम प्रधान का लेटरहेड</h2>'+
     '<p class="hint">अपने Letterhead पर जारी पत्र और ग्राम पंचायत कार्यालय के सादे A4 पत्र अलग-अलग रहेंगे।</p>'+
     '<div class="pai-lh-switch"><button type="button" data-type="created">✦ नया लेटरहेड बनाएँ</button>'+
     '<button type="button" data-type="uploaded">↑ लेटरहेड अपलोड करें</button></div>'+
     '<div class="card pai-lh-fields">'+
     '<div class="pai-lh-upload-form" id="paiLhUpload" hidden><label for="lhFile">अपना Letterhead (JPG / PNG / WebP / PDF)</label><input id="lhFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">'+
     '<label for="lhCrop">A4 फ़ाइल का Header कितना रखें?</label><input id="lhCrop" type="range" min="17" max="53" value="34"><small id="lhCropLabel">ऊपरी 34%</small>'+
     '<p class="hint">यदि पूरे A4 की Image/PDF है, तो केवल ऊपर का Letterhead हिस्सा लिया जाएगा। Preview जाँचें।</p></div>'+
     '<div class="pai-lh-grid">'+
     '<label>प्रधान का नाम<input data-k="name" maxlength="100"></label>'+
     '<label>ग्राम पंचायत<input data-k="gp" maxlength="100"></label>'+
     '<label>विकास खण्ड<input data-k="block" maxlength="100"></label>'+
     '<label>जनपद<input data-k="district" maxlength="100"></label>'+
     '<label>पता<input data-k="address" maxlength="220"></label>'+
     '<label>मोबाइल नंबर<input data-k="phone" inputmode="tel" maxlength="15"></label>'+
     '<label>E-mail (वैकल्पिक)<input data-k="email" maxlength="100"></label>'+
     '<label>मोटो / संदेश (वैकल्पिक)<input data-k="motto" maxlength="100"></label>'+
     '<label class="pai-lh-design">रंग<input id="lhColor" type="color"></label>'+
     '<label class="pai-lh-design">डिज़ाइन<select id="lhStyle"><option value="classic">औपचारिक सरकारी</option><option value="modern">आधुनिक साफ-सुथरा</option></select></label></div>'+
     '<div class="btn-row"><button class="btn" type="button" id="lhPreview">👁 Preview देखें</button>'+
     '<button class="btn alt" type="button" id="lhEdit" hidden>✎ Edit करें</button>'+
     '<button class="btn" type="button" id="lhSave">💾 Save Letterhead</button>'+
     '<button class="btn alt" type="button" id="lhLater">अभी नहीं</button></div>'+
     '<p class="hint" id="lhStatus" role="status"></p></div>'+
     '<section class="pai-lh-preview" id="lhResult" aria-label="लेटरहेड पूर्वावलोकन" hidden></section>'+
     '<div class="card"><p class="hint">प्रधान के व्यक्तिगत पत्रों में सहेजा गया लेटरहेड लगेगा। “ग्राम पंचायत कार्यालय की ओर से पत्र” लिखने पर सादा A4 बनेगा।</p></div></div>';
   const form=$(".pai-lh-fields",el),result=$("#lhResult",el),status=$("#lhStatus",el);
   const keys=["name","gp","block","district","address","phone","email","motto"];
   function drawFields(){
     keys.forEach(k=>{const i=$('[data-k="'+k+'"]',el);if(i)i.value=config[k]||"";});
     $("#lhColor",el).value=config.color;$("#lhStyle",el).value=config.style;
     $("#paiLhUpload",el).hidden=config.type!=="uploaded";
     el.querySelectorAll("[data-type]").forEach(b=>b.classList.toggle("on",b.dataset.type===config.type));
   }
   const read=()=>{
     keys.forEach(k=>config[k]=getTextSafe($('[data-k="'+k+'"]',el)?.value,k==="address"?220:100));
     config.color=$("#lhColor",el).value;config.style=$("#lhStyle",el).value;
     return sanitize(config);
   };
   function getTextSafe(s,max){return clean(s,max)}
   const showPreview=()=>{
     config=read();
     if(config.type==="uploaded"&&!config.image)throw Error("अपलोड किए गए लेटरहेड के लिए Image या PDF चुनें");
     result.hidden=false;
     result.innerHTML='<h3>पत्र का A4 Preview</h3><div class="pai-lh-page">'+header(config)+
       '<div class="pai-lh-demo"><small>नमूना सामग्री (Save में शामिल नहीं)</small>'+
       '<p>सेवा में,<br>सम्बन्धित अधिकारी महोदय</p><p><b>विषय: आवश्यक कार्यवाही के संबंध में।</b></p>'+
       '<p>महोदय,<br>आपके समक्ष आवश्यक कार्यवाही हेतु यह पत्र प्रस्तुत किया जा रहा है।</p>'+
       '<p style="text-align:right">भवदीय<br>'+esc(config.name||"ग्राम प्रधान")+'</p></div></div>';
     status.textContent="Preview देखें। बदलाव चाहिए तो Edit करें; ठीक है तो Save दबाएँ।";
     $("#lhEdit",el).hidden=false;
     result.scrollIntoView({behavior:"smooth",block:"start"});
   };
   $("#lhPreview",el).onclick=()=>{try{showPreview()}catch(e){status.textContent=e.message}};
   $("#lhLater",el).onclick=()=>{onSkip?.();};
   $("#lhEdit",el).onclick=()=>{result.hidden=true;form.scrollIntoView({behavior:"smooth",block:"start"});status.textContent="विवरण बदलकर फिर Preview देखें।"};
   el.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{
     config.type=b.dataset.type;drawFields();result.hidden=true;
     status.textContent=config.type==="uploaded"?"फ़ाइल चुनें और Preview देखें।":"विवरण भरकर Preview देखें।";
   });
   $("#lhCrop",el).oninput=e=>{$("#lhCropLabel",el).textContent="ऊपरी "+e.target.value+"%";};
   const upload=async()=>{
     const file=currentFile;if(!file)return;
     status.textContent="Letterhead की Image तैयार हो रही है…";
     config.image=await fileToHeader(file,Number($("#lhCrop",el).value));
     status.textContent="फ़ाइल तैयार है। Preview देखें।";result.hidden=true;
   };
   $("#lhFile",el).onchange=async e=>{
     currentFile=e.target.files?.[0];if(!currentFile)return;
     try{await upload()}catch(error){status.textContent=error.message;config.image=""}
   };
   $("#lhCrop",el).onchange=async()=>{if(currentFile)try{await upload()}catch(e){status.textContent=e.message}};
   $("#lhSave",el).onclick=async()=>{
     const btn=$("#lhSave",el);btn.disabled=true;
     try{
       config=read();
       if(config.type==="uploaded"&&!config.image)throw Error("Letterhead फ़ाइल अपलोड करें।");
       if(!config.name||!config.gp)throw Error("प्रधान का नाम और ग्राम पंचायत जरूरी हैं।");
       if(config.phone&&!/^\+?\d[\d\s-]{8,14}$/.test(config.phone))throw Error("मोबाइल नंबर जाँचें।");
       if(!user?.uid||!db)throw Error("Google Login करके फिर Save करें।");
       await db.collection("users").doc(user.uid).set({letterhead:config},{merge:true});
       profile.letterhead=config;
       onSaved?.(config);
       showPreview();
       status.textContent="✓ Letterhead सुरक्षित हो गया। केवल स्पष्ट रूप से लेटरहेड माँगे जाने पर उपयोग होगा।";
       toast("Letterhead Saved ✓");
     }catch(error){status.textContent="Save नहीं हुआ: "+(error.message||error);}
     finally{btn.disabled=false}
   };
   drawFields();
   if(profile.letterhead){result.hidden=false;result.innerHTML='<h3>सहेजा हुआ Letterhead</h3><div class="pai-lh-page">'+header(config)+'</div>';}
 }
 window.PAI_LETTERHEAD={mount,mode,sanitize,header,applyToDraft,isPradhan};
})();