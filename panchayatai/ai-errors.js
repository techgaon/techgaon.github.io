/* Panchayat AI — actionable Firebase AI Logic diagnostics.
   Do not expose URL query parameters, API keys, Firebase tokens, or raw payloads. */
(() => {
 "use strict";
 const message = x => String(x ?? "");
 function redact(value){
   return message(value)
     .replace(/https?:\/\/[^\s"'<>]+/gi,"[URL]")
     .replace(/AIza[0-9A-Za-z_-]{20,}/g,"[API KEY]")
     .replace(/(authorization|x-firebase-appcheck|access_token|id_token|key)=?[=:]\s*([^\s,;&]+)/gi,"$1=[HIDDEN]")
     .replace(/[A-Za-z0-9_-]{120,}\.[A-Za-z0-9_-]{60,}\.[A-Za-z0-9_-]{30,}/g,"[TOKEN]")
     .slice(0,300);
 }
 function explain(error,stage="AI"){
   const code=message(error?.code||"");
   const original=message(error?.message||error||"");
   const all=(code+" "+original).toLowerCase();
   const statusMatch=all.match(/\b(400|401|403|404|408|409|429|500|502|503|504)\b/);
   const http=statusMatch?Number(statusMatch[1]):null;
   const result={stage,code:"AI_UNKNOWN",status:http,
     title:"AI सेवा से उत्तर नहीं मिला",
     message:"AI अनुरोध सफल नहीं हुआ। कुछ देर बाद दोबारा प्रयास करें।",
     action:"अधिक जानकारी के लिए AI कनेक्शन जाँचें खोलें।",
     technical: redactedTechnical()};
   function redactedTechnical(){return redact(code+" "+original);}
   function set(id,title,msg,action){
     result.code=id;result.title=title;result.message=msg;result.action=action;return result;
   }
   if(/ai_backup_not_deployed|ai_backup_not_configured|ai_backup_disabled|free ai fallback सेटअप अधूरा/i.test(all))
     return set("AI_BACKUP_SETUP","Gemini और Free AI बैकअप दोनों उपलब्ध नहीं",
       "Gemini उपलब्ध नहीं है और Groq Worker का Deployment या API Key सेटअप अभी पूरा नहीं हुआ।",
       "Admin: GitHub Repository → Actions Secrets में GROQ_API_KEY और Cloudflare credentials देकर Fallback Workflow चलाएँ।");
   if(/backup_exhausted|ai_backup_http_503|ai_all_providers_failed/.test(all))
     return set("AI_BACKUP_EXHAUSTED","सभी AI Providers की सीमा पूरी",
       "Gemini और उपलब्ध Free Backup Providers ने इस अनुरोध को पूरा नहीं किया।",
       "कुछ देर बाद प्रयास करें; Admin Groq/Cloudflare Free Tier की स्थिति जाँचें।");
   if(/ai_backup_text_only/.test(all))
     return set("AI_BACKUP_TEXT_ONLY","Free Backup केवल Text/Word के लिए",
       "Gemini के बिना PDF/फोटो का सुरक्षित AI विश्लेषण संभव नहीं है।",
       "संवेदनशील PDF/फोटो के लिए Gemini कनेक्शन ठीक होने पर पुनः प्रयास करें।");
   if(/user_rate_limit/.test(all))
     return set("AI_BACKUP_BURST_LIMIT","Free Backup के सुरक्षा अनुरोधों की सीमा",
       "अचानक बहुत अधिक अनुरोध होने के कारण थोड़ी देर का सुरक्षा विराम लगा है।",
       "करीब एक मिनट बाद फिर प्रयास करें।");
   if(/(?:ai could not load|module not loaded|module.*load|failed to load module|importing a module)/.test(all))
     return set("AI_MODULE_NOT_LOADED","AI मॉड्यूल लोड नहीं हुआ",
       "AI की आवश्यक Script पूरी तरह लोड नहीं हो सकी।",
       "Internet जाँचें, ऐप पूरी तरह बंद करके खोलें या Refresh करें; फिर AI कनेक्शन जाँचें चलाएँ।");
   if(/(?:re.?captcha|app.?check|attestation|appcheck|attest(?:ation)?)/i.test(all)
      &&/token|failed|invalid|enforc|permission|403|blocked|unauthoriz|captcha|denied/.test(all))
     return set("AI_APP_CHECK", "App Check की जाँच आवश्यक",
       "इस डिवाइस से Firebase App Check का वैध Token नहीं मिल रहा या अनुरोध अस्वीकार हुआ।",
       "Admin: Firebase Console → App Check में इस Web App की reCAPTCHA Enterprise Key, मान्य Domain और AI Logic Enforcement जाँचें।");
   if(/(?:has been deactivated|enforce firebase app check|to access this model, you must enforce)/.test(all))
     return set("AI_APP_CHECK","Firebase AI सेवा App Check से अवरुद्ध",
       "Firebase AI Logic के लिए वैध App Check Token या Enforcement की पुष्टि आवश्यक है।",
       "Admin: Firebase Console → App Check → APIs में Firebase AI Logic और Web App Registration जाँचें।");
   if(/(?:caller does not have permission|api key.*different|project.*mismatch)/.test(all))
     return set("AI_PROJECT_KEY","Firebase Project / API Key में असंगति",
       "AI के लिए प्रयुक्त Firebase API Key और Project की पहचान मेल नहीं खा रही हो सकती है।",
       "Admin: Firebase Project Settings की Web App Configuration को मौजूदा ऐप से मिलाएँ।");
   if(/(?:requests to this api|api.*blocked|api_key_service_blocked|api key.*restricted)/.test(all))
     return set("AI_API_RESTRICTION","Firebase AI API पर प्रतिबंध",
       "Google Cloud API Key की Restrictions ने Firebase AI Logic अनुरोध रोका है।",
       "Admin: Google Cloud → APIs & Services → Credentials में firebasevertexai.googleapis.com API की अनुमति जाँचें।");
   if(/(?:genai config not found|not configured|not enabled|not been enabled|has not been used in project)/.test(all))
     return set("AI_SETUP","Firebase AI Logic सेटअप अधूरा",
       "इस Firebase Project पर AI Logic/Gemini Provider का सेटअप या API सक्षम नहीं दिख रहा।",
       "Admin: Firebase Console → AI Services → AI Logic में Gemini Developer API और Project जाँचें।");
   if(/(?:model.*not found|was not found|model.*not support|unknown model)/.test(all)&&http===404)
     return set("AI_MODEL_NOT_FOUND","Gemini Model उपलब्ध नहीं",
       "Firebase Project या चुने हुए Provider को इस Gemini Model की पहुँच नहीं है।",
       "Admin: Firebase AI Logic की Supported Models सूची और Project की Provider Setting जाँचें।");
   if(/(?:quota|resource_exhausted|rate.?limit|too many requests|overloaded)|\b429\b/.test(all))
     return set("AI_RATE_LIMIT","Gemini सेवा की Rate Limit",
       "ऐप में Unlimited होने पर भी Google की AI Request Limit अलग से लागू रहती है।",
       "कुछ देर बाद पुनः प्रयास करें; Admin को Gemini Provider का कोटा जाँचना होगा।");
   if(/(?:permission.?denied|forbidden|unauthorized)|\b(401|403)\b/.test(all))
     return set("AI_PERMISSION","AI अनुरोध को अनुमति नहीं मिली",
       "Firebase/Google ने अनुरोध अस्वीकार किया। App Check, API Key Restrictions या Project की स्थिति कारण हो सकती है।",
       "Admin: AI Connection Check चलाएँ और Firebase Console में App Check तथा AI Logic Metrics देखें।");
   if(/(?:failed to fetch|network|offline|cors|dns|net::|timeout)|\b(408|502|503|504)\b/.test(all))
     return set("AI_NETWORK","AI सर्वर से कनेक्शन नहीं बना",
       "नेटवर्क या Google AI सेवा अस्थायी रूप से उपलब्ध नहीं है।",
       "Internet जाँचकर फिर प्रयास करें। यदि बार-बार आए तो Error Code Admin को भेजें।");
   if(/(?:json|parse|unexpected token|invalid argument|invalid value)|\b400\b/.test(all))
     return set("AI_RESPONSE_FORMAT","AI ने स्वीकार्य उत्तर नहीं दिया",
       "AI से मिला उत्तर अपेक्षित प्रारूप में नहीं है।",
       "छोटा विषय लिखकर पुनः प्रयास करें। बार-बार आने पर Admin को Error Code भेजें।");
   return result;
 }
 function asError(error,stage="AI"){
   const d=explain(error,stage);
   const safe = new Error(d.title+" — "+d.message+" ["+d.code+"]");
   safe.code=d.code;safe.info=d;safe.cause=error;
   return safe;
 }
 window.PAI_AI_ERRORS={explain,asError,redact};
})();