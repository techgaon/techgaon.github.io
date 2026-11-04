/* पंचायत AI — Gemini (Firebase AI Logic, Spark/निःशुल्क प्लान पर चलता है; API key Firebase में सुरक्षित) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-ai.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-check.js";

const C = window.PAI_CONFIG;
const app = initializeApp(C.firebase, "pai-ai");
// App Check (reCAPTCHA Enterprise) — Gemini कोटे की सुरक्षा
initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(C.recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
const ai = getAI(app, { backend: new GoogleAIBackend() });
const MODEL = C.geminiModel || "gemini-flash-lite-latest";
const gen = async (s, q, req) => { if (q) { try { return await model(s, true).generateContent(req); } catch (e) { if (!/429|quota|billing/i.test(e.message)) throw e; } } return model(s, false).generateContent(req); };
const model = (system, search) => getGenerativeModel(ai, { model: MODEL, systemInstruction: system,
  generationConfig: { temperature: 0.3 }, ...(search ? { tools: [{ googleSearch: {} }] } : {}) });

const ROLE_CALL = { pradhan: "प्रधान जी", prashasak: "प्रशासक जी", sahayak: "पंचायत सहायक जी", gpa: "सचिव जी", gva: "सचिव जी",
  ado: "ADO पंचायत जी", bdo: "BDO साहब", clerk: "बाबू जी", adpro: "ADPRO साहब", dpro: "DPRO साहब", ddo: "DDO साहब", resident: "" };
const who = p => !p ? "" : `उपयोगकर्ता: ${p.name} (${p.gender}), पद: ${p.role}, जनपद: ${p.district || ""}, ब्लॉक: ${p.block || ""}, ग्राम पंचायत: ${(p.gps || []).join(", ")}. सम्बोधन: "प्रणाम ${(p.name || "").split(" ")[0]} ${p.gender === "महिला" ? "बहन" : "भैया"} जी" (पद: ${ROLE_CALL[p.role] || ""}). अभिवादन में "नमस्ते" नहीं, हमेशा "प्रणाम".`;
const refBlock = (refs = []) => refs.map(r => `[${r.id}] ${r.title} | ${r.type || ""} | सं. ${r.number || ""} | दिनांक ${r.date || ""}\nअंश: ${(r.excerpt || "").slice(0, 1800)}`).join("\n\n");
const parts = (text, att = []) => { const p = [{ text }];
  for (const a of att.slice(0, 5)) { if (a.text) p.push({ text: `\n[संलग्न Word फ़ाइल: ${a.name}]\n${a.text}` }); else if (a.data) p.push({ inlineData: { mimeType: a.mime, data: a.data } }); }
  return p; };
const lang = p => p && p.lang === "hi" ? "हमेशा शुद्ध हिन्दी (देवनागरी) में उत्तर दें। रोमन हिन्दी कभी नहीं।"
  : "Reply in English by default (keep official Hindi terms like ग्राम पंचायत, शासनादेश where natural); switch to Hindi if the user writes in Hindi or asks.";

const SYS_CHAT = p => `You are "PANCHAYT AI" (पंचायत AI) by TechGaon AI Services — expert assistant for Uttar Pradesh Panchayati Raj officials (Pradhan, Secretary GPA/GVA, ADO Panchayat, BDO, DPRO, ADPRO, DDO, clerks) and villagers.
${who(p)}
Rules:
- ${lang(p)} Start every reply with the greeting/address above.
- Structure: **Short answer** → **Details / possible answer** → **Your side (what to do as per your post, precautions)** → **Basis**.
- Treat the "Reference documents" (original GOs/rules from the connected database) as the primary basis; cite each one you use by its ID in square brackets like [UP-4234]. Do not cite IDs you did not use.
- If not found there, use Google Search for recent info and say it is from the web. Never invent amounts/rates/dates — if unsure, advise checking the latest GO.
- Old GOs may be amended/superseded — warn when relevant. If a PDF/photo/Word file is attached, read it first and answer based on it.`;
const whoDraft = p => !p ? "" : `प्रेषक: ${p.name} (${p.gender}), पद-कोड: ${p.role} (${({pradhan:"ग्राम प्रधान",prashasak:"प्रशासक, ग्राम पंचायत",sahayak:"पंचायत सहायक",gpa:"ग्राम पंचायत अधिकारी",gva:"ग्राम विकास अधिकारी",ado:"सहायक विकास अधिकारी (पंचायत)",bdo:"खण्ड विकास अधिकारी",clerk:"लिपिक",adpro:"सहायक जिला पंचायत राज अधिकारी",dpro:"जिला पंचायत राज अधिकारी",ddo:"जिला विकास अधिकारी",resident:"ग्रामवासी"})[p.role] || ""}), जनपद: ${p.district || ""}, विकास खण्ड: ${p.block || ""}, ग्राम पंचायत: ${(p.gps || []).join(", ")}.`;
const SYS_DRAFT = p => `आप उत्तर प्रदेश शासन के कार्यालयी पत्राचार के विशेषज्ञ हैं। ${whoDraft(p)}
कठोर नियम:
1. पूरा दस्तावेज़ शुद्ध औपचारिक सरकारी हिन्दी (देवनागरी) में। सभी नाम, पदनाम, ग्राम पंचायत, विकास खण्ड, जनपद देवनागरी में लिखें — अंग्रेज़ी/रोमन नामों का हिन्दी लिप्यंतरण करें (जैसे Haidargarh → हैदरगढ़, Kamela → कमेला, Barabanki → बाराबंकी)।
2. कोई अभिवादन, "प्रणाम", "नमस्ते", "भैया", "जी" या उपयोगकर्ता से बातचीत न लिखें; कोई भूमिका/टिप्पणी नहीं — सीधे दस्तावेज़ से आरम्भ करें।
3. केवल HTML (<p>, <b>, <br>, <table>, <ol>, <div style>) लौटाएँ; markdown या \`\`\` नहीं।
4. ढाँचा (इसी क्रम में): <p style="text-align:center"><b>कार्यालय — [प्रेषक का पदनाम], [ग्राम पंचायत/विकास खण्ड], जनपद [जनपद]</b></p> → बाएँ "पत्रांक: ____" और दाएँ "दिनांक: [आज की तिथि]" एक पंक्ति में → "सेवा में," फिर अगली पंक्तियों में प्राप्तकर्ता का पदनाम व कार्यालय पता → "विषय: ..." (बोल्ड) → "सन्दर्भ: ..." (यदि हो) → "महोदय," (महिला प्राप्तकर्ता हो तो "महोदया,") → मुख्य भाग: "उपर्युक्त विषयक ..." से आरम्भ, क्रमबद्ध अनुच्छेद → निवेदन/आदेश वाक्य ("अतः श्रीमान जी से सविनय निवेदन है कि ..." / "अतः आपको निर्देशित किया जाता है कि ...") → दाहिनी ओर: "भवदीय," फिर हस्ताक्षर ____, नाम, पदनाम, कार्यालय → आवश्यक हो तो "प्रतिलिपि: ..." सूची।
5. स्पष्टीकरण में बिंदुवार तथ्य, अभिलेख और नियम का हवाला देकर पक्ष मजबूती से रखें। नोटिस/आदेश में नियम/GO का हवाला व समय-सीमा दें; नोटिस/आदेश में "भवदीय" की जगह केवल हस्ताक्षर-खण्ड।
6. दिए गए संदर्भ GO प्रयोग करें तो संख्या/दिनांक लिखें और अंत में <!--REFS:ID1,ID2--> जोड़ें। संलग्न नोटिस/पत्र हो तो उसके पत्रांक, दिनांक, आरोप बिंदुवार पढ़कर उत्तर बनाएँ। अज्ञात तथ्य ____ छोड़ें, गढ़ें नहीं।`;

const grounding = r => ((r.response.candidates?.[0]?.groundingMetadata?.groundingChunks) || []).map(g => g.web).filter(Boolean).slice(0, 5);

async function chat(b) {
  const hist = (b.history || []).slice(-10), last = hist.pop() || { t: "" };
  const contents = hist.map(m => ({ role: m.r === "u" ? "user" : "model", parts: [{ text: m.t }] }));
  contents.push({ role: "user", parts: parts(`Reference documents (connected GO database):\n${refBlock(b.refs) || "(no match)"}\n\nQuestion: ${last.t}`, b.att) });
  const r = await gen(SYS_CHAT(b.profile), true, { contents });
  const text = r.response.text();
  const refs = [...new Set((text.match(/\[((?:UP|P2|REF|EXT|S)-\d+)\]/g) || []).map(x => x.slice(1, -1)))];
  return { text, refs, web: grounding(r) };
}
async function draft(b) {
  const prompt = `दस्तावेज़ प्रकार: ${b.kind}\nउपयोगकर्ता का अनुरोध (उसी के अनुसार पूरा दस्तावेज़ बनाएँ; प्राप्तकर्ता, विषय, कारण अनुरोध से समझें): ${b.points || "(संलग्न फ़ाइल देखें)"}\nप्रेषक की ग्राम पंचायत: ${b.gp || ""}\nहस्ताक्षर पदनाम: ${(b.profile && b.profile.sign) || ""}\nआज की तिथि: ${new Date().toLocaleDateString("hi-IN")}\n\nसंदर्भ GO:\n${refBlock(b.refs) || "(कोई नहीं)"}`;
  const r = await model(SYS_DRAFT(b.profile), false).generateContent({ contents: [{ role: "user", parts: parts(prompt, b.att) }] });
  let html = r.response.text().replace(/^```html?|```$/gm, "").trim();
  html = html.replace(/^\s*(<p>)?\s*\u092A\u094D\u0930\u0923\u093E\u092E[^<]*(<\/p>|<br>)?/, "");
  html = html.replace(/<p[^>]*>[^<]*(\u092A\u094D\u0930\u0923\u093E\u092E|\u0928\u092E\u0938\u094D\u0924\u0947)[\s\S]*?<\/p>/, "").replace(/^[^<]*(\u092A\u094D\u0930\u0923\u093E\u092E)[^<]*/, "");
  const m = html.match(/<!--REFS:([^>]*)-->/); const refs = m ? m[1].split(",").map(s => s.trim()).filter(Boolean) : [];
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  return { html, refs };
}
// पंचायत न्यूज़ — Google समाचार RSS (निःशुल्क) → Gemini से 60 शब्द का हिन्दी सार (केवल दिए गए पाठ से)
async function news(area) {
  const key = "pai_news3_" + area, c = JSON.parse(localStorage.getItem(key) || "null");
  if (c && Date.now() - c.at < 3 * 3600e3 && c.items.length) return c;
  const q = area === "उत्तर प्रदेश" ? "उत्तर प्रदेश ग्राम पंचायत OR पंचायती राज OR ग्राम प्रधान OR पंचायत सचिव when:7d"
    : `${area} ग्राम पंचायत OR प्रधान OR सचिव OR ब्लॉक when:7d`;
  const rss = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=hi&gl=IN&ceid=IN:hi";
  const j = await (await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(rss))).json();
  const strip = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;/g, " ").replace(/\s+/g, " ").trim();
  let items = (j.items || []).slice(0, 12).map(it => {
    const parts = it.title.split(" - "); const source = parts.length > 1 ? parts.pop() : "";
    return { title: parts.join(" - "), source, url: it.link, img: it.thumbnail || (it.enclosure && it.enclosure.link) || "", date: it.pubDate || "", summary: strip(it.description).slice(0, 300) };
  });
  if (items.length) {
    try {
      const r = await model("आप हिन्दी समाचार संपादक हैं। केवल दिए गए शीर्षक/अंश से ही सार लिखें, नई बात न जोड़ें। केवल JSON array लौटाएँ।", false)
        .generateContent("हर ख़बर का 60-80 शब्द का सरल, जानकारी-भरा हिन्दी सार बनाएँ (क्या, कहाँ, कौन, कब, आगे क्या), उसी क्रम में, JSON array of strings:\n" + JSON.stringify(items.map(i => i.title + " — " + i.summary)));
      const sums = JSON.parse(r.response.text().replace(/^[^\[]*/, "").replace(/[^\]]*$/, ""));
      items = items.map((it, i) => ({ ...it, summary: sums[i] || it.summary }));
    } catch (e) { console.warn("summary", e); }
  }
  const d = { area, items, at: Date.now() }; try { localStorage.setItem(key, JSON.stringify(d)); } catch {} return d;
}
window.PAI_AI = { chat, draft, news };
window.dispatchEvent(new Event("pai-ai-ready"));
