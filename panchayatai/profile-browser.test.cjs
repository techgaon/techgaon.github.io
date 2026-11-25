/* Local real-form test: no production login, profile or settings writes. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1123-915-0_26.1123.915.0_arm64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../panchayat-cashbook-release/release');
const source=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const roles=source.slice(source.indexOf('const ROLES = {'),source.indexOf('\n};',source.indexOf('const ROLES = {'))+3);
const functions=source.slice(source.indexOf('const geoCache = {};'),source.indexOf('/* ---------- फ़ाइल संलग्न:',source.indexOf('const geoCache = {};')));
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/profile-fixture'){
    res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="hi"><head><meta charset="utf-8"><base href="/panchayatai/"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="theme.css"><style>body{font-family:"Nirmala UI",sans-serif;max-width:960px;margin:auto}#profile,#roles{padding:16px}label,input,select{box-sizing:border-box}input,select{max-width:100%}</style></head><body><main id="profile"></main><aside id="roles"></aside><p id="toast"></p><script src="data/geo.js"></script><script src="hindi-profile.js"></script><script src="profile-options.js"></script></body></html>');
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/json');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1000,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/profile-fixture');
    await page.evaluate(({roles,functions})=>{
      const setup=new Function('window',`
        ${roles}
        const G=window.PAI_GEO,$=(s,r=document)=>r.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        let liveSettings={plans:[{id:'existing-plan'}],disabledRoles:[]};
        const S={user:{uid:'profile-test',email:'test@example.test',displayName:'Test Person'},profile:{uid:'profile-test',role:'pradhan',name:'Test Person',nameHindi:'परीक्षण प्रधान',phone:'9876543210',district:'BARABANKI',districtHindi:'बाराबंकी जनपद',block:'Haidergarh',blockHindi:'हैदरगढ़',gps:['कमेला'],gpsHindi:{'कमेला':'कमेला गाँव'},profileComplete:true},after:null};
        const LS={get:()=>true,set:()=>true},toast=m=>{window.lastToast=m;document.querySelector('#toast').textContent=m;},go=v=>{window.lastView=v;},saveProfile=async()=>{window.savedProfile=structuredClone(S.profile);};
        ${functions}
        window.testProfile=()=>structuredClone(S.profile);
        window.mountProfile=()=>profile(document.querySelector('#profile'));
        window.testSetRoles=ids=>{liveSettings={...liveSettings,disabledRoles:ids};S.profileRoleRefresh?.();};
        window.testRoleSettings=()=>structuredClone(liveSettings);
        window.firebase={firestore:{FieldValue:{serverTimestamp:()=>123}}};
        const db={collection:name=>({doc:id=>({get:async()=>({data:()=>liveSettings}),set:async(data,options)=>{if(!options.merge)throw Error('Must merge');liveSettings={...liveSettings,...data};}})})};
        window.mountAdminRoles=()=>window.PAI_PROFILE_OPTIONS.mount(document.querySelector('#roles'),{db,user:{email:'surajbhanpandey853@gmail.com',emailVerified:true},roles:ROLES,onSaved:ids=>{window.testSetRoles(ids);}});
        window.testReloadProfile=()=>{S.profile=structuredClone(window.savedProfile);window.mountProfile();};
        window.mountProfile();
      `);setup(window);
    },{roles,functions});
    await page.locator('#aGp').waitFor();
    const english=async selector=>{const texts=await page.locator(selector+' option').evaluateAll(els=>els.filter(x=>x.value).map(x=>x.textContent));assert.ok(texts.length);assert.ok(texts.every(x=>!/[\u0900-\u097f]/.test(x)));};
    await english('#aDist');await english('#aBlock');await english('#aGp');
    assert.equal(await page.locator('#aDist').inputValue(),'बाराबंकी');assert.equal(await page.locator('#aBlock').inputValue(),'Haidargarh');assert.equal(await page.locator('#aGp').inputValue(),'Kamela');
    assert.equal(await page.locator('#aDistHindi').inputValue(),'बाराबंकी जनपद');assert.equal(await page.locator('#aGpHindi').inputValue(),'कमेला गाँव');
    await page.locator('#aTeh').fill('Haidargarh');await page.locator('#aTeh').dispatchEvent('change');await page.locator('#aTehHindi').waitFor();assert.equal(await page.locator('#aTehHindi').inputValue(),'हैदरगढ़');
    await page.locator('#aTehHindi').fill('हैदरगढ़ तहसील');await page.locator('#aBlockHindi').fill('हैदरगढ़ विकास खण्ड');await page.locator('#aGpHindi').fill('कमेला पंचायत');await page.locator('#aDistHindi').fill('बाराबंकी');
    await page.locator('#pSuggestHindi').click();await page.getByText('सुझाव आ गए हैं। हिंदी वर्तनी जाँचें; गलत हो तो यहीं सुधारकर Save करें।',{exact:true}).waitFor();
    assert.equal(await page.locator('#aGpHindi').inputValue(),'कमेला पंचायत');assert.equal(await page.locator('#aBlockHindi').inputValue(),'हैदरगढ़ विकास खण्ड');await english('#aBlock');await english('#aGp');
    await page.locator('#pSave').click();let saved=await page.evaluate(()=>savedProfile);assert.equal(saved.gps[0],'Kamela');assert.equal(saved.gpsHindi.Kamela,'कमेला पंचायत');assert.equal(saved.districtEnglish,'Barabanki');assert.equal(saved.districtHindi,'बाराबंकी');assert.equal(saved.tehsilHindi,'हैदरगढ़ तहसील');assert.equal(saved.blockHindi,'हैदरगढ़ विकास खण्ड');
    await page.evaluate(()=>testReloadProfile());await page.locator('#aGpHindi').waitFor();assert.equal(await page.locator('#aGpHindi').inputValue(),'कमेला पंचायत');
    await page.screenshot({path:path.join(out,'previews/13-profile-english-hindi.png'),fullPage:true});
    await page.locator('#pRole').selectOption('takniki_sahayak');await page.locator('#aClusterSelect').waitFor();await english('#aClusterSelect');await english('#aGpAdd');
    await page.locator('#aClusterSelect').selectOption('Kamela');await page.locator('#aClusterBtn').click();await page.locator('#aGpAdd').selectOption('Khanpur');
    await page.locator('[data-hindi-gp="Khanpur"]').fill('खानपुर पंचायत');await page.locator('#pSave').click();saved=await page.evaluate(()=>savedProfile);assert.equal(saved.role,'takniki_sahayak');assert.deepEqual(saved.clusters,['Kamela']);assert.ok(saved.gps.includes('Khanpur'));assert.equal(saved.gpsHindi.Khanpur,'खानपुर पंचायत');
    await page.evaluate(()=>testReloadProfile());await page.locator('#aClusterSelect').waitFor();
    await page.evaluate(()=>mountAdminRoles());await page.locator('[data-role-show="takniki_sahayak"]').waitFor();
    await page.locator('[data-role-show="takniki_sahayak"]').uncheck();await page.locator('[data-role-save]').click();await page.getByText('पदों की सूची सेव हो गई है।',{exact:true}).waitFor();
    assert.equal((await page.evaluate(()=>testRoleSettings())).plans[0].id,'existing-plan');
    assert.equal(await page.locator('#pRole option[value="takniki_sahayak"]').getAttribute('disabled'),'');
    await page.locator('#pSave').click();assert.equal((await page.evaluate(()=>savedProfile)).role,'takniki_sahayak');
    await page.evaluate(()=>testReloadProfile());await page.locator('#aClusterSelect').waitFor();
    await page.locator('#pRole').selectOption('rojgar_sevak');await page.locator('#aGp').waitFor();await page.locator('#pSave').click();saved=await page.evaluate(()=>savedProfile);assert.equal(saved.role,'rojgar_sevak');
    await page.evaluate(()=>testReloadProfile());await page.locator('#aGp').waitFor();assert.equal(await page.locator('#pRole option[value="takniki_sahayak"]').count(),0);
    await page.locator('[data-role-show="takniki_sahayak"]').check();await page.locator('[data-role-save]').click();await page.getByText('पदों की सूची सेव हो गई है।',{exact:true}).waitFor();assert.equal(await page.locator('#pRole option[value="takniki_sahayak"]').count(),1);
    await page.locator('#pRole').selectOption('takniki_sahayak');await page.locator('#aClusterSelect').waitFor();
    await page.locator('[data-role-show="takniki_sahayak"]').uncheck();await page.locator('[data-role-save]').click();await page.getByText('पदों की सूची सेव हो गई है।',{exact:true}).waitFor();
    await page.locator('#pSave').click();assert.equal(await page.locator('#toast').innerText(),'यह पद अभी नए चयन के लिए बंद है। दूसरा पद चुनें।');
    await page.locator('[data-role-show="takniki_sahayak"]').check();await page.locator('[data-role-save]').click();await page.getByText('पदों की सूची सेव हो गई है।',{exact:true}).waitFor();
    await page.screenshot({path:path.join(out,'previews/14-admin-role-visibility.png'),fullPage:true});
    assert.deepEqual(errors,[]);const report={passed:true,checks:['English district/block/GP options; canonical IDs unchanged','legacy Hindi GP restore and custom spellings retained','editable state/district/tehsil/block/GP Hindi fields','automatic suggestions preserve edits and English option labels','profile save/reload Hindi mappings','technical assistant multiple GPs and cluster','employment servant single GP','admin role off/on without overwriting plans','disabled new assignment blocked; other form values preserved','no browser errors']};fs.writeFileSync(path.join(out,'profile-options-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
