# Cashbook return messages (web)

Admin → Cashbook → कारण सहित वापस भेजें opens the reason category and an
always-visible, mandatory custom message (trimmed, 1–500 characters). Selecting
a preset category alone is insufficient. Existing returnReason stores the exact
typed message; returnCode stores the category. returnedAt is a server timestamp
and returnedBy is the authenticated administrator UID. Returning uses a
transaction and accepts pending, in_progress, ready, or already returned requests;
an incomplete upload or deletion cannot be returned.

Both owner request and download screens display the escaped message with line
breaks. Correction follows the existing workflow: upload a corrected PDF as a
new request, keeping the original returned request and its message visible.
There is no in-place rewrite of the original statement. Existing start and
PDF/Excel publish/download paths are retained. Returned output descriptors are
cleared as before; old output chunks remain inaccessible to owners.

## Security and deployment

cashbook-firestore.rules is the additive helper/match block. firestore.rules
includes it for complete local validation. For production, retrieve CURRENT live
rules and replace only the existing cashbook block (or insert the block if absent).
Do not replace other live rules with this repository's older non-cashbook rules.
This release preserves the current live non-cashbook rules byte-for-byte after
normalizing line endings. The deploy config must target panchayat-ai-f00d5 and
only Firestore rules; no indexes or other app resources are changed.

Only the verified administrator can return a request. Rules validate message
type, length and non-whitespace content, authenticated returnedBy, server time,
immutable owner/statement and allowed changed fields. Owners cannot forge or edit
the admin message/status. Legacy returned records without returnedBy stay readable.
These are prototype security rules with emulator and compilation verification;
review them before broader distribution.

## Verification

Install firebase, @firebase/rules-unit-testing and jsdom in a separate test
directory (or expose them through NODE_PATH). Start a Firestore emulator with
project demo-cashbook and set FIRESTORE_EMULATOR_HOST. Run:

    node --test panchayatai/cashbook-return.test.cjs

CASHBOOK_RULES can select a merged production rules file for the integration
test. The test never uses production data. Tests cover typed-message validation,
transaction states/audit fields, visible textarea, escaped owner messages,
owner-only queries, forged metadata, unverified admins, invalid return messages,
start/publish/download, returned-file protection, and new corrected requests.

Web cache: pai-v56-cashbook-return-message-20261125, cashbook.js asset query
20261125-cashbook-return-message1. app.js already mounts both owner screens and
the admin Cashbook panel, so it needs no changes. The bundled web/ native copy
and APK build are outside this web-only release.
