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
test("Personal Pradhan letter uses only their own saved letterhead",()=>{
 assert.equal(L.mode(pradhan,"प्रधान के रूप में BDO को पत्र बनाओ","पत्र"),"pradhan_letterhead");
 assert.equal(L.mode({role:"gpa",letterhead:pradhan.letterhead},"gp karyalay se patra","पत्र"),"plain");
});
