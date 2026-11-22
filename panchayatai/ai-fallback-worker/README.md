# Panchayat AI free AI backups — 22 November 2026

The existing Karmchari News publisher was inspected. Its code supports Gemini,
Groq and Cloudflare. Its repository currently has Cloudflare credentials but no
Groq key. Those settings are not proof that all three providers are live.

The Panchayat AI app already contains Gemini-first fallback integration for
chat, drafts and Hindi spelling suggestions. The secure Worker validates the
Firebase ID token, restricts the site origin, rate-limits signed-in users, keeps
keys off the public website and tries Groq before Cloudflare. Malformed JSON
from a provider is rejected so that it cannot become a broken draft.

## Verified limits and actual deployment status

- Cloudflare account fc14ce3ea45e9966cc8933371cecc0ad was verified on the Free
  Workers plan. Workers AI has a 10,000-neuron daily free allocation. No paid
  plan or automatic upgrade was selected.
- The Worker named panchayat-ai-fallback was created. It is still the initial
  placeholder; the actual fallback code has NOT been successfully deployed.
- Deployment run https://github.com/techgaon/karmcharinews/actions/runs/44976690524
  passed all 10 server tests, then failed because the existing token has no
  access to deploy this Worker. No permission or existing key was broadened.
- The client dedicated-host adapter passes 4 additional tests. Application
  configuration must only be switched after the deployed health check and a
  signed-in request succeed. There is no live second/third-provider guarantee.

## Concrete remaining setup

In techgaon/karmcharinews repository Actions secrets, add:

1. PANCHAYAT_CLOUDFLARE_DEPLOY_TOKEN: a separate token scoped to the verified
   account, with Workers Scripts Edit and Workers AI Read. Leave the existing
   CLOUDFLARE_API_TOKEN unchanged so news publishing is unaffected.
2. GROQ_API_KEY: a Groq Free API key for the intended account/project.

The owner should complete login/credential creation and enter values directly
in encrypted secrets, never in chat or public source files. Creating a token
grants deployment access; it requires the owner's action-time approval.

Run Actions > Deploy Panchayat AI backups with existing account secrets >
Run workflow. It is manual-only and pins the reviewed source commit. It changes
only the Panchayat Worker, not the main website DNS or other apps.

Expected health endpoint:
https://panchayat-ai-fallback.surajbhanpandey853.workers.dev/panchayatai/api/ai-health

It must return status online and configured.groq/configured.cloudflare true.
Then set PAI_CONFIG.aiFallback.endpoint to the same host's
/panchayatai/api/ai-fallback path and test an authenticated request with Gemini
unavailable. The client permits only the app origin or that exact Worker host.

The backup is text/Word only. Binary PDF/photo attachments are explicitly
rejected rather than silently omitted. All free providers have quotas; if all
providers are unavailable the app must give an honest retry message and must
not invent a completed letter. This does not use ChatGPT Plus sessions.
