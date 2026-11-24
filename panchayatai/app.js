/* पंचायत AI — मुख्य ऐप | TechGaon AI Services */
(() => {
const C = window.PAI_CONFIG, G = window.PAI_GEO;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); };
/* ---------- पद (भूमिकाएँ) ---------- */
// scope: gp = एक GP, multigp = अधिकतम 3 Cluster और 25 GP, block, district, clerk = ब्लॉक/जनपद स्तर चुनें
const ROLES = {
  pradhan:  { n: "ग्राम प्रधान", call: "प्रधान जी", scope: "gp" },
  prashasak:{ n: "प्रशासक (ग्राम पंचायत)", call: "प्रशासक जी", scope: "gp" },
  gpa:      { n: "सचिव (ग्राम पंचायत अधिकारी)", call: "सचिव जी", scope: "multigp" },
  sahayak:  { n: "पंचायत सहायक", call: "पंचायत सहायक जी", scope: "gp" },
  gva:      { n: "सचिव (ग्राम विकास अधिकारी)", call: "सचिव जी", scope: "multigp" },
  ado:      { n: "सहायक विकास अधिकारी (पंचायत)", call: "ADO पंचायत जी", scope: "block" },
  bdo:      { n: "खण्ड विकास अधिकारी (BDO)", call: "BDO साहब", scope: "block" },
  clerk:    { n: "विभागीय लिपिक", call: "बाबू जी", scope: "clerk" },
  adpro:    { n: "सहायक जिला पंचायत राज अधिकारी (ADPRO)", call: "ADPRO साहब", scope: "district" },
  dpro:     { n: "जिला पंचायत राज अधिकारी (DPRO)", call: "DPRO साहब", scope: "district" },
  ddo:      { n: "जिला विकास अधिकारी (DDO)", call: "DDO साहब", scope: "district" },
  resident: { n: "पंचायत निवासी", call: "जी", scope: "gp" },
  other_staff: { n: "अन्य विभागीय कर्मचारी", call: "जी", scope: "district" }
};

/* पदवार ड्राफ्ट प्रकार — सभी के लिए 4 मूल + पद अनुसार अतिरिक्त */
const RTI_DRAFTS = [
  { k: "rtiApplication", e: "ℹ️", n: "RTI आवेदन" },
  { k: "rtiReply", e: "📄", n: "RTI उत्तर" }
];
const BASE_DRAFTS = [
  { k: "patra", e: "✉️", n: "पत्र", d: "उच्चाधिकारी या विभाग को पत्र" },
  { k: "spasht", e: "🧾", n: "स्पष्टीकरण", d: "प्राप्त नोटिस का उत्तर / स्पष्टीकरण" },
  { k: "notice", e: "📢", n: "नोटिस", d: "नोटिस / कारण बताओ नोटिस" },
  { k: "aadesh", e: "📜", n: "कार्यालय आदेश", d: "आदेश / आदेश-पत्र" }
];
const EXTRA_DRAFTS = {
  pradhan: [["prastav","🗳️","प्रस्ताव","ग्राम सभा/पंचायत प्रस्ताव"],["karyavahi","📋","बैठक कार्यवाही","ग्राम सभा/समिति बैठक"],["prarthna","🙏","प्रार्थना पत्र","आवेदन / माँग पत्र"]],
  prashasak: [["prastav","🗳️","प्रस्ताव","प्रशासकीय प्रस्ताव"],["karyavahi","📋","बैठक कार्यवाही","बैठक कार्यवृत्त"]],
  sahayak: [["aakhya","🔎","आख्या / रिपोर्ट","कार्य प्रगति रिपोर्ट"],["prarthna","🙏","प्रार्थना पत्र","अवकाश/मानदेय आवेदन"]],
  gpa: [["karyavahi","📋","बैठक कार्यवाही","ग्राम सभा/खुली बैठक"],["prastav","🗳️","प्रस्ताव","GPDP/कार्य प्रस्ताव"],["uc","✅","उपयोगिता प्रमाण पत्र","UC / व्यय विवरण"],["rti","ℹ️","RTI उत्तर","जन सूचना उत्तर"],["aakhya","🔎","जाँच आख्या","स्थलीय सत्यापन आख्या"],["praman","🏷️","प्रमाण पत्र","निवास/परिवार/नोड्यूज"]],
  gva: [["karyavahi","📋","बैठक कार्यवाही","खुली बैठक"],["aakhya","🔎","सत्यापन आख्या","आवास/पेंशन पात्रता"],["uc","✅","उपयोगिता प्रमाण पत्र","UC"],["rti","ℹ️","RTI उत्तर","जन सूचना उत्तर"]],
  ado: [["aakhya","🔎","जाँच आख्या","शिकायत जाँच रिपोर्ट"],["samiksha","📊","समीक्षा टिप्पणी","मासिक समीक्षा"],["rti","ℹ️","RTI उत्तर","जन सूचना उत्तर"]],
  bdo: [["samiksha","📊","समीक्षा बैठक कार्यवृत्त","ब्लॉक स्तरीय समीक्षा"],["aakhya","🔎","जाँच आख्या","जाँच रिपोर्ट"],["rti","ℹ️","RTI उत्तर","जन सूचना"]],
  clerk: [["tippani","🗒️","टिप्पणी / नोटशीट","पत्रावली पर टिप्पणी"],["anusmarak","⏰","अनुस्मारक","रिमाइंडर पत्र"],["rti","ℹ️","RTI उत्तर","जन सूचना"]],
  adpro: [["aakhya","🔎","जाँच आख्या","जाँच रिपोर्ट"],["chetavni","⚠️","चेतावनी पत्र","प्रतिकूल प्रविष्टि/चेतावनी"]],
  dpro: [["chetavni","⚠️","चेतावनी / निलंबन आदेश","अनुशासनिक"],["samiksha","📊","समीक्षा कार्यवृत्त","जनपद समीक्षा"],["anusmarak","⏰","अनुस्मारक","रिमाइंडर"]],
  ddo: [["samiksha","📊","समीक्षा कार्यवृत्त","विकास समीक्षा"],["chetavni","⚠️","चेतावनी पत्र","अनुशासनिक"]],
  resident: [["prarthna","🙏","प्रार्थना पत्र","प्रधान/सचिव/BDO को आवेदन"],["shikayat","📣","शिकायत पत्र","IGRS/शिकायत"],["rti","ℹ️","RTI आवेदन","जन सूचना माँगें"]],
  other_staff: [["prarthna","🙏","प्रार्थना पत्र","कार्यालय/विभाग को आवेदन"],["shikayat","📣","शिकायत पत्र","विभागीय शिकायत"],["tippani","🗒️","टिप्पणी / नोटशीट","कार्यालयीय टिप्पणी"]]
};
const draftsFor = r => BASE_DRAFTS.concat((EXTRA_DRAFTS[r] || []).map(([k,e,n,d]) => ({k,e,n,d})));

/* ---------- स्थिति ---------- */
const S = { user: null, profile: null, view: "home", chat: [], att: [], referenceDocs: [], db: null, auth: null };
const LS = { get: k => { try { return JSON.parse(localStorage.getItem("pai_" + k)); } catch { return null; } },
             set: (k, v) => { try { localStorage.setItem("pai_" + k, JSON.stringify(v)); return true; } catch { return false; } } };

/* ---------- Firebase ---------- */
let fbReady = false;
try {
  if (C.firebase.apiKey !== "REPLACE_ME") {
    firebase.initializeApp(C.firebase); S.auth = firebase.auth(); S.db = firebase.firestore(); fbReady = true;
  }
} catch (e) { console.warn(e); }
// Wait for Firebase to restore its saved session before showing guest/login UI.
S.authReady = !S.auth;
S.authRestoring = false;
// Show the home screen even if Firebase session restoration is slow.
// Late auth callbacks are still processed normally; no session or token is fabricated.
let authWaitTimer = null;
if (S.auth) authWaitTimer = setTimeout(() => {
  if (S.authReady) return;
  console.warn("Firebase Auth is slow; opening the public home screen.");
  S.authReady = true;
  render();
}, 8000);
async function withDeadline(promise, ms) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Profile request timed out")), ms); })
    ]);
  } finally { clearTimeout(timer); }
}

async function idToken() { return S.auth && S.auth.currentUser ? S.auth.currentUser.getIdToken() : ""; }
// निःशुल्क सीमा (प्रतिदिन) — Firestore (सर्वर) पर गिनती; नियम (firestore.rules) सीमा से ऊपर लिखने नहीं देते
function dailyLimitError(kind,limit,plus){
 const e=new Error(plus?"आज की Plus सीमा ("+limit+") पूरी हो गई है।":"आज की निःशुल्क "+(kind==="chat"?"Chat":"पत्र/नोटिस")+" सीमा ("+limit+") पूरी हो गई है।");
 e.code=plus?"PLUS_LIMIT":"FREE_LIMIT";e.quotaKind=kind;e.limit=limit;
 return e;
}
const isDailyLimitError=e=>e&&(e.code==="FREE_LIMIT"||e.code==="PLUS_LIMIT");
function showUpgrade(kind,limit,plus=false){
 const modal=$("#upgradeModal");if(!modal)return;
 $("#upgradeTitle").textContent=plus?"Today's limit reached":"Upgrade to Plus";
 $("#upgradeMessage").textContent=plus?"आज की Plus सीमा ("+limit+") पूरी हो गई है। अगले दिन फिर उपयोग करें।":
   "आज "+(kind==="chat"?"AI Chat":"पत्र / नोटिस")+" के "+limit+" निःशुल्क उपयोग पूरे हो गए हैं। अधिक उपयोग के लिए Plus चुनें।";
 $("#upgradeNow").classList.toggle("hidden",plus);
 modal.classList.remove("hidden");$("#upgradeLater").focus();
}
function initUpgradeModal(){
 const modal=$("#upgradeModal");if(!modal)return;
 $("#upgradeLater").onclick=()=>modal.classList.add("hidden");
 $("#upgradeNow").onclick=()=>{modal.classList.add("hidden");go("plans");};
 modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden");});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")modal.classList.add("hidden");});
}
initUpgradeModal();
function effectiveDailyLimit(settings,kind,plus){
 const key=(plus?"plus":"free")+"Daily"+(kind==="chat"?"Chats":"Drafts");
 // Everyone is unlimited unless admin explicitly activates the limit.
 const enabled=plus?settings?.plusLimitsEnabled===true:settings?.freeLimitsEnabled===true;
 if(!enabled)return Infinity;
 return Number.isInteger(settings?.[key])&&settings[key]>=0&&settings[key]<=1000
  ?settings[key]:(plus?200:(kind==="chat"?10:3));
}
async function useQuota(kind){
 if(S.blocked)throw new Error("Account is blocked");
 if(S.db&&S.user){
  const account=(await S.db.collection("users").doc(S.user.uid).get()).data()||{};
  if(account.blocked)throw new Error("Account is blocked");
  if(S.profile)S.profile.plan=account.plan||null;
 }
 let settings=liveSettings;
 if(!settings&&S.db){
  try{settings=(await settingsRef().get()).data()||{};}catch(e){settings={};}
 }
 const plus=!!isPlus(),limit=effectiveDailyLimit(settings,kind,plus);
 if(limit===Infinity)return; // Unlimited: do not increment a quota counter.
 const day=Math.floor((Date.now()+19800000)/864e5);
 if(!S.db||!S.user||S.user.uid==="demo"){
  let u=LS.get("usage")||{};
  if(u.day!==day)u={day,chat:0,draft:0};
  if((u[kind]||0)>=limit)throw dailyLimitError(kind,limit,plus);
  u[kind]=(u[kind]||0)+1;LS.set("usage",u);return;
 }
 const ref=S.db.collection("users").doc(S.user.uid);
 try{
  await S.db.runTransaction(async tx=>{
   const previous=(await tx.get(ref)).data()||{};
   const u=previous.usage&&previous.usage.day===day?previous.usage:{day,chat:0,draft:0};
   if((u[kind]||0)>=limit)throw dailyLimitError(kind,limit,plus);
   const next={day,chat:u.chat||0,draft:u.draft||0};
   next[kind]++;
   tx.set(ref,{usage:next},{merge:true});
  });
 }catch(e){
  if(isDailyLimitError(e))throw e;
  if(/permission[- ]denied|missing or insufficient permissions/i.test((e.code||"")+" "+(e.message||"")))
   throw new Error("Firebase Security Rules की नई Limit अभी प्रकाशित नहीं हुई है। Admin को Firestore Rules Publish करने होंगे।");
  throw new Error("Network error — please retry.");
 }
}
const aiReady = () => window.PAI_AI ? Promise.resolve() : new Promise((resolve, reject) => {
  const ready = () => { clearTimeout(timer); resolve(); };
  const timer = setTimeout(() => { window.removeEventListener('pai-ai-ready', ready); reject(new Error('AI could not load. Please refresh and try again.')); }, 15000);
  window.addEventListener('pai-ai-ready', ready, { once: true });
});
async function api(path, body) {
  if (path === "/payment") {
    if (!S.db) throw new Error("Firebase कॉन्फ़िग नहीं भरा");
    await S.db.collection("payments").add({ uid: S.user.uid, email: S.user.email, name: S.profile.name, phone: S.profile.phone, plan: body.plan, utr: body.utr, ref: body.ref, status: "pending", at: Date.now() });
    return { ok: true };
  }
  // Preserve the real failure category; never dump Firebase API URLs or tokens.
  try{
    await aiReady();
    await useQuota(path === "/chat" ? "chat" : "draft");
    return await (path === "/chat" ? window.PAI_AI.chat(body) : window.PAI_AI.draft(body));
  }catch(error){
    if(isDailyLimitError(error))throw error;
    const diagnostics=window.PAI_AI_ERRORS?.explain(error,path)||{
      code:"AI_UNKNOWN",status:null,title:"AI सेवा से जवाब नहीं मिला",
      message:"AI कनेक्शन जाँचकर दोबारा प्रयास करें।"
    };
    console.warn("Panchayat AI request failure",{
      type:diagnostics.code,stage:path,status:diagnostics.status||null
    });
    const safe=window.PAI_AI_ERRORS?.asError(error,path);
    if(safe)throw safe;
    throw new Error(diagnostics.title+" — "+diagnostics.message+" ["+diagnostics.code+"]");
  }
}

