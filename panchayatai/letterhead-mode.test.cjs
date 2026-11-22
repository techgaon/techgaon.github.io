const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const sandbox={window:{},console};
vm.runInNewContext(fs.readFileSync(__dirname+"/letterhead.js","utf8"),sandbox);
const L=sandbox.window.PAI_LETTERHEAD;
const pradhan={role:"pradhan",letterhead:{type:"created",name:"ग्राम प्रधान"}};
test("Roman Hindi GP office instructions always choose plain A4 instead of personal header",()=>{
 for(const request of [
   "gp thalwara karyalay ki taraf se bdo ko patra banao",
   "gp karyalay ki taraf se patra banaye",
   "gram panchayat thalwara karyalay ki taraf se",
   "gp thalwara office se bdo ko patra",
   "ग्राम पंचायत थलवारा कार्यालय की ओर से पत्र"
 ])assert.equal(L.mode(pradhan,request,"पत्र"),"gp_office",request);
});
test("Pradhan letterhead is used only when explicitly requested",()=>{
 assert.equal(L.mode(pradhan,"मेरे लेटरहेड पर BDO को पत्र बनाओ","पत्र"),"pradhan_letterhead");
 assert.equal(L.mode(pradhan,"प्रधान के रूप में BDO को सामान्य पत्र बनाओ","पत्र"),"plain");
 assert.equal(L.mode({role:"gpa",letterhead:pradhan.letterhead},"gp karyalay se patra","पत्र"),"plain");
});

test("Secretary ordinary vs explicit GP-office stationery",()=>{
 for(const role of ["gpa","gva","pradhan","prashasak"]){
  const user={...pradhan,role};
  assert.equal(L.mode(user,"ग्राम पंचायत कार्यालय की ओर से ADO को पत्र","पत्र"),"gp_office",role);
  assert.equal(L.mode(user,"sachiv ko ADO ke liye samanya patra","पत्र"),"plain",role);
  assert.equal(L.mode(user,"sade A4 par ADO ko patra","पत्र"),"plain",role);
 }
});
