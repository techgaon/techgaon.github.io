/* Run with: node --test panchayatai/go-search.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"go-search.js"),"utf8");
function setup(catalog){
  const window={};
  const fetch=async location=>({ok:true,json:async()=>String(location).includes("go-index")?catalog:[]});
  vm.runInNewContext(source,{window,fetch,document:{baseURI:"https://techgaon.in/panchayatai/"},URL},{filename:"go-search.js"});
  return window.PAI_GO_SEARCH;
}
const docs=[
  {id:"go-sahayak",title:"पंचायत सहायक नियुक्ति संबंधी शासनादेश",department:"पंचायतीराज",officialNumber:"123/2026",file:"sahayak.pdf"},
  {id:"go-pradhan",title:"ग्राम प्रधान के अधिकार",department:"पंचायतीराज",officialNumber:"456/2026",file:"pradhan.pdf"},
  {id:"notes",title:"UPPCS Preliminary Exam Notes",url:"javascript:alert(1)"}
];
test("Roman Hindi and Devanagari return the relevant original government order",async()=>{
  const api=setup(docs);await api.load();
  assert.deepEqual([...api.search("panchayt sahayak niyukti ka go do").map(x=>x.id)],["go-sahayak"]);
  assert.deepEqual([...api.search("पंचायत सहायक नियुक्ति का GO दो").map(x=>x.id)],["go-sahayak"]);
  assert.deepEqual([...api.search("gram pradhan adhikar ka go dikhao").map(x=>x.id)],["go-pradhan"]);
});
test("GO number retrieval and safe URL validation",async()=>{
  const api=setup(docs);await api.load();
  assert.deepEqual([...api.search("GO 123/2026 डाउनलोड").map(x=>x.id)],["go-sahayak"]);
  assert.equal(api.search("UPPCS Preliminary Exam Notes").length,0);
});
test("chat routes direct GO lookup without treating explanation or drafting as download",()=>{
  const api=setup(docs);
  assert.equal(api.isGoLookup("पंचायत सहायक नियुक्ति का GO दो"),true);
  assert.equal(api.isGoLookup("panchayt sahayak niyukti ka go do"),true);
  assert.equal(api.isGoLookup("GO 123/2026 डाउनलोड"),true);
  assert.equal(api.isGoLookup("इस GO के अनुसार मुझे क्या करना चाहिए"),false);
  assert.equal(api.isGoLookup("शासनादेश के आधार पर पत्र बनाओ"),false);
});
test("empty catalog returns no invented orders",async()=>{
  const api=setup([]);await api.load();
  assert.deepEqual([...api.search("पंचायत सहायक नियुक्ति का GO दो")],[]);
  assert.equal(api.chatResultsHtml(["fake"]), "");
});
test("directory traversal and unsafe links cannot appear",async()=>{
  const api=setup([{id:"bad",title:"शासनादेश",file:"../../secret.pdf"},{id:"bad2",title:"शासनादेश",url:"http://example.com/file.pdf"}]);
  await api.load();
  assert.equal(api.search("शासनादेश").length,0);
});