/* Curated original PDFs only: owner-managed list starts empty */
const sourcePath = doc => {
  const name=String(doc&&doc.file||"");
  if(!/^[^\\/]+\.pdf$/i.test(name)||name.includes(".."))return null;
  return "/panchayatai/reference-pdfs/"+encodeURIComponent(name);
};
fetch("data/verified-pdfs.json",{cache:"no-store"}).then(r=>r.ok?r.json():[]).then(docs=>{
  S.referenceDocs=Array.isArray(docs)?docs.filter(d=>d&&typeof d.id==="string"&&typeof d.title==="string"&&sourcePath(d)).slice(0,500):[];
}).catch(()=>{S.referenceDocs=[];});
const normRef=value=>String(value||"").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
function exactSourceMatches(question){
  const q=normRef(question);if(q.length<5)return [];
  return S.referenceDocs.filter(doc=>{
    const phrases=[doc.title,...(Array.isArray(doc.exactPhrases)?doc.exactPhrases:[])].filter(x=>typeof x==="string"&&normRef(x).length>=12);
    if(phrases.some(x=>q.includes(normRef(x))))return true;
    const number=normRef(doc.officialNumber||"");
    return number.length>=5&&q.split(/[^\p{L}\p{N}./-]+/u).includes(number);
  }).slice(0,3);
}
async function availableOriginals(question){
  return (await Promise.all(exactSourceMatches(question).map(async doc=>{
    try{const response=await fetch(sourcePath(doc),{method:"HEAD",cache:"no-store"});
      return response.ok&&/application\/pdf/i.test(response.headers.get("content-type")||"")?doc:null;
    }catch{return null;}
  }))).filter(Boolean);
}
function saveBlob(blob,name){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const activeOriginalDownloads=new Set();
async function downloadOriginalPDF(id){
  if(activeOriginalDownloads.has(id))return;
  const doc=S.referenceDocs.find(d=>d.id===id);if(!doc||!sourcePath(doc))return;
  activeOriginalDownloads.add(id);
  try{
    const response=await fetch(sourcePath(doc),{cache:"no-store"});
    if(!response.ok)throw Error("Original PDF is unavailable");
    const bytes=await response.arrayBuffer();
    if(!new TextDecoder("ascii").decode(bytes.slice(0,8)).startsWith("%PDF-"))throw Error("Not a valid original PDF");
    saveBlob(new Blob([bytes],{type:"application/pdf"}),doc.file);
    toast("Original PDF downloaded");
  }catch(e){toast("Could not download PDF: "+(e.message||"Unknown error"));}
  finally{activeOriginalDownloads.delete(id);}
}
window.PAI={ downloadOriginalPDF };

/* Browser speech input, using hi-IN for Devanagari. */
let activeSpeech=null;
function stopSpeech(){
  if(activeSpeech){const r=activeSpeech;activeSpeech=null;try{r.abort();}catch(e){}}
}
function attachHindiSpeech(input,button,status){
  const Engine=window.SpeechRecognition||window.webkitSpeechRecognition;
  const setStatus=message=>{status.textContent=message;status.classList.toggle("hidden",!message);};
  button.onclick=()=>{
    if(activeSpeech){stopSpeech();button.classList.remove("listening");button.setAttribute("aria-pressed","false");setStatus("माइक बंद है।");return;}
    if(!Engine){setStatus("हिंदी Voice Typing के लिए Chrome जैसे समर्थित ब्राउज़र में खोलें।");return;}
    if(!window.isSecureContext){setStatus("माइक के लिए सुरक्षित HTTPS कनेक्शन आवश्यक है।");return;}
    const rec=new Engine();
    rec.lang="hi-IN";rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
    const oldText=input.value.trimEnd();
    let transcript="",error="";
    activeSpeech=rec;button.classList.add("listening");button.setAttribute("aria-pressed","true");
    setStatus("हिंदी में बोलिए…");
    rec.onresult=event=>{
      transcript=Array.from(event.results).map(r=>r[0]?.transcript||"").join(" ").trim();
      input.value=(oldText?oldText+" ":"")+transcript;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      setStatus("बोली गई बात लिख रहा है…");
    };
    rec.onerror=e=>{
      error=e.error||"unknown";
      const messages={"not-allowed":"माइक की अनुमति दें।","service-not-allowed":"Voice Typing सेवा उपलब्ध नहीं है।","no-speech":"आवाज़ नहीं सुनी गई। फिर कोशिश करें।","audio-capture":"माइक उपलब्ध नहीं है।","network":"Speech सेवा से कनेक्शन नहीं हुआ।","language-not-supported":"इस ब्राउज़र में हिंदी समर्थित नहीं है।"};
      setStatus(messages[error]||"Voice Typing में समस्या आई। दोबारा कोशिश करें।");
    };
    rec.onend=()=>{
      if(activeSpeech===rec)activeSpeech=null;
      button.classList.remove("listening");button.setAttribute("aria-pressed","false");
      if(!error)setStatus(transcript?"✓ टेक्स्ट की जाँच करके भेजें।":"फिर बोलने के लिए माइक दबाएँ।");
    };
    try{rec.start();}catch(e){activeSpeech=null;button.classList.remove("listening");button.setAttribute("aria-pressed","false");setStatus("माइक शुरू नहीं हो सका।");}
  };
}

/* ---------- राउटिंग ---------- */
function rememberNavigation(view) {
  if (!["chat","draft","draftEdit","tools","estimate","rti","history","goSearch"].includes(view)) return;
  const key = view === "draftEdit" ? "draft" : view;
  const item = { view:key, draft:view === "draftEdit" ? (S.draftType || "patra") : "", at:Date.now() };
  const old = LS.get("navHistory") || [];
  LS.set("navHistory", [item,...old.filter(x => x.view !== item.view || (x.draft || "") !== item.draft)].slice(0,7));
}
function go(v) { if (!S.authReady && v !== "home") { toast("लॉगिन तैयार होते ही फिर से चुनें।"); return; } stopSpeech(); if (v === "news") { location.href = "https://techgaon.in/karmcharinews/"; return; } rememberNavigation(v); S.view = v; window.history.replaceState(null, '', location.pathname + '#' + v); closeDrawer(); render(); window.scrollTo(0, 0); }
document.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); if(a.dataset.go === "chat") S.draftMode = ""; go(a.dataset.go); } });
const closeDrawer = () => { $("#drawer").classList.remove("open"); $("#scrim").classList.remove("show"); };
$("#menuBtn").onclick = () => { $("#drawer").classList.add("open"); $("#scrim").classList.add("show"); };
$("#scrim").onclick = closeDrawer;
$("#backBtn").onclick = () => go("home");
$("#loginTop").onclick = startGoogleLogin;
$("#logoutBtn").onclick = async () => { if (S.auth) await S.auth.signOut(); S.user = null; S.profile = null; S.chat=[];S.att=[];S.chatOwner=null;LS.set("profile", null); go("home"); };

const isPlus = () => { const p = S.profile && S.profile.plan; return p && p.until && p.until > Date.now(); };
// Address users with first + middle name, or first + last name when no middle exists.
// Prefer the verified Hindi profile, but never truncate the address to first name alone
// if another saved name has a second word.
const greetingName = () => {
  const candidates = [S.profile?.nameHindi, S.profile?.name, S.user?.displayName]
    .map(value => String(value || "").trim().split(/\s+/u).filter(Boolean));
  const parts = candidates.find(words => words.length >= 2) || candidates.find(words => words.length);
  return parts ? parts.slice(0, 2).join(" ") : "साथी";
};
// The saved gender determines the honorific; do not infer it from a name.
const greetingHonorific = () => S.profile?.gender === "पुरुष" ? "भैया जी" : S.profile?.gender === "महिला" ? "दीदी जी" : "जी";
const callName = () => S.profile ? greetingName() + " " + greetingHonorific() : "";

function chrome() {
  $("#loginTop").classList.toggle("hidden", !!S.user);
  $("#logoutBtn").classList.toggle("hidden", !S.user);
  $("#backBtn").classList.toggle("hidden", S.view === "home" || (isAdmin() && S.view === "admin"));
  $("#avatar").onclick = () => go(isAdmin() ? "admin" : "profile");
  $("#avatar").classList.toggle("hidden", !S.user || !S.user.photoURL);
  if (S.user && S.user.photoURL) $("#avatar").src = S.user.photoURL;
  $("#planBadge").classList.toggle("hidden", !isPlus()); $("#planBadge").textContent = "PLUS";
  const adminLink = $("#adminLink"); if (adminLink) adminLink.classList.toggle("hidden", !isAdmin());
  document.querySelectorAll("#drawer [data-go]").forEach(link => {
    link.classList.toggle("hidden", isAdmin() ? !["admin","settings","goSearch","igrs","home","chat","draft","draftEdit","plans","history"].includes(link.dataset.go) :
      link.dataset.go==="admin" || (link.dataset.go==="letterhead" && (!S.user||S.profile?.role!=="pradhan")));
  });
  document.querySelectorAll(".tabs a").forEach(a => a.classList.toggle("on", a.dataset.go === S.view));
  document.body.classList.toggle("pai-admin-view", isAdmin());
  const selected = S.view === "draftEdit" ? "draft" : S.view === "newsChat" ? "chat" : S.view;
  document.querySelectorAll("#paiBottomNav a[data-go]").forEach(a => {
    const active = a.dataset.go === selected;
    a.classList.toggle("on", active);
    if(active) a.setAttribute("aria-current","page");
    else a.removeAttribute("aria-current");
  });
}
function needLogin(next) {
  if (!S.authReady) { toast("लॉगिन तैयार होते ही फिर से चुनें।"); return true; }
  if (isAdmin()) { go("admin"); return true; }
  if (!S.user) { S.after = next; go("login"); return true; }
  if (!isAdmin() && (!S.profile || !S.profile.role)) { S.after = next; go("profile"); return true; }
  return false;
}
function render() {
  S.chatCleanup?.(); S.chatCleanup=null;
  if (!S.authReady || S.authRestoring) {
    // Keep the app hidden until the user's saved session and profile are resolved.
    // Rendering a public Home here causes a one-second guest banner flash.
    document.body.classList.add("pai-auth-pending");
    const composer=document.getElementById("composerWrap");if(composer)composer.remove();
    const view=document.getElementById("view");
    if (view) view.replaceChildren();
    return;
  }
  document.body.classList.remove("pai-auth-pending");
  if (isAdmin() && !["admin","settings","goSearch"].includes(S.view)) {
    S.view = "admin";
    window.history.replaceState(null, "", location.pathname + "#admin");
  }
  if (S.blocked) { $("#view").innerHTML = '<div class="card"><h2>Account blocked</h2><p>Please contact the administrator.</p></div>'; chrome(); return; }
  const V = { home, login, details, profile, letterhead:letterheadScreen, chat, draft, draftEdit, news, plans, history, admin, rti, tools: aiTools, goSearch, igrs, estimate: estimateMB, gstCalc, gstNo, settings:settingsScreen }[S.view] || home;
  stopSpeech();
  const cw = $("#composerWrap"); if (cw) cw.remove();
  $("#view").innerHTML = ""; V($("#view")); chrome();
}

function letterheadScreen(el) {
  if(!S.user)return go("login");
  if(S.profile?.role!=="pradhan")return go("profile");
  if(!window.PAI_LETTERHEAD?.mount){el.innerHTML='<div class="card">Letterhead अभी नहीं खुल रहा। Refresh करें।</div>';return;}
  window.PAI_LETTERHEAD.mount(el,{profile:S.profile,user:S.user,db:S.db,
    onSaved:()=>{LS.set("profile",S.profile);LS.set("pradhanLetterheadSeen_"+S.user.uid,true);},
    onSkip:()=>{LS.set("pradhanLetterheadSeen_"+S.user.uid,true);go("home");},
    toast});
}
function settingsScreen(el) {
  if (window.PAI_UX?.preferences) window.PAI_UX.preferences(el);
  else el.innerHTML = '<div class="card">Display Settings अभी नहीं खुल रही हैं। Reload करें।</div>';
}
function aiTools(el) { if (window.PAI_TOOLS && window.PAI_TOOLS.mount) window.PAI_TOOLS.mount(el); else el.textContent = "AI Tools could not load. Refresh and try again."; }
function gstCalc(el) { if(window.PAI_GST?.mountCalc) window.PAI_GST.mountCalc(el); else el.textContent="GST Calculator अभी नहीं खुल रहा। Refresh करें।"; }
function gstNo(el) { if(window.PAI_GST?.mountDetail) { window.PAI_GST.mountDetail(el); S.chatCleanup=()=>window.PAI_GST?.cleanup?.(); } else el.textContent="GST No Detail अभी नहीं खुल रहा। Refresh करें।"; }
function estimateMB(el) { if(window.PAI_ESTIMATE && window.PAI_ESTIMATE.mount) window.PAI_ESTIMATE.mount(el); else el.textContent="Estimate Calculator could not load. Refresh and try again."; }
function igrs(el){
 if(needLogin("igrs"))return;
 const workspace=window.PAI_DRAFT_WORKSPACE.mount(el,{kind:"IGRS निस्तारण आख्या",code:"igrs",
 previous:S.igrsRestore||null,description:"IGRS शिकायत upload करें और वास्तविक जाँच/कार्रवाई के आधार पर निस्तारण आख्या तैयार करें।",profile:S.profile,user:S.user,api,letterhead:window.PAI_LETTERHEAD,toast,
 save:async entry=>{const list=LS.get("drafts")||[],i=list.findIndex(x=>x.id===entry.id),saved={...entry,at:Date.now()};if(i>=0)list[i]=saved;else list.unshift(saved);if(!LS.set("drafts",list.slice(0,50)))throw Error("Draft Save नहीं हुआ।");toast("IGRS Draft saved ✓");}});
 S.igrsRestore=null;S.chatCleanup=()=>workspace?.destroy();
}
function goSearch(el) { if(window.PAI_GO_SEARCH?.mount) window.PAI_GO_SEARCH.mount(el); else el.textContent="GO Search अभी नहीं खुल रहा। Refresh करें।"; }

