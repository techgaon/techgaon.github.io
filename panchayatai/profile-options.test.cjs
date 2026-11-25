const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const load=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
function setup(){const window={};vm.runInNewContext(load('data/geo.js'),{window});vm.runInNewContext(load('profile-options.js'),{window,firebase:{firestore:{FieldValue:{serverTimestamp:()=>123}}}});return window;}
const roles={resident:{n:'पंचायत निवासी'},rojgar_sevak:{n:'ग्राम रोजगार सेवक'},takniki_sahayak:{n:'तकनीकी सहायक'}};
const admin={email:'surajbhanpandey853@gmail.com',emailVerified:true};
test('all 75 English district labels round trip without changing the legacy file indices',()=>{
  const g=setup().PAI_GEO;assert.equal(g.districts.length,75);assert.equal(g.districts.indexOf('बाराबंकी'),13);
  for(const district of g.districts){const en=g.englishDistrict(district);assert.ok(!/[\u0900-\u097f]/.test(en));assert.equal(g.resolveDistrict(en),district);}
  assert.equal(g.englishDistrict('बाराबंकी'),'Barabanki');assert.equal(g.englishDistrict('KHERI'),'Lakhimpur Kheri');
});
test('disabled roles disappear from new selection while an existing selection is preserved',()=>{
  const api=setup().PAI_PROFILE_OPTIONS,s={disabledRoles:['takniki_sahayak']};
  assert.equal(api.choices(roles,s).some(r=>r.id==='takniki_sahayak'),false);
  const existing=api.choices(roles,s,'takniki_sahayak').find(r=>r.id==='takniki_sahayak');assert.equal(existing.enabled,false);
  assert.equal(api.choices(roles,{}).length,3);
});
test('only verified admin saves role visibility and the settings update is a merge',async()=>{
  const api=setup().PAI_PROFILE_OPTIONS,writes=[],db={collection:n=>({doc:id=>({set:async(data,options)=>writes.push({n,id,data,options})})})};
  await assert.rejects(api.save({db,user:{email:'person@example.test',emailVerified:true},roles,disabledRoles:[]}),/एडमिन/);
  await assert.rejects(api.save({db,user:{...admin,emailVerified:false},roles,disabledRoles:[]}),/एडमिन/);
  await assert.rejects(api.save({db,user:admin,roles,disabledRoles:Object.keys(roles)}),/कम-से-कम/);
  await api.save({db,user:admin,roles,disabledRoles:['takniki_sahayak']});assert.equal(writes.length,1);assert.equal(writes[0].n,'paiSettings');assert.equal(writes[0].id,'public');assert.equal(writes[0].options.merge,true);assert.deepEqual(Object.keys(writes[0].data).sort(),['disabledRoles','roleOptionsUpdatedAt']);
});
test('both added roles and edited Hindi locations are retained in drafting context',async()=>{
  const {pathToFileURL}=require('node:url');const core=await import(pathToFileURL(path.join(__dirname,'drafting-core.mjs')).href);
  for(const [id,label]of [['rojgar_sevak','ग्राम रोजगार सेवक'],['takniki_sahayak','तकनीकी सहायक']]){
    const c=core.context({profile:{role:id,district:'बाराबंकी',districtHindi:'बाराबंकी जनपद',block:'Haidargarh',blockHindi:'हैदरगढ़ विकास खण्ड'}});
    assert.equal(c.role,label);assert.equal(c.district,'बाराबंकी जनपद');assert.equal(c.block,'हैदरगढ़ विकास खण्ड');
  }
});
