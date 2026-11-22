# Panchayat AI — free online backups

## Live status — 22 November 2026

Gemini stays primary. If it fails, the authenticated Worker tries Groq and then
Cloudflare Workers AI. No offline letter generator or ChatGPT Plus session is
used.

- Worker deployed: https://panchayat-ai-fallback.surajbhanpandey853.workers.dev
- App endpoint: /panchayatai/api/ai-fallback on that dedicated host.
- Health: /panchayatai/api/ai-health reports both providers configured.
- Groq: real JSON generation succeeded. A sample Hindi letter generated using
  the actual drafting-core request passed the app's validation and rendering.
- Cloudflare: binding and configuration are active, but the live generation
  check currently returns HTTP 429 for the daily free allocation. It is not
  currently available for a successful generation.
- GitHub Pages app deployment succeeded.

Verified deployment and generation run:
https://github.com/techgaon/karmcharinews/actions/runs/44979256707

## Safety and limits

Firebase ID tokens are signature-verified for panchayat-ai-f00d5. Wrong origins
and unauthenticated requests are rejected. The Worker limits each user to 20
requests/minute and never logs letters, profile data, provider keys or tokens.
The public client accepts only the app origin or the exact dedicated Worker
host and does not follow redirects with the login token.

Provider JSON is validated before it is accepted. Malformed Groq replies fall
through to Cloudflare. Cloudflare string and structured-object JSON responses
are supported. The ordinary drafting-core checks still apply to generated
letters. Binary PDF/photo attachments are explicitly rejected by text-only
backups; Word/plain text is supported.

The Cloudflare account was verified on the Free Workers plan. No paid upgrade
or automatic billing change was selected. All free providers have quotas; when
all providers are unavailable the app returns an honest error, never a fake
completed letter.

## Maintenance

Manual deployment workflow:
techgaon/karmcharinews/.github/workflows/panchayat-backups.yml

Its reviewed source commit is pinned. Deployment is manual-only. It uses the
owner's encrypted GROQ_API_KEY and separate
PANCHAYAT_CLOUDFLARE_DEPLOY_TOKEN. Existing news credentials and publisher code
are unchanged. Source updates require reviewing and updating that pinned ref.

The deployment normalizer accepts a raw token or the single official Cloudflare
verification curl example. It extracts the unique Bearer value without ever
executing the pasted command and masks normalized credentials before use.

## Verification scope

Targeted fallback, authentication, origin, quota switching and JSON tests passed.
A real Groq Hindi letter was also validated and rendered successfully.
The separate repository drafting/letterhead CI currently has 3 failing assertions
around GP aliases and letterhead intent; those are outside the fallback module:
https://github.com/techgaon/techgaon.github.io/actions/runs/44979193851
