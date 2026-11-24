// उत्तर प्रदेश के 75 जनपद। ब्लॉक/ग्राम पंचायत सूची eGramSwaraj (LGD) से और तहसील जनपद की NIC वेबसाइट से
// tools/fetch_geo.py चलाकर data/geo/<जनपद>.json में भरी जाती है। फ़ाइल न मिलने पर ऐप में टाइप करने का विकल्प आता है।
window.PAI_GEO = {
  states: ["उत्तर प्रदेश"],
  districts: ["आगरा","अलीगढ़","अम्बेडकर नगर","अमेठी","अमरोहा","औरैया","अयोध्या","आजमगढ़","बागपत","बहराइच","बलिया","बलरामपुर","बाँदा","बाराबंकी","बरेली","बस्ती","भदोही","बिजनौर","बदायूँ","बुलंदशहर","चंदौली","चित्रकूट","देवरिया","एटा","इटावा","फर्रुखाबाद","फतेहपुर","फिरोजाबाद","गौतम बुद्ध नगर","गाजियाबाद","गाजीपुर","गोंडा","गोरखपुर","हमीरपुर","हापुड़","हरदोई","हाथरस","जालौन","जौनपुर","झाँसी","कन्नौज","कानपुर देहात","कानपुर नगर","कासगंज","कौशाम्बी","कुशीनगर","लखीमपुर खीरी","ललितपुर","लखनऊ","महराजगंज","महोबा","मैनपुरी","मथुरा","मऊ","मेरठ","मिर्जापुर","मुरादाबाद","मुजफ्फरनगर","पीलीभीत","प्रतापगढ़","प्रयागराज","रायबरेली","रामपुर","सहारनपुर","संभल","संत कबीर नगर","शाहजहाँपुर","शामली","श्रावस्ती","सिद्धार्थनगर","सीतापुर","सोनभद्र","सुल्तानपुर","उन्नाव","वाराणसी"]
};


/* Restore district selection for profiles saved with Roman/official district names.
   The district dropdown and legacy numeric geo JSON order stay unchanged. */
(() => {
  "use strict";
  const geo=window.PAI_GEO;
  const english=["AGRA","ALIGARH","AMBEDKAR NAGAR","AMETHI","AMROHA","AURAIYA","AYODHYA","AZAMGARH","BAGHPAT","BAHRAICH","BALLIA","BALRAMPUR","BANDA","BARABANKI","BAREILLY","BASTI","SANT RAVIDAS NAGAR","BIJNOR","BUDAUN","BULANDSHAHR","CHANDAULI","CHITRAKOOT","DEORIA","ETAH","ETAWAH","FARRUKHABAD","FATEHPUR","FIROZABAD","GAUTAM BUDDHA NAGAR","GHAZIABAD","GHAZIPUR","GONDA","GORAKHPUR","HAMIRPUR","HAPUR","HARDOI","HATHRAS","JALAUN","JAUNPUR","JHANSI","KANNAUJ","KANPUR DEHAT","KANPUR NAGAR","KASGANJ","KAUSHAMBI","KUSHI NAGAR","KHERI","LALITPUR","LUCKNOW","MAHARAJGANJ","MAHOBA","MAINPURI","MATHURA","MAU","MEERUT","MIRZAPUR","MORADABAD","MUZAFFARNAGAR","PILIBHIT","PRATAPGARH","PRAYAGRAJ","RAE BARELI","RAMPUR","SAHARANPUR","SAMBHAL","SANT KABEER NAGAR","SHAHJAHANPUR","SHAMLI","SHRAVASTI","SIDDHARTH NAGAR","SITAPUR","SONBHADRA","SULTANPUR","UNNAO","VARANASI"];
  const fold=s=>String(s??"").normalize("NFKC").toLocaleLowerCase().replace(/[\u200b-\u200d\ufeff]/g,"").replace(/[^\p{L}\p{N}]/gu,"");
  const districtAliases=new Map();
  geo.districts.forEach((h,i)=>{
    districtAliases.set(fold(h),h);
    districtAliases.set(fold(english[i]),h);
  });
  [
    ["ALLAHABAD","प्रयागराज"],["FAIZABAD","अयोध्या"],
    ["BHADOHI","भदोही"],["SANT RAVIDAS NAGAR BHADOHI","भदोही"],
    ["LAKHIMPUR KHERI","लखीमपुर खीरी"],["LAKHIMPUR","लखीमपुर खीरी"],
    ["RAY BAREILLY","रायबरेली"],["RAEBARELI","रायबरेली"],
    ["AZAMGARH","आजमगढ़"],["AZAMGAR","आजमगढ़"]
  ].forEach(([en,hi])=>districtAliases.set(fold(en),hi));
  geo.resolveDistrict=(value,hindiHint)=>{
    for(const name of [value,hindiHint]){
      const raw=String(name||"").trim();
      if(!raw)continue;
      if(geo.districts.includes(raw))return raw;
      const found=districtAliases.get(fold(raw));
      if(found)return found;
    }
    return "";
  };
  geo.matchPlace=(options,value,translations={})=>{
    const list=Array.isArray(options)?options:[];
    const raw=String(value||"").trim();if(!raw)return "";
    if(list.includes(raw))return raw;
    const key=fold(raw);
    const variants=new Set([key,key.replace(/haidergarh/g,"haidargarh").replace(/sandwa/g,"sandva")]);
    const byName=list.find(x=>variants.has(fold(x)));
    if(byName)return byName;
    // Old profiles may have a Hindi display label instead of its stable Roman ID.
    return list.find(x=>fold(translations[x]||window.PAI_HINDI?.label(x))===key)||"";
  };
})();
