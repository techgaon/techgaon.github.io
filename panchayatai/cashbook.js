/* Cashbook requests: private Firestore documents, bundled client release only. */
(() => {
  "use strict";
  const CHUNK_SIZE = 256 * 1024, MAX_SIZE = 20 * 1024 * 1024;
  const ADMIN = "surajbhanpandey853@gmail.com";
  const MIME = {pdf:"application/pdf",excel:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xls:"application/vnd.ms-excel"};
  const STATUS = {uploading:"अपलोड अधूरा",pending:"अनुरोध प्राप्त हुआ",in_progress:"कैशबुक बन रही है",ready:"कैशबुक तैयार है"};
  const NOTICE = "स्टेटमेंट अपलोड होने के बाद एडमिन टीम द्वारा आपकी कैशबुक तैयार करके भेजी जाएगी। इसके बाद आप उसे डाउनलोड कर सकेंगे। इस प्रक्रिया में कुछ समय लग सकता है।";
  const SAMPLE = "samples/Sample_Cashbook_Redacted.pdf";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const admin = user => !!(user?.emailVerified && user.email?.toLowerCase() === ADMIN);
  const filename = name => String(name || "cashbook").replace(/[\\/\u0000-\u001f\u007f]/g,"_").slice(0,180);
  const date = value => value?.toDate ? value.toDate().toLocaleString("hi-IN",{timeZone:"Asia/Kolkata"}) : "अभी";
  const chunkId = (fileId, index) => fileId + "_" + String(index).padStart(3,"0");
  const WHATSAPP_MESSAGE = "मैंने अपनी ग्राम पंचायत का स्टेटमेंट उपलोड कर दिया है , हमारी कैशबुक जल्दी बना के अपलोड करें ।";
  const WHATSAPP_URL = "https://wa.me/919129203268?text=" + encodeURIComponent(WHATSAPP_MESSAGE);
  const hash = async data => [...new Uint8Array(await crypto.subtle.digest("SHA-256",data))].map(x=>x.toString(16).padStart(2,"0")).join("");
  function errorText(error) {
    if (/permission-denied|insufficient permissions/i.test(error?.code+" "+error?.message)) return "यह सुविधा अभी सर्वर पर सक्रिय नहीं है या इस खाते को अनुमति नहीं मिली है। एडमिन से संपर्क करें।";
    if (/unavailable|offline|network/i.test(error?.code+" "+error?.message)) return "नेटवर्क नहीं मिला। इंटरनेट चालू करके फिर प्रयास करें।";
    return error?.message || "कार्य पूरा नहीं हुआ। फिर प्रयास करें।";
  }
  async function readFile(file, format) {
    if (!file || !file.size) throw Error("पहले फाइल चुनें।");
    if (file.size > MAX_SIZE) throw Error("अधिकतम 20 MB की फाइल चुनें।");
    const name = filename(file.name), ext = name.split(".").pop().toLowerCase();
    if (format === "pdf" ? ext !== "pdf" : !["xlsx","xls"].includes(ext)) throw Error(format === "pdf" ? "PDF फाइल चुनें।" : "Excel (.xlsx या .xls) फाइल चुनें।");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPDF = String.fromCharCode(...bytes.subarray(0,5)) === "%PDF-";
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
    const isXls = [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i)=>bytes[i]===v);
    if (format === "pdf" ? !isPDF : !(ext === "xlsx" ? isZip : isXls)) throw Error("फाइल का प्रकार उसके नाम से मेल नहीं खाता। सही फाइल चुनें।");
    return {bytes,descriptor:{name,mime:ext === "xls" ? MIME.xls : MIME[format],size:bytes.length,chunks:Math.ceil(bytes.length/CHUNK_SIZE),sha256:await hash(bytes)}};
  }
  function validDescriptor(d, format) {
    return !!d && typeof d.name === "string" && d.name.length > 0 && d.name.length <= 180 &&
      Number.isInteger(d.size) && d.size > 0 && d.size <= MAX_SIZE &&
      d.chunks === Math.ceil(d.size/CHUNK_SIZE) && /^[a-f0-9]{64}$/.test(d.sha256) &&
      (format === "pdf" ? d.mime === MIME.pdf : [MIME.excel,MIME.xls].includes(d.mime));
  }
  function createService({db,user}) {
    if (!db || !user || user.uid === "demo") throw Error("अपने Google खाते से लॉगिन करें।");
    const collection = db.collection("paiCashbooks");
    const stamp = () => firebase.firestore.FieldValue.serverTimestamp();
    const session = () => { if (firebase.auth().currentUser?.uid !== user.uid) throw Error("लॉगिन बदल गया है। फिर से यह पेज खोलें।"); };
    async function putFile(ref, fileId, bytes, progress) {
      const total = Math.ceil(bytes.length/CHUNK_SIZE);
      for (let start=0;start<total;start+=8) {
        session();
        const batch = db.batch();
        for (let index=start;index<Math.min(total,start+8);index++) batch.set(ref.collection("chunks").doc(chunkId(fileId,index)),{
          fileId,index,payload:firebase.firestore.Blob.fromUint8Array(bytes.slice(index*CHUNK_SIZE,(index+1)*CHUNK_SIZE))
        });
        await batch.commit();
        progress?.(Math.min(100,Math.round(Math.min(total,start+8)/total*100)));
      }
    }
    return {
      watch(onData,onError) {
        // Single-field owner query avoids a composite-index dependency; sort the small result locally.
        const q = admin(user) ? collection.orderBy("createdAt","desc").limit(100) : collection.where("uid","==",user.uid);
        return q.onSnapshot(s => onData(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0))),onError);
      },
      async submit(file, progress, {resumeId}={}) {
        session();
        const {bytes,descriptor} = await readFile(file,"pdf");
        const ref = resumeId ? collection.doc(resumeId) : collection.doc();
        if (resumeId) {
          const previous = (await ref.get({source:"server"})).data();
          if (!previous || previous.uid !== user.uid || previous.status !== "uploading" || previous.statement.sha256 !== descriptor.sha256) throw Error("इसी अधूरे अनुरोध की मूल PDF चुनें।");
        } else {
          await ref.set({uid:user.uid,email:user.email || "",status:"uploading",statement:descriptor,results:{},createdAt:stamp(),updatedAt:stamp()});
        }
        try {
          await putFile(ref,"statement",bytes,progress);
          session();await ref.update({status:"pending",updatedAt:stamp()});
          return ref.id;
        } catch (e) { e.requestId=ref.id; throw e; }
      },
      async publish(request, format, file, progress) {
        if (!admin(user)) throw Error("एडमिन लॉगिन आवश्यक है।");
        session();
        const {bytes,descriptor} = await readFile(file,format);
        const ref = collection.doc(request.id), latest = (await ref.get({source:"server"})).data();
        if (!latest || latest.status === "uploading") throw Error("स्टेटमेंट का अपलोड अभी पूरा नहीं हुआ है।");
        // Each version has a fresh ID. Existing published files remain readable during a retry/replacement.
        const fileId = format + "-" + crypto.randomUUID().replace(/-/g,"");
        await putFile(ref,fileId,bytes,progress);
        session();
        await ref.update({["results."+format]:{...descriptor,fileId},status:"ready",updatedAt:stamp()});
      },
      async start(request) {
        if (!admin(user)) throw Error("एडमिन लॉगिन आवश्यक है।");
        session();await collection.doc(request.id).update({status:"in_progress",updatedAt:stamp()});
      },
      async download(request, format, progress) {
        session();
        const ref=collection.doc(request.id), latest=(await ref.get({source:"server"})).data();
        if (!latest || (!admin(user) && latest.uid !== user.uid)) throw Error("इस फाइल की अनुमति नहीं है।");
        const statement = format === "statement", d = statement ? latest.statement : latest.results?.[format];
        if (!statement && latest.status !== "ready") throw Error("कैशबुक अभी तैयार नहीं हुई है।");
        if (!validDescriptor(d,statement?"pdf":format)) throw Error("फाइल की जानकारी सही नहीं है। एडमिन से संपर्क करें।");
        const fileId = statement ? "statement" : d.fileId, bytes = new Uint8Array(d.size);
        for (let start=0;start<d.chunks;start+=8) {
          session();
          const docs=await Promise.all(Array.from({length:Math.min(8,d.chunks-start)},(_,j)=>ref.collection("chunks").doc(chunkId(fileId,start+j)).get({source:"server"})));
          docs.forEach((doc,j)=>{
            const part=doc.data(), index=start+j, expected=Math.min(CHUNK_SIZE,d.size-index*CHUNK_SIZE);
            const chunk=part?.payload?.toUint8Array?.();
            if (!doc.exists || part.fileId !== fileId || part.index !== index || chunk?.length !== expected) throw Error("फाइल का अपलोड अधूरा है। एडमिन से संपर्क करें।");
            bytes.set(chunk,index*CHUNK_SIZE);
          });
          progress?.(Math.round(Math.min(d.chunks,start+8)/d.chunks*100));
        }
        if (await hash(bytes) !== d.sha256) throw Error("फाइल की जाँच असफल हुई। फिर से डाउनलोड करें।");
        session();return {blob:new Blob([bytes],{type:d.mime}),name:filename(d.name)};
      }
    };
  }
  async function save({blob,name}) {
    const cap=window.Capacitor;
    if(cap?.isNativePlatform?.()) {
      if(!cap.isPluginAvailable?.("Filesystem") || !cap.isPluginAvailable?.("Share")) throw Error("इस APK में फाइल सेव करने की सुविधा उपलब्ध नहीं है। नया ऐप संस्करण आवश्यक है।");
      const Filesystem=cap.registerPlugin("Filesystem"), Share=cap.registerPlugin("Share");
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(",")[1]);r.onerror=()=>reject(Error("फाइल पढ़ी नहीं जा सकी।"));r.readAsDataURL(blob);});
      const path="cashbooks/"+crypto.randomUUID()+"/"+filename(name);
      const result=await Filesystem.writeFile({path,data,directory:"CACHE",recursive:true});
      // Android's system sheet lets the owner save/open the private local file.
      // Sharing is only initiated by the owner's download tap, never automatically.
      await Share.share({title:name,files:[result.uri],dialogTitle:"कैशबुक सेव करें या खोलें"});
      return;
    }
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function shell(el,context) {
    let destroyed=false,unsubscribe=()=>{},busy=false;
    const active=()=>!destroyed && el.isConnected;
    const message=text=>{ if(active())el.querySelector("[data-cb-message]").textContent=text; };
    const controls=disabled=>{ if(active())el.querySelectorAll("button,input").forEach(x=>x.disabled=disabled); };
    const run=async(action,success)=>{
      if(busy||!active())return;busy=true;controls(true);message("कृपया प्रतीक्षा करें…");
      const progressBox=el.querySelector("[data-cb-progress]");
      const updateProgress=n=>{
        message("फाइल का "+n+"% पूरा हुआ…");
        if(active()&&progressBox){progressBox.hidden=false;progressBox.querySelector("progress").value=n;progressBox.querySelector("span").textContent=n+"%";}
      };
      if(progressBox)updateProgress(0);
      try { await action(updateProgress); if(active()) { message(success);context.toast?.(success); } }
      catch(e){message(errorText(e));}finally{busy=false;controls(false);}
    };
    return {active,message,run,get busy(){return busy;},watch(service,callback){unsubscribe=service.watch(data=>{if(active())callback(data);},e=>message(errorText(e)));},destroy(){destroyed=true;unsubscribe();}};
  }
  const heading = title => '<div class="cb-heading"><button type="button" class="btn alt" data-go="home">← वापस</button><h2>'+title+'</h2></div>';
  const sample = () => '<a class="tile cb-option" href="'+SAMPLE+'" download="Sample_Cashbook_Redacted.pdf"><span class="e">📄</span><b>Download Sample Cashbook</b><small>स्वीकृत 13 पेज का नमूना PDF</small></a>';
  function mountSubmitted(el) {
    el.innerHTML='<div class="cb-wrap">'+heading("स्टेटमेंट अपलोड हो गया")+
      '<section class="card cb-success"><div class="cb-success-tick" role="img" aria-label="अपलोड सफल">✓</div><h2>स्टेटमेंट सफलतापूर्वक अपलोड हो गया है।</h2><p>'+NOTICE+'</p><h3>एडमिन टीम को WhatsApp पर मैसेज भेजें</h3><p class="cb-whatsapp-message">'+esc(WHATSAPP_MESSAGE)+'</p><a class="btn cb-whatsapp" href="'+WHATSAPP_URL+'" target="_blank" rel="noopener noreferrer">WhatsApp पर मैसेज भेजें</a><p class="hint">एडमिन WhatsApp: 9129203268</p><div class="btn-row"><button class="btn alt" type="button" data-go="cashbookDownload">Download Your Cashbook</button><button class="btn alt" type="button" data-go="cashbook">वापस जाएँ</button></div></section></div>';
    el.querySelector('.cb-success').scrollIntoView({block:"start",behavior:"smooth"});
  }
  function mount(el,context) {
    el.innerHTML='<div class="cb-wrap">'+heading("कैशबुक बनवाएँ")+'<div class="cb-options">'+
      '<button class="tile cb-option" type="button" data-cb-upload><span class="e">📤</span><b>Upload Statement</b><small>बैंक स्टेटमेंट PDF भेजें</small></button>'+sample()+
      '<button class="tile cb-option" type="button" data-go="cashbookDownload"><span class="e">📥</span><b>Download Your Cashbook</b><small>तैयार PDF और Excel प्राप्त करें</small></button></div>'+
      '<section class="card cb-upload" hidden><h3>Upload Statement</h3><label for="cb-statement">बैंक स्टेटमेंट PDF चुनें</label><input id="cb-statement" type="file" accept="application/pdf,.pdf"><p class="hint">अधिकतम 20 MB</p><p class="cb-notice">'+NOTICE+'</p><button class="btn" type="button" data-cb-submit>Upload Statement</button><button class="btn alt" type="button" data-cb-cancel hidden>नया अनुरोध</button></section>'+
      '<div class="cb-progress" data-cb-progress hidden><label for="cb-upload-progress">अपलोड प्रगति</label><div><progress id="cb-upload-progress" max="100" value="0" aria-label="स्टेटमेंट अपलोड"></progress><span>0%</span></div></div><p data-cb-message class="cb-message" role="status" aria-live="polite"></p><section><h3>आपके अनुरोध</h3><div data-cb-requests>अनुरोध लोड हो रहे हैं…</div></section></div>';
    const ui=shell(el,context);let service,resumeId="",records=[];
    try {service=createService(context);}catch(e){ui.message(errorText(e));return ui;}
    const upload=el.querySelector(".cb-upload"),input=el.querySelector("#cb-statement"),cancel=el.querySelector("[data-cb-cancel]");
    input.onchange=()=>{if(!ui.busy)ui.message("");};
    if(window.Capacitor?.isNativePlatform?.()) el.querySelector('a[download]').onclick=e=>{
      e.preventDefault();ui.run(async()=>{const r=await fetch(SAMPLE);if(!r.ok)throw Error("सैंपल PDF नहीं मिली।");await save({blob:await r.blob(),name:"Sample_Cashbook_Redacted.pdf"});},"सैंपल PDF तैयार है।");
    };
    const reset=()=>{resumeId="";cancel.hidden=true;input.value="";};
    el.querySelector("[data-cb-upload]").onclick=()=>{reset();upload.hidden=false;input.focus();};
    cancel.onclick=()=>{reset();ui.message("नया स्टेटमेंट चुनें।");};
    el.querySelector("[data-cb-submit]").onclick=()=>ui.run(async progress=>{
      try {await service.submit(input.files[0],progress,{resumeId});reset();upload.hidden=true;ui.destroy();mountSubmitted(el);}
      catch(e){if(e.requestId){resumeId=e.requestId;cancel.hidden=false;}throw e;}
    },"स्टेटमेंट भेज दिया गया है। एडमिन टीम कैशबुक तैयार करेगी।");
    ui.watch(service,data=>{
      records=data;const box=el.querySelector("[data-cb-requests]");
      box.innerHTML=data.length?data.map(r=>'<article class="card cb-request"><b>'+esc(r.statement.name)+'</b><p>'+esc(STATUS[r.status]||r.status)+' · '+esc(date(r.createdAt))+'</p>'+
        (r.status==="uploading"?'<button type="button" class="btn alt" data-cb-resume="'+esc(r.id)+'">अपलोड फिर शुरू करें</button>':'<button type="button" class="btn alt" data-go="cashbookDownload">कैशबुक देखें</button>')+'</article>').join(""):'<p>अभी कोई स्टेटमेंट नहीं भेजा गया है।</p>';
      box.querySelectorAll("[data-cb-resume]").forEach(b=>b.onclick=()=>{
        if(ui.busy)return;resumeId=b.dataset.cbResume;cancel.hidden=false;upload.hidden=false;input.value="";input.focus();ui.message("अधूरे अनुरोध की वही मूल PDF चुनें।");
      });
      if(ui.busy)box.querySelectorAll("button").forEach(b=>b.disabled=true);
    });
    return ui;
  }
  function mountDownloads(el,context) {
    el.innerHTML='<div class="cb-wrap">'+heading("Download Your Cashbook")+'<p>'+NOTICE+'</p><button class="btn alt" type="button" data-go="cashbook">कैशबुक बनवाएँ</button><p class="cb-message" data-cb-message role="status" aria-live="polite"></p><div data-cb-downloads>कैशबुक लोड हो रही हैं…</div></div>';
    const ui=shell(el,context);let service;
    try{service=createService(context);}catch(e){ui.message(errorText(e));return ui;}
    ui.watch(service,records=>{
      const box=el.querySelector("[data-cb-downloads]");
      box.innerHTML=records.length?records.map(r=>'<section class="card cb-request"><h3>'+esc(r.statement.name)+'</h3><p>'+esc(STATUS[r.status]||r.status)+' · '+esc(date(r.createdAt))+'</p>'+
        (r.status==="ready"?'<div class="cb-format-grid">'+["pdf","excel"].filter(f=>r.results?.[f]).map(f=>'<button type="button" class="tile cb-option" data-cb-file="'+f+'" data-cb-request="'+esc(r.id)+'"><span class="e">'+(f==="pdf"?'📕':'📗')+'</span><b>'+ (f==="pdf"?'PDF Cashbook':'Excel Cashbook')+'</b><small>'+esc(r.results[f].name)+'</small><span>Download</span></button>').join("")+'</div>':'<p>तैयार होने पर डाउनलोड विकल्प यहाँ दिखाई देंगे।</p>')+'</section>').join(""):'<section class="card"><p>अभी कोई कैशबुक अनुरोध नहीं है। पहले अपना स्टेटमेंट भेजें।</p></section>';
      box.querySelectorAll("[data-cb-file]").forEach(b=>b.onclick=()=>ui.run(async progress=>save(await service.download(records.find(r=>r.id===b.dataset.cbRequest),b.dataset.cbFile,progress)),"फाइल डाउनलोड कर दी गई है।"));
      if(ui.busy)box.querySelectorAll("button").forEach(b=>b.disabled=true);
    });return ui;
  }
  function mountAdmin(el,context) {
    if(!admin(context.user)){el.textContent="एडमिन लॉगिन आवश्यक है।";return {destroy(){}};}
    el.innerHTML='<div class="cb-wrap cb-admin"><h2>कैशबुक अनुरोध</h2><p>स्टेटमेंट डाउनलोड करें और तैयार कैशबुक उसी अनुरोध में अपलोड करें। केवल अपलोड किया गया फ़ॉर्मैट उपयोगकर्ता को मिलेगा।</p><label for="cb-filter">स्थिति</label><select id="cb-filter"><option value="all">सभी अनुरोध</option>'+Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("")+'</select><p class="cb-message" data-cb-message role="status" aria-live="polite"></p><div data-cb-admin-list>अनुरोध लोड हो रहे हैं…</div></div>';
    const ui=shell(el,context);let service,records=[],busy=false,pendingRender=false;
    try{service=createService(context);}catch(e){ui.message(errorText(e));return ui;}
    const run=(action,success)=>{busy=true;return ui.run(action,success).finally(()=>{busy=false;if(pendingRender){pendingRender=false;draw();}});};
    const draw=()=>{
      if(busy){pendingRender=true;return;}
      const filter=el.querySelector("#cb-filter").value,box=el.querySelector("[data-cb-admin-list]"),shown=records.filter(r=>filter==="all"||r.status===filter);
      box.innerHTML=shown.length?shown.map(r=>'<article class="card cb-request" data-cb-admin-request="'+esc(r.id)+'"><h3>'+esc(r.email)+'</h3><p>'+esc(r.statement.name)+' · '+esc(date(r.createdAt))+'</p><b>'+esc(STATUS[r.status]||r.status)+'</b><p class="hint">अनुरोध: '+esc(r.id)+'</p>'+
        (r.status==="uploading"?'<p>अपलोड पूरा होने की प्रतीक्षा करें।</p>':'<div class="btn-row"><button type="button" class="btn alt" data-cb-statement>Download Statement</button>'+(r.status==="pending"?'<button type="button" class="btn" data-cb-start>बनाना शुरू करें</button>':"")+'</div><div class="cb-format-grid">'+["pdf","excel"].map(f=>'<section class="cb-format"><h4>'+ (f==="pdf"?'PDF Cashbook':'Excel Cashbook')+'</h4>'+(r.results?.[f]?'<p>'+esc(r.results[f].name)+'</p><button class="btn alt" type="button" data-cb-check="'+f+'">डाउनलोड करके जाँचें</button>':'<p>अभी अपलोड नहीं हुई</p>')+'<label for="cb-'+esc(r.id)+'-'+f+'">तैयार फाइल चुनें</label><input id="cb-'+esc(r.id)+'-'+f+'" type="file" data-cb-input="'+f+'" accept="'+(f==="pdf"?'.pdf,application/pdf':'.xlsx,.xls')+'"><button type="button" class="btn" data-cb-publish="'+f+'">अपलोड करके उपलब्ध कराएँ</button></section>').join("")+'</div>')+'</article>').join(""):'<p>इस स्थिति में कोई अनुरोध नहीं है।</p>';
      box.querySelectorAll("[data-cb-admin-request]").forEach(card=>{
        const request=records.find(r=>r.id===card.dataset.cbAdminRequest);
        card.querySelector("[data-cb-statement]")?.addEventListener("click",()=>run(async progress=>save(await service.download(request,"statement",progress)),"स्टेटमेंट डाउनलोड कर दिया गया है।"));
        card.querySelector("[data-cb-start]")?.addEventListener("click",()=>run(()=>service.start(request),"कैशबुक बनाना शुरू किया गया है।"));
        card.querySelectorAll("[data-cb-check]").forEach(b=>b.onclick=()=>run(async progress=>save(await service.download(request,b.dataset.cbCheck,progress)),"फाइल डाउनलोड कर दी गई है।"));
        card.querySelectorAll("[data-cb-publish]").forEach(b=>b.onclick=()=>run(progress=>service.publish(request,b.dataset.cbPublish,card.querySelector('[data-cb-input="'+b.dataset.cbPublish+'"]').files[0],progress),"कैशबुक उपयोगकर्ता के लिए उपलब्ध कर दी गई है।"));
      });
    };
    el.querySelector("#cb-filter").onchange=draw;
    ui.watch(service,data=>{records=data;draw();});return ui;
  }
  window.PAI_CASHBOOK={mount,mountDownloads,mountAdmin,createService,readFile,validDescriptor,WHATSAPP_MESSAGE,WHATSAPP_URL,chunkId,CHUNK_SIZE,MAX_SIZE,NOTICE,STATUS};
})();
