# Admin daily limits and Firebase Rules

The admin screen has **Limits**: Free chats, Free document drafts, Plus chats and Plus document drafts per day (0–500 for Free and 0–1000 for Plus). Values live at `paiSettings/public` in the following fields: `freeDailyChats`, `freeDailyDrafts`, `plusDailyChats`, `plusDailyDrafts`.

The app reads these values and shows an **Upgrade to Plus** popup whenever the Free quota is exhausted. Limits reset at **00:00 Asia/Kolkata**.

**Required security deployment:** The updated limit logic in `panchayatai/firestore.rules` must be merged into the existing Firestore Security Rules in Firebase Console and published. Do not simply replace the entire Firebase project's rules with this file: the Firebase project may host other apps such as FoodGaon. Preserve all unrelated rules and publish only the matching `users` usage control and helper functions with appropriate Firebase Rules editor testing.

After publishing, verify by signing in as a regular test user, setting Free daily drafts to 1 in Admin, creating one draft, and confirming the second attempt shows Upgrade to Plus without proceeding. Restore desired limits afterward. Also verify Plus behavior and that unauthenticated users cannot edit `paiSettings/public`.

The app requires a supported HTTPS browser (typically Chrome) for `SpeechRecognition` in Hindi (`hi-IN`). Microphone permission and device recognition support are required. Text is inserted into the input for review; the app does not automatically send transcriptions.
