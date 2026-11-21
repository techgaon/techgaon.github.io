/* Panchayat AI presentation preferences and admin-controlled homepage. */
(() => {
  "use strict";
  const KEY="pai_appearance_v2";
  const $=(q,root=document)=>root.querySelector(q);
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const presets={
    navy:{name:"Midnight Blue",primary:"#254f86",blue:"#3166b3",start:"#172f58",end:"#24618a",feature:"#15a39b"},
    teal:{name:"Ocean Teal",primary:"#116e79",blue:"#158d91",start:"#123a56",end:"#0c8688",feature:"#1aada0"},
    indigo:{name:"Royal Indigo",primary:"#4d4f9e",blue:"#6b64c9",start:"#282f64",end:"#5d62ad",feature:"#50b9b6"}
  };
  const defaults={mode:"light",font:"normal"};
  const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");return {mode:["light","dark","auto"].includes(x.mode)?x.mode:"light",font:["normal","large"].includes(x.font)?x.font:"normal"};}catch{return {...defaults};}};
  const save=p=>{try{localStorage.setItem(KEY,JSON.stringify(p));}catch{}};
  let prefs=load(),remote={};
  function applyPrefs(){
    let dark=prefs.mode==="dark"||(prefs.mode==="auto"&&window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
    document.body.dataset.theme=dark?"dark":"light";
    document.body.classList.toggle("pai-font-large",prefs.font==="large");
    document.documentElement.style.setProperty("--pai-ui-scale",prefs.font==="large"?"1.12":"1");
    document.documentElement.style.colorScheme=dark?"dark":"light";
  }
  function applyDesign(settings={}){
    remote=settings&&typeof settings==="object"?settings:{};
    const chosen=presets[remote.preset]||presets.navy;
    const root=document.documentElement,brand=String(remote.accent||"");
    const accent=/^#[\da-fA-F]{6}$/.test(brand)?brand:chosen.feature;
    root.style.setProperty("--pai-header-start",chosen.start);
    root.style.setProperty("--pai-header-end",chosen.end);
    root.style.setProperty("--pai-hero-start",chosen.start);
    root.style.setProperty("--pai-hero-end",chosen.end);
    root.style.setProperty("--pai-feature",accent);
    root.style.setProperty("--g",chosen.primary);
    root.style.setProperty("--g2",chosen.blue);
    root.style.setProperty("--pai-teal",accent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",chosen.start);
    document.body.classList.toggle("pai-motion-off",remote.motion===false);
  }
  function preferences(el){
    el.innerHTML='<div class="pai-display-settings"><h2>🎨 ऐप की दिखावट</h2>'+
     '<p class="hint">ये विकल्प सिर्फ आपके डिवाइस पर लागू होंगे। Admin द्वारा चुना गया मुख्य Brand Theme अलग है।</p>'+
     '<section class="card"><h3>Display Settings</h3><div class="settings-row"><label for="paiMode">रंग / Dark Mode</label>'+
     '<select id="paiMode"><option value="light">Light</option><option value="dark">Dark</option><option value="auto">फोन के अनुसार</option></select></div>'+
     '<div class="settings-row"><label for="paiFont">अक्षरों का आकार</label><select id="paiFont"><option value="normal">सामान्य</option><option value="large">बड़े अक्षर (+12%)</option></select></div>'+
     '<div class="settings-preview"><strong>पूर्वावलोकन · पंचायत AI</strong><p>सरकारी पत्र, नोटिस और AI सहायता को अपनी पसंद के अनुसार आसानी से पढ़ें।</p></div>'+
     '<button class="btn alt" type="button" id="paiResetAppearance">डिफ़ॉल्ट सेटिंग</button>'+
     '<button class="btn" type="button" id="paiReplayTour">ऐप टूर फिर देखें</button><p id="paiPrefStatus" class="hint" role="status"></p></section></div>';
    $("#paiMode",el).value=prefs.mode;$("#paiFont",el).value=prefs.font;
    function change(){
      prefs={mode:$("#paiMode",el).value,font:$("#paiFont",el).value};
      save(prefs);applyPrefs();$("#paiPrefStatus",el).textContent="✓ सेटिंग इस डिवाइस पर सेव हो गई है।";
    }
    $("#paiMode",el).onchange=change;$("#paiFont",el).onchange=change;
    $("#paiResetAppearance",el).onclick=()=>{prefs={...defaults};save(prefs);applyPrefs();
      $("#paiMode",el).value=prefs.mode;$("#paiFont",el).value=prefs.font;
      $("#paiPrefStatus",el).textContent="मूल Display Settings लागू हो गई हैं।";};
    $("#paiReplayTour",el).onclick=()=>window.PanchayatTour?.open();
  }
  function adminDesign(panel,{data,onSave}){
    const d=data&&typeof data==="object"?data:{};
    panel.innerHTML='<div class="card pai-admin-design"><h3>🎨 Panchayat AI Design Studio</h3>'+
      '<p class="design-help">ये सेटिंग केवल Panchayat AI के Home Page पर लागू होगी। दूसरे Apps या Firebase Rules नहीं बदलेंगे।</p>'+
      '<label for="paiAdminPreset">Theme / Colour Scheme</label><select id="paiAdminPreset">'+
      Object.keys(presets).map(k=>'<option value="'+k+'">'+presets[k].name+'</option>').join("")+'</select>'+
      '<label for="paiAdminAccent">Highlight Colour</label><input id="paiAdminAccent" type="color">'+
      '<label for="paiBannerTitle">Home Banner Heading (Guest)</label><input id="paiBannerTitle" maxlength="70">'+
      '<label for="paiBannerText">Home Banner Description</label><textarea id="paiBannerText" maxlength="180" rows="3"></textarea>'+
      '<label for="paiBannerLabel">Banner Eyebrow Label</label><input id="paiBannerLabel" maxlength="45">'+
      '<label for="paiFeatured">Smart Dashboard मुख्य Shortcut</label>'+
      '<select id="paiFeatured"><option value="chat">AI Help</option><option value="draft">पत्र / नोटिस</option>'+
      '<option value="tools">AI Tools</option><option value="estimate">Estimate Calculator</option></select>'+
      '<label class="chk"><input type="checkbox" id="paiShowNews">Home पर Panchayat News दिखाएँ</label>'+
      '<label class="chk"><input type="checkbox" id="paiShowEstimate">Home पर Estimate Calculator दिखाएँ</label>'+
      '<label class="chk"><input type="checkbox" id="paiShowPlus">Home पर Plus दिखाएँ</label>'+
      '<label class="chk"><input type="checkbox" id="paiMotion">हल्की Motion Animations चालू रखें</label>'+
      '<div class="btn-row"><button id="paiPreviewDesign" class="btn alt" type="button">Preview Colours</button>'+
      '<button id="paiSaveDesign" class="btn" type="button">Save & Publish</button></div>'+
      '<p id="paiDesignStatus" class="hint" role="status"></p></div>';
    const set=(id,val)=>{$("#"+id,panel).value=val;};
    set("paiAdminPreset",presets[d.preset]?d.preset:"navy");
    set("paiAdminAccent",/^#[0-9a-fA-F]{6}$/.test(d.accent||"")?d.accent:(presets[d.preset]||presets.navy).feature);
    set("paiBannerTitle",d.title||"पंचायत AI");
    set("paiBannerText",d.subtitle||"हिंदी में AI सहायता, सरकारी पत्र, नोटिस और पंचायत के उपयोगी Tools");
    set("paiBannerLabel",d.label||"TECHGAON · DIGITAL PANCHAYAT");
    set("paiFeatured",["chat","draft","tools","estimate"].includes(d.featured)?d.featured:"chat");
    for(const [id,k] of [["paiShowNews","showNews"],["paiShowEstimate","showEstimate"],["paiShowPlus","showPlus"],["paiMotion","motion"]])
      $("#"+id,panel).checked=d[k]!==false;
    $("#paiAdminPreset",panel).onchange=()=>{
      const p=presets[$("#paiAdminPreset",panel).value];
      if(p)$("#paiAdminAccent",panel).value=p.feature;
    };
    const read=()=>({
      preset:$("#paiAdminPreset",panel).value,
      accent:$("#paiAdminAccent",panel).value,
      title:$("#paiBannerTitle",panel).value.trim().slice(0,70),
      subtitle:$("#paiBannerText",panel).value.trim().slice(0,180),
      label:$("#paiBannerLabel",panel).value.trim().slice(0,45),
      featured:$("#paiFeatured",panel).value,
      showNews:$("#paiShowNews",panel).checked,
      showEstimate:$("#paiShowEstimate",panel).checked,
      showPlus:$("#paiShowPlus",panel).checked,
      motion:$("#paiMotion",panel).checked
    });
    const status=$("#paiDesignStatus",panel);
    $("#paiPreviewDesign",panel).onclick=()=>{applyDesign(read());status.textContent="रंगों का Preview दिख रहा है; दूसरे उपयोगकर्ताओं के लिए अभी प्रकाशित नहीं हुआ।";};
    $("#paiSaveDesign",panel).onclick=async()=>{
      const btn=$("#paiSaveDesign",panel);btn.disabled=true;
      try{
        const design=read();if(!design.title||!design.subtitle)throw Error("Heading और Description खाली नहीं हो सकते।");
        await onSave(design);applyDesign(design);status.textContent="✓ डिज़ाइन प्रकाशित। सभी उपयोगकर्ताओं को अपडेट मिलेगा।";
      }catch(e){status.textContent="Save failed: "+(e.message||"Retry");}
      finally{btn.disabled=false;}
    };
  }
  if(window.matchMedia){
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change",()=>{if(prefs.mode==="auto")applyPrefs();});
  }
  applyPrefs();applyDesign();
  window.PAI_UX={preferences,adminDesign,applyPrefs,applyDesign,loadPrefs:()=>({...prefs}),getDesign:()=>({...remote})};
})();
