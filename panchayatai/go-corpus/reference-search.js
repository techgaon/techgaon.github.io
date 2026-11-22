/* Shared, deterministic index search. PDF data and OCR are built offline. */
(function(root){
  'use strict';
  const stop=new Set('का की के है हैं में से और को पर यह वह एक कोई लिए देना चाहिए बताइए बताओ मुझे शासनादेश आदेश सम्बन्ध संबंध संबंधी बारे क्या कैसे कितना कब कौन नियम बताना वाला वाली the a an of to for please download pdf go order government give show me is are about ka ki ke hai hain me mein se aur ko par kya kaise kitna kab kaun chahiye batao do dijiye'.split(' '));
  const aliases={caretaker:'केयरटेकर','care taker':'केयरटेकर',shauchalay:'शौचालय',shauchalaya:'शौचालय',samudayik:'सामुदायिक',mandey:'मानदेय',manadey:'मानदेय',mandeya:'मानदेय',sachiv:'सचिव',sachivalaya:'सचिवालय',panchayat:'पंचायत',panchayati:'पंचायती',talab:'तालाब',rti:'सूचना अधिकार',janm:'जन्म',mrityu:'मृत्यु',prashasak:'प्रशासक',prasasak:'प्रशासक',gram:'ग्राम',gaon:'गांव',gaw:'गांव',nidhi:'निधि',rajya:'राज्य',vitt:'वित्त',vitta:'वित्त',bhugtan:'भुगतान',bhugatan:'भुगतान',bhatta:'भत्ता',chhutti:'अवकाश',avkash:'अवकाश',niyukti:'नियुक्ति',seva:'सेवा',niyamawali:'नियमावली',niyamavali:'नियमावली',niyam:'नियम',aadesh:'आदेश',shasanadesh:'शासनादेश',pradhan:'प्रधान',sahayak:'सहायक',goshala:'गोशाला',gaushala:'गोशाला',janpad:'जनपद',jila:'जिला',dm:'जिलाधिकारी',cdo:'मुख्य विकास अधिकारी',dpro:'जिला पंचायत राज अधिकारी',ddo:'जिला विकास अधिकारी',bdo:'खण्ड विकास अधिकारी'};
  Object.assign(aliases,{family:'फैमिली',familyid:'फैमिली आईडी',id:'आईडी',parivar:'परिवार',raj:'राज',act:'अधिनियम'});
  const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u200b-\u200d\ufeff]/g,'').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x966));
  function tokens(value,limit=24){
    value=norm(value);
    value=value.replace(/\bcare\s+taker\b/g,'केयरटेकर');
    let words=value.match(/[\p{L}\p{M}\p{N}]+/gu)||[];
    words=words.flatMap(w=>(aliases[w]||w).split(' ')).map(w=>w.replace(/(?:यों|ों)$/u,''));
    return [...new Set(words.filter(w=>w.length>1&&!stop.has(w)))].slice(0,limit);
  }
  function search(index,question){
    const terms=tokens(question);if(!terms.length)return [];
    const scores=new Map(),coverage=new Map();
    for(const term of terms){
      const entries=Object.hasOwn(index.terms,term)?index.terms[term]:[];
      const weight=1+Math.log(1+index.pages.length/Math.max(1,entries.length));
      for(const n of entries){scores.set(n,(scores.get(n)||0)+weight);coverage.set(n,(coverage.get(n)||0)+1);}
    }
    const ranked=[...scores].filter(([n])=>coverage.get(n)>=Math.min(2,terms.length)).map(([n,score])=>{
      const row=index.pages[n],doc=index.docs[row.doc];
      const titleTerms=tokens(doc.title);
      const bonus=terms.filter(t=>titleTerms.includes(t)).length*2;
      return {n,score:score+bonus,coverage:coverage.get(n)/terms.length};
    }).sort((a,b)=>b.coverage-a.coverage||b.score-a.score);
    const hits=[];
    for(const row of ranked){
      const page=index.pages[row.n],doc=index.docs[page.doc];
      let hit=hits.find(h=>h.id===doc.id);
      if(!hit){
        if(hits.length>=4)continue;
        hit={id:doc.id,title:doc.title,officialNumber:doc.officialNumber||'',date:doc.date||'',jurisdiction:doc.jurisdiction||'',documentType:doc.documentType,score:row.score,pages:[],passages:[]};hits.push(hit);
      }
      if(hit.passages.length>=3)continue;
      hit.passages.push({page:page.page,text:page.text,quality:page.quality||'extracted'});
      hit.pages.push(page.page);
    }
    for(const hit of hits){hit.pages.sort((a,b)=>a-b);hit.passages.sort((a,b)=>a.page-b.page);}
    return hits;
  }
  const api={tokens,norm,search};root.PAI_REFERENCE_SEARCH=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
