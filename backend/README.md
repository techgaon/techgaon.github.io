# TechGaon enquiries

The static website submits validated requests to `techgaonEnquiries` in the existing Firebase project. The dedicated Firebase Authentication user for TechGaon administration can read requests and change their status/private notes. Public listing, document reads, updates and deletes are denied. Visitors can only create the constrained enquiry schema.

The Firebase API key in browser code identifies the project; the Firebase Auth credential and Firestore rules enforce access. The selected admin PIN is not stored in the website source. Login tokens are kept in tab memory and expire; logout clears them. Authentication is independent of the FoodGaon trial-phone identities.

`enquiries.rules` contains only the deployed TechGaon collection block. It belongs inside the existing `match /databases/{database}/documents` block; it is not a standalone replacement ruleset. The existing FoodGaon rules were preserved during deployment. Keep this collection block when deploying database rules in future. Never replace the deployed rules with an older FoodGaon-only copy. The full prior ruleset backup stays in the local verification folder.

The rule template uses `ADMIN_FIREBASE_UID` as a placeholder; substitute the dedicated administrator UID privately before deployment. Do not deploy the placeholder unchanged.

The form provides no automated email/WhatsApp notification. The administrator checks `/admin/` and uses Refresh. Quotation/agreement references may be recorded as private notes; this is not a customer document portal or an electronic-signature service.
