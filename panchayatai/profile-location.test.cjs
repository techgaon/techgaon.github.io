/* node --test panchayatai/profile-location.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const load=p=>fs.readFileSync(path.join(__dirname,p),"utf8");
function setup(){
 const store=new Map();
 const window={};
 const context={window,localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},console};
 vm.runInNewContext(load("data/geo.js"),context,{filename:"data/geo.js"});
 vm.runInNewContext(load("hindi-profile.js"),context,{filename:"hindi-profile.js"});
 return {G:window.PAI_GEO,H:window.PAI_HINDI};
}
test("75 Hindi districts keep stable geo file indices",()=>{
 const {G}=setup();
 assert.equal(G.districts.length,75);
 assert.equal(G.districts.indexOf("आगरा"),0);
 assert.equal(G.districts.indexOf("बाराबंकी"),13);
 assert.equal(G.districts.indexOf("वाराणसी"),74);
 assert.equal(G.resolveDistrict("BARABANKI"),"बाराबंकी");
 assert.equal(G.resolveDistrict("Barabanki"),"बाराबंकी");
 assert.equal(G.resolveDistrict("PRAYAGRAJ"),"प्रयागराज");
 assert.equal(G.resolveDistrict("ALLAHABAD"),"प्रयागराज");
 assert.equal(G.resolveDistrict("Sant Ravidas Nagar"),"भदोही");
 assert.equal(G.resolveDistrict("Lakhimpur Kheri"),"लखीमपुर खीरी");
 assert.equal(G.resolveDistrict("not a district"),"");
});
test("Haidargarh block and Kamela/Khanpur/Sandva remain selectable using Hindi or older names",()=>{
 const {G,H}=setup();
 const data=JSON.parse(load("data/geo/13.json"));
 const blocks=Object.keys(data.blocks);
 assert.equal(G.matchPlace(blocks,"HAIDARGARH"),"Haidargarh");
 assert.equal(G.matchPlace(blocks,"Haidergarh"),"Haidargarh");
 assert.equal(G.matchPlace(blocks,"हैदरगढ़"),"Haidargarh");
 const gps=data.blocks.Haidargarh;
 assert.ok(gps.length>50);
 assert.equal(G.matchPlace(gps,"कमेला"),"Kamela");
 assert.equal(G.matchPlace(gps,"KHANPUR"),"Khanpur");
 assert.equal(G.matchPlace(gps,"Sandwa"),"Sandva");
 assert.equal(G.matchPlace(gps,"संडवा"),"Sandva");
 assert.equal(H.label("Haidargarh"),"हैदरगढ़");
 assert.equal(H.label("Kamela"),"कमेला");
});
test("Profile retains up to 3 clusters and 25 GPs, uses Hindi labels and offers reload",()=>{
 const app=load("app.js");
 assert.match(app,/अधिकतम 3 Cluster/);
 assert.match(app,/अधिकतम 25/);
 assert.match(app,/G\.resolveDistrict\?\.\(p\.district,p\.districtHindi\)/);
 assert.match(app,/G\.matchPlace\?\.\(availableGpNames,name,st\.gpsHindi\)/);
 assert.doesNotMatch(app,/st\.clusters=st\.clusters\.filter\(name=>availableGpNames\.includes\(name\)\)/);
 assert.match(app,/आपका पद चुनें/);
 assert.match(app,/तहसील \(वैकल्पिक\)/);
 assert.match(app,/id="aGeoRetry"/);
});
