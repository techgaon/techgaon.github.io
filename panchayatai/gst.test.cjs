/* node --test panchayatai/gst.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
function gst(){
 const window={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"gst.js"),"utf8"),{window},{
  filename:"gst.js",timeout:3000
 });
 return window.PAI_GST;
}
test("known checksum-valid GSTIN examples decode correctly",()=>{
 const api=gst();
 const one=api.decode("27AAPFU0939F1ZV");
 assert.equal(one.valid,true);
 assert.equal(one.state,"Maharashtra");
 assert.equal(one.pan,"AAPFU0939F");
 assert.equal(api.decode("27AAACR5055K1Z7").valid,true);
});
test("checksum mismatch and wrong reserved character are rejected",()=>{
 const api=gst();
 assert.equal(api.decode("29ABCDE1234F1Z5").valid,false);
 assert.equal(api.decode("27AAPFU0939F1XV").valid,false);
 assert.equal(api.decode("27AAPFU0939F1Z").valid,false);
});
test("OCR candidate scan returns genuine GSTINs from invoice text",()=>{
 const api=gst();
 const found=api.findGstins("GSTIN: 27AAPFU0939F1ZV\nTotal: 118\nBuyer GSTIN 27AAACR5055K1Z7");
 assert.deepEqual([...found].sort(),["27AAACR5055K1Z7","27AAPFU0939F1ZV"]);
});
test("GST exclusive, inclusive and inter-state computations",()=>{
 const api=gst();
 assert.deepEqual(JSON.parse(JSON.stringify(api.calculate(100,18,"add","intra"))),
  {base:100,total:118,gst:18,cgst:9,sgst:9,igst:0});
 assert.deepEqual(JSON.parse(JSON.stringify(api.calculate(118,18,"remove","inter"))),
  {base:100,total:118,gst:18,cgst:0,sgst:0,igst:18});
 assert.equal(api.calculate(100,0,"add","intra").gst,0);
 assert.equal(api.calculate(100,NaN,"add","intra"),null);
});
test("cent-wise rounded GST parts always reconcile",()=>{
 const api=gst();
 for(const amount of [0,0.01,1,10.17,104.23,9999.99]){
  for(const rate of [0,0.25,1.5,3,5,18,40]){
   for(const mode of ["add","remove"]){
    const r=api.calculate(amount,rate,mode,"intra");
    assert.ok(Math.abs(r.base+r.gst-r.total)<0.00001);
    assert.ok(Math.abs(r.cgst+r.sgst-r.gst)<0.00001);
   }
  }
 }
});
