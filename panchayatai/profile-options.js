/* Profile role visibility is a UI preference, never an admin authorization grant. */
(() => {
  "use strict";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=user=>!!(user?.emailVerified&&user.email?.toLowerCase()==="surajbhanpandey853@gmail.com");
  function choices(roles,settings,current="") {
    const hidden=new Set(Array.isArray(settings?.disabledRoles)?settings.disabledRoles:[]);
    return Object.entries(roles).filter(([id])=>!hidden.has(id)||id===current).map(([id,role])=>({id,...role,enabled:!hidden.has(id)}));
  }
  async function save({db,user,roles,disabledRoles}) {
    if(!isAdmin(user))throw Error("एडमिन लॉगिन आवश्यक है।");
    const ids=Object.keys(roles),disabled=[...new Set(disabledRoles)];
    if(disabled.some(id=>!ids.includes(id)))throw Error("पदों की सूची मान्य नहीं है।");
    if(disabled.length>=ids.length)throw Error("कम-से-कम एक पद दिखना चाहिए।");
    await db.collection("paiSettings").doc("public").set({disabledRoles:disabled,roleOptionsUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    return disabled;
  }
  async function mount(panel,context) {
    if(!isAdmin(context.user)){panel.textContent="एडमिन लॉगिन आवश्यक है।";return;}
    const settings=(await context.db.collection("paiSettings").doc("public").get()).data()||{};
    if(!panel.isConnected || (panel.dataset.panel && panel.dataset.panel!=="roles"))return;
    const hidden=new Set(Array.isArray(settings.disabledRoles)?settings.disabledRoles:[]);
    panel.innerHTML='<section class="card"><h3>पद दिखाएँ या बंद करें</h3><p>बंद किए गए पद नए चयन में नहीं दिखेंगे। पहले से चुने हुए पद और पुराने उपयोगकर्ताओं की प्रोफ़ाइल सुरक्षित रहेंगी।</p>'+Object.entries(context.roles).map(([id,r])=>'<label class="chk" style="display:flex;align-items:center;gap:12px;padding:10px 0"><input type="checkbox" data-role-show="'+esc(id)+'" aria-label="'+esc(r.n)+' दिखाएँ" '+(!hidden.has(id)?'checked':'')+'><span>'+esc(r.n)+'</span></label>').join("")+'<button class="btn" type="button" data-role-save>पदों की सूची सेव करें</button><p data-role-status role="status" aria-live="polite"></p></section>';
    const card=panel.querySelector('section'),button=card.querySelector('[data-role-save]'),status=card.querySelector('[data-role-status]');
    button.onclick=async()=>{
      button.disabled=true;status.textContent="सेव हो रहा है…";
      const disabledRoles=[...card.querySelectorAll('[data-role-show]')].filter(x=>!x.checked).map(x=>x.dataset.roleShow);
      card.querySelectorAll('input').forEach(x=>x.disabled=true);
      try{const disabled=await save({...context,disabledRoles});context.onSaved?.(disabled);if(card.isConnected)status.textContent="पदों की सूची सेव हो गई है।";}
      catch(e){if(card.isConnected)status.textContent="सेव नहीं हुआ: "+e.message;}
      finally{if(card.isConnected){button.disabled=false;card.querySelectorAll('input').forEach(x=>x.disabled=false);}}
    };
  }
  window.PAI_PROFILE_OPTIONS={choices,save,mount};
})();
