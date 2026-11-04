/* पंचायत AI — मुख्य ऐप | TechGaon AI Services */
(() => {
const C = window.PAI_CONFIG, G = window.PAI_GEO;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); };

/* ---------- पद (भूमिकाएँ) ---------- */
// scope: gp = एक GP, multigp = अधिकतम 20 GP, block, district, clerk = ब्लॉक/जनपद स्तर चुनें
const ROLES = {
  pradhan:  { n: "ग्राम प्रधान", call: "प्रधान जी", scope: "gp" },
  prashasak:{ n: "प्रशासक (ग्राम पंचायत)", call: "प्रशासक जी", scope: "gp" },
  sahayak:  { n: "पंचायत सहायक", call: "पंचायत सहायक जी", scope: "gp" },
  gpa:      { n: "ग्राम पंचायत अधिकारी (GPA)", call: "सचिव जी", scope: "multigp" },
  gva:      { n: "ग्राम विकास अधिकारी (GVA)", call: "सचिव जी", scope: "multigp" },
  ado:      { n: "सहायक विकास अधिकारी (पंचायत)", call: "ADO पंचायत जी", scope: "block" },
  bdo:      { n: "खण्ड विकास अधिकारी (BDO)", call: "BDO साहब", scope: "block" },
  clerk:    { n: "विभागीय लिपिक", call: "बाबू जी", scope: "clerk" },
  adpro:    { n: "सहायक जिला पंचायत राज अधिकारी (ADPRO)", call: "ADPRO साहब", scope: "district" },
  dpro:     { n: "जिला पंचायत राज अधिकारी (DPRO)", call: "DPRO साहब", scope: "district" },
  ddo:      { n: "जिला विकास अधिकारी (DDO)", call: "DDO साहब", scope: "district" },
  resident: { n: "ग्रामवासी / नागरिक", call: "जी", scope: "gp" }
};

/* पदवार ड्राफ्ट प्रकार — सभी के लिए 4 मूल + पद अनुसार अतिरिक्त */
const BASE_DRAFTS = [
  { k: "patra", e: "✉️", n: "पत्र", d: "उच्चाधिकारी/विभाग को पत्र" },
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
  resident: [["prarthna","🙏","प्रार्थना पत्र","प्रधान/सचिव/BDO को आवेदन"],["shikayat","📣","शिकायत पत्र","IGRS/शिकायत"],["rti","ℹ️","RTI आवेदन","जन सूचना माँगें"]]
};
const draftsFor = r => BASE_DRAFTS.concat((EXTRA_DRAFTS[r] || []).map(([k,e,n,d]) => ({k,e,n,d})));

/* ---------- स्थिति ---------- */
const S = { user: null, profile: null, view: "home", chat: [], att: [], catalog: [], db: null, auth: null };
const LS = { get: k => { try { return JSON.parse(localStorage.getItem("pai_" + k)); } catch { return null; } },
             set: (k, v) => { try { localStorage.setItem("pai_" + k, JSON.stringify(v)); } catch {} } };

/* ---------- Firebase ---------- */
let fbReady = false;
try {
  if (C.firebase.apiKey !== "REPLACE_ME") {
    firebase.initializeApp(C.firebase); S.auth = firebase.auth(); S.db = firebase.firestore(); fbReady = true;
  }
} catch (e) { console.warn(e); }

async function idToken() { return S.auth && S.auth.currentUser ? S.auth.currentUser.getIdToken() : ""; }
// निःशुल्क सीमा (प्रतिदिन) — Firestore (सर्वर) पर गिनती; नियम (firestore.rules) सीमा से ऊपर लिखने नहीं देते
async function useQuota(kind) {
  const day = Math.floor(Date.now() / 864e5), plus = isPlus();
  const lim = plus ? 200 : C.plans.free[kind === "chat" ? "dailyChats" : "dailyDrafts"];
  const msg = plus ? "आज की उचित उपयोग सीमा पूरी हुई" : `Today's free limit (${lim}) is over — get Plus (₹49/month) / आज की निःशुल्क सीमा पूरी हुई`;
  if (!S.db || !S.user || S.user.uid === "demo") {
    let u = LS.get("usage") || {}; if (u.day !== day) u = { day, chat: 0, draft: 0 };
    if (u[kind] >= lim) throw new Error(msg); u[kind]++; LS.set("usage", u); return;
  }
  const ref = S.db.collection("users").doc(S.user.uid);
  try {
    await S.db.runTransaction(async tx => {
      const d = (await tx.get(ref)).data() || {};
      let u = d.usage && d.usage.day === day ? d.usage : { day, chat: 0, draft: 0 };
      if ((u[kind] || 0) >= lim) throw new Error("LIMIT");
      u = Object.assign({ chat: 0, draft: 0 }, u, { [kind]: (u[kind] || 0) + 1 });
      tx.set(ref, { usage: u }, { merge: true });
    });
  } catch (e) { throw new Error(e.message === "LIMIT" || /permission/i.test(e.message) ? msg : "Network error — please retry"); }
}
const aiReady = () => window.PAI_AI ? Promise.resolve() : new Promise(r => window.addEventListener("pai-ai-ready", r, { once: true }));
async function api(path, body) {
  if (path === "/payment") {
    if (!S.db) throw new Error("Firebase कॉन्फ़िग नहीं भरा");
    await S.db.collection("payments").add({ uid: S.user.uid, email: S.user.email, name: S.profile.name, phone: S.profile.phone, plan: body.plan, utr: body.utr, ref: body.ref, status: "pending", at: Date.now() });
    return { ok: true };
  }
  if (!isPlus() && body.att) body.att = body.att.slice(0, 1);
  await useQuota(path === "/chat" ? "chat" : "draft");
  await aiReady();
  try { return await (path === "/chat" ? window.PAI_AI.chat(body) : window.PAI_AI.draft(body)); }
  catch (e) { console.error(e); throw new Error("AI से उत्तर नहीं मिला: " + (e.message || "").slice(0, 120)); }
}

