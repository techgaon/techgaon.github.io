/* Panchayat AI: reference rate list for common Panchayat purchases, 24 Nov 2026.
Do NOT use these rates without HSN, invoice date and applicable notification check. */
(() => {
"use strict";
const cbic="https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html";
const reform="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555";
const bricks="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2167151";
const entries=[
["sand","निर्माण सामग्री","मौरंग / प्राकृतिक बालू",5,"2505","Natural sand; manufactured sand का HSN अलग हो सकता है।",cbic,"मौरंग रेत बालू maurang morang sand"],
["aggregate","निर्माण सामग्री","गिट्टी / Crushed Stone",5,"2517","Road और concrete aggregates; अन्य processed stone की classification देखें।",cbic,"गिट्टी बजरी gitti bajri gravel aggregate"],
["cement","निर्माण सामग्री","सीमेंट / Cement",18,"2523","22 सितंबर 2025 से 28% के स्थान पर 18%।",reform,"सीमेंट cement opc ppc"],
["bricks-noitc","निर्माण सामग्री","साधारण ईंट",6,"6904 10 00","बिल और लागू अधिसूचना से दर की पुष्टि करें।",bricks,"ईंट eent brick clay kiln"],
["flyash-noitc","निर्माण सामग्री","Fly Ash ईंट",6,"6815","विशेष ईंट व्यवस्था; सही माल और विक्रेता की invoice जाँचें।",bricks,"फ्लाई ऐश fly ash brick"],
["interlock","निर्माण सामग्री","इंटरलॉकिंग ईंट / कंक्रीट पेवर ब्लॉक",18,"6810","कंक्रीट या सीमेंट के पेवर ब्लॉक; बिल में HSN मिलाएँ।",cbic,"इंटरलॉक ईंट इंटरलॉकिंग interlock interlocking paver concrete block"],
["sandlime","निर्माण सामग्री","Sand-Lime Bricks",5,"68","Sand-lime brick साधारण पकी ईंट से अलग माल है।",reform,"रेत चूना ईंट sand lime"],
["steel","निर्माण सामग्री","सरिया / TMT Steel",18,"7213–7215","Steel bar/rod; exact HSN को invoice से मिलाएँ।",cbic,"सरिया लोहा sariya tmt steel"],
["tiles","निर्माण सामग्री","Ceramic Tiles",18,"6907","Ceramic floor/wall tile; stone tile की category अलग हो सकती है।",cbic,"टाइल tiles floor"],
["paint","निर्माण सामग्री","Paint / Varnish",18,"3208/3209","Paint के प्रकार का HSN मिलाएँ।",cbic,"रंग पेंट paint"],
["aluminium","निर्माण सामग्री","Aluminium Windows / Frames",18,"7610","Aluminium structural frames; fitting service अलग supply हो सकती है।",cbic,"खिड़की aluminium frame window"],
["pipe","जलापूर्ति व स्वच्छता","PVC / UPVC Pipes",18,"3917","Plastic pipes और fittings; exact classification जाँचें।",cbic,"पाइप pipe pvc upvc जल"],
["tap","जलापूर्ति व स्वच्छता","नल / Taps & Valves",18,"8481","Taps और valves; invoice HSN जाँचें।",cbic,"नल टोंटी tap valve"],
["toilet","जलापूर्ति व स्वच्छता","Ceramic Toilet / Wash Basin",18,"6910","Ceramic sanitary fixtures; plastic/steel की दर अलग हो सकती है।",cbic,"शौचालय toilet washbasin latrine"],
["pump","जलापूर्ति व स्वच्छता","Water Pump",18,"8413","Liquid pumps; अलग electric motor का HSN भिन्न हो सकता है।",cbic,"पंप motor pump पानी"],
["wire","बिजली व उपकरण","Electrical Wires / Cables",18,"8544","Insulated wires and cables।",cbic,"बिजली तार wire cable"],
["civil","सेवाएँ","सामान्य Civil Works Contract",18,"SAC 9954","Taxable construction works contract की सामान्य दर; सरकार को दी गई विशिष्ट services और exemption की शर्तें जाँचें।",cbic,"निर्माण ठेका works contract nirman"],
["plumbing","सेवाएँ","Plumbing Installation Contract",18,"SAC 9954","Taxable installation/works contract; pure service छूट का परीक्षण करें।",cbic,"प्लंबिंग plumber पाइप fitting"],
["electrical","सेवाएँ","Electrical Installation Contract",18,"SAC 9954","सामान्य taxable installation/works contract; कार्य की प्रकृति जाँचें।",cbic,"electrical बिजली फिटिंग wiring"],
["consult","सेवाएँ","Engineering / Technical Consultancy",18,"SAC 9983","Taxable technical consultancy की सामान्य दर; विशिष्ट exemptions देखें।",cbic,"engineering consultant design estimate"],
["clean","विशेष जाँच","पंचायत सफाई / Sanitation Service",null,"SAC / 243G","अनुच्छेद 243G के पंचायत कार्यों हेतु pure services पर शर्तों सहित exemption हो सकती है; एक दर नहीं लगाई जा सकती।",cbic,"सफाई swachhta cleaning sanitation"],
["transport","विशेष जाँच","माल परिवहन / Transport",null,"SAC 9965","GTA/गैर-GTA, RCM और invoice के अनुसार कर-व्यवस्था बदलती है।",cbic,"परिवहन transport truck freight"],
["labour","विशेष जाँच","केवल श्रम / Labour Service",null,"SAC जाँचें","कार्य की शर्तें, रोजगार संबंध और छूट जाँचें; एक ही GST दर नहीं।",cbic,"श्रम मजदूरी labour mazdoor"],
["water","विशेष जाँच","पेयजल आपूर्ति / Water Supply",null,"HSN/SAC जाँचें","नगर निकाय की supply, सामान्य potable water और packaged water का tax treatment भिन्न है।",cbic,"जल आपूर्ति water पानी"]
].map(([id,group,name,rate,hsn,note,source,keywords])=>({id,group,name,rate,hsn,note,source,keywords}));
window.PAI_GST_RATES=Object.freeze(entries);
})();
