// Run with node --test; integration requires firebase, @firebase/rules-unit-testing,
// jsdom and FIRESTORE_EMULATOR_HOST (use a demo project, never production).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'cashbook.js'),'utf8');
function api(extra={}){const context={window:{},...extra};vm.runInNewContext(source,context);return context.window.PAI_CASHBOOK;}
test('Every reason category requires a custom typed message',()=>{
 const a=api();for(const code of Object.keys(a.RETURN_REASONS)){
  for(const message of ['', ' \n\t ', 'x'.repeat(501)])assert.throws(()=>a.returnReason(code,message));
  assert.equal(a.returnReason(code,'  पेज 2 और 3 फिर भेजें।\nपूरा स्टेटमेंट दें।  '),'पेज 2 और 3 फिर भेजें।\nपूरा स्टेटमेंट दें।');
 }assert.throws(()=>a.returnReason('invalid','message'));
});
test('Return uses current transaction state, records admin and preserves denied requests',async()=>{
 const user={uid:'admin',email:'surajbhanpandey853@gmail.com',emailVerified:true};
 let current={status:'pending'},written;
 const firebase={auth:()=>({currentUser:user}),firestore:{FieldValue:{serverTimestamp:()=> 'SERVER'}}};
 const db={collection:()=>({doc:()=>({})}),runTransaction:async fn=>fn({get:async()=>({data:()=>current}),update:(_,data)=>{written=data;}})};
 const a=api({firebase}),s=a.createService({db,user});
 for(const status of ['pending','in_progress','ready','returned']){current={status};await s.returnRequest({id:'r'},'unclear','पेज साफ भेजें');assert.equal(written.returnReason,'पेज साफ भेजें');assert.equal(written.returnedBy,'admin');assert.equal(written.status,'returned');}
 for(const status of ['uploading','deleting']){current={status};written=null;await assert.rejects(s.returnRequest({id:'r'},'other','सुधारें'));assert.equal(written,null);}
 await assert.rejects(a.createService({db,user:{...user,email:'owner@example.com'}}).returnRequest({id:'r'},'other','सुधारें'));
});
test('Admin textarea is always visible and owner views escape messages',async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only'}),w=dom.window;
 w.eval(source);let records=[{id:'r',email:'owner@example.com',status:'returned',returnCode:'unclear',returnReason:'<img src=x onerror=alert(1)>\nपेज 2 भेजें',statement:{name:'bank.pdf'}}];
 const db={collection:()=>({orderBy(){return this},limit(){return this},where(){return this},onSnapshot(fn){fn({docs:records.map(r=>({id:r.id,data:()=>r}))});return ()=>{};}})};
 const el=w.document.querySelector('main'),user={uid:'admin',email:'surajbhanpandey853@gmail.com',emailVerified:true};
 let ui=w.PAI_CASHBOOK.mountAdmin(el,{db,user});el.querySelector('[data-cb-return-open]').click();
 assert.equal(el.querySelector('[data-cb-return-box]').hidden,false);
 assert.equal(el.querySelector('[data-cb-return-text]').required,true);
 assert.equal(el.querySelector('[data-cb-return-text]').closest('[hidden]'),null);
 assert.equal(el.querySelector('[data-cb-return-text]').maxLength,500);ui.destroy();
 for(const name of ['mount','mountDownloads']){ui=w.PAI_CASHBOOK[name](el,{db,user:{uid:'owner',email:'owner@example.com'}});assert.equal(el.querySelector('.cb-return-note img'),null);assert.match(el.querySelector('.cb-return-note').textContent,/पेज 2 भेजें/);assert.match(el.textContent,/सही स्टेटमेंट दोबारा भेजें/);ui.destroy();}
 dom.window.close();
});
test('Firestore permissions and existing completion paths',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
 const {doc,setDoc,updateDoc,getDoc,getDocs,collection,query,where,orderBy,limit,serverTimestamp,Timestamp,Bytes}=require('firebase/firestore');
 const env=await initializeTestEnvironment({projectId:'demo-cashbook',firestore:{rules:fs.readFileSync(process.env.CASHBOOK_RULES||path.join(__dirname,'firestore.rules'),'utf8')}});
 const own=env.authenticatedContext('owner',{email:'owner@example.com',email_verified:true}).firestore();
 const other=env.authenticatedContext('other',{email:'other@example.com',email_verified:true}).firestore();
 const admin=env.authenticatedContext('admin',{email:'surajbhanpandey853@gmail.com',email_verified:true}).firestore();
 const unverified=env.authenticatedContext('fake',{email:'surajbhanpandey853@gmail.com',email_verified:false}).firestore();
 const statement={name:'bank.pdf',mime:'application/pdf',size:5,chunks:1,sha256:'a'.repeat(64)};
 const fresh=()=>({uid:'owner',email:'owner@example.com',status:'uploading',statement,results:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 const ref=(db,id='r')=>doc(db,'paiCashbooks',id);
 const returned=(message='पेज 2 दोबारा भेजें')=>({status:'returned',returnCode:'unclear',returnReason:message,returnedBy:'admin',returnedAt:serverTimestamp(),updatedAt:serverTimestamp(),results:{}});
 try{
  await env.clearFirestore();await assertSucceeds(setDoc(ref(own),fresh()));
  await assertFails(setDoc(ref(own,'forged'),{...fresh(),returnedBy:'admin'}));
  await assertFails(updateDoc(ref(admin),returned())); // incomplete upload
  await assertSucceeds(setDoc(doc(own,'paiCashbooks/r/chunks/statement_000'),{fileId:'statement',index:0,payload:Bytes.fromUint8Array(new Uint8Array([37,80,68,70,45]))}));
  await assertSucceeds(updateDoc(ref(own),{status:'pending',updatedAt:serverTimestamp()}));
  await assertFails(getDoc(ref(other)));await assertFails(getDoc(ref(env.unauthenticatedContext().firestore())));
  await assertSucceeds(getDocs(query(collection(own,'paiCashbooks'),where('uid','==','owner'))));
  await assertSucceeds(getDocs(query(collection(admin,'paiCashbooks'),orderBy('createdAt','desc'),limit(100))));
  await assertFails(getDocs(collection(own,'paiCashbooks')));
  await assertFails(updateDoc(ref(own),returned()));await assertFails(updateDoc(ref(other),returned()));await assertFails(updateDoc(ref(unverified),returned()));
  for(const message of ['', ' \n\t ', 'x'.repeat(501),17])await assertFails(updateDoc(ref(admin),returned(message)));
  await assertFails(updateDoc(ref(admin),{...returned(),returnedBy:'fake'}));
  await assertFails(updateDoc(ref(admin),{...returned(),returnedAt:Timestamp.fromMillis(1)}));
  await assertSucceeds(updateDoc(ref(admin),{status:'in_progress',updatedAt:serverTimestamp()}));
  const fileId='pdf-'+'b'.repeat(32);
  await assertSucceeds(setDoc(doc(admin,`paiCashbooks/r/chunks/${fileId}_000`),{fileId,index:0,payload:Bytes.fromUint8Array(new Uint8Array([37,80,68,70,45]))}));
  await assertSucceeds(updateDoc(ref(admin),{status:'ready',results:{pdf:{...statement,fileId}},updatedAt:serverTimestamp()}));
  await assertSucceeds(getDoc(doc(own,`paiCashbooks/r/chunks/${fileId}_000`)));
  await assertSucceeds(updateDoc(ref(admin),returned()));
  assert.equal((await getDoc(ref(own))).data().returnReason,'पेज 2 दोबारा भेजें');
  await assertFails(updateDoc(ref(own),{returnReason:'changed',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref(own),{status:'pending',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref(admin),{status:'ready',results:{pdf:{...statement,fileId}},updatedAt:serverTimestamp()}));
  await assertFails(getDoc(doc(own,`paiCashbooks/r/chunks/${fileId}_000`)));
  await assertFails(setDoc(doc(own,'paiCashbooks/r/chunks/statement_000'),{fileId:'statement',index:0,payload:Bytes.fromUint8Array(new Uint8Array(5))}));
  await assertSucceeds(setDoc(ref(own,'corrected'),fresh()));
  await assertSucceeds(updateDoc(ref(admin),{status:'deleting',updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(ref(admin),returned()));
 }finally{await env.cleanup();}
});
