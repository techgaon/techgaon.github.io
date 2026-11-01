const base='https://firestore.googleapis.com/v1/projects/petpyaar-a3ea6/databases/(default)/documents/techgaonEnquiries';
const strings={en:['Send enquiry','Sending…','Your enquiry is saved. Reference: ','Could not save. Please try again or contact us on WhatsApp.'],hi:['Enquiry भेजें','भेज रहे हैं…','आपकी enquiry सहेज ली है। संदर्भ: ','Enquiry नहीं भेज पाए। फिर कोशिश करें या WhatsApp पर संपर्क करें।'],aw:['अपन बात भेजौ','भेजित हई…','आपकै बात सहेज ली गई। संदर्भ: ','बात नाहीं भेज पाए। फिर कोशिश करौ या WhatsApp पर बतावौ।'],bh:['आपन बात भेजीं','भेजत बानी…','रउरा बात सहेज लिहल गइल। संदर्भ: ','बात ना भेजा सकल। फेर कोशिश करीं भा WhatsApp पर बताईं।']};
const form=document.getElementById('enq'), button=document.getElementById('enq-submit'),result=document.getElementById('enq-result');
const value=id=>document.getElementById(id).value.trim();
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled||!form.reportValidity())return;
 if(value('f-website'))return;
 const lang=document.querySelector('.langs [aria-pressed="true"]')?.dataset.lang||'en',t=strings[lang]||strings.en;
 button.disabled=true;button.textContent=t[1];result.textContent='';
 const data={name:value('f-name'),phone:value('f-phone').replace(/\D/g,''),email:value('f-email'),kind:value('f-type'),message:value('f-msg'),budget:value('f-budget'),timeline:value('f-timeline'),status:'new'};
 const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,{stringValue:v}]));fields.createdAt={timestampValue:new Date().toISOString()};
 try{
  const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});
  if(!response.ok)throw Error('Save failed');const saved=await response.json();
  result.textContent=t[2]+saved.name.split('/').pop();result.style.color='var(--leaf)';form.reset();
  document.getElementById('wa-send').href='https://wa.me/919129203268';
 }catch{result.textContent=t[3];result.style.color='#b33a22';}
 finally{button.disabled=false;button.textContent=t[0];}
});