/* ---------- GO/नियम कैटलॉग (कनेक्टेड फ़ोल्डर की PDF से बना डेटाबेस) ---------- */
fetch("data/catalog.json").then(r => r.json()).then(c => { S.catalog = c; }).catch(() => {});
const norm = s => (s || "").toLowerCase().replace(/[।,.\-()/:;'"“”]/g, " ");
function searchCatalog(q, n = 6) {
  const words = norm(q).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  return S.catalog.map(d => {
    const t = norm(d.title + " " + d.topicName + " " + d.number), x = norm(d.text || "");
    let s = 0; for (const w of words) { if (t.includes(w)) s += 3; if (x.includes(w)) s += 1; }
    return [s, d];
  }).filter(a => a[0] > 2).sort((a, b) => b[0] - a[0]).slice(0, n).map(a => a[1]);
}

/* ---------- PDF फ़ुटर (हर पेज पर: बाएँ TechGaon AI Services, दाएँ PANCHAYT AI — दोनों हाइपरलिंक) ---------- */
async function stampFooter(bytes) {
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFString } = PDFLib;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const link = (page, x, y, w, h, url) => {
    const a = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y, x + w, y + h], Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) } });
    const ref = doc.context.register(a);
    const annots = page.node.lookup(PDFName.of("Annots"));
    if (annots) annots.push(ref); else page.node.set(PDFName.of("Annots"), doc.context.obj([ref]));
  };
  for (const p of doc.getPages()) {
    const { width } = p.getSize(), sz = 8, y = 8;
    p.drawRectangle({ x: 0, y: 0, width, height: 22, color: rgb(1, 1, 1), opacity: 0.85 });
    const L = C.companyName, R = C.appName;
    const lw = font.widthOfTextAtSize(L, sz), rw = font.widthOfTextAtSize(R, sz);
    p.drawText(L, { x: 18, y, size: sz, font, color: rgb(0.06, 0.32, 0.2) });
    p.drawText(R, { x: width - 18 - rw, y, size: sz, font, color: rgb(0.91, 0.45, 0.05) });
    link(p, 16, y - 3, lw + 4, sz + 6, C.companyUrl);
    link(p, width - 20 - rw, y - 3, rw + 4, sz + 6, C.appUrl);
  }
  return doc.save();
}
function saveBlob(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
async function downloadGO(id) {
  const d = S.catalog.find(x => x.id === id);
  toast("Preparing original PDF…");
  try {
    const r = await fetch(C.pdfBase + encodeURIComponent(id) + ".pdf"); if (!r.ok) throw 0;
    const out = await stampFooter(await r.arrayBuffer());
    saveBlob(new Blob([out], { type: "application/pdf" }), `${id} ${(d && d.title || "").slice(0, 60)}.pdf`);
  } catch { toast("PDF not available yet"); }
}
async function downloadAll(ids) { for (const id of ids) { await downloadGO(id); await new Promise(r => setTimeout(r, 700)); } }
window.PAI = { downloadGO, downloadAll };

/* ---------- राउटिंग ---------- */
function go(v) { S.view = v; closeDrawer(); render(); window.scrollTo(0, 0); }
document.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); go(a.dataset.go); } });
const closeDrawer = () => { $("#drawer").classList.remove("open"); $("#scrim").classList.remove("show"); };
$("#menuBtn").onclick = () => { $("#drawer").classList.add("open"); $("#scrim").classList.add("show"); };
$("#scrim").onclick = closeDrawer;
$("#loginTop").onclick = () => go("login");
$("#logoutBtn").onclick = async () => { if (S.auth) await S.auth.signOut(); S.user = null; S.profile = null; LS.set("profile", null); go("home"); };

const isPlus = () => { const p = S.profile && S.profile.plan; return p && p.until && p.until > Date.now(); };
// FoodGaon जैसा: लिंग के अनुसार भैया / बहन
const sib = () => S.profile && S.profile.gender === "महिला" ? "बहन" : "भैया";
const callName = () => S.profile ? ((S.profile.name || "").split(" ")[0] + " " + sib() + " जी") : "";

function chrome() {
  $("#loginTop").classList.toggle("hidden", !!S.user);
  $("#logoutBtn").classList.toggle("hidden", !S.user);
  $("#avatar").classList.toggle("hidden", !S.user || !S.user.photoURL);
  if (S.user && S.user.photoURL) $("#avatar").src = S.user.photoURL;
  $("#planBadge").classList.toggle("hidden", !isPlus()); $("#planBadge").textContent = "PLUS";
  $("#adSlot").classList.toggle("hidden", isPlus() || S.view === "chat");
  document.querySelectorAll(".tabs a").forEach(a => a.classList.toggle("on", a.dataset.go === S.view));
}
function needLogin(next) {
  if (!S.user) { S.after = next; go("login"); return true; }
  if (!S.profile || !S.profile.role) { S.after = next; go("profile"); return true; }
  return false;
}
function render() {
  const V = { home, login, details, profile, chat, draft, draftEdit, library, news, plans, history }[S.view] || home;
  const cw = $("#composerWrap"); if (cw) cw.remove();
  $("#view").innerHTML = ""; V($("#view")); chrome();
}

/* ---------- होम ---------- */
function home(el) {
  const p = S.profile;
  el.innerHTML = `
  <div class="card hero"><h1>${p ? "प्रणाम " + esc(callName()) + " 🙏" : "पंचायत AI — PANCHAYT AI"}</h1>
   <p>${p ? esc(ROLES[p.role].n) + " · " + esc([p.block, p.district].filter(Boolean).join(", ")) : "AI assistant for Panchayat officials — Pradhan, Secretary, ADO, BDO, DPRO & clerks"}</p></div>
  ${!S.user ? `<div class="card"><b>अगर आप विभागीय अधिकारी, कर्मचारी या प्रधान हैं तो अपनी प्रोफ़ाइल पूरी करें और अपने काम — पत्र, स्पष्टीकरण आदि — 1 मिनट में निपटाएँ।</b>
   <div class="btn-row"><button class="btn" data-go="login">Login with Google</button></div></div>` : ""}
  <div class="grid">
   ${draftsFor(p ? p.role : "gpa").slice(0, 4).map(d => `<div class="tile" data-draft="${d.k}"><span class="e">${d.e}</span>${d.n} बनाएँ<small>${d.d}</small></div>`).join("")}
  </div><br>
  <div class="grid">
   <div class="tile" data-go="chat"><span class="e">💬</span>AI से पूछें<small>GO/नियम संदर्भ सहित उत्तर</small></div>
   <div class="tile" data-go="library"><span class="e">📚</span>GO पुस्तकालय<small>${S.catalog.length || "1100+"} मूल शासनादेश</small></div>
   <div class="tile" data-go="news"><span class="e">📰</span>Panchayat News<small>District & State updates</small></div>
   <div class="tile" data-go="plans"><span class="e">⭐</span>Plus<small>₹49/month · ₹499/year</small></div>
  </div>
  <div class="card" style="margin-top:14px"><b>Try asking:</b>
   ${["सामुदायिक शौचालय की केयरटेकर को मानदेय कितना देना चाहिए?","15वें वित्त आयोग की टाइड धनराशि किन कार्यों पर खर्च होगी?","परिवार रजिस्टर में नाम जोड़ने की प्रक्रिया क्या है?","ग्राम सभा की खुली बैठक का कोरम कितना होता है?"]
     .map(q => `<div class="lib-item"><a data-ask="${esc(q)}">❓ ${esc(q)}</a></div>`).join("")}
  </div>`;
  el.querySelectorAll("[data-draft]").forEach(t => t.onclick = () => { if (needLogin("draft")) return; S.draftType = t.dataset.draft; go("draftEdit"); });
  el.querySelectorAll("[data-ask]").forEach(t => t.onclick = () => { if (needLogin("chat")) return; S.pendingAsk = t.dataset.ask; go("chat"); });
}

