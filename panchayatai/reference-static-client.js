/* Reviewed static corpus: no paid storage or per-query PDF processing. */
(()=>{
  'use strict';
  let loading=null,loaded=null;
  function catalogURL(){
    const value=window.PAI_CONFIG?.referenceCatalog;if(!value)return null;
    const url=new URL(value,location.href);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('अमान्य दस्तावेज सेवा');
    return url;
  }
  async function checkedJSON(url,hash){
    const r=await fetch(url,{credentials:'omit',cache:hash?'default':'no-cache',signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('दस्तावेज संग्रह अभी उपलब्ध नहीं है');
    const bytes=await r.arrayBuffer();
    if(bytes.byteLength>25*1024*1024)throw Error('दस्तावेज index बहुत बड़ा है');
    if(hash&&await digest(bytes)!==hash)throw Error('दस्तावेज index की जाँच असफल हुई');
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  async function load(){
    const url=catalogURL();if(!url)return null;
    if(loaded)return loaded;
    if(!loading)loading=(async()=>{
      const catalog=await checkedJSON(url);
      if(catalog.schema!==1||!/^search-[a-f0-9]{16}\.json$/.test(catalog.index)||!/^[a-f0-9]{64}$/.test(catalog.indexSha256))throw Error('अमान्य दस्तावेज catalog');
      const index=await checkedJSON(new URL(catalog.index,url),catalog.indexSha256);
      if(index.schema!==1||!Array.isArray(index.docs)||!Array.isArray(index.pages)||!index.terms)throw Error('अमान्य दस्तावेज index');
      const allowed=new Set(['act','rules','go','dm_order','cdo_order','dpro_order','ddo_order','bdo_order']);
      for(const doc of index.docs){if(!/^[a-f0-9]{24}$/.test(doc.id)||!allowed.has(doc.documentType)||!Array.isArray(doc.blocks))throw Error('अनुमति सूची से बाहर दस्तावेज');}
      loaded={catalog,index,url};return loaded;
    })().catch(e=>{loading=null;throw e;});
    return loading;
  }
  async function search(question){
    const data=await load();if(!data)return [];
    const hits=window.PAI_REFERENCE_SEARCH.search(data.index,question);
    for(const hit of hits){
      const doc=data.index.docs.find(d=>d.id===hit.id),selected=new Set(hit.pages);
      for(const p of hit.pages){if(doc.availablePages.includes(p-1))selected.add(p-1);if(doc.availablePages.includes(p+1))selected.add(p+1);}
      hit.pages=[...selected].sort((a,b)=>a-b).slice(0,8);
      hit.passages=hit.pages.map(p=>data.index.pages.find(row=>data.index.docs[row.doc].id===hit.id&&row.page===p)).filter(Boolean).map(row=>({page:row.page,text:row.text.slice(0,7000),quality:row.quality,nativeNumberEvidence:row.nativeNumberEvidence||[]}));
      hit.archiveIncomplete=!!data.catalog.incompleteArchive;
    }
    return hits;
  }
  async function downloadMany(hits){
    const data=await load();if(!data)throw Error('दस्तावेज सेवा अभी सक्रिय नहीं है');
    const PDF=window.PDFLib||await import('./vendor/pdflib.js');
    const result=await PDF.PDFDocument.create(),seen=new Set(),blocks=new Map(),provenance=[];
    for(const hit of hits){
      const doc=data.index.docs.find(d=>d.id===hit.id);if(!doc)throw Error('दस्तावेज उपलब्ध नहीं है');
      const pages=[...new Set(hit.pages)].sort((a,b)=>a-b);
      for(const p of pages){
        const indexed=data.index.pages.find(row=>data.index.docs[row.doc].id===doc.id&&row.page===p);
        const key=/^[a-f0-9]{64}$/.test(indexed?.visualHash||'')?indexed.visualHash:doc.id+':'+p;if(seen.has(key))continue;
        if(seen.size>=32)throw Error('एक बार में अधिकतम 32 संदर्भ पन्ने चुनें');
        if(!Number.isInteger(p)||!doc.availablePages.includes(p))throw Error('अमान्य संदर्भ पन्ना');
        const block=doc.blocks.find(b=>p>=b.first&&p<=b.last);
        if(!block||!/^blocks\/[a-f0-9]{24}-[1-9][0-9]*\.pdf$/.test(block.file)||!/^[a-f0-9]{64}$/.test(block.sha256))throw Error('अमान्य स्रोत');
        let source=blocks.get(block.file);
        if(!source){
          const response=await fetch(new URL(block.file,data.url),{credentials:'omit',signal:AbortSignal.timeout(45000)});
          if(!response.ok)throw Error('संदर्भ पन्ने डाउनलोड नहीं हो सके');
          const bytes=await response.arrayBuffer();
          if(bytes.byteLength>25*1024*1024||await digest(bytes)!==block.sha256)throw Error('मूल पन्नों की जाँच असफल हुई');
          source=await PDF.PDFDocument.load(bytes);blocks.set(block.file,source);
        }
        const [copied]=await result.copyPages(source,[p-block.first]);result.addPage(copied);seen.add(key);
      }
      provenance.push(doc.title+' — मूल पन्ने '+pages.join(', '));
    }
    if(!seen.size)throw Error('संदर्भ पन्ना नहीं चुना गया');
    result.setTitle('Panchayat AI — संदर्भ पन्ने');result.setSubject(provenance.join('\n'));
    const bytes=await result.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');
    a.href=url;a.download='PanchayatAI-reference-pages.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    return {pages:seen.size,bytes:bytes.length};
  }
  window.PAI_REFERENCES={search,download:hit=>downloadMany([hit]),downloadMany,load};
})();
