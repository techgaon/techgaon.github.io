/* Run: node --test panchayatai/gst-ui.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const code=file=>fs.readFileSync(path.join(__dirname,file),"utf8");
function api(){
 const window={};
 vm.runInNewContext(code("gst-rates.js"),{window},{filename:"gst-rates.js"});
 vm.runInNewContext(code("gst.js"),{window},{filename:"gst.js"});
 return window;
}
test("both GST screens and source-backed catalog are available",()=>{
 const w=api();
 assert.equal(typeof w.PAI_GST.mountCalc,"function");
 assert.equal(typeof w.PAI_GST.mountRates,"function");
 assert.equal(typeof w.PAI_GST.mountCalculator,"function");
 assert.ok(w.PAI_GST_RATES.length>=20);
 const unique=[...new Set(w.PAI_GST_RATES.map(item=>item.id))];
 assert.equal(unique.length,w.PAI_GST_RATES.length);
});
test("uncertain rate categories do not invent GST",()=>{
 const w=api();
 const uncertain=w.PAI_GST_RATES.filter(x=>x.group==="विशेष जाँच");
 assert.ok(uncertain.length>=3);
 assert.ok(uncertain.every(x=>x.rate===null));
});
test("selected brick scheme and cement reference rates have meaningful details",()=>{
 const items=api().PAI_GST_RATES;
 const cement=items.find(x=>x.id==="cement");
 assert.equal(cement.rate,18);
 const bricks=items.filter(x=>x.id.startsWith("bricks-"));
 assert.deepEqual([...bricks.map(x=>x.rate)].sort((a,b)=>a-b),[6,12]);
 assert.ok(bricks.every(x=>x.note.includes("ITC")));
});
test("only valid calculator rates can be used",()=>{
 const calc=api().PAI_GST.calculate;
 assert.equal(calc(118,18,"remove","intra").base,100);
 assert.equal(calc(100,5,"add","inter").total,105);
 assert.equal(calc(100,-3,"add","intra"),null);
 assert.equal(calc(100,NaN,"add","intra"),null);
});
test("calculator has WhatsApp link, Copy and English messages with no bottom note",()=>{
 const source=code("gst.js");
 assert.ok(source.includes("WhatsApp Share"));
 assert.ok(source.includes("wa.me/?text="));
 assert.ok(source.includes("📋 Copy"));
 assert.ok(source.includes("Enter an amount to see the result."));
 assert.ok(!source.includes("[0,0.25,1.5,3,5,18,40]"));
 assert.ok(source.includes("GST दरें जानें"));
 assert.ok(source.includes("ईंट, गिट्टी, मौरंग"));
});
