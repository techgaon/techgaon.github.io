# Panchayat AI — Gemini → Groq → Cloudflare AI

यह केवल **पंचायत AI** का Live, online AI fallback है; कोई Offline Template या ChatGPT Plus Session इस्तेमाल नहीं किया जाता।

## लागू क्रम

1. **Gemini (Firebase AI Logic)**: Primary. सही काम करने पर Groq को Request नहीं जाएगी।
2. **Groq Free**: Gemini Quota / App Check / Network / Model Error होने पर Worker में `openai/gpt-oss-20b`।
3. **Cloudflare Workers AI**: Groq भी उपलब्ध न हो तो Workers AI binding से `@cf/meta/llama-3.1-8b-instruct-fp8-fast`। Free Tier में भी 10,000 neurons/day की सीमा है। **Cloudflare AI शुरुआत में Disabled है**, क्योंकि Paid Cloudflare Workers account पर free allocation के बाद बिल लग सकता है।

## Live करने का सुरक्षित तरीका

Panchayat AI के GitHub Repository [techgaon/techgaon.github.io](https://github.com/techgaon/techgaon.github.io) पर जाएँ:

**Settings → Secrets and variables → Actions → New repository secret**

निम्न 3 नामों के Secrets जोड़ें:

| GitHub Secret | कहाँ से |
| --- | --- |
| `GROQ_API_KEY` | [Groq Console — API Keys](https://console.groq.com/keys) में नया Free API Key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token, permission Workers Scripts Edit + Zone Workers Routes Edit, zone techgaon.in |

**किसी भी API Key/Token को WhatsApp, ChatGPT, app.js, config.js, HTML या GitHub public file में Paste न करें।** केवल GitHub Secrets में डालें।

फिर Repository की **Actions → Panchayat AI Groq Cloudflare Free Fallback → Run workflow** चलाएँ। Workflow केवल `techgaon.in/panchayatai/api/*` Route पर Worker Deploy करेगा। दूसरी वेबसाइट, Cloudflare Pages या पुराने Apps के Code को नहीं बदलेगा।

Deployment के बाद:
- [Fallback Health](https://techgaon.in/panchayatai/api/ai-health) पर JSON में `configured.groq: true` आए।
- Panchayat AI → AI Help → **AI कनेक्शन जाँचें** में Groq Free Backup: Available आए।
- Gemini को quota मिले तो प्राथमिक उत्तर Gemini से आता रहेगा; Gemini request विफल हो तो Groq चलेगा।

## अतिरिक्त Cloudflare Workers AI चालू करना

Cloudflare Worker का `wrangler.toml` में `ENABLE_CF_AI = "false"` डिफ़ॉल्ट है। Cloudflare **Free** Workers AI Plan और 10,000 free neurons/day की पुष्टि कर लेने के बाद इसे `true` करें और फिर से Deploy करें। Paid Workers पर खर्च हो सकता है; बिना पुष्टि इसे Enable न करें।

## सुरक्षा और सीमाएँ

- Firebase `panchayat-ai-f00d5` का **सही Google Login ID Token** Google Public Keys से Verify होता है।
- बिना Login / गलत Origin / 20 Requests प्रति मिनट से अधिक वाले उपयोगकर्ता की Fallback Request रोकी जाती है। यह Rate Limit Google Provider Quotas से अलग एक सुरक्षा सीमा है।
- Provider API Keys सिर्फ Cloudflare Worker Secrets में रहती हैं; APK/Browser में कभी नहीं।
- PDF/फोटो के Binary Attachments Backup AI को नहीं भेजे जाते। Free Fallback Text/Word दस्तावेज़ों और प्रश्नों के लिए है।
- Text, User Prompt और आवश्यक Profile Context को Groq/Cloudflare को भेजा जा सकता है। संवेदनशील/गोपनीय दस्तावेज़ भेजने से पहले Privacy Notice उपयोगकर्ताओं को दिखाएँ।
- Free Provider की अपने RPM/TPM/दिन की सीमाएँ हैं, इसलिए 24×7 Unlimited Usage की गारंटी नहीं।
- Draft की GP/नाम/तारीख/कानूनी संदर्भ जाँच Panchayat AI के मौजूदा `drafting-core.mjs` से होती है; Backup AI से मिली असत्यापित जानकारी सीधे प्रमाणित नहीं होती।

## Deployment Status

Code/Tests: तैयार। Production Worker को Live करने के लिए उपर्युक्त GitHub Secrets आवश्यक हैं।