/* ---------- लॉगिन: Continue with Google ---------- */
function login(el) {
  el.innerHTML = `<div class="welcome"><div class="logo">पं</div><h2>Login to पंचायत AI</h2>
   <p class="hint">One tap with your Google account</p>
   <button class="gbtn" id="gLogin"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continue with Google</button>
   ${fbReady ? "" : `<p class="hint">⚙️ Firebase कॉन्फ़िग अभी नहीं भरा गया (config.js)। <a id="demo">Try demo mode</a></p>`}
   <p class="hint" style="margin-top:20px">By logging in you accept the <a href="https://techgaon.in/terms/" target="_blank">Terms</a> and <a href="https://techgaon.in/privacy-policy/" target="_blank">Privacy Policy</a>.</p></div>`;
  $("#gLogin").onclick = async () => {
    if (!fbReady) return toast("पहले config.js में Firebase भरें");
    const pr = new firebase.auth.GoogleAuthProvider();
    pr.addScope("https://www.googleapis.com/auth/user.phonenumbers.read");
    pr.addScope("https://www.googleapis.com/auth/user.gender.read");
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
  };
  const d = $("#demo"); if (d) d.onclick = () => { S.user = { uid: "demo", displayName: "डेमो उपयोगकर्ता", email: "demo@techgaon.in" }; S.gInfo = { name: "डेमो उपयोगकर्ता", phone: "", gender: "" }; afterLogin(); };
}
async function afterLogin() {
  let p = LS.get("profile");
  if (S.db && S.user.uid !== "demo") { const s = await S.db.collection("users").doc(S.user.uid).get(); if (s.exists) p = s.data(); }
  S.profile = p && p.uid === S.user.uid ? p : null;
  if (!S.profile || !S.profile.name) go("details");
  else if (!S.profile.role) go("profile");
  else go(S.after || "home");
}
if (S.auth) S.auth.onAuthStateChanged(u => { S.user = u; if (u) afterLogin(); else render(); });

/* ---------- अगली स्क्रीन: नाम, लिंग, मोबाइल ---------- */
function details(el) {
  const g = S.gInfo || {}, p = S.profile || {};
  const name = p.name || g.name || "", phone = p.phone || g.phone || "", gender = p.gender || g.gender || "";
  el.innerHTML = `<div class="card"><h2 style="margin-top:0">Your details</h2>
   <p class="hint">Filled from your Google account — complete anything missing.</p>
   <label>Name</label><input id="dName" value="${esc(name)}" placeholder="Full name">
   <label>Gender</label><select id="dGender"><option value="">— Select —</option>${[["पुरुष","Male"],["महिला","Female"],["अन्य","Other"]].map(([v,l]) => `<option value="${v}" ${v === gender ? "selected" : ""}>${l}</option>`).join("")}</select>
   <label>Mobile number</label><input id="dPhone" inputmode="tel" maxlength="13" value="${esc(phone)}" placeholder="10-digit mobile number">
   ${g.phone ? `<label class="chk"><input type="checkbox" id="dOk" checked> This is correct ✔</label>` : ""}
   <div class="btn-row"><button class="btn" id="dNext">Continue →</button></div></div>`;
  $("#dNext").onclick = () => {
    const n = $("#dName").value.trim(), ph = $("#dPhone").value.replace(/\D/g, "").slice(-10), gd = $("#dGender").value;
    if (!n) return toast("Enter your name"); if (!gd) return toast("Select gender");
    if (ph.length !== 10) return toast("Enter a valid 10-digit mobile number");
    if ($("#dOk") && !$("#dOk").checked && ph === (g.phone || "").replace(/\D/g, "").slice(-10)) return toast("नंबर सही न हो तो बदलें");
    S.profile = Object.assign({}, S.profile, { uid: S.user.uid, email: S.user.email, name: n, gender: gd, phone: ph });
    saveProfile(); go("profile");
  };
}
async function saveProfile() {
  LS.set("profile", S.profile);
  if (S.db && S.user && S.user.uid !== "demo") { const { plan, usage, ...p } = S.profile; await S.db.collection("users").doc(S.user.uid).set(p, { merge: true }); }
}

