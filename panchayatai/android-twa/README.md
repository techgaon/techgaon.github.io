# Panchayat AI Android TWA

This wraps the existing live web application at https://techgaon.in/panchayatai/ with Android Browser Helper's Trusted Web Activity launcher.
Google Sign-In remains in the actual Chrome browser context; do not replace with an embedded WebView.
The launcher app name is **Panchayat AI** and Android package ID is `in.techgaon.panchayatai`.

## Signing and updates
The GitHub workflow currently generates a **debug-signed APK for testing only**; it is not Play Store production signed. A pre-existing installation signed with a different certificate cannot be updated by this APK. Install via adb or the device package installer after removing the incompatible old build (back up any unsynced local data first).
A full-screen TWA requires an exact SHA-256 signing certificate entry in https://techgaon.in/.well-known/assetlinks.json; without it, Chrome correctly falls back to a Custom Tab. Do not claim a signed release or Play Store compatibility until a stable release keystore is configured and verified.
The website content is fetched live, so new web updates do not require an APK rebuild.
