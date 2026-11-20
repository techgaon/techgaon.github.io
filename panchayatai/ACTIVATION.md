# Panchayat AI — remaining owner activation

Admin and UPI are outside this update.

## Existing project

Firebase project: `petpyaar-a3ea6`. Use its existing web app; do not create or replace the FoodGaon project.

1. In Firebase Authentication, enable the Google provider and add `techgaon.in` as an authorized domain. Test a successful account sign-in on the published app. Existing Google account credentials must remain private.
2. In Firebase AI Logic, complete the Gemini Developer API setup. Register the production web app with App Check, using the production reCAPTCHA site key for the site's real domains. Keep enforcement on. Do not publish an AI API secret or use an App Check debug token in production.
3. Update `panchayatai/runtime.json`: set `ai.enabled` to `true` and supply the public `ai.appCheckSiteKey`. The model currently selected is `gemini-2.5-flash-lite`. A successful live request is required before claiming that AI is active.
4. To activate cross-device profile/draft sync, merge `panchayat-firestore.rules` into the existing Firestore rules under the database documents block. Preserve all unrelated rules. Set `cloud.enabled` to `true` only after verifying that one Google account cannot read another account's `panchayatUsers/{uid}` document.

No API secrets are requested in chat, browser local storage, or source files.

## Reference database status

The old bundled Acts, Rules, GO, Order PDFs and corpus were disconnected and removed from the published branch on 20 November 2026. AI answers general questions using its model and optional live Google Search; it does not quote or rely on old document indices. Future original PDFs must be added explicitly in `reference-pdfs/` and listed in `data/verified-pdfs.json` using exact titles or official numbers. Nothing is auto-imported from the removed collection.
