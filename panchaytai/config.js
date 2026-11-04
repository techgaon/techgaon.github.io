// ===== पंचायत AI — कॉन्फ़िग (डिप्लॉय से पहले ये मान भरें) =====
window.PAI_CONFIG = {
  appName: "PANCHAYT AI",
  appUrl: "https://techgaon.in/panchaytai",
  companyName: "TechGaon AI Services",
  companyUrl: "https://techgaon.in",

  // Firebase Console > Project settings > Web app (Suraj Bhan Pandey वाला TechGaon Firebase प्रोजेक्ट)
  firebase: {
    "apiKey": "AIzaSyDT64So3GzCSwaFCr1zp92ZKcIO9Suk3Lc",
    "authDomain": "panchayat-ai-f00d5.firebaseapp.com",
    "projectId": "panchayat-ai-f00d5",
    "storageBucket": "panchayat-ai-f00d5.firebasestorage.app",
    "messagingSenderId": "411636009403",
    "appId": "1:411636009403:web:2fcee0c1db23cf3f7a5c9e"
},

  // Gemini: Firebase AI Logic (Gemini Developer API) — key Firebase में सुरक्षित, निःशुल्क Spark प्लान
  geminiModel: "gemini-flash-lite-latest",
  recaptchaSiteKey: "6Lcmdw8uAAAAALp9S2hlQaEAiLe72Att_nX7pq4G", // App Check (public site key)

  // मूल GO/नियम PDF कहाँ रखी हैं. फ़ाइल नाम: <ID>.pdf
  pdfBase: "https://panchayat-ai-f00d5.web.app/go/",

  // UPI भुगतान (FoodGaon की तरह केवल UPI)
  upi: { vpa: "REPLACE_ME@upi", payeeName: "TechGaon AI Services" },
  plans: {
    free:   { label: "निःशुल्क", price: 0, dailyChats: 10, dailyDrafts: 3 },
    plus:   { label: "Plus मासिक", price: 49, days: 30 },
    yearly: { label: "Plus वार्षिक", price: 499, days: 365 }
  },
  whatsapp: "919129203268"
};
