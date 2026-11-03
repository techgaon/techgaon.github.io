import {dependency} from './dependencies.js';
import {configuration} from './ai.js';
let firestore;
async function database(){
  const config=await configuration();
  if(!config.cloud?.enabled)throw Error('Cloud sync activation is pending. Your workspace remains saved on this device.');
  if(!window.paUser)throw Error('Sign in with Google first.');
  const [apps,db]=await Promise.all([dependency('app'),dependency('db')]);
  const app=apps.getApps().find(a=>a.name==='panchayatai');
  if(!app)throw Error('Google sign-in has not finished.');
  firestore||=db.getFirestore(app);
  return {db,store:firestore,uid:window.paUser.uid};
}
async function sync(button,load){
  button.disabled=true;
  try{
    const {db,store,uid}=await database();
    const ref=db.doc(store,'panchayatUsers',uid);
    if(load){
      const snapshot=await db.getDoc(ref);
      if(window.paUser?.uid!==uid)return;
      if(!snapshot.exists())throw Error('No cloud workspace has been saved for this Google account.');
      const data=snapshot.data();
      window.paRestoreWorkspace?.(data.profile,data.drafts);
      window.paToast?.('Cloud workspace loaded.');
    }else{
      const payload={profile:window.paProfile?.()||{},drafts:(window.paDrafts?.()||[]).slice(0,100),updatedAt:db.serverTimestamp()};
      if(new TextEncoder().encode(JSON.stringify(payload)).length>700000)throw Error('Workspace is too large for one sync. Export older drafts first.');
      await db.setDoc(ref,payload);
      if(window.paUser?.uid===uid)window.paToast?.('Workspace synced to your Google account.');
    }
  }catch(e){window.paToast?.(e.code==='permission-denied'?'Cloud rules have not been activated for this account. Local drafts are unchanged.':e.message)}
  finally{if(button.isConnected)button.disabled=false}
}
async function controls(){
  const form=document.querySelector('#profileform');if(!form||document.querySelector('#cloud-controls'))return;
  const area=document.createElement('section');area.id='cloud-controls';area.className='card';
  const config=await configuration().catch(()=>({}));if(!form.isConnected)return;
  area.innerHTML='<h3>Google account workspace</h3><p>Save your profile and drafts across devices. Sync is optional; attachments stay on this device.</p><p class="hint">'+(config.cloud?.enabled?'Google sign-in and owner-only database rules are required.':'Cloud activation is pending. Your local profile and drafts work now.')+'</p><div class="actions"><button type="button" id="cloud-save" class="outline">Sync workspace</button><button type="button" id="cloud-load" class="outline">Load cloud workspace</button></div>';
  form.after(area);area.querySelector('#cloud-save').onclick=e=>sync(e.currentTarget,false);area.querySelector('#cloud-load').onclick=e=>sync(e.currentTarget,true);
}
window.addEventListener('pa:route',controls);controls();