/* ---------- होम ---------- */
function home(el) {
  const p = S.profile;
  el.innerHTML = `
  <div class="card hero">
   <div class="hero-motion" aria-hidden="true"><span class="trace"></span><span class="particle"></span><span class="particle"></span><span class="particle"></span></div>
   <h1>${p ? 'प्रणाम <span class="pai-greeting-emoji" role="img" aria-label="प्रणाम">🙏</span> <span class="pai-greeting-name">' + esc(greetingName()) + ' ' + esc(greetingHonorific()) + '</span>' : "पंचायत AI"}</h1>
   <p>${p ? esc([(ROLES[p.role] || ROLES.resident).n, p.block, p.district].filter(Boolean).join(" · ")) : "हिंदी में AI सहायता, सरकारी पत्र, नोटिस और पंचायत के उपयोगी Tools"}</p>
   </div>
  ${!S.user && S.authReady ? `<div class="card"><b>पंचायत निवासी के रूप में जारी रखें। अधिकारी, कर्मचारी या प्रधान अपनी भूमिका My Profile में चुन सकते हैं।</b>
   <div class="btn-row"><button class="gbtn" id="homeGoogleLogin" type="button">${googleIcon()} Continue with Google</button></div></div>` : ""}
  <div class="home-options">
    <div class="grid draft-grid home-feature-pair">
      <button class="tile ai-tile" data-go="chat"><span class="e pai-ai-logo"><img src="ai-help-icon.svg?v=20261121-generic-ai2" alt="" width="53" height="53" decoding="async"></span><b>AI Help</b><small>UP के नियम व पंचायत कार्य</small></button>
      <button class="tile ai-tile home-ai-new" data-go="tools"><span class="new-pulse">NEW</span><span class="e">🧰</span><b>AI Tools</b><small>10 conversion tools</small></button>
    </div>
    <div class="grid draft-grid pai-office-tiles">
      <button class="tile go-search-tile" type="button" data-go="goSearch"><span class="e">📚</span><b>GO Search</b><small>Search GO · Original PDF</small></button>
      ${BASE_DRAFTS.slice(0,1).map(d => `<button class="tile" data-draft="${d.k}"><span class="e">${d.e}</span><b>${d.n} बनाएँ</b></button>`).join("")}
      <button class="tile gst-calc-tile" data-go="gstCalc"><span class="e pai-gst-icon"><img src="gst-calculator-icon.svg?v=20261124-premium1" alt="" width="53" height="53" decoding="async"></span><b>GST Calculator</b></button>
      <button class="tile gst-no-tile" data-go="gstNo"><span class="e">🔎</span><b>GST No Detail</b></button>
      ${BASE_DRAFTS.slice(1).map(d => `<button class="tile" data-draft="${d.k}"><span class="e">${d.e}</span><b>${d.n} बनाएँ</b></button>`).join("")}
      <a class="tile" href="https://techgaon.in/karmcharinews/"><span class="e">📰</span><b>Panchayat News</b><small>District & State updates</small></a>
      <button class="tile home-estimate" data-go="estimate"><span class="e">📐</span><b>Estimate Calculator</b></button>
      <button class="tile" data-go="rti"><span class="e">ℹ️</span><b>RTI</b></button>
      <button class="tile plus-tile" data-go="plans"><span class="e">⭐</span><b>Plus</b><small>More features</small></button>
      <button class="tile igrs-tile" type="button" data-go="igrs"><span class="e">📋</span><b>IGRS</b><small>Complaint Upload · Report · Word/PDF</small></button>
    </div>
  </div>
  <div class="card" style="margin-top:14px"><b>Try asking:</b>
   ${["ग्राम पंचायत की खुली बैठक आयोजित करने की प्रक्रिया क्या है?","ग्राम पंचायत की कार्ययोजना (GPDP) कैसे तैयार की जाती है?","15वें वित्त आयोग की धनराशि से कार्य कराते समय किन बातों का ध्यान रखना चाहिए?","ग्राम पंचायत में RTI आवेदन मिलने पर सचिव को क्या करना चाहिए?"]
     .map(q => `<div class="lib-item"><a data-ask="${esc(q)}">❓ ${esc(q)}</a></div>`).join("")}
  </div>`;
  const homeGoogleLogin = el.querySelector("#homeGoogleLogin");
  if (homeGoogleLogin) homeGoogleLogin.onclick = startGoogleLogin;
  window.PAI_DASH?.mount(el, {
    profile:p,user:S.user,drafts:draftsFor(p?.role||"resident"),
    roleName:p?(ROLES[p.role]||ROLES.resident).n:"",
    design:liveSettings?.design||{},history:LS.get("navHistory")||[],
    saved:(LS.get("drafts")||[]).length
  });
  window.PAI_HOME_UI?.enhance(el);
  el.querySelectorAll("[data-draft]").forEach(t => t.onclick = () => { if (needLogin("draft")) return; S.draftType = t.dataset.draft; go("draftEdit"); });
  el.querySelectorAll("[data-ask]").forEach(t => t.onclick = () => { if (needLogin("chat")) return; S.pendingAsk = t.dataset.ask; go("chat"); });
}

/* ---------- लॉगिन: Continue with Google ---------- */
async function startGoogleLogin() {
    if (!fbReady) return toast("पहले config.js में Firebase भरें");
    const pr = new firebase.auth.GoogleAuthProvider();
    // Both the TWA and Chrome must be able to recover the same local session.
    try { await S.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }
    catch(e) { console.warn("Auth persistence unavailable", e); }
    
    
    try {
      const res = await S.auth.signInWithPopup(pr);
      const tok = res.credential && res.credential.accessToken;
      S.gInfo = { name: res.user.displayName, email: res.user.email, phone: res.user.phoneNumber || "", gender: "" };
      if (tok) { // Google People API से मोबाइल नंबर व लिंग (उपयोगकर्ता अनुमति दे तो)
        try {
          const pj = await (await fetch("https://people.googleapis.com/v1/people/me?personFields=phoneNumbers,genders", { headers: { Authorization: "Bearer " + tok } })).json();
          if (pj.phoneNumbers && pj.phoneNumbers[0]) S.gInfo.phone = pj.phoneNumbers[0].canonicalForm || pj.phoneNumbers[0].value;
          if (pj.genders && pj.genders[0]) S.gInfo.gender = { male: "पुरुष", female: "महिला" }[pj.genders[0].value] || "अन्य";
        } catch {}
      }
    } catch (e) { toast("लॉगिन नहीं हुआ: " + e.message); }
}

function login(el) {
  el.innerHTML = `<div class="welcome"><img src="icon.svg" class="logo welcome-logo" alt="पं AI"><h2>Login to पंचायत AI</h2>
   <p class="hint">One tap with your Google account</p>
   <button class="gbtn" id="gLogin"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continue with Google</button>
   ${fbReady ? "" : `<p class="hint">⚙️ Firebase कॉन्फ़िग अभी नहीं भरा गया (config.js)। <a id="demo">Try demo mode</a></p>`}
   <label class="hint" style="display:flex;gap:8px;align-items:flex-start;text-align:left;margin-top:18px"><input type="checkbox" id="tosOk" style="margin-top:3px"><span>I have read and agree to the <a href="https://techgaon.in/terms/" target="_blank">Terms &amp; Conditions</a> and <a href="https://techgaon.in/panchayatai/privacy/" target="_blank">Privacy Policy</a>. I understand Panchayat AI is not an official government app and AI answers may contain mistakes.</span></label></div>`;
  $("#gLogin").onclick = () => { if (!$("#tosOk")?.checked) return toast("पहले Terms & Conditions स्वीकार करें (टिक करें)।"); startGoogleLogin(); };
  const d = $("#demo"); if (d) d.onclick = () => { S.user = { uid: "demo", displayName: "डेमो उपयोगकर्ता", email: "demo@techgaon.in" }; S.gInfo = { name: "डेमो उपयोगकर्ता", phone: "", gender: "" }; afterLogin(); };
}
async function afterLogin() {
  if (isAdmin()) {
    S.profile = { uid: S.user.uid, name: S.user.displayName || "Suraj Bhan Pandey", email: S.user.email };
    S.blocked = false;
    S.after = null;
    go("admin");
    return;
  }
  S.gInfo = S.gInfo || { name: S.user.displayName || "", email: S.user.email || "", phone: S.user.phoneNumber || "" };
  let p = LS.get("profile");
  if (S.db && S.user.uid !== "demo") {
    try {
      const snapshot = await withDeadline(S.db.collection("users").doc(S.user.uid).get(), 5500);
      if (snapshot.exists) p = snapshot.data();
    } catch (e) { console.warn("Profile load delayed; using saved local profile", e); }
  }
  const previous = p && p.uid === S.user.uid ? p : null;
  const needsDefaults = !previous || !previous.name || !ROLES[previous.role];
  S.profile = Object.assign({
    uid: S.user.uid, email: S.user.email, name: S.user.displayName || "पंचायत निवासी",
    gender: "", phone: S.user.phoneNumber || ""
  }, previous || {});
  if (!ROLES[S.profile.role]) S.profile.role = "resident";
  if (!S.profile.name) S.profile.name = S.user.displayName || "पंचायत निवासी";
  S.profile.sign = ROLES[S.profile.role].n;
  S.blocked = S.profile.blocked === true;
  if (needsDefaults && !S.blocked) saveProfile().catch(e => console.warn("Initial profile sync delayed", e));
  const scope=ROLES[S.profile.role]?.scope||"gp";
  const selectedClusters=Array.isArray(S.profile.clusters) ? S.profile.clusters.filter(Boolean).length : (S.profile.cluster ? 1 : 0);
  const selectedGps=Array.isArray(S.profile.gps) ? S.profile.gps.filter(Boolean).length : 0;
  const secretaryAreaComplete=scope!=="multigp" || (selectedClusters>=1&&selectedClusters<=3&&selectedGps>=1&&selectedGps<=25);
  // Verify Hindi names once during Profile completion, never at draft time.
  const verifiedHindi=S.profile.hindiProfileReviewed===true &&
    !!window.PAI_HINDI?.canUseHindi(S.profile.nameHindi);
  const completed=secretaryAreaComplete && verifiedHindi && (S.profile.profileComplete===true||
    (Boolean(previous)&&!needsDefaults&&Boolean(previous.phone)&&Boolean(previous.district)&&
      (scope==="district"||Boolean(previous.block))));
  S.needsProfileSetup=!completed;
  const next=S.after||"home";
  if(!completed&&!S.blocked){S.after=next;go("profile");}
  else{
    S.after=null;
    if(S.profile.role==="pradhan"&&!S.profile.letterhead && !LS.get("pradhanLetterheadSeen_"+S.user.uid) && next==="home")
      go("letterhead");
    else go(next);
  }
}
if (S.auth) S.auth.onAuthStateChanged(async u => {
  if (S.userWatch) S.userWatch();
  if((u?.uid||"")!==(S.chatOwner||"")){S.chat=[];S.att=[];S.chatOwner=u?.uid||null;}
  S.user = u;
  S.authReady = true;
  S.authRestoring = !!u;
  clearTimeout(authWaitTimer);
  if (u) {
    try {
      await afterLogin();
      S.userWatch = S.db.collection("users").doc(u.uid).onSnapshot(doc => {
        const data = doc.data() || {};
        S.blocked = !isAdmin() && data.blocked === true;
        if (S.profile) S.profile.plan = data.plan || null;
        window.PAI_PAYMENTS?.notify(data.plan,S.user?.uid);
        if (S.blocked) { S.view = "blocked"; render(); }
      });
    } catch (e) { toast("Account could not load. Please try again."); go("login"); }
  } else { S.blocked = false; S.profile = null; }
  S.authRestoring = false;
  S.authReady = true;
  render();
}, e => {
  console.warn("Auth session restore error",e);
  S.authReady = true;
  S.authRestoring = false;
  clearTimeout(authWaitTimer);
  document.body.classList.remove("pai-auth-pending");
  render();
});

