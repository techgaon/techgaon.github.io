// techgaon-site/upgpasangh/core.mjs
var districts = "AGRA|ALIGARH|AMBEDKAR NAGAR|AMETHI|AMROHA|AURAIYA|AYODHYA|AZAMGARH|BAGHPAT|BAHRAICH|BALLIA|BALRAMPUR|BANDA|BARABANKI|BAREILLY|BASTI|BHADOHI|BIJNOR|BUDAUN|BULANDSHAHR|CHANDAULI|CHITRAKOOT|DEORIA|ETAH|ETAWAH|FARRUKHABAD|FATEHPUR|FIROZABAD|GAUTAM BUDDHA NAGAR|GHAZIABAD|GHAZIPUR|GONDA|GORAKHPUR|HAMIRPUR|HAPUR|HARDOI|HATHRAS|JALAUN|JAUNPUR|JHANSI|KANNAUJ|KANPUR DEHAT|KANPUR NAGAR|KASGANJ|KAUSHAMBI|KHERI|KUSHINAGAR|LALITPUR|LUCKNOW|MAHARAJGANJ|MAHOBA|MAINPURI|MATHURA|MAU|MEERUT|MIRZAPUR|MORADABAD|MUZAFFARNAGAR|PILIBHIT|PRATAPGARH|PRAYAGRAJ|RAE BARELI|RAMPUR|SAHARANPUR|SAMBHAL|SANT KABIR NAGAR|SHAHJAHANPUR|SHAMLI|SHRAVASTI|SIDDHARTHNAGAR|SITAPUR|SONBHADRA|SULTANPUR|UNNAO|VARANASI".split("|").sort();
function initialState() {
  return { members: [{ id: "9129203268", name: "\u091A\u0902\u0926\u094D\u0930 \u092D\u093E\u0928\u0941 \u092A\u093E\u0902\u0921\u0947\u092F", parent: "", gender: "\u092A\u0941\u0930\u0941\u0937", district: "BARABANKI", mobile: "9129203268", first: "CHANDRA", demo: true }], officers: [{ id: "state", name: "\u0921\u0949. \u092A\u094D\u0930\u0926\u0940\u092A \u0938\u093F\u0902\u0939", mobile: "9415892666", scope: "state" }, { id: "district-BARABANKI", name: "\u0905\u092D\u092F \u0936\u0941\u0915\u094D\u0932\u093E", mobile: "9415213754", scope: "district", district: "BARABANKI" }], funds: [{ id: "2026-apr", title: "\u0905\u0930\u094D\u0927\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0936\u0941\u0932\u094D\u0915 \xB7 \u0905\u092A\u094D\u0930\u0948\u0932\u2013\u0938\u093F\u0924\u0902\u092C\u0930 2026", amount: 600, scope: "district" }, { id: "2026-oct", title: "\u0905\u0930\u094D\u0927\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0936\u0941\u0932\u094D\u0915 \xB7 \u0905\u0915\u094D\u091F\u0942\u092C\u0930 2026\u2013\u092E\u093E\u0930\u094D\u091A 2027", amount: 600, scope: "district" }], payments: [], messages: [], letters: [], settings: {}, sessions: [], audit: [] };
}
function firstName(name) {
  return String(name).trim().replace(/^(?:(?:श्रीमती|श्रीमान|श्री|सुश्री|कुमारी|श्रीमति|डॉक्टर|डॉ|smt|shrimati|shri|mr|mrs|ms|dr)[.॰\s]+)+/iu, "").trim().split(/\s+/)[0] || "";
}
function password(m) {
  const first = firstName(m.first || m.name).normalize("NFC");
  const chars = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(first), (x) => x.segment) : Array.from(first);
  return chars.slice(0, 4).join("").toUpperCase() + m.mobile.slice(-4);
}
var fail = (s) => {
  throw Error(s);
};
function actor(s, token) {
  const session = s.sessions.find((x) => x.token === token);
  if (!session) fail("\u0915\u0943\u092A\u092F\u093E \u0932\u0949\u0917\u093F\u0928 \u0915\u0930\u0947\u0902\u0964");
  return session;
}
var stateOnly = (a) => {
  if (a.role !== "state") fail("\u0915\u0947\u0935\u0932 \u092A\u094D\u0930\u0926\u0947\u0936 \u092A\u0926\u093E\u0927\u093F\u0915\u093E\u0930\u0940\u0964");
};
var manager = (a, d) => {
  if (!(a.role === "state" || a.role === "district" && a.district === d)) fail("\u0907\u0938 \u091C\u093F\u0932\u0947 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
};
function visible(s, a) {
  const isState = a.role === "state";
  const isMember = a.role === "gpa";
  return { me: a, members: s.members.filter((m) => isState || isMember && m.id === a.id || !isMember && m.district === a.district), officers: s.officers.filter((o) => isState || o.scope === "district" && o.district === a.district).map(({ mobile, ...x }) => isState ? { ...x, mobile } : x), funds: s.funds, payments: s.payments.filter((p) => isState || isMember && p.member === a.id || !isMember && p.district === a.district), messages: s.messages, letters: s.letters.filter((l) => isState || l.sender === a.id), settings: Object.fromEntries(Object.entries(s.settings).filter(([k]) => isState || k === "state" || k === a.district)), audit: isState ? s.audit.slice(-100) : [] };
}
function publicView(s) {
  return { messages: s.messages.filter((x) => x.scope === "state" && x.public), profiles: s.settings.profiles || {}, memberCount: s.members.filter((x) => !x.demo).length };
}
function operation(s, action, p = {}, token = "") {
  if (action === "lookup") {
    const m = s.members.find((x) => x.mobile === p.mobile);
    if (!m) return { registered: false };
    return { registered: true, name: m.name, gender: m.gender, mobile: m.mobile, password: password(m), demo: !!m.demo };
  }
  if (action === "login") {
    let a2;
    if (p.role === "gpa") {
      const m = s.members.find((x) => x.mobile === p.mobile);
      if (!m) fail("\u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u092A\u0902\u091C\u0940\u0915\u0943\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
      if (!(m.demo && p.code === "1234" || p.code === password(m))) fail("\u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0938\u0939\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
      a2 = { id: m.id, name: m.name, role: "gpa", district: m.district };
    } else {
      const o = s.officers.find((x) => x.mobile === p.mobile && x.scope === p.role && (p.role === "state" || x.district === p.district));
      if (!o || p.code !== "1234") fail("\u092A\u0926, \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u092F\u093E OTP \u0938\u0939\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
      a2 = { id: o.id, name: o.name, role: o.scope, district: o.district || "", designation: p.designation || "" };
    }
    const session = { ...a2, token: crypto.randomUUID() };
    s.sessions.push(session);
    return { token: session.token, data: visible(s, session) };
  }
  const a = actor(s, token);
  if (action === "read") return visible(s, a);
  if (action === "logout") {
    s.sessions = s.sessions.filter((x) => x.token !== token);
    return { ok: true };
  }
  if (action === "members") {
    manager(a, p.district);
    if (!districts.includes(p.district)) fail("\u091C\u093F\u0932\u093E \u0938\u0939\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
    if (!Array.isArray(p.rows) || !p.rows.length || p.rows.length > 2e3) fail("1\u20132000 \u0938\u0926\u0938\u094D\u092F \u091C\u094B\u0921\u093C\u0947\u0902\u0964");
    const rows = p.rows.map((r) => {
      const mobile = String(r.mobile || "").replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(mobile) || !String(r.name || "").trim() || !r.gender) fail("\u0928\u093E\u092E, gender \u0914\u0930 10 \u0905\u0902\u0915\u094B\u0902 \u0915\u093E \u092E\u094B\u092C\u093E\u0907\u0932 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964");
      const old = s.members.find((x) => x.mobile === mobile);
      if (old && old.district !== p.district) fail(mobile + " \u092A\u0939\u0932\u0947 \u0926\u0942\u0938\u0930\u0947 \u091C\u093F\u0932\u0947 \u092E\u0947\u0902 \u092A\u0902\u091C\u0940\u0915\u0943\u0924 \u0939\u0948\u0964");
      return { id: mobile, mobile, name: String(r.name).trim(), parent: String(r.parent || ""), gender: r.gender, first: firstName(r.first || r.name), district: p.district };
    });
    if (new Set(rows.map((r) => r.mobile)).size !== rows.length) fail("\u0938\u0942\u091A\u0940 \u092E\u0947\u0902 \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u0926\u094B\u0939\u0930\u093E\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964");
    for (const r of rows) {
      s.members = s.members.filter((x) => x.mobile !== r.mobile);
      s.members.push(r);
    }
  } else if (action === "payment") {
    if (a.role !== "gpa") fail("\u0938\u0926\u0938\u094D\u092F \u0932\u0949\u0917\u093F\u0928 \u0906\u0935\u0936\u094D\u092F\u0915\u0964");
    if (!s.funds.some((f) => f.id === p.fund)) fail("\u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0936\u0941\u0932\u094D\u0915 / \u0938\u0939\u092F\u094B\u0917 \u0930\u093E\u0936\u093F \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940\u0964");
    if (!p.file) fail("\u092D\u0941\u0917\u0924\u093E\u0928 \u092A\u094D\u0930\u092E\u093E\u0923 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902\u0964");
    const old = s.payments.find((x) => x.member === a.id && x.fund === p.fund);
    if (old && old.status !== "rejected") fail("\u092F\u0939 \u092D\u0941\u0917\u0924\u093E\u0928 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092D\u0947\u091C\u093E \u091C\u093E \u091A\u0941\u0915\u093E \u0939\u0948\u0964");
    s.payments = s.payments.filter((x) => x !== old);
    s.payments.push({ id: crypto.randomUUID(), member: a.id, district: a.district, fund: p.fund, file: p.file, status: "submitted", date: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (action === "verify") {
    const pay = s.payments.find((x) => x.id === p.id);
    if (!pay) fail("\u092D\u0941\u0917\u0924\u093E\u0928 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964");
    manager(a, pay.district);
    const fund = s.funds.find((x) => x.id === pay.fund);
    if (a.role === "state" && fund.scope !== "state") fail("\u091C\u093F\u0932\u093E \u0938\u0926\u0938\u094D\u092F\u0924\u093E \u0936\u0941\u0932\u094D\u0915 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u091C\u093F\u0932\u093E\u0927\u094D\u092F\u0915\u094D\u0937 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902\u0917\u0947\u0964");
    if (!["verified", "rejected"].includes(p.status)) fail("\u0938\u094D\u0925\u093F\u0924\u093F \u0917\u0932\u0924 \u0939\u0948\u0964");
    pay.status = p.status;
    pay.verifiedBy = a.name;
    pay.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    pay.reason = String(p.reason || "");
  } else if (action === "fund") {
    stateOnly(a);
    if (!p.title || !Number.isFinite(Number(p.amount)) || Number(p.amount) <= 0) fail("\u0936\u0940\u0930\u094D\u0937\u0915 \u0914\u0930 \u0938\u0939\u0940 \u0930\u093E\u0936\u093F \u0926\u0947\u0902\u0964");
    s.funds.push({ id: crypto.randomUUID(), title: String(p.title), amount: Number(p.amount), scope: "state", description: String(p.description || ""), date: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (action === "settings") {
    if (p.key === "profiles" || p.key === "state") stateOnly(a);
    else manager(a, p.key);
    if (!["state", "profiles", ...districts].includes(p.key)) fail("\u0917\u0932\u0924 setting\u0964");
    s.settings[p.key] = { ...s.settings[p.key] || {}, ...p.value };
  } else if (action === "message") {
    if (a.role === "gpa") fail("\u092A\u0926\u093E\u0927\u093F\u0915\u093E\u0930\u0940 \u0932\u0949\u0917\u093F\u0928 \u0906\u0935\u0936\u094D\u092F\u0915\u0964");
    if (!String(p.text || "").trim()) fail("\u0938\u0902\u0926\u0947\u0936 \u0932\u093F\u0916\u0947\u0902\u0964");
    s.messages.unshift({ id: crypto.randomUUID(), text: String(p.text).slice(0, 3e3), author: a.name, scope: a.role, district: a.district, public: a.role === "state" && !!p.public, date: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (action === "letter") {
    if (!p.title || !p.file) fail("\u0935\u093F\u0937\u092F \u0914\u0930 \u092A\u0924\u094D\u0930 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902\u0964");
    s.letters.unshift({ id: crypto.randomUUID(), title: String(p.title), text: String(p.text || ""), file: p.file, sender: a.id, author: a.name, district: a.district, date: (/* @__PURE__ */ new Date()).toISOString(), status: "sent" });
  } else if (action === "officer") {
    stateOnly(a);
    if (!districts.includes(p.district) || !p.name || !/^[6-9]\d{9}$/.test(p.mobile)) fail("\u0928\u093E\u092E, \u091C\u093F\u0932\u093E \u0914\u0930 \u092E\u094B\u092C\u093E\u0907\u0932 \u0938\u0939\u0940 \u092D\u0930\u0947\u0902\u0964");
    const id = "district-" + p.district;
    s.officers = s.officers.filter((x) => x.id !== id);
    s.officers.push({ id, name: p.name, mobile: p.mobile, scope: "district", district: p.district });
    s.sessions = s.sessions.filter((x) => x.id !== id);
  } else fail("\u0905\u092E\u093E\u0928\u094D\u092F \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908\u0964");
  s.audit.push({ action, by: a.id, date: (/* @__PURE__ */ new Date()).toISOString() });
  return visible(s, a);
}

// techgaon-site/upgpasangh/server/d1-worker.mjs
var MAX = 8 * 1024 * 1024;
function cors(req) {
  const o = req.headers.get("Origin");
  return { "Access-Control-Allow-Origin": ["https://techgaon.in", "http://localhost:8093"].includes(o) ? o : "https://techgaon.in", "Access-Control-Allow-Headers": "Content-Type,Authorization,X-File-Name", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" };
}
async function init(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS sangh_head (id INTEGER PRIMARY KEY, revision TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sangh_chunks (revision TEXT NOT NULL, seq INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(revision,seq)); CREATE TABLE IF NOT EXISTS sangh_files (id TEXT PRIMARY KEY, owner TEXT NOT NULL, district TEXT, size INTEGER, type TEXT, name TEXT); CREATE TABLE IF NOT EXISTS sangh_file_chunks (id TEXT NOT NULL, seq INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(id,seq)); CREATE TABLE IF NOT EXISTS sangh_rate (key TEXT PRIMARY KEY, count INTEGER, updated INTEGER);");
  const row = await db.prepare("SELECT revision FROM sangh_head WHERE id=1").first();
  if (!row) {
    const seed = JSON.stringify(initialState());
    await db.batch([db.prepare("INSERT OR IGNORE INTO sangh_chunks(revision,seq,value) VALUES('seed',0,?)").bind(seed), db.prepare("INSERT OR IGNORE INTO sangh_head(id,revision) VALUES(1,'seed')")]);
  }
}
async function read(db) {
  const { results } = await db.prepare("SELECT h.revision,c.seq,c.value FROM sangh_head h JOIN sangh_chunks c ON h.revision=c.revision WHERE h.id=1 ORDER BY c.seq").all();
  if (!results.length) throw Error("Database is initializing. Try again.");
  return { revision: results[0].revision, state: JSON.parse(results.map((r) => r.value).join("")) };
}
async function save(db, old, state) {
  const revision = crypto.randomUUID(), s = JSON.stringify(state), queries = [];
  for (let i = 0; i < s.length; i += 8e4) queries.push(db.prepare("INSERT INTO sangh_chunks(revision,seq,value) VALUES(?,?,?)").bind(revision, i / 8e4, s.slice(i, i + 8e4)));
  queries.push(db.prepare("UPDATE sangh_head SET revision=? WHERE id=1 AND revision=?").bind(revision, old));
  const rs = await db.batch(queries);
  if (!rs.at(-1).meta.changes) {
    await db.prepare("DELETE FROM sangh_chunks WHERE revision=?").bind(revision).run();
    return false;
  }
  await db.prepare("DELETE FROM sangh_chunks WHERE revision=?").bind(old).run();
  return true;
}
async function throttle(db, req) {
  const now = Math.floor(Date.now() / 6e4), key = (req.headers.get("CF-Connecting-IP") || "local") + ":" + now;
  await db.prepare("INSERT INTO sangh_rate(key,count,updated) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").bind(key, now).run();
  const r = await db.prepare("SELECT count FROM sangh_rate WHERE key=?").bind(key).first();
  if (r.count > 30) throw Error("\u0905\u092D\u0940 \u092C\u0939\u0941\u0924 \u092A\u094D\u0930\u092F\u093E\u0938 \u0939\u0941\u090F \u0939\u0948\u0902\u0964 1 \u092E\u093F\u0928\u091F \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964");
  if (Math.random() < 0.02) await db.prepare("DELETE FROM sangh_rate WHERE updated<?").bind(now - 2).run();
}
var d1_worker_default = { async fetch(req, env) {
  const h = cors(req), json = (x, status = 200) => Response.json(x, { status, headers: h });
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  try {
    const db = env.DB;
    if (!db) throw Error("Database binding is not configured.");
    await init(db);
    const u = new URL(req.url), token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    let { state } = await read(db);
    if (u.pathname === "/public") return json(publicView(state));
    if (u.pathname === "/file" && req.method === "POST") {
      const a = actor(state, token), b = await req.arrayBuffer(), mime = req.headers.get("Content-Type") || "";
      if (b.byteLength > MAX) throw Error("\u0905\u0927\u093F\u0915\u0924\u092E 8 MB \u092B\u093E\u0907\u0932\u0964");
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.ms-excel"].includes(mime)) throw Error("JPG, PNG, WEBP, PDF \u092F\u093E Excel \u091A\u0941\u0928\u0947\u0902\u0964");
      const id = crypto.randomUUID(), qs = [db.prepare("INSERT INTO sangh_files(id,owner,district,size,type,name) VALUES(?,?,?,?,?,?)").bind(id, a.id, a.district, b.byteLength, mime, decodeURIComponent(req.headers.get("X-File-Name") || "file"))];
      for (let i = 0; i < b.byteLength; i += 128e3) qs.push(db.prepare("INSERT INTO sangh_file_chunks(id,seq,data) VALUES(?,?,?)").bind(id, i / 128e3, b.slice(i, i + 128e3)));
      await db.batch(qs);
      return json({ id });
    }
    if (u.pathname.startsWith("/file/")) {
      const id = u.pathname.split("/")[2], meta = await db.prepare("SELECT * FROM sangh_files WHERE id=?").bind(id).first();
      if (!meta) return json({ error: "Not found" }, 404);
      let allowed = false;
      try {
        const a = actor(state, token), v = visible(state, a);
        allowed = a.role === "state" || meta.owner === a.id || v.payments.some((x) => x.file === id) || v.letters.some((x) => x.file === id) || Object.values(v.settings).some((x) => [x.qr, x.presidentPhoto, x.secretaryPhoto].includes(id));
      } catch {
      }
      const p = state.settings.profiles || {};
      if ([p.presidentPhoto, p.secretaryPhoto].includes(id)) allowed = true;
      if (!allowed) throw Error("\u092B\u093E\u0907\u0932 \u0926\u0947\u0916\u0928\u0947 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964");
      const { results } = await db.prepare("SELECT data FROM sangh_file_chunks WHERE id=? ORDER BY seq").bind(id).all();
      return new Response(new Blob(results.map((r) => new Uint8Array(r.data)), { type: meta.type }), { headers: { ...h, "Content-Type": meta.type, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
    }
    if (u.pathname === "/op" && req.method === "POST") {
      const p = await req.json();
      if (["lookup", "login"].includes(p.action)) await throttle(db, req);
      for (let tries = 0; tries < 4; tries++) {
        const snapshot = await read(db);
        state = snapshot.state;
        const result = operation(state, p.action, p.payload, token);
        if (["read", "lookup"].includes(p.action) || await save(db, snapshot.revision, state)) return json(result);
      }
      throw Error("\u0905\u0928\u094D\u092F \u092C\u0926\u0932\u093E\u0935 \u0938\u0939\u0947\u091C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948\u0964 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964");
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message }, 400);
  }
} };
export {
  d1_worker_default as default
};
