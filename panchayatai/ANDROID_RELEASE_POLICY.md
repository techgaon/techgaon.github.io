# Panchayat AI Android release policy — 25 November 2026

Owner requirement: the Android client must be an independently versioned, installable app. Website updates must not change the installed client's UI, JavaScript, CSS, or client features. Client changes require a new APK (or Play Store AAB update). No live website wrapper or remote code hot-update mechanism for the production app.

## Implementation requirements

- Package all first-party client HTML, JS, CSS, icons and other executable UI assets inside the APK, or implement native UI. Use a local asset origin in a packaged hybrid app; do not configure a remote server URL or fetch executable UI code from techgaon.in. The existing android-twa project is a legacy test wrapper, not the target production architecture.
- Keep online AI inference, GO document/index retrieval, news, authentication, profile sync and admin data/limits online through versioned, authenticated APIs. Server data can change without an APK release; preserve compatibility for installed client versions. No secrets inside APK assets.
- Integrate supported native Google sign-in and Firebase authentication/App Check; verify origin and CORS for authenticated backup requests without weakening security. Keep existing Google accounts and profile records. No embedded Google OAuth login page.
- Preserve existing package identity and signing certificate where available; increment versionCode on each release. Do not publish a debug build as a production update. Preserve user data during upgrades.
- Latest web AI fallback fix (c14b2df918c1cf0769f35b2604daae64a5fb5476) must be included in the new packaged app; test both Gemini and actual authenticated fallback, as well as draft generation, Hindi profile, GO search/download and device attachments.

## Release gate

1. Install version A, change web UI, reopen A; installed UI and client features remain unchanged while online content stays functional.
2. Install signed version B over A, verify new client UI and retained sign-in/profile; check package, version and signature.
3. Verify AI Help on an actual Android device, including Gemini failure and backup inference; test web separately.
4. Verify APK and AAB outputs before distributing. Do not claim this policy has been implemented until the above checks pass.

This document records requirements only. No Android binary or production migration is produced by this commit.