/* ---------- अगली स्क्रीन: नाम, लिंग, मोबाइल ---------- */
function details(el) {
  const g = S.gInfo || {}, p = S.profile || {};
  const name = p.name || g.name || "", phone = p.phone || g.phone || "", gender = p.gender || g.gender || "";
  const nameHindi=p.nameHindi||(/[\u0900-\u097f]/u.test(name)&&!/[A-Za-z]/.test(name)?name:"");
  el.innerHTML = `<div class="card"><h2 style="margin-top:0">Your details</h2>
   <p class="hint">Filled from your Google account — complete anything missing.</p>
   <label>नाम (Google Profile)</label><input id="dName" value="${esc(name)}" placeholder="पूरा नाम">
   <label for="dNameHindi">नाम हिंदी में — सरकारी पत्रों हेतु</label>
   <input id="dNameHindi" lang="hi" maxlength="80" value="${esc(nameHindi)}" placeholder="जैसे: चंद्र भानु पांडेय">
   <p class="hint">Google से नाम English में आया है तो सही हिंदी वर्तनी यहाँ Save करें। पत्रों में उसी नाम का उपयोग होगा।</p>
   <label>Gender</label><select id="dGender"><option value="">— Select —</option>${[["पुरुष","Male"],["महिला","Female"],["अन्य","Other"]].map(([v,l]) => `<option value="${v}" ${v === gender ? "selected" : ""}>${l}</option>`).join("")}</select>
   <label>Mobile number</label><input id="dPhone" inputmode="tel" maxlength="13" value="${esc(phone)}" placeholder="10-digit mobile number">
   ${g.phone ? `<label class="chk"><input type="checkbox" id="dOk" checked> This is correct ✔</label>` : ""}
   <div class="btn-row"><button class="btn" id="dNext">Continue →</button></div></div>`;
  $("#dNext").onclick = () => {
    const n = $("#dName").value.trim(), nh=$("#dNameHindi").value.trim().replace(/\s+/gu," "),
      ph = $("#dPhone").value.replace(/\D/g, "").slice(-10), gd = $("#dGender").value;
    if(!/^[\u0900-\u097F\s.'-]{2,80}$/u.test(nh))return toast("सरकारी पत्रों के लिए पूरा नाम हिंदी में दर्ज करें।");
    if (!n) return toast("Enter your name"); if (!gd) return toast("Select gender");
    if (ph.length !== 10) return toast("Enter a valid 10-digit mobile number");
    if ($("#dOk") && !$("#dOk").checked && ph === (g.phone || "").replace(/\D/g, "").slice(-10)) return toast("नंबर सही न हो तो बदलें");
    S.profile = Object.assign({}, S.profile, { uid: S.user.uid, email: S.user.email, name: n, nameHindi:nh, gender: gd, phone: ph });
    saveProfile(); const next=S.after==="draftEdit"?"draftEdit":"profile";S.after=null;go(next);
  };
}
async function saveProfile() {
  LS.set("profile", S.profile);
  if (S.db && S.user && S.user.uid !== "demo") { const { plan, usage, blocked, ...p } = S.profile; await S.db.collection("users").doc(S.user.uid).set(p, { merge: true }); }
}

/* ---------- प्रोफ़ाइल: पद + क्षेत्र ---------- */
const geoCache = {};
async function loadDistrict(d) {
  const canonical=G.resolveDistrict?.(d)||d;
  const index=G.districts.indexOf(canonical);
  if(index<0)return null; // Never request a wrong district, e.g. -1.json.
  if(geoCache[canonical]!==undefined)return geoCache[canonical];
  try{
    const response=await fetch("data/geo/"+index+".json");
    if(!response.ok)throw Error("जिले का डेटा उपलब्ध नहीं है");
    const geo=await response.json();
    if(!geo||!geo.blocks||Array.isArray(geo.blocks)||typeof geo.blocks!=="object")
      throw Error("जिले का ब्लॉक डेटा अमान्य है");
    geoCache[canonical]={tehsils:Array.isArray(geo.tehsils)?geo.tehsils:[],blocks:geo.blocks};
  }catch(error){console.warn("Profile location list unavailable",canonical,error);geoCache[canonical]=null;}
  return geoCache[canonical];
}
function profile(el) {
  if (!S.user) return go("login");
  const p = S.profile || { role: "resident" },H=window.PAI_HINDI;
  const initialName=String(p.nameHindi||H?.guess(p.name||S.user.displayName||"")||"");
  el.innerHTML = `<div class="card"><h2 style="margin-top:0">अपनी प्रोफ़ाइल पूरी करें</h2>
   <p class="hint">नाम और स्थानों की हिंदी वर्तनी जाँचें। कोई नाम गलत हो तो यहीं सुधारकर Save करें। पत्र लिखते समय दोबारा नहीं पूछा जाएगा।</p>
   <label for="pNameHindi">आपका पूरा नाम (हिंदी में)</label>
   <input id="pNameHindi" lang="hi" maxlength="80" value="${esc(initialName)}" placeholder="जैसे: चंद्र भानु पांडेय">
   <label for="pPhone">मोबाइल नंबर</label>
   <input id="pPhone" inputmode="tel" maxlength="13" value="${esc(p.phone||S.user.phoneNumber||"")}" placeholder="10 अंकों का मोबाइल नंबर">
   <label for="pAddressHindi">Full Address (पत्र के नीचे आएगा)</label>
   <textarea id="pAddressHindi" lang="hi" maxlength="350" rows="2" placeholder="मकान/मोहल्ला, ग्राम, पोस्ट, विकास खण्ड, जनपद, पिनकोड">${esc(p.addressHindi||p.address||"")}</textarea>
   <p class="hint">यह पता केवल आपके नाम से बनने वाले पत्रों में लगेगा। दूसरे व्यक्ति की ओर से बने पत्र में उसका अलग पता देना होगा।</p>
   <label for="pRole">आपका पद चुनें</label>
   <select id="pRole">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${(p.role || "resident") === k ? "selected" : ""}>${r.n}</option>`).join("")}</select>
   <div id="pArea"></div>
   <div class="btn-row"><button class="btn alt" id="pSuggestHindi" type="button">✦ हिंदी नाम के सुझाव</button>
   <button class="btn" id="pSave">✓ प्रोफ़ाइल Save करें</button></div>
   <p class="hint" id="pHindiStatus" role="status">नाम और स्थान की वर्तनी बदल सकते हैं। सही करके Save करें।</p>
   <div id="pradhanLetterheadCard" class="card ${p.role==="pradhan"?"":"hidden"}" style="margin-top:15px">
      <b>🖋️ ग्राम प्रधान लेटरहेड</b>
      <p class="hint">लेटरहेड बनाएँ या Upload करें, Preview/Edit करके Save करें।</p>
      <button type="button" class="btn" id="pradhanLetterheadOpen">लेटरहेड बनाएँ या Upload करें</button>
    </div></div>`;  const area = $("#pArea");
  // Keep the letterhead option tied to the selected Gram Pradhan role.
  const updateLetterheadCard = () => {
    const isPradhan = $("#pRole",el)?.value==="pradhan";
    $("#pradhanLetterheadCard",el)?.classList.toggle("hidden",!isPradhan);
  };
  $("#pradhanLetterheadOpen",el).onclick = () => {
    if($("#pRole",el)?.value!=="pradhan")return;
    if(S.profile?.role!=="pradhan"){
      toast("पहले ग्राम प्रधान पद चुनकर प्रोफ़ाइल Save करें।");
      return;
    }
    go("letterhead");
  };
  const savedDistrict=G.resolveDistrict?.(p.district,p.districtHindi)||p.district||"";
  const st = { district:savedDistrict,tehsil:p.tehsil||"",block:p.block||"",
    districtHindi:savedDistrict||p.districtHindi||"",blockHindi:p.blockHindi||"",
    gpsHindi:{...(p.gpsHindi||{})},
    clusters:(Array.isArray(p.clusters)?p.clusters:p.cluster?[p.cluster]:[]).slice(0,3),
    gps:(Array.isArray(p.gps)?p.gps:[]).slice(0,25),
    clerkLevel:p.clerkLevel||"block",designation:p.designation||"" };
  const touchedHindi=new Set();
  const hindiName=raw=>H?.label(raw,st.gpsHindi)||raw;
  const hintFor=raw=>H?.guess(raw)||raw;
  let lastAutoSignature="";
  let availableGpNames=[];
  let drawEpoch=0;
  async function draw() {
    const thisDraw=++drawEpoch;
    const role = $("#pRole").value; if (!role) { area.innerHTML = ""; return; }
    let scope = ROLES[role].scope; if (scope === "clerk") scope = st.clerkLevel === "district" ? "district" : "block";
    const geo = st.district ? await loadDistrict(st.district) : null;
    if(thisDraw!==drawEpoch)return;
    const tehsils = geo?.tehsils||[], blocks = geo?.blocks?Object.keys(geo.blocks):[];
    // Preserve the stable Roman IDs, but accept older saved Hindi/uppercase spellings.
    if(st.block&&blocks.length){
      const restored=G.matchPlace?.(blocks,st.block)||"";
      if(restored)st.block=restored;
    }
    const gpsAll=geo?.blocks?.[st.block]||[];
    availableGpNames=[...new Set(gpsAll.filter(x=>typeof x==="string"&&x.trim()))];
    if(availableGpNames.length){
      const restoreNames=values=>[...new Set(values.map(name=>{
        const restored=G.matchPlace?.(availableGpNames,name,st.gpsHindi);
        if(restored&&restored!==name&&st.gpsHindi[name]&&!st.gpsHindi[restored])
          st.gpsHindi[restored]=st.gpsHindi[name];
        return restored||name; // Never silently discard an existing assignment.
      }))];
      st.clusters=restoreNames(st.clusters).slice(0,3);
      st.gps=restoreNames(st.gps).slice(0,25);
    }
    const sel = (id,label,list,val,ph) => list.length
      ? `<label for="${id}">${label}</label><select id="${id}"><option value="">— ${label} चुनें —</option>${list.map(x => `<option value="${esc(x)}" ${x===val?"selected":""}>${esc(id==="aDist"?x:id==="aBlock"?(x===st.block?st.blockHindi||hintFor(x):H?.label(x)||x):hindiName(x))}</option>`).join("")}</select>`
      : `<label for="${id}">${label}</label><input id="${id}" value="${esc(val)}" placeholder="${ph}">`;
    let h = `<label>राज्य</label><select disabled><option>उत्तर प्रदेश</option></select>`;
    if (ROLES[role].scope === "clerk") h += `<label>कार्यालय स्तर</label><select id="aLvl"><option value="block" ${st.clerkLevel === "block" ? "selected" : ""}>विकास खण्ड कार्यालय</option><option value="district" ${st.clerkLevel === "district" ? "selected" : ""}>जनपद स्तरीय कार्यालय (DPRO/DDO/CDO)</option></select>`;
    if (role === "other_staff") h += `<label>विभाग एवं पदनाम (Optional)</label><input id="aDesignation" maxlength="100" value="${esc(st.designation)}" placeholder="जैसे: राजस्व विभाग, कनिष्ठ सहायक">`;
    h += sel("aDist", "जनपद", G.districts, st.district, "");
    if(scope!=="district"){
      // Some legacy Geo files lack a vetted tehsil list: permit an editable value
      // rather than inventing a tehsil, without blocking the GP/Block selection.
      h += sel("aTeh","तहसील (वैकल्पिक)",tehsils,st.tehsil,"तहसील का नाम हिंदी में लिखें");
      h += sel("aBlock","विकास खण्ड",blocks,st.block,"विकास खण्ड लिखें");
      if(st.district&&!geo)h += '<p class="hint" role="status">जनपद की ब्लॉक सूची लोड नहीं हुई। इंटरनेट चालू करके <button type="button" class="btn alt" id="aGeoRetry">Retry</button> करें।</p>';
      if(st.block)h += `<label for="aBlockHindi">विकास खण्ड का हिंदी नाम (सही करें)</label><input lang="hi" maxlength="100" id="aBlockHindi" value="${esc(st.blockHindi||hintFor(st.block))}">`;
    }
    if(scope==="gp"){
      h += sel("aGp",role==="resident"?"आपकी ग्राम पंचायत":"ग्राम पंचायत",gpsAll,st.gps[0]||"","ग्राम पंचायत का नाम");
      if(st.gps[0])h += `<label for="aGpHindi">ग्राम पंचायत का हिंदी नाम (सही करें)</label><input lang="hi" id="aGpHindi" maxlength="100" value="${esc(hindiName(st.gps[0]))}">`;
    }
    if (scope === "multigp" && st.block) {
      h += `<label for="aClusterSelect">Cluster चुनें (अधिकतम 3)</label>
       <p class="hint" id="clusterHelp">इस Block की सभी ग्राम पंचायतों में से Cluster चुनें। Cluster का नाम भी ग्राम पंचायत का नाम होता है।</p>
       <div class="pai-cluster-add"><select id="aClusterSelect" aria-describedby="clusterHelp" ${availableGpNames.length ? "" : "disabled"}><option value="">— ग्राम पंचायत से Cluster चुनें —</option>${availableGpNames.map(name=>`<option value="${esc(name)}" ${st.clusters.includes(name) ? "disabled" : ""}>${esc(hindiName(name))}${st.clusters.includes(name) ? " ✓" : ""}</option>`).join("")}</select><button class="btn" id="aClusterBtn" type="button" ${availableGpNames.length && st.clusters.length<3 ? "" : "disabled"}>+ Add</button></div>
       ${!availableGpNames.length ? '<p class="hint" role="status">इस Block की ग्राम पंचायत सूची उपलब्ध नहीं है। सही Block चुनें या सूची अपडेट करवाएँ।</p>' : ""}
       <div class="gp-list" aria-label="चुने गए Cluster">${st.clusters.map((g,i)=>`<span class="chip">${esc(hindiName(g))}<button type="button" aria-label="${esc(g)} Cluster हटाएँ" data-rm-cluster="${i}">✕</button></span>`).join("")}</div>
       <p class="hint">${st.clusters.length}/3 Cluster चुने गए</p>
       <label>ग्राम पंचायतें चुनें (अधिकतम 25)</label><p class="hint">अपनी ग्राम पंचायतें चुनें। अधिकतम 25 GP जोड़ सकते हैं।</p>
       ${gpsAll.length ? `<select id="aGpAdd"><option value="">+ ग्राम पंचायत जोड़ें</option>${gpsAll.filter(x => !st.gps.includes(x)).map(x => `<option value="${esc(x)}">${esc(hindiName(x))}</option>`).join("")}</select>`
        : `<div style="display:flex;gap:6px"><input id="aGpTxt" placeholder="Gram Panchayat name"><button class="btn" id="aGpBtn" type="button">Add</button></div>`}
       <div class="gp-list">${st.gps.map((g, i) => `<span class="chip">${esc(hindiName(g))}<b data-rm="${i}">✕</b></span>`).join("")}</div>
       <p class="hint">${st.gps.length}/25 ग्राम पंचायतें चुनी गईं</p>
       <label>चुनी हुई ग्राम पंचायतों/Cluster के हिंदी नाम — सुधार सकते हैं</label>
       ${[...new Set([...st.clusters,...st.gps])].map(g=>`<label class="pai-hindi-gp-row">${esc(g)}<input lang="hi" data-hindi-gp="${esc(g)}" maxlength="100" value="${esc(hindiName(g))}"></label>`).join("")}`;
    }
    if (scope === "multigp" && !st.block) h += `<p class="hint">पहले Block चुनें, फिर अधिकतम 3 Cluster और 25 ग्राम पंचायतें जोड़ सकेंगे।</p>`;
    area.innerHTML = h;
    const on = (id, f) => { const x = $("#" + id); if (x) x.onchange = f; };
    const geoRetry=$("#aGeoRetry");
    if(geoRetry)geoRetry.onclick=()=>{delete geoCache[st.district];draw();};
    on("aLvl", e => { st.clerkLevel = e.target.value; draw(); });
    on("aDist", e => { st.district = e.target.value; st.districtHindi=st.district;st.tehsil = st.block = "";st.blockHindi=""; st.clusters = []; st.gps = [];st.gpsHindi={}; draw(); });
    on("aTeh", e => { st.tehsil = e.target.value; });
    on("aBlock", e => { st.block = e.target.value; st.blockHindi=hintFor(st.block);st.clusters=[];st.gps=[];st.gpsHindi={};draw(); });
    on("aGp", e => { st.gps = e.target.value?[e.target.value]:[];draw(); });
    on("aGpAdd", e => { if (!e.target.value) return; if (st.gps.length >= 25) return toast("Maximum 25 Gram Panchayats"); if (!st.gps.includes(e.target.value)) st.gps.push(e.target.value); draw(); });
    const b = $("#aGpBtn"); if (b) b.onclick = () => { const v = $("#aGpTxt").value.trim(); if (!v) return; if (st.gps.length >= 25) return toast("Maximum 25 Gram Panchayats"); if (!st.gps.includes(v)) st.gps.push(v); draw(); };
    const addCluster = () => {
      const name=($("#aClusterSelect")?.value||"").trim();
      if(!name)return toast("ग्राम पंचायत सूची से Cluster चुनें");
      if(!availableGpNames.includes(name))return toast("Cluster का नाम इसी Block की ग्राम पंचायत सूची में होना चाहिए");
      if(st.clusters.includes(name))return toast("यह Cluster पहले से जुड़ा है");
      if(st.clusters.length>=3)return toast("अधिकतम 3 Cluster चुन सकते हैं");
      st.clusters.push(name);draw();
    };
    const addBtn=$("#aClusterBtn");if(addBtn)addBtn.onclick=addCluster;
    const blockHindi=$("#aBlockHindi");if(blockHindi)blockHindi.oninput=e=>{st.blockHindi=e.target.value;touchedHindi.add("block");};
    const singleGpHindi=$("#aGpHindi");if(singleGpHindi)singleGpHindi.oninput=e=>{
      const key=st.gps[0];if(key){st.gpsHindi[key]=e.target.value;touchedHindi.add("gp:"+key);}
    };
    area.querySelectorAll("[data-hindi-gp]").forEach(inp=>inp.oninput=e=>{
      const key=e.target.dataset.hindiGp;st.gpsHindi[key]=e.target.value;touchedHindi.add("gp:"+key);
    });
    area.querySelectorAll("[data-rm-cluster]").forEach(x => x.onclick = () => { st.clusters.splice(Number(x.dataset.rmCluster),1); draw(); });
    area.querySelectorAll("[data-rm]").forEach(x => x.onclick = () => { st.gps.splice(+x.dataset.rm, 1); draw(); });
    // Prefill editable Hindi spellings automatically without blocking the Profile.
    Promise.resolve().then(()=>suggestHindi(false)).catch(e=>console.warn("Hindi suggestion",e));
  }
  // Suggest Hindi spellings immediately as selections change; leave manually edited
  // fields untouched. All spellings are reviewed and saved on this Profile screen.
  async function suggestHindi(force=false){
    if(!H)return;
    const rawName=String(p.name||S.gInfo?.name||S.user.displayName||"").trim();
    const raws=[rawName,st.block,...st.clusters,...st.gps].filter(Boolean);
    const signature=raws.join("|");
    if(!force&&signature===lastAutoSignature)return;
    lastAutoSignature=signature;
    const state=$("#pHindiStatus");
    if(force&&state)state.textContent="हिंदी वर्तनी के सुझाव प्राप्त हो रहे हैं…";
    const hints=await H.suggest(raws);
    if(!el.isConnected)return;
    const first=$("#pNameHindi");
    if(first&&!touchedHindi.has("name")&&!p.nameHindi&&H.canUseHindi(hints[rawName])){
      first.value=hints[rawName];
    }
    if(st.block&&!touchedHindi.has("block")&&!p.blockHindi&&H.canUseHindi(hints[st.block])){
      st.blockHindi=hints[st.block];
      const field=$("#aBlockHindi");if(field)field.value=st.blockHindi;
      const blockSelect=$("#aBlock");
      if(blockSelect?.selectedOptions?.[0])blockSelect.selectedOptions[0].textContent=st.blockHindi;
    }
    for(const raw of [...new Set([...st.clusters,...st.gps])]){
      if(touchedHindi.has("gp:"+raw)||p.gpsHindi?.[raw])continue;
      if(!H.canUseHindi(hints[raw]))continue;
      st.gpsHindi[raw]=hints[raw];
      area.querySelectorAll("[data-hindi-gp]").forEach(inp=>{
        if(inp.dataset.hindiGp===raw)inp.value=hints[raw];
      });
      const single=$("#aGpHindi");if(single&&st.gps[0]===raw)single.value=hints[raw];
      for(const id of ["aGp","aGpAdd","aClusterSelect"]){
        const select=$("#"+id);
        if(select)for(const option of select.options||[])
          if(option.value===raw)option.textContent=hints[raw]+(id==="aClusterSelect"&&st.clusters.includes(raw)?" ✓":"");
      }
    }
    if(force&&state)state.textContent="सुझाव आ गए हैं। हिंदी वर्तनी जाँचें; गलत हो तो यहीं सुधारकर Save करें।";
  }
  $("#pNameHindi").oninput=()=>touchedHindi.add("name");
  $("#pSuggestHindi").onclick=()=>suggestHindi(true);
  $("#pRole").onchange = () => { updateLetterheadCard(); draw(); };
  updateLetterheadCard();
  draw();
  $("#pSave").onclick = async () => {
    const role = $("#pRole").value; if (!role) return toast("Select your post");
    const v = id => { const x = $("#" + id); return x ? x.value.trim() : ""; };
    if ($("#aTeh")) st.tehsil = v("aTeh"); if ($("#aBlock")) st.block = v("aBlock"); if ($("#aGp")) st.gps = v("aGp") ? [v("aGp")] : [];
    if (role === "other_staff") st.designation = v("aDesignation").slice(0,100);
    let scope = ROLES[role].scope; if (scope === "clerk") scope = st.clerkLevel === "district" ? "district" : "block";
    if (role !== "resident" && !st.district) return toast("Select district");
    if (role !== "resident" && scope !== "district" && !st.block) return toast("Select block");
    if (role !== "resident" && scope === "multigp" && !st.clusters.length) return toast("कम-से-कम 1 Cluster जोड़ें");
    if (scope === "multigp" && st.clusters.length > 3) return toast("अधिकतम 3 Cluster");
    if (scope === "multigp" && (!availableGpNames.length || st.clusters.some(name=>!availableGpNames.includes(name)))) return toast("Cluster केवल चुने गए Block की ग्राम पंचायत सूची से चुनें");
    if (scope === "multigp" && st.gps.length > 25) return toast("अधिकतम 25 Gram Panchayats");
    if (role !== "resident" && (scope === "gp" || scope === "multigp") && !st.gps.length) return toast("Select Gram Panchayat");
    const nh=$("#pNameHindi").value.trim().replace(/\s+/gu," ");
    const rawPhone=$("#pPhone").value.replace(/\D/g,"");
    const phone=rawPhone.slice(-10);
    if(!H?.canUseHindi(nh)){toast("अपना पूरा नाम हिंदी में सुधारकर Save करें।");$("#pNameHindi").focus();return;}
    if(rawPhone&&phone.length!==10){toast("मोबाइल नंबर 10 अंकों का होना चाहिए।");$("#pPhone").focus();return;}
    const blockHindi=st.block?String(st.blockHindi||hintFor(st.block)).trim():"";
    if(st.block&&!H.canUseHindi(blockHindi))return toast("विकास खण्ड का नाम हिंदी में लिखें");
    const selected=[...new Set([...st.clusters,...st.gps])];
    const mapping={};
    for(const raw of selected){
      const text=String(st.gpsHindi[raw]||hintFor(raw)).trim();
      if(!H.canUseHindi(text))return toast(raw+" का सही हिंदी नाम लिखें");
      mapping[raw]=text;
    }
    const previousProfile={...(S.profile||{})};
    const nextProfile={...previousProfile,role,state:"उत्तर प्रदेश",
      nameHindi:nh,addressHindi:v("pAddressHindi").slice(0,350),phone:phone||previousProfile.phone||"",district:st.district,districtHindi:st.districtHindi||st.district,
      tehsil:scope.includes("gp")?st.tehsil:"",block:scope==="district"?"":st.block,
      blockHindi:scope==="district"?"":blockHindi,
      gpsHindi:mapping,
      clusters:scope==="multigp"?st.clusters.slice(0,3):[],
      gps:scope.includes("gp")?st.gps.slice(0,25):[],
      clerkLevel:role==="clerk"?st.clerkLevel:"",
      designation:role==="other_staff"?st.designation:"",
      sign:role==="other_staff"&&st.designation?st.designation:ROLES[role].n,
      hindiProfileReviewed:true,profileComplete:true};
    S.profile=nextProfile;
    const btn=$("#pSave");btn.disabled=true;
    try{
      await saveProfile();
      S.needsProfileSetup=false;
      toast("प्रोफ़ाइल हिंदी नामों के साथ Save हुई ✓");
      const n=S.after||"home";S.after=null;
      if(role==="pradhan"&&!S.profile.letterhead&&!LS.get("pradhanLetterheadSeen_"+S.user.uid))go("letterhead");
      else go(n);
    }catch(e){
      S.profile=previousProfile;
      LS.set("profile",previousProfile);
      $("#pHindiStatus").textContent="Save नहीं हुआ: "+(e.message||"Network error");
      btn.disabled=false;
    }
    return;
  };
}

/* ---------- फ़ाइल संलग्न: PDF / Word / कैमरा / गैलरी ---------- */
function attachBar(onChange) {
  const w = document.createElement("div"); w.className = "att";
  w.innerHTML = `<button class="attbtn" title="PDF" data-a="application/pdf">📄</button>
    <button class="attbtn" title="Word" data-a=".doc,.docx">📝</button>
    <button class="attbtn" title="कैमरा" data-a="image/*" data-cap="1">📷</button>
    <button class="attbtn" title="गैलरी" data-a="image/*">🖼️</button><span class="gp-list" id="attList"></span>`;
  w.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const i = document.createElement("input"); i.type = "file"; i.accept = b.dataset.a; i.multiple = !b.dataset.cap;
    if (b.dataset.cap) i.capture = "environment";
    i.onchange = async () => { for (const f of i.files) await addFile(f); paint(); onChange && onChange(); }; i.click();
  });
  async function addFile(f) {
    if (f.size > 15e6) return toast("फ़ाइल 15MB से छोटी रखें");
    if (/\.docx?$/i.test(f.name)) {
      try { const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() }); S.att.push({ name: f.name, text: r.value.slice(0, 30000) }); }
      catch { toast("Word फ़ाइल नहीं पढ़ी जा सकी (.docx प्रयोग करें)"); }
      return;
    }
    const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(",")[1]); fr.readAsDataURL(f); });
    S.att.push({ name: f.name || "photo.jpg", mime: f.type || "image/jpeg", data });
  }
  function paint() { $("#attList", w).innerHTML = S.att.map((a, i) => `<span class="chip">${esc(a.name.slice(0, 22))}<b data-x="${i}">✕</b></span>`).join("");
    w.querySelectorAll("[data-x]").forEach(x => x.onclick = () => { S.att.splice(+x.dataset.x, 1); paint(); }); }
  paint(); return w;
}

/* ---------- चैट ---------- */
const CHAT_ROLE_TITLES = { pradhan: 'प्रधान', prashasak: 'प्रशासक', sahayak: 'पंचायत सहायक', gpa: 'सचिव', gva: 'सचिव', ado: 'ADO पंचायत', bdo: 'BDO', clerk: 'लिपिक', adpro: 'ADPRO', dpro: 'DPRO', ddo: 'DDO', resident: 'पंचायत निवासी', other_staff: 'अन्य विभागीय कर्मचारी' };
const CHAT_ENGLISH_TITLES = { pradhan: 'Pradhan', prashasak: 'Administrator', sahayak: 'Panchayat Assistant', gpa: 'Secretary', gva: 'Secretary', ado: 'ADO Panchayat', bdo: 'BDO', clerk: 'Clerk', adpro: 'ADPRO', dpro: 'DPRO', ddo: 'DDO', resident: 'Panchayat Resident', other_staff: 'Other Departmental Employee' };
function cleanChatAnswer(value){return String(value||"").trim();}
function chatParagraphs(text){const safe=esc(text).replace(/\*\*([^\n*]+)\*\*/g,"<strong>$1</strong>");return "<p>"+safe.replace(/\n\s*\n/g,"</p><p>").replace(/\n/g,"<br>")+"</p>";}
function refsHtml(ids){
  const docs=[...new Set(ids||[])].map(id=>S.referenceDocs.find(d=>d.id===id)).filter(Boolean);
  if(!docs.length)return "";
  return '<div class="refs original-downloads">'+docs.map(doc=>
    '<div class="ref"><div><b>'+esc(doc.title)+'</b><small>Verified original PDF</small></div><button type="button" class="btn alt btn-sm" data-original="'+esc(doc.id)+'">⬇ Original PDF</button></div>'
  ).join("")+"</div>";
}
function assistantHtml(message,index){
  if(message.document)return '<div data-draft-message="'+index+'"></div>';
  const answer=cleanChatAnswer(message.t);
  if(message.error)return chatParagraphs(answer);
  const english=message.language==="en";
  const web=(message.web||[]).filter(src=>/^https?:\/\//i.test(src.uri||"")).slice(0,5).map(src=>
    '<a href="'+esc(src.uri)+'" target="_blank" rel="noopener noreferrer">'+esc(src.title||(english?"Web source":"वेब स्रोत"))+"</a>"
  ).join(" · ");
  const followups=(message.followups||[]).filter(q=>typeof q==="string"&&q.trim().length>5).slice(0,2);
  window.PAI_GO_SEARCH?.registerHits(message.referenceHits||[]);
  return (Array.isArray(message.goResultIds)?(window.PAI_GO_SEARCH?.chatResultsHtml(message.goResultIds,message.question)||""):"")+chatParagraphs(answer)+
    (Array.isArray(message.goResultIds)?'<div class="btn-row"><button class="btn-sm btn alt" data-go="goSearch">📚 Open GO Search</button></div>':"")+(web?'<p class="hint">'+web+"</p>":"")+refsHtml(message.originalIds||[])+
    (followups.length?'<div class="followups">'+followups.map(q=>
      '<button class="btn alt followup" data-followup="'+esc(q)+'" data-message-index="'+index+'">'+esc(q)+'</button>'
    ).join("")+"</div>":"")+'<div class="btn-row"><button class="btn-sm btn alt" data-tod="'+index+'">📝 इससे पत्र बनाएँ</button></div>';
}
function chat(el) {
  if (needLogin("chat")) return;
  S.chat = S.chat.length ? S.chat : (LS.get("chat_general_v1_" + S.user.uid) || []);
  const choices = RTI_DRAFTS.concat(draftsFor(S.profile.role));
  S.draftMode="";
  const uid=S.user.uid,archiveKey="chat_archives_v1_"+uid,activeKey="chat_general_v1_"+uid;
  const readArchives=()=>Array.isArray(LS.get(archiveKey))?(LS.get(archiveKey)||[]):[];
  el.innerHTML='<div class="pai-chat-mode"><button type="button" class="on" aria-current="page">✦ AI Help</button>'+
    '<button type="button" id="paiStartNewChat">＋ New Chat</button>'+
    '</div>'+

    '<p class="hint">Gemini अनुपलब्ध होने पर लिखित प्रश्न और आवश्यक Profile संदर्भ Groq/Cloudflare AI तक जा सकते हैं। Free Backup का उपयोग संबंधित Providers की अपनी सीमा तक ही संभव है।</p>'+
    '<div class="pai-chat-archive"><label for="paiChatArchive">Chat History</label>'+
    '<select id="paiChatArchive"><option value="">— Select Chat —</option></select></div>'+
    '<div class="draft-chat-header"><h2>AI Help</h2></div>'+
    ((S.profile.gps||[]).length>1?'<div class="pai-chat-gp"><label for="chatDraftGP">Gram Panchayat for Draft (Optional)</label>'+
    '<select id="chatDraftGP"><option value="">— ग्राम पंचायत चुनें —</option>'+
    (S.profile.gps||[]).map(raw=>'<option value="'+esc(raw)+'" '+
      (S.chatGP===raw?'selected':'')+'>'+esc(S.profile.gpsHindi?.[raw]||window.PAI_HINDI?.label(raw)||raw)+'</option>').join('')+
    '</select></div>':'')+
    '<div class="chat draft-conversation" id="chatBox"></div>';
  if($("#chatDraftGP"))$("#chatDraftGP").onchange=e=>{S.chatGP=e.target.value;};
  function paintArchives(){
    const picker=$("#paiChatArchive");if(!picker)return;
    picker.innerHTML='<option value="">— Previous Chats —</option>'+
      readArchives().map((item,i)=>'<option value="'+i+'">'+
      esc(String(item.title||"पुरानी Chat").slice(0,55))+'</option>').join("");
  }
  paintArchives();
  $("#paiStartNewChat").onclick=()=>{
    if(S.chatBusy)return toast("पहले चल रहा जवाब पूरा होने दें।");
    if(S.chat.length){
      const old=readArchives();
      const first=S.chat.find(m=>m.r==="u");
      const archive={title:(first?.t||"नई बातचीत").slice(0,80),at:Date.now(),
        messages:S.chat.slice(-40)};
      if(!LS.set(archiveKey,[archive,...old].slice(0,12)))
        return toast("पुरानी Chat Save नहीं हुई; नई Chat नहीं खुली।");
    }
    S.chat=[];S.att=[];LS.set(activeKey,[]);
    S.draftSeed=null;S.pendingAsk=null;
    toast("New Chat started ✓");
    go("chat");
  };
  $("#paiChatArchive").onchange=e=>{
    if(S.chatBusy)return toast("पहले जवाब पूरा होने दें।");
    const value=e.target.value;if(value==="")return;
    const chosen=readArchives()[Number(value)];if(!chosen)return;
    if(S.chat.length){
      const old=readArchives();
      const first=S.chat.find(m=>m.r==="u");
      const item={title:(first?.t||"पिछली Chat").slice(0,80),at:Date.now(),
        messages:S.chat.slice(-40)};
      if(!LS.set(archiveKey,[item,...old].slice(0,12)))
        return toast("Current Chat Save नहीं हुई।");
    }
    S.chat=Array.isArray(chosen.messages)?chosen.messages:[];
    LS.set(activeKey,S.chat.slice(-40));go("chat");
  };
  const box = $("#chatBox");
  const draftCards = new Map();
  S.chatCleanup=()=>draftCards.forEach(c=>c.dispose());
  const paint = () => {
    box.innerHTML = (S.chat.length ? "" : `<div class="msg a">उत्तर प्रदेश के पंचायती राज अधिनियम, नियम, शासनादेश और विभागीय प्रक्रियाओं के बारे में पूछें।</div>`) +
      S.chat.map((m,index) => '<div class="msg ' + (m.r === "u" ? "u" : m.document ? "a draft-message" : "a") + '">' + (m.r === "u" ? esc(m.t) : assistantHtml(m,index)) + '</div>').join("");

    box.querySelectorAll("[data-draft-message]").forEach(holder=>{
      const m=S.chat[Number(holder.dataset.draftMessage)];
      if(draftCards.has(m.id)){holder.appendChild(draftCards.get(m.id).card);return;}
      draftCards.set(m.id,window.PAI_DRAFT_CARD.mount(holder,{html:m.html,kind:m.kind,review:m.review,size:m.size||12,dirty:m.dirty,
        stationery:m.stationery||"plain",letterhead:S.profile?.role==="pradhan"?S.profile?.letterhead:null,
        toast,onChange:change=>{Object.assign(m,change,{dirty:true});},onSave:change=>{
          const list=LS.get("drafts")||[], entry={id:m.id,kind:m.kind,html:m.html,stationery:m.stationery||"plain",refs:m.refs||[],review:m.review,size:m.size||12,at:Date.now()};
          const index=list.findIndex(x=>x.id&&x.id===m.id);if(index>=0)list[index]=entry;else list.unshift(entry);
          if(!LS.set("drafts",list.slice(0,50)))throw Error("Phone Storage Full. Draft Save नहीं हुआ।");
          Object.assign(m,change,{dirty:false});persistChat();
        }}));
    });
    box.querySelectorAll("[data-tod]").forEach(b => b.onclick = () => { S.draftType = "patra"; S.draftSeed = S.chat[+b.dataset.tod].t; go("draftEdit"); });
    box.querySelectorAll("[data-original]").forEach(b=>b.onclick=()=>window.PAI.downloadOriginalPDF(b.dataset.original));
  };
  const persistChat=()=>LS.set("chat_general_v1_" + S.user.uid,S.chat.slice(-40));
  paint();
  window.PAI_GO_SEARCH?.load().then(()=>{if(S.view==="chat"&&document.contains(box))paint();});
  const comp = document.createElement("div"); comp.className = "composer"; comp.id = "composerWrap";
  comp.appendChild(attachBar());
  const row = document.createElement("div"); row.className = "in";
  row.innerHTML = `<button id="voiceMic" class="voice-mic" type="button" aria-label="हिंदी बोलकर लिखें" aria-pressed="false" title="हिंदी बोलकर लिखें"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"></path></svg></button><textarea id="q" placeholder="लिखें या माइक से हिंदी बोलें…" rows="1"></textarea><button class="btn" id="send">➤</button>`;
  comp.appendChild(row);
  const voiceStatus=document.createElement("div");voiceStatus.id="voiceStatus";voiceStatus.className="voice-status hidden";voiceStatus.setAttribute("role","status");voiceStatus.setAttribute("aria-live","polite");comp.appendChild(voiceStatus);document.body.appendChild(comp);
  attachHindiSpeech($("#q"),$("#voiceMic"),voiceStatus);
  const send = async (contextIndex = -1) => {
    if (S.chatBusy) return;
    const q = $("#q").value.trim(); if (!q && !S.att.length) return;
    S.chatBusy = true; $("#send").disabled = true;
    S.chat.push({ r: "u", t: q || "(संलग्न फ़ाइल देखें)" }); $("#q").value = "";
    const att = S.att.splice(0); paint();
    box.insertAdjacentHTML("beforeend", `<div class="msg a typing" id="typing">Thinking…</div>`);
    try {
      const previous=S.chat.slice(0,-1).reverse().find(m=>m.document);
      const revising=previous&&/इसमें|इसे|बदल|सुधार|जोड़|हटा|edit|change|update/i.test(q);
      const kind = requestedDraftKind(q, S.draftMode)||(revising?previous.kind:"");
      if(window.PAI_GO_SEARCH?.isGoLookup(q)&&!att.length&&!revising){
        await window.PAI_GO_SEARCH.load();
        const docs=window.PAI_GO_SEARCH.search(q,10);
        S.chat.push({r:"a",t:docs.length
          ?docs.length+" सत्यापित शासनादेश मिले हैं। PDF देखने या डाउनलोड करने के लिए नीचे लिंक खोलें।"
          :"इस विषय का कोई सत्यापित GO अभी लाइब्रेरी में नहीं मिला। GO Search में दूसरे शब्द या GO नंबर से खोजें। GO का संग्रह अपलोड होने पर परिणाम उपलब्ध होंगे।",
          goResultIds:docs.map(d=>d.id),question:q,formatVersion:4});
      }else if(kind){
        const followup=revising;
        const source=followup?[{name:"Previous Draft reference",text:window.PAI_DRAFT_CARD.sanitize(previous.html).replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g," ")}]:[];
        const detected=window.PAI_LETTERHEAD?.mode(S.profile,q,kind)||"plain";
        const stationery=revising && previous?.stationery==="gp_office" && detected==="pradhan_letterhead"?
          "gp_office":detected;
        const r=await api("/draft",{kind,profile:S.profile,points:q,gp:$("#chatDraftGP")?.value.trim()||"",
          stationery,att:att.concat(source),refs:[]});

        S.chat.push({r:"a",document:true,id:crypto.randomUUID(),kind,html:r.html,review:r.review,stationery,refs:r.refs||[],t:kind,question:q});
      }else{
        const [r, originals] = await Promise.all([
          api("/chat", { profile: S.profile, history: S.chat.slice(-10).map(m=>({r:m.r,t:m.document?m.kind+" Draft ready.":m.t})), att }),
          availableOriginals(q)
        ]);
        S.chat.push({r:"a",t:r.text,originalIds:originals.map(d=>d.id),referenceHits:r.referenceHits||[],goResultIds:r.referenceHits?.length?r.referenceHits.map(h=>h.id):undefined,web:r.web||[],formatVersion:3,language:r.language,followups:r.followups||[],question:q});
      }
    } catch (e) { if(isDailyLimitError(e))showUpgrade(e.quotaKind,e.limit,e.code==="PLUS_LIMIT");S.chat.push({r:"a",error:true,t:isDailyLimitError(e)?e.message:"⚠️ "+e.message}); }
    S.chatBusy = false;
    persistChat();
    if (document.contains(box)) { paint(); $("#send").disabled = false; const latest=box.lastElementChild;latest?.scrollIntoView({block:"start",behavior:"smooth"}); }
    else if (S.view === "chat") render();
  };
  $("#send").onclick = () => send();
  box.addEventListener("click",event => { const button = event.target.closest("[data-followup]"); if (button && !S.chatBusy) { $("#q").value = button.dataset.followup; send(Number(button.dataset.messageIndex)); } });
  $("#q").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  if(S.draftSeed){$("#q").value=S.draftSeed;S.draftSeed=null;}
  if (S.pendingAsk) { $("#q").value = S.pendingAsk; S.pendingAsk = null; send(); }
}

