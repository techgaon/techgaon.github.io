/* Panchayat AI — in-app A4 government draft editor */
(() => {
 "use strict";
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;":"&quot;","'":"&#39;"}[c]));
 function mount({paper,profile,role,toast}={}){
   if(!paper||paper.dataset.editorReady)return;
   paper.dataset.editorReady="true";
   paper.setAttribute("contenteditable","true");
   paper.setAttribute("spellcheck","true");
   paper.setAttribute("role","textbox");
   paper.setAttribute("aria-label","संपादन योग्य A4 सरकारी दस्तावेज़");
   paper.setAttribute("aria-multiline","true");
   paper.dataset.docSize="12";
   paper.closest(".card")?.classList.add("pai-doc-editor-shell");
   const toolbar=document.createElement("div");
   toolbar.className="pai-document-tools";
   toolbar.setAttribute("role","toolbar");
   toolbar.setAttribute("aria-label","सरकारी पत्र Formatting Tools");
   toolbar.innerHTML='<span class="doc-structure">A4</span>'+
     '<div class="tool-group"><button type="button" data-command="bold" aria-label="बोल्ड"><strong>B</strong></button>'+
     '<button type="button" data-command="italic" aria-label="इटैलिक"><em>I</em></button>'+
     '<button type="button" data-command="underline" aria-label="रेखांकित"><u>U</u></button></div>'+
     '<div class="tool-group"><button type="button" data-command="justifyLeft" aria-label="बाएँ">☷</button>'+
     '<button type="button" data-command="justifyCenter" aria-label="बीच">≡</button>'+
     '<button type="button" data-command="justifyRight" aria-label="दाएँ">☰</button>'+
     '<button type="button" data-command="justifyFull" aria-label="जस्टिफाई">▤</button></div>'+
     '<div class="tool-group"><button type="button" data-command="undo" aria-label="Undo">↶</button>'+
     '<button type="button" data-command="redo" aria-label="Redo">↷</button></div>'+
     '<label class="doc-structure" for="pai-doc-size">Font</label>'+
     '<select id="pai-doc-size" aria-label="पत्र का Font Size">'+
     '<option value="11">11 pt</option><option value="12" selected>12 pt</option>'+
     '<option value="13">13 pt</option><option value="14">14 pt</option></select>'+
     '<button type="button" id="pai-letterhead" aria-label="कार्यालय लेटरहेड जोड़ें">▤ लेटरहेड</button>';
   paper.before(toolbar);
   const note=document.createElement("p");
   note.className="pai-paper-info";
   note.textContent="A4 • 20 mm मार्जिन वाला संपादन योग्य दस्तावेज़। डाउनलोड करने से पहले तथ्य व नियम अवश्य जाँचें।";
   toolbar.after(note);
   let range=null;
   document.addEventListener("selectionchange",()=>{
     const sel=window.getSelection();
     if(!sel?.rangeCount)return;
     if(paper.contains(sel.anchorNode))range=sel.getRangeAt(0).cloneRange();
   });
   function restore(){
     paper.focus();
     if(range){
       const sel=window.getSelection();
       try{sel.removeAllRanges();sel.addRange(range);}catch{}
     }
   }
   toolbar.querySelectorAll("[data-command]").forEach(button=>{
     button.addEventListener("mousedown",e=>e.preventDefault());
     button.addEventListener("click",()=>{
       restore();
       document.execCommand(button.dataset.command,false,null);
       paper.dispatchEvent(new Event("input",{bubbles:true}));
     });
   });
   const size=toolbar.querySelector("#pai-doc-size");
   size.onchange=()=>{
     paper.style.fontSize=size.value+"pt";
     paper.dataset.docSize=size.value;
     toast?.("Font Size "+size.value+" pt");
   };
   const headerButton=toolbar.querySelector("#pai-letterhead");
   headerButton.onclick=()=>{
     const existing=paper.querySelector(":scope > .paper-letterhead");
     if(existing){
       if(existing.dataset.original==="yes"){
         const fragment=document.createDocumentFragment();
         while(existing.firstChild)fragment.append(existing.firstChild);
         existing.replaceWith(fragment);
       }else existing.remove();
       headerButton.textContent="▤ लेटरहेड";return;
     }
     const first=Array.from(paper.children).find(e=>e.tagName==="P"||e.tagName==="DIV");
     const isOffice=first&&/^\s*कार्यालय\s*[:：—-]?/.test(first.textContent||"");
     const container=document.createElement("div");
     container.className="paper-letterhead";
     container.setAttribute("data-letterhead","true");
     if(isOffice){
       container.dataset.original="yes";
       paper.insertBefore(container,first);
       container.appendChild(first);
     }else{
       container.dataset.original="no";
       const office=role==="resident"?"आवेदक":(role||"कार्यालय");
       const location=[profile?.gps?.[0],profile?.block,profile?.district].filter(Boolean).join(", ");
       const p=document.createElement("p"),strong=document.createElement("strong");
       strong.textContent="कार्यालय — "+office;
       p.appendChild(strong);container.appendChild(p);
       if(location){const place=document.createElement("p");place.textContent=location;container.appendChild(place);}
       paper.prepend(container);
     }
     headerButton.textContent="लेटरहेड हटाएँ";
     toast?.("कार्यालय विवरण जाँचकर आवश्यकतानुसार संपादित करें।");
   };
 }
 window.PAI_EDITOR={mount};
})();