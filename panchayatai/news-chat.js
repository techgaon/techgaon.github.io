/* Panchayat AI | separate news chat within AI Help */
(() => {
 "use strict";
 const $=(q,root=document)=>root.querySelector(q);
 function safeUrl(value){
   try { const u=new URL(value); return ["https:","http:"].includes(u.protocol)?u.href:""; }
   catch(e){return "";}
 }
 function mount(el,{api,profile,user,LS,toast}={}){
   if(!user)return;
   const key="newsChat_v1_"+user.uid;
   let messages=LS.get(key)||[];
   el.innerHTML='<section class="pai-news-chat">'+
     '<div class="pai-chat-mode"><button type="button" data-go="chat">✦ AI Help</button>'+
     '<button class="on" type="button" aria-current="page">📰 News Chat</button></div>'+
     '<div class="pai-news-intro"><h2>📰 News Chat</h2>'+
     '<p>उत्तर प्रदेश और पंचायती राज की ताज़ा खबरों पर सवाल करें। भरोसेमंद स्रोत और प्रकाशन की तारीख मिलने पर ही जानकारी को सत्यापित माना जाएगा।</p></div>'+
     '<div class="pai-news-messages" id="paiNewsMessages" aria-live="polite"></div>'+
     '<div class="pai-news-compose"><label for="paiNewsQuestion">खबरों से संबंधित प्रश्न</label>'+
     '<textarea id="paiNewsQuestion" rows="3" placeholder="जैसे: उत्तर प्रदेश पंचायत चुनाव की नवीनतम आधिकारिक सूचना क्या है?"></textarea>'+
     '<div class="pai-news-commands"><button class="btn" type="button" id="paiNewsAsk">स्रोत सहित जवाब दें →</button>'+
     '<button class="btn alt" type="button" id="paiNewsClear">चैट साफ करें</button></div>'+
     '<p class="hint" id="paiNewsStatus" role="status"></p></div></section>';
   const list=$("#paiNewsMessages",el),q=$("#paiNewsQuestion",el),send=$("#paiNewsAsk",el);
   function repaint(){
     list.innerHTML=messages.length?"":'<div class="pai-news-empty">खबरों से जुड़े सवाल पूछें, जैसे “पंचायती राज विभाग का ताजा निर्णय क्या है?”</div>';
     for(const m of messages){
       const block=document.createElement("article");block.className="pai-news-message "+(m.user?"is-user":"is-ai");
       const answer=document.createElement("div");answer.textContent=m.text;block.appendChild(answer);
       if(!m.user&&Array.isArray(m.sources)&&m.sources.length){
         const links=document.createElement("div");links.className="pai-news-sources";
         const label=document.createElement("span");label.textContent="समाचार स्रोत: ";links.appendChild(label);
         for(const item of m.sources.slice(0,5)){
           const url=safeUrl(item.uri);if(!url)continue;
           const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";
           a.textContent=String(item.title||new URL(url).hostname).slice(0,90);links.appendChild(a);
         }
         block.appendChild(links);
       }
       list.appendChild(block);
     }
   }
   repaint();
   let pending=false;
   send.onclick=async()=>{
     if(pending)return;
     const text=q.value.trim();if(!text){q.focus();return;}
     const history=[...messages,{user:true,text}].slice(-12).map(m=>({r:m.user?"u":"a",t:m.text}));
     messages.push({user:true,text});q.value="";pending=true;send.disabled=true;
     $("#paiNewsStatus",el).textContent="स्रोतों की जाँच करके जवाब तैयार हो रहा है…";repaint();
     try {
       const r=await api("/chat",{mode:"news",profile,history,att:[]});
       messages.push({user:false,text:r.text||"सत्यापित खबर उपलब्ध नहीं है।",sources:r.web||[]});
       $("#paiNewsStatus",el).textContent="✓ जवाब तैयार है। तारीख और मूल स्रोत जाँचें।";
       LS.set(key,messages.slice(-30));
     } catch(e) {
       $("#paiNewsStatus",el).textContent="⚠️ "+String(e.message||"फिर प्रयास करें");
       messages.pop();q.value=text;
     } finally {pending=false;send.disabled=false;repaint();}
   };
   q.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send.click();}};
   $("#paiNewsClear",el).onclick=()=>{messages=[];LS.set(key,[]);repaint();toast("News Chat History साफ हुई");};
 }
 window.PAI_NEWS_CHAT={mount};
})();
