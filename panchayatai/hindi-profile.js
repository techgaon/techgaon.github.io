/* Hindi place/name suggestions for UP Panchayat AI.
   The source Roman place IDs are NEVER changed, avoiding GP lookup errors.
   Suggestions are editable, never treated as legally verified spellings. */
(() => {
 "use strict";
 const fixed={
  "Thalwara":"थलवारा","Haidargarh":"हैदरगढ़","Barabanki":"बाराबंकी",
  "Kamela":"कमेला","Khanpur":"खानपुर","Sandva":"संडवा",
  "Bani Kodar":"बनी कोडर","Banki":"बंकी","Dariyabad":"दरियाबाद",
  "Dewa":"देवा","Fatehpur":"फतेहपुर","Harakh":"हरख",
  "Masauli":"मसौली","Nindaura":"निंदौरा","Puredalai":"पूरेडलई",
  "Ramnagar":"रामनगर","Sidhaur":"सिद्धौर","Sirauli Gauspur":"सिरौली गौसपुर",
  "Suratganj":"सूरतगंज",
  "Aalapur":"आलापुर","Ahirgaon":"अहीरगाँव","Bara":"बारा","Behta":"बेहटा",
  "Bhatgavan":"भटगवाँ","Chiraiya":"चिरैया","Chaubeesi":"चौबीसी",
  "Dandupur":"दंडूपुर","Gotauna":"गोतौना","Harchandpur":"हरचंदपुर",
  "Harpalpur":"हरपालपुर","Islampur":"इस्लामपुर",
  "Jasepur":"जसेपुर","Mangauwa":"मंगौवा","Mohammadpur":"मोहम्मदपुर",
  "Mustfabad":"मुस्तफाबाद","Narauli":"नरौली","Palia":"पलिया",
  "Ranapur":"रानापुर","Ranipur":"रानीपुर","Sandwa":"संडवा",
  "Shivrajpur":"शिवराजपुर","Shukulpur":"शुकुलपुर",
  "Thanpur":"थानपुर","Sarai Chaubey":"सराय चौबे",
  "Ravi":"रवि","Kumar":"कुमार","Pankaj":"पंकज","Chandra":"चंद्र",
  "Bhanu":"भानु","Pandey":"पांडेय","Singh":"सिंह","Devi":"देवी",
  "Ram":"राम","Shweta":"श्वेता","Suraj":"सूरज","Bhan":"भान"
 };
 const cons={"chh":"छ","tth":"ठ","ddh":"ढ","shr":"श्र","ksh":"क्ष","gy":"ज्ञ","sh":"श","ch":"च","kh":"ख","gh":"घ","jh":"झ","th":"थ","dh":"ध","ph":"फ","bh":"भ","ng":"ङ","ny":"ञ","tr":"त्र",
  "k":"क","g":"ग","c":"क","j":"ज","t":"त","d":"द","n":"न","p":"प","b":"ब","m":"म","y":"य","r":"र","l":"ल","v":"व","w":"व","s":"स","h":"ह","f":"फ","z":"ज़","q":"क","x":"क्स"};
 const vowels={"aa":["आ","ा"],"ee":["ई","ी"],"oo":["ऊ","ू"],"ai":["ऐ","ै"],"au":["औ","ौ"],"ou":["औ","ौ"],"ei":["ए","े"],"a":["अ",""],"e":["ए","े"],"i":["इ","ि"],"o":["ओ","ो"],"u":["उ","ु"]};
 const consonantKeys=Object.keys(cons).sort((a,b)=>b.length-a.length);
 const vowelKeys=Object.keys(vowels).sort((a,b)=>b.length-a.length);
 const devanagari=s=>/[\u0900-\u097f]/u.test(String(s||""))&&!/[A-Za-z]/.test(s);
 const trim=s=>String(s??"").trim().replace(/\s+/g," ").slice(0,160);
 function phonetic(word){
   if(!word)return "";
   if(fixed[word])return fixed[word];
   const w=word.toLowerCase().replace(/[^a-z]/g,"");
   if(!w)return word;
   let out="",i=0,prevCons=false;
   while(i<w.length){
     const v=vowelKeys.find(k=>w.startsWith(k,i));
     if(v){
       // A final -a in ordinary Hindi place names can be ambiguous.
       // Use inherent vowel and offer an editable preview.
       const [letter,matra]=vowels[v];
       out+=prevCons?matra:letter;prevCons=false;i+=v.length;continue;
     }
     const c=consonantKeys.find(k=>w.startsWith(k,i));
     if(c){out+=cons[c];prevCons=true;i+=c.length;continue;}
     i++;
   }
   return out||word;
 }
 function guess(text){
   const raw=trim(text);if(!raw)return "";
   if(devanagari(raw))return raw;
   if(fixed[raw])return fixed[raw];
   return raw.split(/(\s+|[-/])/u).map(t=>/^[A-Za-z]+$/u.test(t)?phonetic(t):t).join("");
 }
 function canUseHindi(text){
   return devanagari(trim(text)) && trim(text).length>=2;
 }
 function label(raw,mapping){
   return trim(mapping?.[raw])||trim(cached()[raw])||guess(raw);
 }
 const cacheKey="pai-hindi-hints-2026";
 function cached(){
   try{return JSON.parse(localStorage.getItem(cacheKey)||"{}")}catch{return {};}
 }
 function store(hints){
   try{localStorage.setItem(cacheKey,JSON.stringify({...cached(),...hints}));}catch{}
 }
 async function suggest(names){
   const unique=[...new Set(names.map(trim).filter(x=>x&&!devanagari(x)))].slice(0,30);
   if(!unique.length)return {};
   const memory=cached(),needs=unique.filter(n=>!canUseHindi(memory[n]));
   let answers={};for(const n of unique)if(canUseHindi(memory[n]))answers[n]=memory[n];
   if(needs.length&&window.PAI_AI?.hindiNames){
     try{
       const remote=await window.PAI_AI.hindiNames(needs);
       for(const n of needs)if(canUseHindi(remote?.[n]))answers[n]=trim(remote[n]);
       store(answers);
     }catch(e){console.warn("Hindi profile suggestions unavailable",e);}
   }
   for(const n of unique)if(!answers[n])answers[n]=guess(n);
   return answers;
 }
 window.PAI_HINDI={guess,label,suggest,canUseHindi};
})();
