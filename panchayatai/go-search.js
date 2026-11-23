/* Panchayat AI — non-AI Government Order (GO) search.
   Results render as compact document tiles; original PDF text stays in the PDF.
   Catalog is owner-verified and starts empty until original PDFs are imported.
   Never invent results or route a download to the Google Drive staging ZIP. */
(() => {
  "use strict";
  const SOURCES = ["data/go-index.json", "data/verified-pdfs.json"];
  const EXAMPLES = [
    "पंचायत सहायक नियुक्ति का GO दो",
    "panchayt sahayak niyukti ka go do",
    "पंचायत सहायक मानदेय का शासनादेश",
    "panchayat sahayak mandey ka go do",
    "सामुदायिक शौचालय केयरटेकर मानदेय GO",
    "samudayik shauchalay caretaker mandey go",
    "ग्राम प्रधान के अधिकारों का शासनादेश",
    "gram pradhan adhikar ka go dikhao",
    "15वें वित्त आयोग से संबंधित GO",
    "15ve vitt ayog ka go do"
  ];
  const latin = {
    panchayat:"पंचायत", panchayt:"पंचायत", panchyat:"पंचायत", panchayati:"पंचायत",
    gram:"ग्राम", gaon:"ग्राम", sachiv:"सचिव", secretary:"सचिव", sahayak:"सहायक",
    niyukti:"नियुक्ति", niyookti:"नियुक्ति", bharti:"भर्ती", mandey:"मानदेय",
    manadey:"मानदेय", vetan:"वेतन", salary:"वेतन", safai:"सफाई",
    shauchalay:"शौचालय", shauchalya:"शौचालय", samudayik:"सामुदायिक",
    caretaker:"केयरटेकर", pradhan:"प्रधान", adhikar:"अधिकार", niyam:"नियम",
    vitta:"वित्त", vitt:"वित्त", ayog:"आयोग", aayog:"आयोग", awas:"आवास",
    aawas:"आवास", mgnrega:"मनरेगा", narega:"मनरेगा", nrega:"मनरेगा",
    go:"शासनादेश", shasanadesh:"शासनादेश", shashanadesh:"शासनादेश",
    shasan:"शासन", aadesh:"आदेश", adesh:"आदेश", order:"आदेश",
    nirdesh:"निर्देश", pdf:"", do:"", dijiye:"", dikhao:"", ka:"",
    ki:"", ke:"", me:"", mein:"", wala:"", chahiye:"", search:"",
    find:"", download:"", file:"", bhejo:""
  };
  const stop=new Set(["का","की","के","को","में","से","पर","लिए","का","एक","वह","यह","दो","दें","दीजिए","दिखाओ","बताओ","खोजो","खोजें","पीडीएफ","pdf","शासनादेश","आदेश","go","file","link","खोज","डाउनलोड","सम्बंधित","संबंधित"]);
  const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=v=>String(v??"").normalize("NFKC").toLocaleLowerCase()
    .replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406))
    .replace(/[^\p{L}\p{M}\p{N}./\s-]/gu," ").replace(/\s+/g," ").trim();
  const terms=value=>{
    const raw=norm(value).split(/[\s./-]+/u).filter(Boolean);
    return [...new Set(raw.map(t=>Object.hasOwn(latin,t)?latin[t]:t).filter(t=>t.length>=2&&!stop.has(t)))];
  };
  const verifiedUrl=item=>{
    if(typeof item.file==="string"&&/^[^/\\]+\.pdf$/iu.test(item.file)&&!item.file.includes(".."))
      return new URL("reference-pdfs/"+encodeURIComponent(item.file),document.baseURI).href;
    if(typeof item.url!=="string")return "";
    try{
      const target=new URL(item.url,document.baseURI);
      if(target.protocol!=="https:"||target.username||target.password)return "";
      return target.href;
    }catch{return "";}
  };
  const safeItem=item=>{
    if(!item||typeof item!=="object"||typeof item.id!=="string"||typeof item.title!=="string")return null;
    const url=verifiedUrl(item);
    if(!url||!item.id.trim()||!item.title.trim())return null;
    return {
      id:item.id.slice(0,160), title:item.title.slice(0,400), url,
      officialNumber:typeof item.officialNumber==="string"?item.officialNumber.slice(0,120):"",
      department:typeof item.department==="string"?item.department.slice(0,150):"",
      date:typeof item.date==="string"?item.date.slice(0,40):"",
      keywords:Array.isArray(item.keywords)?item.keywords.filter(x=>typeof x==="string").slice(0,40):[],
      aliases:Array.isArray(item.aliases)?item.aliases.filter(x=>typeof x==="string").slice(0,40):
        Array.isArray(item.exactPhrases)?item.exactPhrases.filter(x=>typeof x==="string").slice(0,40):[]
    };
  };
  let records=[],loaded=false,inflight=null,loadError=false,corpus=null;
  const excerptHits=new Map();
  async function load(){
    if(loaded)return records;
    if(inflight)return inflight;
    inflight=Promise.all(SOURCES.map(async path=>{
      try{const response=await fetch(path,{cache:"no-store"});if(!response.ok)throw Error("catalog unavailable");
        const json=await response.json();return Array.isArray(json)?json:[];}
      catch{return null;}
    })).then(parts=>{
      loadError=parts.every(p=>p===null);
      const unique=new Map();
      for(const item of parts.flatMap(p=>p||[])){
        const doc=safeItem(item);if(doc&&!unique.has(doc.id))unique.set(doc.id,doc);
      }
      records=[...unique.values()];loaded=true;return records;
    }).finally(()=>{inflight=null;});
    return inflight;
  }
  const baseLoad=load;
  load=async function(){
    const local=await baseLoad();
    if(!window.PAI_REFERENCES)return local;
    if(!corpus){
      const data=await window.PAI_REFERENCES.load();
      if(data){
        corpus=data;
        for(const doc of data.index.docs){
          if(!records.some(d=>d.id===doc.id))records.push({...doc,url:"",keywords:[],aliases:[]});
        }
      }
    }
    return records;
  };
  function search(query,limit=20){
    const q=norm(query),words=terms(query);if(!q||!words.length)return [];
    if(corpus){
      const hits=window.PAI_REFERENCE_SEARCH.search(corpus.index,query).slice(0,limit);
      for(const hit of hits){hit.query=query;excerptHits.set(hit.id,hit);}
      return hits;
    }
    const scored=[];
    for(const doc of records){
      const title=norm(doc.title),number=norm(doc.officialNumber),aliases=norm(doc.aliases.join(" ")),
        key=norm(doc.keywords.join(" ")),dept=norm(doc.department);
      const hay=[title,aliases,key,dept,number].join(" ");
      const matching=words.filter(w=>hay.includes(w));
      if(matching.length<Math.ceil(words.length*0.55))continue; // Avoid misleading single-keyword matches on specific queries.
      const ratio=matching.length/words.length;
      const score=ratio*100+(number&&q.includes(number)?80:0)
        +(title&&title.includes(q)?50:0)+matching.filter(w=>title.includes(w)).length*10
        +(aliases&&aliases.includes(q)?15:0);
      scored.push({doc,score,ratio});
    }
    return scored.sort((a,b)=>b.score-a.score||a.doc.title.localeCompare(b.doc.title,"hi"))
      .slice(0,Math.max(1,Math.min(50,limit))).map(x=>x.doc);
  }
  function isGoLookup(query){
    const q=norm(query);
    const go=/(?:\bgo\b|\bg\.o\b|शासनादेश|शासन\s*आदेश|जी\.?ओ\.?|government\s+order|shasanadesh|shashanadesh)/iu.test(q);
    const retrieval=/(?:\bdo\b|\bdijiye\b|\bdikhao\b|\bsearch\b|\bfind\b|\bdownload\b|\bpdf\b|\bbhejo\b|\bchahiye\b|दिखाओ|दिखाइए|दें|दीजिए|खोज|डाउनलोड|पीडीएफ|लिंक|भेजो|चाहिए|चाहिये|निकालो|प्राप्त|उपलब्ध|मिलेगा)/iu.test(q);
    const explaining=/(?:समझाओ|समझाइए|समझाएं|अर्थ|व्याख्या|स्पष्ट\s*करें|explain|meaning|samjhao|अनुसार|anusar|के\s*आधार\s*पर)/iu.test(q);
    const drafting=/(?:पत्र|नोटिस|प्रस्ताव|आख्या|letter|patra|notice).{0,30}(?:बनाओ|बनाइ|बनाय|तैयार|लिखो|banao|bana|draft)/iu.test(q);
    return go&&!explaining&&!drafting&&(retrieval||q.split(" ").length<=10);
  }
  function card(doc,chat=false,query=""){
    if(!doc)return "";
    const hit=excerptHits.get(doc.id)||doc;
    const sub=[hit.officialNumber||doc.officialNumber,doc.department||doc.documentType||"",hit.date||doc.date]
      .filter(Boolean).map(escapeHTML).join(" · ");
    const full=!!(corpus&&corpus.index.docs.some(d=>d.id===doc.id)&&excerptHits.has(doc.id));
    const pageCount=full?corpus.index.docs.find(d=>d.id===doc.id)?.availablePages?.length:0;
    const action=full
      ?'<button type="button" class="btn pai-go-open" data-go-full="'+escapeHTML(doc.id)+'">Download Or View Pdf</button>'
      :'<a class="btn pai-go-open" href="'+escapeHTML(doc.url||"")+'" target="_blank" rel="noopener noreferrer">Download Or View Pdf</a>';
    return '<article class="pai-go-result pai-go-tile"><div class="pai-go-file-icon" aria-hidden="true">📑</div>'+
      '<div class="pai-go-result-info"><strong>'+escapeHTML(hit.title||doc.title)+'</strong>'+
      (sub?'<small>'+sub+'</small>':"")+
      (pageCount?'<small>मूल PDF के उपलब्ध '+pageCount+' पृष्ठ</small>':"")+

      '<div class="pai-go-actions">'+action+'</div></div></article>';
  }
  function chatResultsHtml(ids,query){
    if(!Array.isArray(ids)||!ids.length)return "";
    if(corpus&&query)for(const hit of window.PAI_REFERENCE_SEARCH.search(corpus.index,query))if(!excerptHits.has(hit.id))excerptHits.set(hit.id,hit);
    const list=ids.slice(0,10).map(id=>excerptHits.get(id)||records.find(d=>d.id===id)).filter(Boolean);
    return list.length?'<div class="pai-go-chat-results">'+list.map(d=>card(d,true,query)).join("")+'</div>':"";
  }
  function mount(el){
    if(!el)return;
    el.innerHTML='<section class="card pai-go-intro"><div class="pai-go-heading"><span aria-hidden="true">📚</span><div><h2>GO Search</h2><p>GO नंबर या Keyword से Search करें। Results Tiles में दिखेंगे; PDF में पूरा मूल GO मिलेगा।</p></div></div>'+
      '<form class="pai-go-form"><label for="paiGoQuery">GO Keyword / Number</label><div class="pai-go-input"><input id="paiGoQuery" type="search" autocomplete="off" placeholder="जैसे पंचायत सहायक नियुक्ति का GO" /><button type="submit" class="btn">Search</button></div></form></section>'+
      '<section class="pai-go-results" aria-live="polite"><p class="hint">GO List Loading…</p></section>'+
      '<section class="card pai-go-suggest"><h3>Search Examples</h3><p>Hindi या Roman Hindi, दोनों में Search कर सकते हैं।</p><div class="pai-go-chips">'+
      EXAMPLES.map(x=>'<button type="button" data-go-example="'+escapeHTML(x)+'">'+escapeHTML(x)+'</button>').join("")+
      '</div></section>';
    const input=el.querySelector("#paiGoQuery"),result=el.querySelector(".pai-go-results");
    const draw=()=>{
      if(!loaded){result.innerHTML='<p class="hint">GO List Loading…</p>';return;}
      if(loadError){result.innerHTML='<div class="card">GO List अभी नहीं खुल रही। फिर Try करें।</div>';return;}
      if(!records.length){result.innerHTML='<div class="card"><strong>GO Library में अभी PDF नहीं जोड़ी गई है।</strong></div>';return;}
      const q=input.value.trim(),matches=q?search(q):[];
      result.innerHTML=q
        ?(matches.length?matches.map(d=>card(d,false,q)).join(""):'<div class="card">इस Keyword पर कोई GO नहीं मिला। अलग Keyword या GO नंबर से Search करें।</div>')
        :'<div class="card pai-go-start">ऊपर Keyword या GO नंबर लिखकर Search करें।</div>';
    };
    el.querySelector(".pai-go-form").onsubmit=e=>{e.preventDefault();draw();};
    let searchTimer;
    input.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(draw,180);});
    el.querySelectorAll("[data-go-example]").forEach(b=>b.onclick=()=>{
      input.value=b.dataset.goExample;draw();input.focus();result.scrollIntoView?.({behavior:"smooth",block:"start"});
    });
    load().then(draw).catch(()=>{result.textContent="GO Library अभी उपलब्ध नहीं है। फिर Try करें।";});
  }
  document.addEventListener?.("click",async e=>{
    const button=e.target?.closest?.("[data-go-full],[data-go-excerpt]");if(!button)return;
    const hit=excerptHits.get(button.dataset.goFull||button.dataset.goExcerpt);if(!hit)return;
    button.disabled=true;const label=button.textContent;button.textContent="PDF तैयार हो रही है…";
    try{
      if(button.hasAttribute("data-go-full")){
        if(!window.PAI_FULL_GO?.open)throw Error("पूरा GO PDF मॉड्यूल नहीं मिला। Reload करें।");
        await window.PAI_FULL_GO.open(hit,hit.query||"",message=>{button.textContent=message;});
      }else await window.PAI_REFERENCES.download(hit);
      button.textContent=label;
    }catch(error){
      button.textContent=label;
      const note=document.createElement("p");note.className="hint pai-go-error";note.textContent=error.message||"PDF डाउनलोड नहीं हो सका";
      button.closest(".pai-go-actions")?.append(note);
    }finally{button.disabled=false;}
  });
  function registerHits(hits){for(const hit of hits||[])if(corpus?.index.docs.some(d=>d.id===hit.id))excerptHits.set(hit.id,hit);}
  async function inventory(){await load();return {documents:corpus?.index?.docs?.length||records.length,pages:corpus?.index?.pages?.length||0,incomplete:!!corpus?.catalog?.incompleteArchive};}
  window.PAI_GO_SEARCH={load,search,isGoLookup,mount,chatResultsHtml,registerHits,inventory};
})();
