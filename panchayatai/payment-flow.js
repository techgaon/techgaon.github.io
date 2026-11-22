/* Local QR generation, bounded payment proofs and approval notices. */
(()=>{
'use strict';
const validUpi=v=>/^[a-zA-Z0-9._-]{2,100}@[a-zA-Z0-9.-]{2,80}$/.test(String(v||''));
const safeProof=v=>typeof v==='string'&&v.length<=200000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v);
function uri(vpa,payee,amount,ref='',label='Panchayat AI Plus'){
 if(!validUpi(vpa))throw Error('मान्य UPI ID भरें।');
 const q=new URLSearchParams({pa:vpa,pn:payee||'TechGaon AI Services',cu:'INR',tn:label});
 if(amount!==undefined){if(!Number.isFinite(Number(amount))||Number(amount)<0)throw Error('भुगतान राशि अमान्य है।');q.set('am',Number(amount).toFixed(2));}
 if(ref)q.set('tr',ref);
 return 'upi://pay?'+q.toString();
}
async function qr(container,value){
 container.replaceChildren();
 if(typeof window.qrcode!=='function')throw Error('QR सुविधा लोड नहीं हुई। Reload करें।');
 const code=window.qrcode(0,'M');code.addData(value,'Byte');code.make();
 const image=new Image();image.alt='UPI भुगतान QR';image.width=260;image.height=260;
 image.src=code.createDataURL(6,12);await image.decode();
 const canvas=document.createElement('canvas');canvas.width=canvas.height=image.naturalWidth;
 canvas.getContext('2d').drawImage(image,0,0);
 const png=canvas.toDataURL('image/png');image.src=png;
 const link=document.createElement('a');link.className='btn alt';link.textContent='QR डाउनलोड करें';link.href=png;link.download='PanchayatAI-UPI-QR.png';
 container.append(image,link);return png;
}
async function proof(file){
 if(!file||!/^image\/(?:jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024)throw Error('5 MB से छोटी payment screenshot (JPEG/PNG/WebP) चुनें।');
 const bmp=await createImageBitmap(file),c=document.createElement('canvas');
 const ratio=Math.min(1,1100/Math.max(bmp.width,bmp.height));c.width=Math.max(1,Math.round(bmp.width*ratio));c.height=Math.max(1,Math.round(bmp.height*ratio));
 const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);bmp.close();
 let result='';for(const quality of [.85,.7,.55,.4]){result=c.toDataURL('image/jpeg',quality);if(result.length<=200000)break;}
 c.width=c.height=0;if(!safeProof(result))throw Error('Screenshot बहुत बड़ी है। छोटा screenshot चुनें।');return result;
}
function notify(plan,uid){
 if(!uid||!plan||!Number.isFinite(plan.until)||plan.until<=Date.now())return;
 const id=String(plan.activationId||plan.until),key='pai-plus-notice-'+uid;
 try{if(localStorage.getItem(key)===id)return;}catch{}
 if(document.getElementById('paiPlusCelebration'))return;
 const dialog=document.createElement('dialog');dialog.id='paiPlusCelebration';dialog.className='pai-plus-celebration';
 const heading=document.createElement('h2');heading.textContent='आपका Plus सक्रिय हो गया!';
 const star=document.createElement('div');star.className='pai-plus-star';star.textContent='✦';
 const message=document.createElement('p');message.textContent=String(plan.name||'Plus')+' · '+new Date(plan.until).toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata'})+' तक';
 const note=document.createElement('p');note.textContent='Admin ने आपका payment approve कर दिया है। Plus सुविधाएँ अब उपलब्ध हैं।';
 const close=document.createElement('button');close.className='btn';close.textContent='शुरू करें';
 dialog.append(star,heading,message,note,close);document.body.append(dialog);
 const seen=()=>{try{localStorage.setItem(key,id);}catch{}dialog.remove();};
 close.onclick=()=>{dialog.close();seen();};dialog.addEventListener('close',seen,{once:true});dialog.showModal();
 if('Notification' in window&&Notification.permission==='granted')try{new Notification('Panchayat AI Plus सक्रिय',{body:message.textContent,tag:'pai-plus-'+id});}catch{}
}
function openProof(value){
 if(!safeProof(value))return;
 const d=document.createElement('dialog');d.style.cssText='max-width:94vw;max-height:92vh;border:0;border-radius:18px;padding:16px';
 const close=document.createElement('button');close.className='btn';close.textContent='बंद करें';close.onclick=()=>d.close();
 const image=new Image();image.alt='Payment screenshot';image.src=value;image.style.cssText='display:block;max-width:90vw;height:auto;margin:12px 0';
 const download=document.createElement('a');download.className='btn alt';download.textContent='Screenshot डाउनलोड करें';download.href=value;download.download='payment-screenshot.jpg';
 d.append(close,download,image);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
}
window.PAI_PAYMENTS={openProof,validUpi,safeProof,uri,qr,proof,notify};
})();