/* ---------- ड्राफ्ट ---------- */
function draft(el) {
  if (needLogin("draft")) return;
  el.innerHTML = `<h2>What shall we draft, ${esc(callName())}?</h2><div class="grid">${draftsFor(S.profile.role).map(d => `<div class="tile" data-k="${d.k}"><span class="e">${d.e}</span>${d.n}</div>`).join("")}</div>`;
  el.querySelectorAll("[data-k]").forEach(t => t.onclick = () => { S.draftType = t.dataset.k; go("draftEdit"); });
}
/* Short, selectable examples for drafting: one Hindi + two Roman Hindi. */
function examples(k,role){
  const e={
    patra:["अवकाश हेतु खण्ड विकास अधिकारी को पत्र बनाएं","BDO ko patra","chhutti patra"],
    spasht:["नोटिस का स्पष्टीकरण तैयार करें","notice ka jawab","mera paksh"],
    notice:["कारण बताओ नोटिस तैयार करें","notice bana do","jawab mango"],
    aadesh:["कार्यालय आदेश तैयार करें","aadesh banao","office order"],
    rtiApplication:["सूचना हेतु RTI आवेदन बनाएं","RTI aavedan","suchna mango"],
    rtiReply:["प्राप्त RTI आवेदन का उत्तर बनाएं","RTI ka jawab","suchna ka uttar"],
    rti:["RTI का बिंदुवार उत्तर तैयार करें","RTI ka jawab","suchna ka uttar"],
    prastav:["ग्राम पंचायत का प्रस्ताव बनाएं","prastav banao","nali prastav"],
    karyavahi:["ग्राम सभा की बैठक कार्यवाही बनाएं","sabha karyawahi","baithak note"],
    uc:["उपयोगिता प्रमाण पत्र तैयार करें","UC banao","vyay ka UC"],
    aakhya:["स्थलीय जाँच आख्या तैयार करें","jaanch aakhya","report banao"],
    praman:["परिवार रजिस्टर प्रमाण पत्र बनाएं","praman patra","nodayuz banao"],
    samiksha:["मासिक समीक्षा रिपोर्ट बनाएं","samiksha report","meeting note"],
    tippani:["पत्रावली पर टिप्पणी तैयार करें","tippani likho","file note"],
    anusmarak:["अनुस्मारक पत्र तैयार करें","anusmarak banao","reminder patra"],
    chetavni:["कर्मचारी को चेतावनी पत्र बनाएं","chetavni patra","warning notice"],
    prarthna:["अवकाश हेतु प्रार्थना पत्र बनाएं","prarthna patra","chhutti patra"],
    shikayat:["नाली निर्माण की शिकायत लिखें","shikayat patra","BDO shikayat"]
  };
  return e[k]||["आवश्यक कार्यालयी पत्र तैयार करें","patra banao","office letter"];
}
function progress(btn, label, ms = 22000) {
  const t0 = Date.now(); btn.disabled = true;
  const tick = () => { const p = Math.min(95, Math.round(100 * (1 - Math.exp(-(Date.now() - t0) / (ms / 2.5))))); btn.textContent = `${label} ${p}%`; };
  tick(); const id = setInterval(tick, 300);
  return ok => { clearInterval(id); btn.textContent = ok ? "✔ 100%" : "✨ Generate in 1 minute"; setTimeout(() => { btn.disabled = false; btn.textContent = "✨ Regenerate"; }, ok ? 900 : 0); };
}
function rti(el) {
  if (needLogin("rti")) return;
  el.innerHTML = '<h2>RTI</h2><div class="grid draft-grid">' + RTI_DRAFTS.map(d => '<button class="tile" data-rti="' + d.k + '">' + d.e + ' ' + d.n + ' बनाएँ</button>').join('') + '</div>';
  el.querySelectorAll('[data-rti]').forEach(button => button.onclick = () => { S.draftType = button.dataset.rti; go("draftEdit"); });
}
function requestedDraftKind(text, selected="") {
  if(selected)return selected;
  if(/कैसे|क्या|कब|क्यों|के बारे में|जानकारी|समझाओ|बताइए|बताओ|how|procedure|explain/i.test(text))return "";
  // Terse office commands (“सचिव की ओर से ADO को पत्र”, “BDO notice”) also mean draft intent.
  const action=/बना|बनाइ|बनाय|तैयार|लिख|draft|bana|likh|taiyar|prepare|create/i.test(text);
  const terse=text.trim().split(/\s+/u).length<=24 &&
    /पत्र|लेटर|patra|letter|नोटिस|notice|spashti|स्पष्टीकरण|आख्या|aakhya|आदेश|order|प्रस्ताव|prastav|आवेदन|aavedan|application|rt[i]/i.test(text);
  if(!action&&!terse)return "";
  if(/नोटिस|notice|notis/i.test(text))return "नोटिस";
  if(/स्पष्टीकरण|spashti|जवाब|प्रतिउत्तर/i.test(text))return "स्पष्टीकरण";
  if(/आख्या|aakhya|report|जाँच\s*रिपोर्ट/i.test(text))return "आख्या";
  if(/आदेश|aadesh|order/i.test(text))return "कार्यालय आदेश";
  if(/प्रमाण|certificate|praman/i.test(text))return "प्रमाणपत्र";
  if(/प्रस्ताव|prastav/i.test(text))return "प्रस्ताव";
  if(/कार्यवाही|karyavahi|minutes/i.test(text))return "कार्यवाही";
  if(/आरटीआई|rti/i.test(text))return /उत्तर|जवाब|reply/i.test(text)?"RTI उत्तर":"RTI आवेदन";
  if(/पत्र|लेटर|patra|letter|आवेदन/i.test(text))return "पत्र";
  return "";
}
function draftEdit(el) {
  if(needLogin("draftEdit"))return;
  // Hindi spelling was confirmed in Profile; never interrupt drafting for it.
  const choices=RTI_DRAFTS.concat(draftsFor(S.profile.role));
  const type=choices.find(x=>x.k===S.draftType)||BASE_DRAFTS[0];
  S.draftType=type.k;
  S.draftMode="";
  if(!window.PAI_DRAFT_WORKSPACE?.mount){
    el.innerHTML='<div class="card">पत्र बनाने वाला Workspace उपलब्ध नहीं है। ऐप Reload करें।</div>';
    return;
  }
  const save=async entry=>{
    const list=LS.get("drafts")||[];
    const draft={id:entry.id||crypto.randomUUID(),kind:entry.kind||type.n,html:entry.html,
      refs:entry.refs||[],review:entry.review||{},stationery:entry.stationery||"plain",
      size:entry.size||12,question:entry.question||"",at:Date.now()};
    const i=list.findIndex(x=>x.id===draft.id);
    if(i>=0)list[i]=draft;else list.unshift(draft);
    if(!LS.set("drafts",list.slice(0,50)))throw Error("फोन में Draft Save नहीं हो सका");
    toast("Draft saved ✓");
  };
  const previous=S.draftRestore||(S.draftSeed?{question:S.draftSeed}:null);
  const workspace=window.PAI_DRAFT_WORKSPACE.mount(el,{
    kind:type.n,code:type.k,description:type.d||"",profile:S.profile,user:S.user,
    api,letterhead:window.PAI_LETTERHEAD,toast,save,previous
  });
  S.draftRestore=null;S.draftSeed=null;
  S.chatCleanup=()=>workspace?.destroy();
}
function history(el) {
  const h = LS.get("drafts") || [];
  el.innerHTML = `<h2>My Drafts</h2>` + (h.length ? h.map((x, i) => `<div class="lib-item"><a data-i="${i}"><b>${esc(x.kind)}</b></a><small>${new Date(x.at).toLocaleString("hi-IN")}</small></div>`).join("") : `<p class="hint">No saved drafts yet.</p>`) + `<div id="out"></div>`;
  el.querySelectorAll("[data-i]").forEach(a => a.onclick = () => { const x = h[+a.dataset.i]; if(x.kind==="IGRS निस्तारण आख्या"){S.igrsRestore=x;go("igrs");return;} S.draftType=([...RTI_DRAFTS,...draftsFor(S.profile?.role||"resident")].find(d=>d.n===x.kind)?.k)||"patra";
    S.draftRestore=x;go("draftEdit"); });
}

