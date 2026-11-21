const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

function load(){
  const store=new Map();
  const sandbox={window:{},console,
    localStorage:{
      getItem:k=>store.get(k)||null,
      setItem:(k,v)=>store.set(k,String(v))
    }};
  vm.runInNewContext(fs.readFileSync(__dirname+"/hindi-profile.js","utf8"),sandbox);
  return sandbox.window.PAI_HINDI;
}
test("known Roman block and GP names display editable Hindi spellings",()=>{
  const h=load();
  assert.equal(h.guess("Thalwara"),"थलवारा");
  assert.equal(h.guess("Kamela"),"कमेला");
  assert.equal(h.guess("Haidargarh"),"हैदरगढ़");
  assert.equal(h.label("Thalwara",{Thalwara:"थलवरा"}),"थलवरा");
});
test("Google person names can be suggested before Profile completion",()=>{
  const h=load();
  assert.equal(h.guess("Chandra Bhanu Pandey"),"चंद्र भानु पांडेय");
  assert.ok(h.canUseHindi("पंकज कुमार"));
  assert.ok(!h.canUseHindi("Pankaj Kumar"));
});
test("Automatic suggestions fall back without requiring AI or internet",async()=>{
  const h=load(),data=await h.suggest(["Thalwara","Kamela"]);
  assert.equal(data.Thalwara,"थलवारा");
  assert.equal(data.Kamela,"कमेला");
});
