(()=>{
 const words=[['You are offline. Connect to send or refresh.','आप Offline हैं। भेजने या Refresh के लिए इंटरनेट जोड़ें।','नेट नाहीं चलत अहै। भेजै या Refresh खातिर नेट जोड़ौ।','नेट ना चलत बा। भेजे भा Refresh खातिर नेट जोड़ीं।']];
 const update=()=>{const e=document.getElementById('connection'),i=['en','hi','aw','bh'].indexOf(document.getElementById('lang').value);e.hidden=navigator.onLine;e.textContent=words[0][Math.max(0,i)];};
 addEventListener('online',update);addEventListener('offline',update);addEventListener('tg-language',update);update();
 document.querySelectorAll('#o-phone,#f-phone').forEach(e=>e.addEventListener('input',()=>e.value=e.value.replace(/\D/g,'').slice(0,10)));
 document.querySelectorAll('[role=status],#o-lmsg,#n-msg,#s-msg').forEach(e=>e.setAttribute('aria-live','polite'));
 document.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
})();