/* ---------- पंचायत न्यूज़ (Inshorts जैसी छोटी ख़बरें) ---------- */
function news(el) {
  const dist = (S.profile && S.profile.district) || "";
  S.newsScope = S.newsScope || (dist ? "district" : "state");
  el.innerHTML = `<h2>📰 Panchayat News</h2><div class="seg"><button data-s="state">पूरा उत्तर प्रदेश</button><button data-s="district">जनपद</button></div>
   <select id="nd" class="${S.newsScope === "district" ? "" : "hidden"}">${G.districts.map(d => `<option ${d === (S.newsDist || dist) ? "selected" : ""}>${d}</option>`).join("")}</select>
   <div id="nl" style="margin-top:10px"><p class="typing">Fetching latest news…</p></div>`;
  el.querySelectorAll("[data-s]").forEach(b => { b.classList.toggle("on", b.dataset.s === S.newsScope); b.onclick = () => { S.newsScope = b.dataset.s; news(el); }; });
  $("#nd").onchange = e => { S.newsDist = e.target.value; news(el); };
  const area = S.newsScope === "district" ? $("#nd").value : "उत्तर प्रदेश";
  aiReady().then(() => window.PAI_AI.news(area)).then(j => {
    const E = ["🏡", "🌾", "🚰", "🏗️", "📜", "🗳️", "🧹", "🌳"];
    S.newsItems = j.items || [];
    $("#nl").innerHTML = S.newsItems.map((n, i) => {
      const d = n.date ? new Date(n.date.replace(" ", "T")) : null;
      const ds = d && !isNaN(d) ? d.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
      return `<article class="ns">
       <div class="ns-img">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="ns-emoji">${E[i % E.length]}</span></div>
       <div class="ns-bar"><span class="ns-brand"><img src="icon.svg" class="logo news-logo" alt="पं AI">Panchayat AI</span>
         <span class="ns-act"><button class="ns-wa" data-wa="${i}" title="WhatsApp">🟢 WhatsApp</button><button class="ns-sh" data-sh="${i}" title="Share">↗ Share</button></span></div>
       <h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p>
       <div class="ns-foot">${esc(ds)}${n.source ? ` | ${esc(n.source)}` : ""} | ${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">पूरा पढ़ें →</a>` : ""}</div></article>`;
    }).join("") || `<p class="hint">No news found right now.</p>`;
    const txt = n => `📰 ${n.title}\n\n${n.summary}\n\nपूरा पढ़ें: ${n.url}\n\n— Panchayat AI ${C.appUrl}`;
    $("#nl").querySelectorAll("[data-wa]").forEach(b => b.onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(txt(S.newsItems[+b.dataset.wa]))));
    $("#nl").querySelectorAll("[data-sh]").forEach(b => b.onclick = async () => { const n = S.newsItems[+b.dataset.sh];
      if (navigator.share) { try { await navigator.share({ title: n.title, text: txt(n), url: n.url }); } catch {} }
      else { try { await navigator.clipboard.writeText(txt(n)); toast("Copied ✔ — कहीं भी पेस्ट करें"); } catch {} } });
  }).catch(() => { $("#nl").innerHTML = `<p class="hint">Could not load news — please try again shortly.</p>`; });
}

const ADMIN_EMAIL = "surajbhanpandey853@gmail.com";
const isAdmin = () => !!(S.user && S.user.emailVerified && S.user.email.toLowerCase() === ADMIN_EMAIL);
function googleIcon() {
  return '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="">';
}
const settingsRef = () => S.db.collection("paiSettings").doc("public");
const money = value => Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
let liveSettings = null;
let settingsError = false;
if (S.db) settingsRef().onSnapshot(doc => {
  liveSettings = doc.exists ? doc.data() : { plans: [] };
  window.PAI_UX?.applyDesign(liveSettings.design || {});
  settingsError = false;
  if (S.view === "plans" || (S.view === "home" && !document.querySelector(".pai-tour-layer"))) render();
}, () => { settingsError = true; if (S.view === "plans") render(); });

function plans(el) {
  el.innerHTML = '<h2>Plus</h2><p>For more features and easy work</p>';
  if (settingsError) { el.innerHTML += '<div class="card">Plans could not load. <button class="btn" data-go="plans">Try again</button></div>'; return; }
  if (!liveSettings) { el.innerHTML += '<p class="typing">Loading plans…</p>'; return; }
  if (isPlus()) el.innerHTML += `<div class="card hero">Plus active until ${new Date(S.profile.plan.until).toLocaleDateString("en-IN")}</div>`;
  const available = (liveSettings.plans || []).filter(p => p.active);
  el.innerHTML += available.map(p => `<section class="plan"><h3>${esc(p.label)}</h3><div class="price">${money(p.price)}</div><p>${p.days} days</p><p class="plan-features">${esc(p.features)}</p><button class="btn" data-buy="${esc(p.id)}">Choose plan</button></section>`).join("") || '<div class="card">Plus plans will appear here when published by the administrator.</div>';
  el.innerHTML += '<div id="pay"></div>';
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (needLogin("plans")) return; payUI(b.dataset.buy); });
}
function payUI(id) {
  const plan = liveSettings.plans.find(p => p.id === id && p.active);
  if (!plan) return;
  const box = $("#pay");
  box.innerHTML = `<div class="card"><h3>${esc(plan.label)}</h3><p id="payAmount">${money(plan.price)}</p><label for="coupon">Coupon code</label><input id="coupon" maxlength="40" placeholder="Optional"><button class="btn alt" id="applyCoupon">Apply coupon</button><p id="couponStatus" role="status"></p><div id="paymentInstructions"></div></div>`;
  let quote = { amount: plan.price, coupon: "" };
  function paymentInstructions() {
    const vpa = liveSettings.upiMigrateToYbl ? (liveSettings.upi || C.upi?.vpa || "") : (C.upi?.vpa || liveSettings.upi || "");
    const area = $("#paymentInstructions");
    if (quote.amount > 0 && (!window.PAI_PAYMENTS.validUpi(vpa) || /REPLACE_ME/i.test(vpa))) { area.innerHTML = '<p>Payment setup is pending. Please contact the administrator.</p>'; return; }
    const ref = "PAI" + crypto.randomUUID().replaceAll("-", "").slice(0, 20);
    const uri = quote.amount>0?window.PAI_PAYMENTS.uri(vpa,liveSettings.payee||C.companyName,quote.amount,ref,plan.label):"";
    area.innerHTML = `${quote.amount>0?`<a class="btn" href="${uri}">Pay via UPI · ${money(quote.amount)}</a><p>UPI ID: <b>${esc(vpa)}</b> <button class="btn alt" type="button" id="copyUpi">UPI ID कॉपी करें</button></p><div class="pai-payment-qr" id="payQr"></div><p class="hint">UPI app से भुगतान करें, QR download करके scan करें या UPI ID से payment करें।</p><label for="utr">12-digit UTR / Transaction ID</label><input id="utr" inputmode="numeric" maxlength="12"><label for="paymentProof">Payment screenshot upload करें</label><input id="paymentProof" type="file" accept="image/jpeg,image/png,image/webp"><img id="paymentProofPreview" class="pai-payment-proof" alt="Payment screenshot preview" hidden>`:'<p>Coupon से पूरा भुगतान कवर है। Admin approval के लिए भेजें।</p>'}<button class="btn" id="submitPayment">Admin को जाँच के लिए भेजें</button><p id="paymentStatus" role="status"></p>`;
    let proof="",reading=false;
    if(quote.amount>0){
      window.PAI_PAYMENTS.qr($("#payQr"),uri).catch(e=>{$("#paymentStatus").textContent=e.message;});
      $("#copyUpi").onclick=()=>navigator.clipboard.writeText(vpa).then(()=>toast("UPI ID कॉपी हो गई"));
      $("#paymentProof").onchange=async e=>{reading=true;proof="";try{proof=await window.PAI_PAYMENTS.proof(e.target.files?.[0]);$("#paymentProofPreview").src=proof;$("#paymentProofPreview").hidden=false;$("#paymentStatus").textContent="Screenshot तैयार है। UTR जाँचकर भेजें।";}catch(error){$("#paymentProofPreview").hidden=true;$("#paymentStatus").textContent=error.message;}finally{reading=false;}};
    }
    $("#submitPayment").onclick = async () => {
      const utr = quote.amount === 0 ? "FREE" : $("#utr").value.trim();
      if (quote.amount > 0 && !/^\d{12}$/.test(utr)) return toast("Enter a valid 12-digit UTR");
      if(reading)return toast("Screenshot तैयार होने दें।");
      if(quote.amount>0&&!proof)return toast("Payment screenshot upload करें।");
      const button = $("#submitPayment"); button.disabled = true;
      try {
        const paymentId=quote.amount>0?"upi-"+utr:ref;
        await S.db.runTransaction(async tx=>{
          const userRef=S.db.collection("users").doc(S.user.uid),user=(await tx.get(userRef)).data()||{};
          if(isAdmin()&&(await tx.get(S.db.collection("paiPayments").doc(paymentId))).exists)throw Error("इस UTR का अनुरोध पहले से मौजूद है।");
          const proofs={...(user.paymentProofs||{})};
          if(proof){
            if(Object.keys(proofs).length>=3&&!proofs[paymentId])throw Error("पहले भेजे 3 अनुरोधों की जाँच पूरी होने दें।");
            proofs[paymentId]={image:proof,createdAt:Date.now(),planId:id};
            if(new TextEncoder().encode(JSON.stringify({...user,paymentProofs:proofs})).length>850000)throw Error("कृपया छोटा screenshot चुनें या पुराने अनुरोध की जाँच होने दें।");
            tx.set(userRef,{paymentProofs:proofs},{merge:true});
          }
          tx.set(S.db.collection("paiPayments").doc(paymentId),{uid:S.user.uid,email:S.user.email,planId:id,amount:quote.amount,coupon:quote.coupon,utr,status:"pending",at:firebase.firestore.FieldValue.serverTimestamp()});
        });
        $("#paymentStatus").textContent = "✓ Screenshot और payment विवरण Admin को भेज दिए गए हैं। Approval के बाद Plus सक्रिय होगा और notification मिलेगा।";
      } catch (e) { $("#paymentStatus").textContent = e.code==="permission-denied"?"इस UTR पर अनुरोध पहले भेजा गया हो सकता है। UTR जाँचें या Admin से संपर्क करें।":(e.message||"अनुरोध नहीं भेजा गया। फिर कोशिश करें।"); button.disabled = false; }
    };
  }
  $("#applyCoupon").onclick = async () => {
    const code = $("#coupon").value.trim().toUpperCase();
    try {
      if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new Error("Enter a valid coupon code");
      const doc = await S.db.collection("paiCoupons").doc(code).get();
      const coupon = doc.data();
      if (!coupon || !coupon.active || (coupon.expires && coupon.expires < Date.now()) || (coupon.planId && coupon.planId !== id)) throw new Error("Coupon is invalid or expired");
      const discount = coupon.type === "percent" ? plan.price * coupon.value / 100 : coupon.value;
      quote = { amount: Math.max(0, Math.round((plan.price - discount) * 100) / 100), coupon: code };
      $("#payAmount").textContent = money(quote.amount);
      $("#couponStatus").textContent = "Coupon applied"; paymentInstructions();
    } catch (e) { quote = { amount: plan.price, coupon: "" }; $("#payAmount").textContent = money(plan.price); $("#couponStatus").textContent = e.message; paymentInstructions(); }
  };
  paymentInstructions(); box.scrollIntoView({ behavior: "smooth" });
}

async function admin(el) {
  if (!isAdmin()) { S.after = 'admin'; el.innerHTML = '<div class="card"><h2>Admin login</h2><p>Sign in with the administrator Google account.</p><button class="gbtn" data-go="login">' + googleIcon() + ' Continue with Google</button></div>'; return; }
  el.innerHTML = '<h2>Admin</h2><div class="seg"><button data-panel="overview">Visitors</button><button data-panel="limits">Limits</button><button data-panel="plans">Plans</button><button data-panel="coupons">Coupons</button><button data-panel="users">Users</button><button data-panel="payments">Payments</button><button data-panel="design">🎨 Design</button></div><div id="adminPanel"></div>';
  el.querySelectorAll('[data-panel]').forEach(b => b.onclick = async () => {
    el.querySelectorAll('[data-panel]').forEach(x => x.classList.toggle('on', x === b));
    const panel = $("#adminPanel"); panel.innerHTML = '<p class="typing">Loading…</p>';
    try { await ({ overview: adminOverview, limits: adminLimits, plans: adminPlans, coupons: adminCoupons, users: adminUsers, payments: adminPayments, design:adminDesign }[b.dataset.panel])(panel); }
    catch (e) { panel.innerHTML = '<div class="card">Admin data could not load. Please try again.</div>'; console.error(e); }
  });
  el.querySelector('[data-panel="overview"]').click();
}
async function adminDesign(panel) {
  if (!isAdmin()) throw new Error("Administrator access is required.");
  const doc = await settingsRef().get();
  const design = doc.data()?.design || {};
  if(!window.PAI_UX?.adminDesign) throw new Error("Design module did not load.");
  window.PAI_UX.adminDesign(panel, {
    data:design,
    onSave:async next => {
      if(!isAdmin()) throw new Error("Admin only");
      await settingsRef().set({design:next,designUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      liveSettings={...(liveSettings||{}),design:next};
    }
  });
}
async function adminOverview(panel) {
  await S.db.waitForPendingWrites();
  const since = new Date(Date.now() - 13 * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [total, daily] = await Promise.all([S.db.collection("stats").doc("visits").get(), S.db.collection("paiVisitorDays").where(firebase.firestore.FieldPath.documentId(), ">=", since).get()]);
  const days = new Map(daily.docs.map(d => [d.id, d.data().count || 0]));
  const values = Array.from({ length: 14 }, (_, i) => { const day = new Date(Date.now() - (13-i)*864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); return { day, count: days.get(day) || 0 }; });
  const today = values[13].count, week = values.slice(-7).reduce((n,d) => n + d.count, 0), max = Math.max(1, ...values.map(d => d.count));
  panel.innerHTML = `<div class="metrics"><div class="card"><small>Total visitors</small><strong>${Number(total.data()?.count || 0).toLocaleString("en-IN")}</strong></div><div class="card"><small>Today</small><strong>${today}</strong></div><div class="card"><small>Last 7 days</small><strong>${week}</strong></div></div><div class="card"><h3>Visits over 14 days</h3><div class="visitor-chart" role="img" aria-label="Visits over the last 14 days">${values.map(d => `<div class="chart-day" title="${d.day}: ${d.count}"><span>${d.count}</span><div class="chart-bar" style="height:${Math.max(2,d.count / max * 130)}px"></div><small>${d.day.slice(8)}</small></div>`).join('')}</div><p class="hint">Visits count browser sessions. Daily tracking starts with this update.</p></div>`;

  const goInventory=document.createElement("div");
  goInventory.className="card";goInventory.style.marginTop="14px";
  goInventory.textContent="GO Library Loading…";
  panel.append(goInventory);
  window.PAI_GO_SEARCH?.inventory?.().then(info=>{
    goInventory.innerHTML='<h3>GO Library</h3><p><strong>'+
      Number(info.documents).toLocaleString("en-IN")+'</strong> indexed Documents · <strong>'+
      Number(info.pages).toLocaleString("en-IN")+'</strong> indexed Pages</p>'+
      (info.incomplete?'<p class="hint">पूरी 6 GB ZIP का आयात अभी पूर्ण नहीं है।</p>':'');
  }).catch(()=>{goInventory.textContent="GO Library stats अभी नहीं मिल रहे।";});

}
async function adminPlans(panel) {
  const doc = await settingsRef().get(), config = doc.data() || {};
  // Admin-only one-time migration; never override subsequent changes by the admin.
  if(isAdmin() && config.upiMigrateToYbl !== true){
    await settingsRef().set({upi:C.upi.vpa,payee:C.upi.payeeName,
      upiMigrateToYbl:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    config.upi=C.upi.vpa;config.payee=C.upi.payeeName;config.upiMigrateToYbl=true;
  }
  const entries = config.plans || [
    { id: "monthly", label: "Plus Monthly", price: 49, days: 30, active: false, features: "More questions and drafts\nFile attachments" },
    { id: "yearly", label: "Plus Yearly", price: 499, days: 365, active: false, features: "All Plus features for a year" },
    { id: "two-year", label: "Plus 2 Years", price: 999, days: 730, active: false, features: "All Plus features for two years" }
  ];
  panel.innerHTML = '<p class="hint">Edit prices, duration and features. Enable a plan to display it to users.</p><div id="planEditors"></div><button class="btn alt" id="addPlan">Add plan</button><h3>Payment settings</h3><label for="adminUpi">UPI ID</label><input id="adminUpi"><label for="adminPayee">Payee name</label><input id="adminPayee"><div id="adminUpiQr" class="pai-payment-qr" hidden></div><p id="adminQrStatus" role="status"></p><button class="btn" id="savePlans">Save and publish plans</button><p id="planStatus" role="status"></p>';
  $("#adminUpi").value = config.upi || C.upi?.vpa || ''; $("#adminPayee").value = config.payee || C.upi?.payeeName || C.companyName;
  let qrTimer;
  const updateQr=()=>{clearTimeout(qrTimer);qrTimer=setTimeout(async()=>{
    const vpa=$("#adminUpi").value.trim(),box=$("#adminUpiQr");box.hidden=!window.PAI_PAYMENTS.validUpi(vpa);
    if(box.hidden){$("#adminQrStatus").textContent=vpa?"मान्य UPI ID भरें।":"";return;}
    try{await window.PAI_PAYMENTS.qr(box,window.PAI_PAYMENTS.uri(vpa,$("#adminPayee").value.trim()||C.companyName));$("#adminQrStatus").textContent="UPI QR Ready. Save करके Publish करें।";}catch(e){$("#adminQrStatus").textContent=e.message;}
  },250);};
  $("#adminUpi").addEventListener("input",updateQr);$("#adminPayee").addEventListener("input",updateQr);updateQr();
  function add(p) {
    const form = document.createElement('div'); form.className = 'card plan-editor'; form.dataset.id = p.id;
    form.innerHTML = `<label>Plan name<input data-field="label" value="${esc(p.label)}" maxlength="80"></label><div class="grid"><label>Price (₹)<input data-field="price" type="number" min="0" step="0.01" value="${p.price}"></label><label>Duration (days)<input data-field="days" type="number" min="1" max="3650" value="${p.days}"></label></div><label>Features<textarea data-field="features" maxlength="2000">${esc(p.features || '')}</textarea></label><label class="chk"><input data-field="active" type="checkbox" ${p.active ? 'checked' : ''}> Published</label><button class="btn alt" data-remove>Remove plan</button>`;
    form.querySelector('[data-remove]').onclick = () => form.remove(); $("#planEditors").appendChild(form);
  }
  entries.forEach(add); $("#addPlan").onclick = () => add({ id: crypto.randomUUID(), label: "New plan", price: 0, days: 30, active: false });
  $("#savePlans").onclick = async () => {
    const button = $("#savePlans"); button.disabled = true;
    try {
      const plans = [...panel.querySelectorAll('.plan-editor')].map(form => {
        const field = n => form.querySelector(`[data-field="${n}"]`);
        const p = { id: form.dataset.id, label: field('label').value.trim(), price: Number(field('price').value), days: Number(field('days').value), features: field('features').value.trim(), active: field('active').checked };
        if (!p.label || !Number.isFinite(p.price) || p.price < 0 || !Number.isInteger(p.days) || p.days < 1 || p.days > 3650) throw new Error("Check plan name, price and duration"); return p;
      });
      const upi = $("#adminUpi").value.trim(); if (upi && !window.PAI_PAYMENTS.validUpi(upi)) throw new Error("Check the UPI ID");
      await settingsRef().set({ plans, upi, payee: $("#adminPayee").value.trim(), upiMigrateToYbl:true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      $("#planStatus").textContent = "Plans published successfully";
    } catch (e) { $("#planStatus").textContent = e.message; } finally { button.disabled = false; }
  };
}
async function adminLimits(panel){
 const settings=(await settingsRef().get()).data()||{};
 const fields=[
   ["freeDailyChats","Free AI Chats / day",10],["freeDailyDrafts","Free letters / day",3],
   ["plusDailyChats","Plus AI Chats / day",200],["plusDailyDrafts","Plus letters / day",200]
 ];
 panel.innerHTML='<section class="card limit-admin"><h3>AI Usage Limits</h3>'+
   '<p class="hint">अभी सभी के लिए Unlimited है। Admin के ON करने पर ही प्रतिदिन की सीमा लागू होगी।</p>'+
   '<label class="chk"><input id="freeLimitsEnabled" type="checkbox" '+(settings.freeLimitsEnabled===true?'checked':'')+'> Free Plan की दैनिक सीमा चालू करें</label>'+
   '<div id="paiFreeLimitFields" class="pai-limit-fields"></div>'+
   '<label class="chk"><input id="plusLimitsEnabled" type="checkbox" '+(settings.plusLimitsEnabled===true?'checked':'')+'> Plus Plan की दैनिक सीमा चालू करें</label>'+
   '<div id="paiPlusLimitFields" class="pai-limit-fields"></div>'+
   '<button class="btn" type="button" id="saveLimits">Save Limits</button><p id="limitResult" role="status"></p>'+
   '<p class="hint">Security Rules में भी यही नियंत्रण Publish होना चाहिए। केवल Admin Panel में Save करने से सर्वर नियम अपने-आप नहीं बदलते।</p></section>';
 function fieldsFor(kind){
   const enabled=panel.querySelector("#"+kind+"LimitsEnabled").checked;
   const wrap=panel.querySelector(kind==="free"?"#paiFreeLimitFields":"#paiPlusLimitFields");
   wrap.hidden=!enabled;
   wrap.innerHTML=fields.filter(([key])=>key.startsWith(kind)).map(([key,label,def])=>
     '<label for="limit-'+key+'">'+label+'</label><input id="limit-'+key+
     '" type="number" min="0" max="1000" step="1" inputmode="numeric" value="'+
     (Number.isInteger(settings[key])&&settings[key]>=0?settings[key]:def)+'">').join("");
 }
 for(const kind of ["free","plus"]){
   panel.querySelector("#"+kind+"LimitsEnabled").onchange=()=>fieldsFor(kind);
   fieldsFor(kind);
 }
 panel.querySelector("#saveLimits").onclick=async()=>{
   const button=panel.querySelector("#saveLimits"),message=panel.querySelector("#limitResult");
   const update={freeLimitsEnabled:panel.querySelector("#freeLimitsEnabled").checked,
      plusLimitsEnabled:panel.querySelector("#plusLimitsEnabled").checked};
   try{
     for(const [key,label,def] of fields){
       const enabled=update[key.startsWith("free")?"freeLimitsEnabled":"plusLimitsEnabled"];
       if(!enabled)continue;
       const raw=panel.querySelector("#limit-"+key).value.trim();
       if(!/^\d+$/.test(raw))throw Error(label+": पूरा अंक भरें।");
       const value=Number(raw);
       if(!Number.isSafeInteger(value)||value<0||value>1000)throw Error(label+": 0–1000 तक मान्य है।");
       update[key]=value;
     }
     button.disabled=true;
     await settingsRef().set({...update,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
     liveSettings={...(liveSettings||{}),...update};
     message.textContent=update.freeLimitsEnabled||update.plusLimitsEnabled?
       "✓ सीमाएँ Save हो गई हैं। सर्वर पर लागू करने के लिए Firestore Rules Publish करें।":
       "✓ Unlimited मोड Save हो गया है। सभी के लिए Chat और पत्र असीमित हैं।";
   }catch(e){message.textContent="Save नहीं हुआ: "+(e.message||"Retry");}
   finally{button.disabled=false;}
 };
}
async function adminCoupons(panel) {
  const snapshot = await S.db.collection("paiCoupons").get();
  panel.innerHTML = `<div class="card"><h3>Coupon</h3><label for="couponCode">Code</label><input id="couponCode" maxlength="40"><label for="couponType">Discount type</label><select id="couponType"><option value="percent">Percentage</option><option value="fixed">Fixed amount (₹)</option></select><label for="couponValue">Value</label><input id="couponValue" type="number" min="1"><label for="couponPlan">Plan</label><select id="couponPlan"><option value="">All plans</option>${(liveSettings?.plans || []).map(p => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select><label for="couponExpiry">Expiry date (optional)</label><input id="couponExpiry" type="date"><label class="chk"><input id="couponActive" type="checkbox" checked> Active</label><button class="btn" id="saveCoupon">Save coupon</button><p id="couponMessage" role="status"></p></div><div id="couponList">${snapshot.docs.map(d => `<button class="card coupon-row" data-code="${esc(d.id)}">${esc(d.id)} · ${d.data().active ? 'Active' : 'Disabled'}</button>`).join('')}</div>`;
  panel.querySelectorAll('[data-code]').forEach(b => b.onclick = () => { const c = snapshot.docs.find(d => d.id === b.dataset.code).data(); $("#couponCode").value = b.dataset.code; $("#couponType").value = c.type; $("#couponValue").value = c.value; $("#couponPlan").value = c.planId || ''; $("#couponActive").checked = c.active; $("#couponExpiry").value = c.expires ? new Date(c.expires).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}) : ''; });
  $("#saveCoupon").onclick = async () => {
    try {
      const code = $("#couponCode").value.trim().toUpperCase(), value = Number($("#couponValue").value), type = $("#couponType").value;
      if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !Number.isFinite(value) || value <= 0 || (type === 'percent' && value > 100)) throw new Error('Enter a valid code and discount');
      const expires = $("#couponExpiry").value ? new Date($("#couponExpiry").value + 'T23:59:59+05:30').getTime() : 0;
      await S.db.collection('paiCoupons').doc(code).set({ type, value, expires, active: $("#couponActive").checked, planId: $("#couponPlan").value });
      await adminCoupons(panel);
    } catch(e) { $("#couponMessage").textContent = e.message; }
  };
}
async function adminUsers(panel) {
  panel.innerHTML = '<div class="card"><label for="userSearch">Email or UID</label><input id="userSearch" type="text"><button class="btn" id="findUser">Find user</button><p id="userMessage" role="status"></p></div><div id="userResults"></div>';
  $("#findUser").onclick = async () => {
    try {
      const term = $("#userSearch").value.trim(); if (!term) return;
      const col = S.db.collection('users'); let docs;
      if (term.includes('@')) docs = (await col.where('email','==',term.toLowerCase()).limit(20).get()).docs;
      else { const d = await col.doc(term).get(); docs = d.exists ? [d] : []; }
      $("#userResults").innerHTML = docs.map(d => `<div class="card"><h3>${esc(d.data().name || d.data().email || d.id)}</h3><p>${esc(d.data().email || '')}</p><p>${d.data().blocked ? 'Blocked' : 'Active'}</p><button class="btn" data-block="${esc(d.id)}">${d.data().blocked ? 'Unblock' : 'Block'} user</button></div>`).join('') || '<p>No user found</p>';
      panel.querySelectorAll('[data-block]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try {
          const d = docs.find(d => d.id === b.dataset.block);
          if (d.id === S.user.uid || d.data().email === ADMIN_EMAIL) throw new Error('The administrator cannot be blocked');
          await col.doc(d.id).update({ blocked: !d.data().blocked }); $("#findUser").click();
        } catch(e) { $("#userMessage").textContent = e.message; b.disabled = false; }
      });
    } catch(e) { $("#userMessage").textContent = 'Could not load users. Please try again.'; }
  };
}
async function adminPayments(panel) {
  const payments = await S.db.collection('paiPayments').where('status','==','pending').limit(100).get();
  const proofById=new Map(await Promise.all(payments.docs.map(async d=>{const p=d.data();try{const user=(await S.db.collection("users").doc(p.uid).get()).data();return [d.id,p.proof||user?.paymentProofs?.[d.id]?.image||""];}catch{return [d.id,""];}})));
  panel.innerHTML = '<p class="hint">Verify the amount and UTR in your bank or UPI app before approving a payment.</p>' + (payments.docs.map(d => { const p = {...d.data(),proof:proofById.get(d.id)||''}; return `<div class="card"><b>${esc(p.email)}</b><p>${esc(p.planId)} · ${money(p.amount)} · UTR ${esc(p.utr)}</p><p>Coupon: ${esc(p.coupon || 'None')}</p>${window.PAI_PAYMENTS.safeProof(p.proof)?`<img class="pai-payment-proof" alt="Payment screenshot" src="${p.proof}"><button type="button" class="btn alt" data-proof-view="${d.id}">Screenshot बड़ा देखें / डाउनलोड करें</button>`:'<p class="hint">इस पुराने अनुरोध में screenshot नहीं है। बैंक में UTR जाँचें।</p>'}<button class="btn" data-approve="${d.id}">Verify and approve</button> <button class="btn alt" data-reject="${d.id}">Reject</button><p class="payment-message" role="status"></p></div>`; }).join('') || '<div class="card">No pending payments</div>');
  panel.querySelectorAll('[data-proof-view]').forEach(b=>b.onclick=()=>window.PAI_PAYMENTS.openProof(proofById.get(b.dataset.proofView)));
  panel.querySelectorAll('[data-approve],[data-reject]').forEach(b => b.onclick = async () => {
    const id = b.dataset.approve || b.dataset.reject, approve = !!b.dataset.approve; b.disabled = true;
    try {
      await S.db.runTransaction(async tx => {
        const ref = S.db.collection('paiPayments').doc(id), payment = (await tx.get(ref)).data();
        if (!payment || payment.status !== 'pending') throw new Error('Payment already processed');
        const userRef = S.db.collection('users').doc(payment.uid), user = (await tx.get(userRef)).data() || {};
        const cfg = (await tx.get(settingsRef())).data() || {}, plan = (cfg.plans || []).find(p => p.id === payment.planId);
        if (approve) {
          if (!plan || !plan.active || user.blocked) throw new Error('Plan is unavailable or user is blocked');
          let amount = plan.price;
          if (payment.coupon) {
            const coupon = (await tx.get(S.db.collection('paiCoupons').doc(payment.coupon))).data();
            if (!coupon || !coupon.active || (coupon.expires && coupon.expires < Date.now()) || (coupon.planId && coupon.planId !== plan.id)) throw new Error('Coupon is invalid or expired');
            amount = Math.max(0, Math.round((amount - (coupon.type === 'percent' ? amount * coupon.value / 100 : coupon.value)) * 100) / 100);
          }
          if (Math.abs(amount - payment.amount) > 0.001) throw new Error('Price changed. Verify the amount before proceeding');
          if(payment.utr!=="FREE"){
            const ledgerRef=S.db.collection("users").doc(S.user.uid),ledger=(await tx.get(ledgerRef)).data()||{};
            if(ledger.approvedUpiRefs?.[payment.utr])throw Error("यह UTR पहले approve हो चुका है।");
            tx.set(ledgerRef,{uid:S.user.uid,email:S.user.email,approvedUpiRefs:{[payment.utr]:id}},{merge:true});
          }
          tx.set(userRef, { plan: { name: plan.label, activationId:id, activatedAt:Date.now(), until: Math.max(Date.now(), user.plan?.until || 0) + plan.days * 864e5 } }, { merge: true });
        }
        const receipt=payment.proof||user.paymentProofs?.[id]?.image||"";
        if(user.paymentProofs?.[id])tx.update(userRef,{["paymentProofs."+id]:firebase.firestore.FieldValue.delete()});
        tx.update(ref, {proof:window.PAI_PAYMENTS.safeProof(receipt)?receipt:"", status: approve ? 'approved' : 'rejected', by: S.user.email, doneAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await adminPayments(panel);
    } catch(e) { b.parentElement.querySelector('.payment-message').textContent = e.message; b.disabled = false; }
  });
}

const publicViews = ['home', 'login', 'profile', 'chat', 'draft', 'draftEdit', 'letterhead', 'plans', 'history', 'admin', 'rti', 'tools', 'estimate', 'gstCalc', 'gstNo', 'settings', 'goSearch', 'igrs'];
const initialView = location.hash.slice(1);
if (publicViews.includes(initialView)) S.view = initialView;
window.addEventListener('hashchange', () => {
  const view = location.hash.slice(1) || 'home';
  if (publicViews.includes(view) && view !== S.view) go(view);
});
render();
})();