/* ---------- प्रोफ़ाइल: पद + क्षेत्र ---------- */
const geoCache = {};
async function loadDistrict(d) {
  if (geoCache[d] !== undefined) return geoCache[d];
  try { geoCache[d] = await (await fetch("data/geo/" + G.districts.indexOf(d) + ".json")).json(); } catch { geoCache[d] = null; }
  return geoCache[d]; // {tehsils:[..], blocks:{ "हैदरगढ़": ["कमेला", ...] }}
}
function profile(el) {
  if (!S.user) return go("login");
  const p = S.profile || {};
  el.innerHTML = `<div class="card"><h2 style="margin-top:0">Complete your profile</h2>
   <p class="hint">अगर आप विभागीय अधिकारी, कर्मचारी या प्रधान हैं तो अपनी प्रोफ़ाइल पूरी करें और अपने काम — पत्र, स्पष्टीकरण आदि — 1 मिनट में निपटाएँ।</p>
   <label>Your post</label><select id="pRole"><option value="">— Select post —</option>${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${p.role === k ? "selected" : ""}>${r.n}</option>`).join("")}</select>
   <div id="pArea"></div>
   <label>Designation / office (used in letter signature)</label><input id="pSign" value="${esc(p.sign || "")}" placeholder="जैसे: ग्राम पंचायत अधिकारी, विकास खण्ड हैदरगढ़, बाराबंकी">
   <label>Chat language</label><select id="pLang"><option value="en">English</option><option value="hi" ${p.lang === "hi" ? "selected" : ""}>हिन्दी (देवनागरी)</option></select>
   <div class="btn-row"><button class="btn" id="pSave">Save ✔</button><button class="btn alt" data-go="details">Edit name/mobile</button></div></div>`;
  const area = $("#pArea");
  const st = { district: p.district || "", tehsil: p.tehsil || "", block: p.block || "", gps: (p.gps || []).slice(), clerkLevel: p.clerkLevel || "block" };
  async function draw() {
    const role = $("#pRole").value; if (!role) { area.innerHTML = ""; return; }
    let scope = ROLES[role].scope; if (scope === "clerk") scope = st.clerkLevel === "district" ? "district" : "block";
    const geo = st.district ? await loadDistrict(st.district) : null;
    const tehsils = geo && geo.tehsils || [], blocks = geo && geo.blocks ? Object.keys(geo.blocks) : [], gpsAll = geo && geo.blocks && geo.blocks[st.block] || [];
    const sel = (id, label, list, val, ph) => list.length
      ? `<label>${label}</label><select id="${id}"><option value="">— Select ${label} —</option>${list.map(x => `<option ${x === val ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`
      : `<label>${label}</label><input id="${id}" value="${esc(val)}" placeholder="${ph}">`;
    let h = `<label>State</label><select disabled><option>उत्तर प्रदेश</option></select>`;
    if (ROLES[role].scope === "clerk") h += `<label>Office level</label><select id="aLvl"><option value="block" ${st.clerkLevel === "block" ? "selected" : ""}>Block office</option><option value="district" ${st.clerkLevel === "district" ? "selected" : ""}>District office (DPRO/DDO/CDO)</option></select>`;
    h += sel("aDist", "District", G.districts, st.district, "");
    if (scope !== "district") h += sel("aBlock", "Block", blocks, st.block, "Type block name");
    if (scope === "gp") h += sel("aGp", role === "resident" ? "Your Gram Panchayat" : "Gram Panchayat", gpsAll, st.gps[0] || "", "Type Gram Panchayat name");
    if (scope === "multigp") {
      h += `<label>Gram Panchayats (max 20)</label><p class="hint">If you hold charge of more than one Gram Panchayat, select all of them.</p>
       ${gpsAll.length ? `<select id="aGpAdd"><option value="">+ Add Gram Panchayat</option>${gpsAll.filter(x => !st.gps.includes(x)).map(x => `<option>${esc(x)}</option>`).join("")}</select>`
        : `<div style="display:flex;gap:6px"><input id="aGpTxt" placeholder="Gram Panchayat name"><button class="btn" id="aGpBtn" type="button">Add</button></div>`}
       <div class="gp-list">${st.gps.map((g, i) => `<span class="chip">${esc(g)}<b data-rm="${i}">✕</b></span>`).join("")}</div><p class="hint">${st.gps.length}/20 selected</p>`;
    }
    area.innerHTML = h;
    const on = (id, f) => { const x = $("#" + id); if (x) x.onchange = f; };
    on("aLvl", e => { st.clerkLevel = e.target.value; draw(); });
    on("aDist", e => { st.district = e.target.value; st.tehsil = st.block = ""; st.gps = []; draw(); });
    on("aTeh", e => { st.tehsil = e.target.value; });
    on("aBlock", e => { st.block = e.target.value; if (geo && geo.blocks) { st.gps = []; draw(); } });
    on("aGp", e => { st.gps = [e.target.value]; });
    on("aGpAdd", e => { if (st.gps.length >= 20) return toast("Maximum 20 Gram Panchayats"); st.gps.push(e.target.value); draw(); });
    const b = $("#aGpBtn"); if (b) b.onclick = () => { const v = $("#aGpTxt").value.trim(); if (!v) return; if (st.gps.length >= 20) return toast("Maximum 20 Gram Panchayats"); st.gps.push(v); draw(); };
    area.querySelectorAll("[data-rm]").forEach(x => x.onclick = () => { st.gps.splice(+x.dataset.rm, 1); draw(); });
  }
  $("#pRole").onchange = draw; draw();
  $("#pSave").onclick = () => {
    const role = $("#pRole").value; if (!role) return toast("Select your post");
    const v = id => { const x = $("#" + id); return x ? x.value.trim() : ""; };
    if ($("#aTeh")) st.tehsil = v("aTeh"); if ($("#aBlock")) st.block = v("aBlock"); if ($("#aGp")) st.gps = v("aGp") ? [v("aGp")] : [];
    let scope = ROLES[role].scope; if (scope === "clerk") scope = st.clerkLevel === "district" ? "district" : "block";
    if (!st.district) return toast("Select district");
    if (scope !== "district" && !st.block) return toast("Select block");
    if ((scope === "gp" || scope === "multigp") && !st.gps.length) return toast("Select Gram Panchayat");
    Object.assign(S.profile, { role, state: "उत्तर प्रदेश", district: st.district, tehsil: scope.includes("gp") ? st.tehsil : "", block: scope === "district" ? "" : st.block,
      gps: scope.includes("gp") ? st.gps : [], clerkLevel: role === "clerk" ? st.clerkLevel : "", sign: $("#pSign").value.trim(), lang: $("#pLang").value });
    saveProfile(); toast("Profile saved ✔"); const n = S.after || "home"; S.after = null; go(n);
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
function refsHtml(ids) {
  const docs = ids.map(id => S.catalog.find(d => d.id === id)).filter(Boolean);
  if (!docs.length) return "";
  return `<div class="refs"><b>📎 Basis (original GO / rules):</b>${docs.map(d => `<div class="ref"><div>${esc(d.title)}<small><span class="pill">${esc(d.type || "GO")}</span>${esc(d.number && !/असत्यापित/.test(d.number) ? "सं. " + d.number : "")} ${esc(d.date || "")} · ${d.id}</small></div><button class="btn-sm btn alt" onclick="PAI.downloadGO('${d.id}')">⬇ Original PDF</button></div>`).join("")}
   ${docs.length > 1 ? `<div class="btn-row"><button class="btn" onclick='PAI.downloadAll(${JSON.stringify(docs.map(d => d.id))})'>⬇ Download all ${docs.length} PDFs</button></div>` : ""}</div>`;
}
function chat(el) {
  if (needLogin("chat")) return;
  S.chat = S.chat.length ? S.chat : (LS.get("chat_" + S.user.uid) || []);
  el.innerHTML = `<div class="chat" id="chatBox"></div>`;
  const box = $("#chatBox");
  const paint = () => {
    box.innerHTML = (S.chat.length ? "" : `<div class="msg a">प्रणाम ${esc(callName())} 🙏 मैं पंचायत AI हूँ। पंचायत से जुड़े किसी भी नियम, शासनादेश, योजना, भुगतान या प्रक्रिया पर प्रश्न पूछें — उत्तर के साथ मूल GO/नियम की PDF भी दूँगा। आप PDF/Word/फ़ोटो भी भेज सकते हैं।</div>`) +
      S.chat.map(m => `<div class="msg ${m.r === "u" ? "u" : "a"}">${m.r === "u" ? esc(m.t) : marked.parse(m.t)}${m.refs ? refsHtml(m.refs) : ""}${m.web && m.web.length ? `<div class="refs"><b>🌐 Web sources:</b> ${m.web.map(w => `<a href="${esc(w.uri)}" target="_blank">${esc(w.title || "स्रोत")}</a>`).join(" · ")}</div>` : ""}${m.r === "a" && m.t ? `<div class="btn-row"><button class="btn-sm btn alt" data-tod="${S.chat.indexOf(m)}">📝 इससे पत्र बनाएँ</button></div>` : ""}</div>`).join("");
    box.querySelectorAll("[data-tod]").forEach(b => b.onclick = () => { S.draftType = "patra"; S.draftSeed = S.chat[+b.dataset.tod].t; go("draftEdit"); });
    window.scrollTo(0, document.body.scrollHeight);
  };
  paint();
  const comp = document.createElement("div"); comp.className = "composer"; comp.id = "composerWrap";
  comp.appendChild(attachBar());
  const row = document.createElement("div"); row.className = "in";
  row.innerHTML = `<textarea id="q" placeholder="Ask your question (Hindi or English)…" rows="1"></textarea><button class="btn" id="send">➤</button>`;
  comp.appendChild(row); document.body.appendChild(comp);
  const send = async () => {
    const q = $("#q").value.trim(); if (!q && !S.att.length) return;
    const refsLocal = searchCatalog(q, 6);
    S.chat.push({ r: "u", t: q || "(संलग्न फ़ाइल देखें)" }); $("#q").value = "";
    const att = S.att.splice(0); paint();
    box.insertAdjacentHTML("beforeend", `<div class="msg a typing" id="typing">Thinking… searching GOs & rules 🔎</div>`);
    try {
      const r = await api("/chat", { profile: S.profile, history: S.chat.slice(-10).map(m => ({ r: m.r, t: m.t })),
        refs: refsLocal.map(d => ({ id: d.id, title: d.title, type: d.type, number: d.number, date: d.date, topic: d.topicName, excerpt: (d.text || "").slice(0, 1800) })), att });
      S.chat.push({ r: "a", t: r.text, refs: r.refs || [], web: r.web || [] });
    } catch (e) { S.chat.push({ r: "a", t: "⚠️ " + e.message + (/सीमा|limit/i.test(e.message) ? "\n\n[Plus प्लान लें](#)" : "") }); }
    LS.set("chat_" + S.user.uid, S.chat.slice(-40)); paint();
  };
  $("#send").onclick = send;
  $("#q").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  if (S.pendingAsk) { $("#q").value = S.pendingAsk; S.pendingAsk = null; send(); }
}

/* ---------- ड्राफ्ट ---------- */
function draft(el) {
  if (needLogin("draft")) return;
  el.innerHTML = `<h2>What shall we draft, ${esc(callName())}?</h2><div class="grid">${draftsFor(S.profile.role).map(d => `<div class="tile" data-k="${d.k}"><span class="e">${d.e}</span>${d.n}<small>${d.d}</small></div>`).join("")}</div>`;
  el.querySelectorAll("[data-k]").forEach(t => t.onclick = () => { S.draftType = t.dataset.k; go("draftEdit"); });
}
/* पद के अनुसार उदाहरण — "मेरी तरफ़ से" लिखने की शैली */
const SACHIV = ["gpa", "gva"], BLOCKO = ["ado", "bdo"], DISTO = ["dpro", "adpro", "ddo"];
function examples(k, role) {
  const R = x => x.includes(role);
  const E = {
    patra: R(SACHIV) ? ["ADO पंचायत को 2 दिन के आकस्मिक अवकाश (CL) के लिए पत्र बनाएँ", "BDO को ग्राम पंचायत कमेला में सामुदायिक शौचालय की मरम्मत हेतु धनराशि माँगने का पत्र"]
      : R(["pradhan", "prashasak"]) ? ["BDO को ग्राम पंचायत में हैंडपंप रिबोर हेतु प्रस्ताव भेजने का पत्र बनाएँ", "सचिव जी को ग्राम सभा की खुली बैठक बुलाने हेतु पत्र"]
      : R(BLOCKO) ? ["सभी ग्राम पंचायत अधिकारियों को GPDP eGramSwaraj पर अपलोड करने हेतु पत्र बनाएँ", "DPRO को ब्लॉक की ODF प्लस प्रगति रिपोर्ट भेजने का पत्र"]
      : R(DISTO) ? ["सभी ADO पंचायत को परिवार रजिस्टर अद्यतन कराने हेतु पत्र बनाएँ", "निदेशक पंचायती राज को जनपद की 15वें वित्त आयोग व्यय प्रगति भेजने का पत्र"]
      : role === "clerk" ? ["BDO की ओर से सभी सचिवों को मासिक बैठक की सूचना का पत्र बनाएँ"]
      : role === "sahayak" ? ["सचिव जी को 2 दिन के अवकाश हेतु प्रार्थना पत्र बनाएँ"]
      : ["प्रधान जी को मेरी गली में नाली निर्माण हेतु प्रार्थना पत्र बनाएँ"],
    spasht: ["मुझे जारी इस नोटिस के आधार पर स्पष्टीकरण बनाएँ (नोटिस की फ़ोटो/PDF लगाएँ)",
      R(SACHIV) ? "बैठक में अनुपस्थित रहने पर BDO के कारण बताओ नोटिस का स्पष्टीकरण — उस दिन मैं तहसील दिवस में था" : "जाँच में बताई गई कमी पर अपना पक्ष रखते हुए स्पष्टीकरण बनाएँ"],
    notice: R(SACHIV) ? ["सामुदायिक शौचालय की केयरटेकर को लगातार अनुपस्थित रहने पर नोटिस बनाएँ", "ग्राम सभा की भूमि पर अतिक्रमण हटाने हेतु नोटिस"]
      : R(["pradhan", "prashasak"]) ? ["ग्राम सभा की भूमि पर अतिक्रमण हटाने हेतु 7 दिन का नोटिस बनाएँ"]
      : R(BLOCKO) ? ["ग्राम पंचायत अधिकारी को समीक्षा बैठक में अनुपस्थित रहने पर कारण बताओ नोटिस बनाएँ"]
      : R(DISTO) ? ["ग्राम पंचायत अधिकारी को कार्य में लापरवाही पर 3 दिन में स्पष्टीकरण देने हेतु नोटिस बनाएँ"]
      : ["नोटिस किसे, किस विषय पर और कितने दिन में उत्तर — लिखें"],
    aadesh: R(BLOCKO) ? ["ग्राम पंचायत अधिकारी रमेश को ग्राम पंचायत कमेला का अतिरिक्त प्रभार देने का कार्यालय आदेश बनाएँ"]
      : R(DISTO) ? ["ग्राम पंचायत अधिकारियों के क्लस्टर पुनर्गठन का कार्यालय आदेश बनाएँ"]
      : R(SACHIV) ? ["ग्राम पंचायत में सफाईकर्मियों की वार्डवार ड्यूटी निर्धारण का आदेश बनाएँ"]
      : ["आदेश किस विषय पर और किसके लिए — लिखें"]
  };

  const X = {
    prastav: R(["pradhan", "prashasak"]) ? ["ग्राम सभा की भूमि पर खेल मैदान बनाने हेतु प्रस्ताव बनाएँ", "15वें वित्त आयोग से गाँव की 3 गलियों में इंटरलॉकिंग का प्रस्ताव"]
      : ["GPDP 2027-28 में पंचायत भवन मरम्मत, नाली और सोलर लाइट शामिल करने का प्रस्ताव बनाएँ", "सामुदायिक शौचालय की केयरटेकर के चयन का प्रस्ताव"],
    karyavahi: ["आज की ग्राम सभा खुली बैठक की कार्यवाही — 112 सदस्य उपस्थित, 4 प्रस्ताव पारित (नाली, हैंडपंप, पेंशन सत्यापन, सफाई)", "ग्राम पंचायत की मासिक बैठक की कार्यवाही बनाएँ — विषय: वित्तीय वर्ष की प्रगति समीक्षा"],
    uc: ["15वें वित्त आयोग की टाइड धनराशि ₹4,50,000 के व्यय का उपयोगिता प्रमाण पत्र बनाएँ", "सामुदायिक शौचालय रखरखाव मद का उपयोगिता प्रमाण पत्र"],
    rti: role === "resident" ? ["ग्राम पंचायत में पिछले 2 वर्ष के 15वें वित्त आयोग के व्यय का विवरण माँगने हेतु RTI आवेदन बनाएँ"]
      : ["RTI आवेदन का उत्तर बनाएँ — माँगी गई सूचना: वर्ष 2025-26 में हुए निर्माण कार्यों की सूची (आवेदन संलग्न करें)", "तृतीय पक्ष से जुड़ी सूचना होने के कारण धारा 11 के अंतर्गत सूचना देने से पहले नोटिस का उत्तर"],
    aakhya: R(SACHIV) ? ["प्रधानमंत्री आवास (ग्रामीण) पात्रता का स्थलीय सत्यापन आख्या — लाभार्थी रामकली, कच्चा मकान, कोई पक्का मकान नहीं", "वृद्धावस्था पेंशन आवेदन की सत्यापन आख्या"]
      : ["IGRS शिकायत (नाली निर्माण में अनियमितता) की स्थलीय जाँच आख्या बनाएँ", "शिकायत की जाँच आख्या — मौके पर कार्य पूर्ण पाया गया, माप पुस्तिका से मिलान सही"],
    praman: ["ग्राम कमेला निवासी श्री रामू पुत्र श्री श्यामलाल का परिवार रजिस्टर नकल प्रमाण पत्र बनाएँ", "ठेकेदार के अंतिम भुगतान हेतु नो-ड्यूज़ प्रमाण पत्र"],
    samiksha: ["ब्लॉक स्तरीय मासिक समीक्षा बैठक का कार्यवृत्त — विषय: ODF प्लस, परिवार रजिस्टर डिजिटलीकरण, 15वाँ वित्त व्यय", "जनपद स्तरीय समीक्षा में कम प्रगति वाली ग्राम पंचायतों के लिए निर्देश सहित कार्यवृत्त"],
    tippani: ["ग्राम पंचायत अधिकारी के अवकाश प्रार्थना पत्र पर स्वीकृति हेतु पत्रावली पर टिप्पणी बनाएँ", "ठेकेदार के भुगतान प्रस्ताव पर टिप्पणी — अभिलेख पूर्ण, स्वीकृति हेतु प्रस्तुत"],
    anusmarak: ["सभी ग्राम पंचायत अधिकारियों को GPDP अपलोड न करने पर अनुस्मारक पत्र बनाएँ — पहला पत्र दिनांक 15.10.2026", "उपयोगिता प्रमाण पत्र न भेजने पर द्वितीय अनुस्मारक"],
    chetavni: ["ग्राम पंचायत अधिकारी को बार-बार निर्देश के बाद भी परिवार रजिस्टर अद्यतन न करने पर चेतावनी पत्र बनाएँ", "सफाईकर्मी की लगातार अनुपस्थिति पर अंतिम चेतावनी"],
    prarthna: role === "resident" ? ["प्रधान जी को मेरे घर के सामने हैंडपंप लगवाने हेतु प्रार्थना पत्र बनाएँ", "BDO को वृद्धावस्था पेंशन न मिलने पर प्रार्थना पत्र"]
      : ["सचिव जी को 2 दिन के अवकाश हेतु प्रार्थना पत्र बनाएँ", "BDO को मानदेय भुगतान हेतु प्रार्थना पत्र"],
    shikayat: ["गाँव की नाली निर्माण में घटिया सामग्री लगाने की शिकायत BDO को बनाएँ", "राशन कोटेदार द्वारा कम राशन देने की IGRS शिकायत"]
  };
  Object.assign(E, X);
  return E[k] || [`${(draftsFor(role).find(x => x.k === k) || {}).n || "पत्र"} बनाएँ — क्या चाहिए, एक-दो पंक्ति में लिखें`];
}
function draftEdit(el) {
  if (needLogin("draft")) return;
  const d = draftsFor(S.profile.role).find(x => x.k === S.draftType) || BASE_DRAFTS[0];
  const ex = examples(d.k, S.profile.role);
  el.innerHTML = `<div class="card"><h2 style="margin-top:0">${d.e} ${d.n} बनाएँ</h2>
   <p class="hint">संक्षेप में हिन्दी में लिखें कि क्या बनाना है — जैसे मुझसे कहते हैं, वैसे ही। उदाहरण पर क्लिक करें:</p>
   <div class="ex-list">${ex.map(x => `<button class="ex" type="button">“${esc(x)}”</button>`).join("")}</div>
   <textarea id="pts" rows="3" placeholder="${esc(ex[0])}">${esc(S.draftSeed || "")}</textarea>
   <div id="attHere"></div>
   <div class="btn-row"><button class="btn saf" id="mk">✨ Generate in 1 minute</button></div></div>
   <div id="out"></div>`;
  S.draftSeed = null; $("#attHere").appendChild(attachBar());
  el.querySelectorAll(".ex").forEach(b => b.onclick = () => { $("#pts").value = b.textContent.replace(/[“”]/g, ""); $("#pts").focus(); });
  $("#mk").onclick = async () => {
    const req = $("#pts").value.trim(); if (!req && !S.att.length) return toast("Please write what you need");
    const b = $("#mk"); b.disabled = true; b.textContent = "Generating…";
    try {
      const r = await api("/draft", { kind: d.n, profile: S.profile, points: req, gp: (S.profile.gps || [])[0] || "", att: S.att.splice(0),
        refs: searchCatalog(req, 5).map(x => ({ id: x.id, title: x.title, number: x.number, date: x.date, excerpt: (x.text || "").slice(0, 1500) })) });
      showDraft(r.html, r.refs || [], d.n);
    } catch (e) { toast(e.message); }
    b.disabled = false; b.textContent = "✨ Regenerate";
  };
}
function showDraft(html, refs, kind) {
  const out = $("#out");
  out.innerHTML = `<div class="card"><p class="hint">✏️ Tap the letter to edit it directly.</p><div class="paper" id="paper" contenteditable="true">${html}</div>
   <div class="btn-row"><button class="btn" id="dcopy">📋 Copy</button><button class="btn" id="dpdf">⬇ PDF</button><button class="btn alt" id="dword">⬇ Word</button><button class="btn alt" id="dsave">💾 Save</button><button class="btn alt" id="dwa">WhatsApp</button></div>${refsHtml(refs)}</div>`;
  const name = kind + "_" + new Date().toISOString().slice(0, 10);
  $("#dcopy").onclick = async () => { const t = $("#paper").innerText; try { await navigator.clipboard.writeText(t); } catch { const x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); document.execCommand("copy"); x.remove(); } toast("Copied ✔"); };
  $("#dpdf").onclick = async () => {
    toast("Creating PDF…");
    const blob = await html2pdf().set({ margin: [14, 14, 18, 14], filename: name + ".pdf", html2canvas: { scale: 2 }, jsPDF: { format: "a4" } }).from($("#paper")).outputPdf("arraybuffer");
    saveBlob(new Blob([await stampFooter(blob)], { type: "application/pdf" }), name + ".pdf");
  };
  $("#dword").onclick = () => {
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Mangal,"Noto Sans Devanagari";font-size:13pt;line-height:1.6}</style></head><body>${$("#paper").innerHTML}
     <p style="font-size:8pt;color:#666;border-top:1px solid #ccc;margin-top:30px"><a href="${C.companyUrl}">${C.companyName}</a><span style="float:right"><a href="${C.appUrl}">${C.appName}</a></span></p></body></html>`;
    saveBlob(new Blob(["﻿" + doc], { type: "application/msword" }), name + ".doc");
  };
  $("#dsave").onclick = () => { const h = LS.get("drafts") || []; h.unshift({ kind, html: $("#paper").innerHTML, refs, at: Date.now() }); LS.set("drafts", h.slice(0, 50)); toast("Saved ✔"); };
  $("#dwa").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent($("#paper").innerText.slice(0, 3000) + "\n\n— " + C.appName + " " + C.appUrl));
}
function history(el) {
  const h = LS.get("drafts") || [];
  el.innerHTML = `<h2>My Drafts</h2>` + (h.length ? h.map((x, i) => `<div class="lib-item"><a data-i="${i}"><b>${esc(x.kind)}</b></a><small>${new Date(x.at).toLocaleString("hi-IN")}</small></div>`).join("") : `<p class="hint">No saved drafts yet.</p>`) + `<div id="out"></div>`;
  el.querySelectorAll("[data-i]").forEach(a => a.onclick = () => { const x = h[+a.dataset.i]; showDraft(x.html, x.refs, x.kind); });
}

/* ---------- GO पुस्तकालय ---------- */
function library(el) {
  const topics = [...new Map(S.catalog.map(d => [d.topic, d.topicName])).entries()].filter(t => t[1]).sort();
  el.innerHTML = `<h2>📚 GO पुस्तकालय</h2><p class="hint">${S.catalog.length} original documents — Acts, Rules, GOs, Gazettes, court rulings.</p>
   <input id="ls" placeholder="Search: सामुदायिक शौचालय, परिवार रजिस्टर, 15th FC…">
   <select id="lt" style="margin-top:8px"><option value="">All topics</option>${topics.map(([k, n]) => `<option value="${k}">${k}. ${esc(n)}</option>`).join("")}</select>
   <div id="lr" class="card" style="margin-top:10px"></div>`;
  const draw = () => {
    const q = $("#ls").value.trim(), t = $("#lt").value;
    let list = q ? searchCatalog(q, 60) : S.catalog; if (t) list = list.filter(d => d.topic === t);
    $("#lr").innerHTML = list.slice(0, 80).map(d => `<div class="lib-item ref"><div><b>${esc(d.title)}</b><small><span class="pill">${esc(d.type)}</span>${esc(d.date)} · ${esc(d.topicName)} · ${d.id}</small><small>${esc(d.use || "")}</small></div>${d.p ? `<button class="btn alt btn-sm" onclick="PAI.downloadGO('${d.id}')">⬇ PDF</button>` : ""}</div>`).join("") || `<p class="hint">Nothing found</p>`;
  };
  $("#ls").oninput = draw; $("#lt").onchange = draw; draw();
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
    $("#nl").innerHTML = (j.items || []).map(n => `<div class="news-card"><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><div class="meta">${esc(n.date || "")} · ${n.url ? `<a href="${esc(n.url)}" target="_blank">${esc(n.source || "Read more")}</a>` : esc(n.source || "")}</div></div>`).join("") || `<p class="hint">No news found right now.</p>`;
  }).catch(() => { $("#nl").innerHTML = `<p class="hint">Could not load news — please try again shortly.</p>`; });
}

/* ---------- प्लान व UPI भुगतान ---------- */
function plans(el) {
  const P = C.plans;
  el.innerHTML = `<h2>⭐ पंचायत AI Plus</h2>
  ${isPlus() ? `<div class="card hero"><b>Your Plus is active</b><p>${new Date(S.profile.plan.until).toLocaleDateString("hi-IN")} (valid till)</p></div>` : ""}
  <div class="plan"><h3>Free</h3><div class="price">₹0</div><ul><li>${P.free.dailyChats} questions & ${P.free.dailyDrafts} drafts per day</li><li>GO library & original PDF download</li><li>Panchayat News</li><li>With ads</li></ul></div>
  <div class="plan"><h3>Plus Monthly</h3><div class="price">₹${P.plus.price}<small style="font-size:14px">/30 days</small></div>
   <ul><li>Unlimited* questions & drafts</li><li>Answers from PDF / Word / photo (multiple files)</li><li>All post-wise special drafts (UC, RTI, inquiry report, minutes…)</li><li>Answers with live web search</li><li>Ad-free</li></ul>
   <button class="btn" data-buy="plus">₹${P.plus.price} Pay via UPI</button></div>
  <div class="plan best"><span class="badge">Best value</span><h3>Plus Yearly</h3><div class="price">₹${P.yearly.price}<small style="font-size:14px">/365 days</small></div>
   <ul><li>All Plus features for a full year</li><li>Completely ad-free</li><li>Drafts saved in cloud (every device)</li><li>District-wise alerts for new GOs</li><li>Priority support (WhatsApp)</li><li>Save ₹${P.plus.price * 12 - P.yearly.price} vs monthly</li></ul>
   <button class="btn saf" data-buy="yearly">₹${P.yearly.price} Pay via UPI</button></div>
  <table class="cmp"><tr><th>Feature</th><th>Free</th><th>Plus</th><th>Yearly</th></tr>
   ${[["Questions/day", P.free.dailyChats, "Unlimited*", "Unlimited*"], ["Drafts/day", P.free.dailyDrafts, "Unlimited*", "Unlimited*"], ["Original GO PDF", "✔", "✔", "✔"], ["Answer from files", "1 file", "✔", "✔"], ["Web search", "✔", "✔", "✔"], ["Ads", "Yes", "No", "No"], ["Cloud drafts", "—", "—", "✔"], ["Priority support", "—", "—", "✔"]].map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>
  <p class="hint">*Fair use: 200/day. Payment via UPI only. <a href="https://techgaon.in/refund-policy/" target="_blank">Refund policy</a></p><div id="pay"></div>`;
  el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { if (needLogin("plans")) return; payUI(b.dataset.buy); });
}
function payUI(k) {
  const pl = C.plans[k], ref = "PAI" + Date.now().toString(36).toUpperCase();
  const uri = `upi://pay?pa=${encodeURIComponent(C.upi.vpa)}&pn=${encodeURIComponent(C.upi.payeeName)}&am=${pl.price}.00&cu=INR&tn=${encodeURIComponent("PANCHAYT AI " + pl.label + " " + ref)}&tr=${ref}`;
  $("#pay").innerHTML = `<div class="card"><h3 style="margin-top:0">₹${pl.price} — ${pl.label}</h3>
   <a class="btn saf" href="${uri}" style="display:block;text-align:center;text-decoration:none">📱 Pay with UPI app (PhonePe / GPay / Paytm / BHIM)</a>
   <p class="hint" style="text-align:center">On a computer? Scan this QR with your phone:</p><canvas id="qr" style="display:block;margin:auto"></canvas>
   <p class="hint" style="text-align:center">UPI ID: <b>${esc(C.upi.vpa)}</b></p>
   <label>After paying, enter the 12-digit UTR / Transaction ID</label><input id="utr" inputmode="numeric" maxlength="12" placeholder="जैसे 4321XXXXXXXX">
   <div class="btn-row"><button class="btn" id="utrOk">Submit for verification</button></div><p class="hint">Your plan activates after verification (usually within minutes).</p></div>`;
  QRCode.toCanvas($("#qr"), uri, { width: 200 });
  $("#utrOk").onclick = async () => {
    const utr = $("#utr").value.replace(/\D/g, ""); if (utr.length !== 12) return toast("Enter the 12-digit UTR");
    try { await api("/payment", { plan: k, utr, ref }); toast("Submitted ✔ Plus activates after verification"); } catch (e) { toast(e.message); }
  };
  $("#pay").scrollIntoView({ behavior: "smooth" });
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
})();
