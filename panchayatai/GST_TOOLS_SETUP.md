# Panchayat AI GST Tools — implementation & verification

## Current functionality
- Home cards (after letter/drafting cards): **GST Calculator** and **GST No Detail**, without subtitles.
- GST Calculator is client-side; user picks amount, one of common rates (0, 0.25, 1.5, 3, 5, 18, 40%) or a custom 0–100% rate, inclusive/exclusive amount and intra/inter-State treatment. Results show taxable amount, CGST/SGST or IGST, total GST, total amount and Copy/Clear. **No automatic HSN/SAC determination; applicable rate is the user's responsibility.**
- GST No Detail accepts manual GSTIN, Camera Scan or Gallery Upload. OCR is performed in browser by Tesseract.js; the image itself is not submitted to an API. GSTIN pattern, State code and mod-36 check character are locally checked. GSTIN may contain a PAN; only user-provided/scanned values are processed in this page.
- **Do not call GSTIN format verification a GSTN registration lookup**. It does not prove whether the taxpayer exists, whether their registration is Active, or their true legal name, address, tax scheme, turnover or filing history.
- Official public search link: https://services.gst.gov.in/services/searchtp . Public taxpayer details are displayed on the government portal, subject to its usual CAPTCHA and interface.
- The app does not have an authorized live GSTN/GSP API connected. Until one is configured, the **Full Detail** action opens the official portal, not an in-app official lookup.

## Optional verified in-app lookup contract (future)
Configure an appropriately authorised, secure, same-origin backend endpoint:
```js
window.PAI_GST_LOOKUP_ENDPOINT = "/api/gst/lookup";
```
It must be set before `gst.js` is used. The UI sends `POST` with JSON:
```json
{"gstin": "27AAPFU0939F1ZV"}
```
The trusted backend should validate the GSTIN, enforce rate limits and query a properly authorised GSTN/GSP or licensed data service. Return only supported, actually verified public details, for example:
```json
{
  "verified": true,
  "source": "Authorized GST data provider",
  "checkedAt": "2026-11-23T11:00:00+05:30",
  "data": {
    "legalName": "ONLY IF VERIFIED BY THE API",
    "tradeName": "",
    "status": "",
    "registrationDate": "",
    "constitution": "",
    "address": "",
    "taxpayerType": "",
    "stateJurisdiction": "",
    "centralJurisdiction": ""
  }
}
```
This is a **contract example, not a response to a real GSTIN**. Do not expose provider credentials in public JavaScript, GitHub or Firebase client config. CAPTCHA must not be bypassed or automated in breach of provider rules.

## Verification
Run `node --test panchayatai/gst.test.cjs` from repository root. Test real device Camera permission and Mobile file capture on the deployed HTTPS website before claiming live E2E readiness. Verify the official GST search link separately. Disable camera tracks on navigation.


## GST Home tile update — 24 November 2026

The existing **GST Calculator** tile now opens two animated selections:
1. **Calculate** — English-language GST add/remove calculator. Visible quick-rate 3% was removed; there is no negative GST-rate option. The existing other quick rates and custom rate remain. Shareable results now have **Copy** and **WhatsApp Share** actions and no explanatory paragraph below the result.
2. **GST दरें जानें** — Hindi subtitle: **ईंट, गिट्टी, मौरंग आदि की GST दर जानें**. Select a group, search Panchayat supplies/services, open an item to see reference GST rate, HSN/SAC and classification caveats, then press Calculate to open the same calculator with a prefilled rate. Items without a defensible fixed rate require the user to select/confirm the rate before calculation.

Catalog file: `panchayatai/gst-rates.js`. As of 24 November 2026 it lists 25 goods and service references, each with a public government source link. These values are **a general reference, not a tax invoice or legal opinion**. Confirm classification, ITC conditions, supply date, exemption and any later notifications. General bricks explicitly distinguish special **6% without ITC** and **12% with ITC**; sand-lime bricks have separate treatment. For pure Panchayat sanitation services, labour-only services, transport and potable water the app avoids pretending there is a single universal rate.

Key official sources:
- [PIB GST Council reform recommendations (3 September 2025)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555)
- [PIB GST Council bricks FAQ (2025)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2167151)
- [CBIC GST goods and services rates](https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html)

The frontend has no server-side PDF/database requirement for this catalog. Keep catalog reviewed and updated when notifications change. The rate explorer is not a substitute for official GST tax classification.
