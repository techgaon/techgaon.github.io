# Panchayat AI — remaining owner activation

Admin and UPI are outside this update.

## Existing project

Firebase project: `petpyaar-a3ea6`. Use its existing web app; do not create or replace the FoodGaon project.

1. In Firebase Authentication, enable the Google provider and add `techgaon.in` as an authorized domain. Test a successful account sign-in on the published app. Existing Google account credentials must remain private.
2. In Firebase AI Logic, complete the Gemini Developer API setup. Register the production web app with App Check, using the production reCAPTCHA site key for the site's real domains. Keep enforcement on. Do not publish an AI API secret or use an App Check debug token in production.
3. Update `panchayatai/runtime.json`: set `ai.enabled` to `true` and supply the public `ai.appCheckSiteKey`. The model currently selected is `gemini-2.5-flash-lite`. A successful live request is required before claiming that AI is active.
4. To activate cross-device profile/draft sync, merge `panchayat-firestore.rules` into the existing Firestore rules under the database documents block. Preserve all unrelated rules. Set `cloud.enabled` to `true` only after verifying that one Google account cannot read another account's `panchayatUsers/{uid}` document.

No API secrets are requested in chat, browser local storage, or source files.

## Data and validation

- The district importer reads the official UP Panchayati Raj PB3 report. It retains district/block/GP names and GP LGD codes, retrieval dates and source dates. It stores no official phone numbers or personnel records. Conflicting LGD codes are blanked and marked for review.
- `Panchayat verified-source Hindi OCR` reads only public government source documents whose SHA-256 matches the original manifest. Missing sources, changed files and unreadable pages remain unresolved; coverage is measured, never assumed.
- Source search rejects legacy-font text whose encoding is visibly corrupted. Such pages are added to the OCR queue rather than being supplied to the AI as reliable text.
- Cited-page export verifies original-file checksums and exact passage positions. It fails visibly if the original PDF or a highlight position cannot be verified. Only cited original pages are included; full master collections are not exposed as download buttons.
- The current static host does not store the complete multi-GB original collection. Some references can be read as text but cannot yet be exported; complete export coverage needs suitable object storage and a source-file migration. The existing small verified originals remain available.

## Verification completed in this change

- Source catalog/role behavior checks and JavaScript syntax checks.
- Mixed text + scanned PDF reading, selected-page bounds and PDF cleanup tests.
- Rejection of invented and missing AI citations; HTML escaping; English query case normalization.
- Official Haidargarh seed records: Kamela 51946, Khanpur 51948, Sandva 51969.

Live model responses, cross-account database isolation, Google account completion and full-corpus OCR coverage require the activation/data jobs above and must not be described as already verified.
