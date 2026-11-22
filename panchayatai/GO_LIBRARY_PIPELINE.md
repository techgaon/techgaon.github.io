# Panchayat AI — GO Library ingestion plan (not yet imported)

## Current status (22 Nov 2026)
- App has a separate **GO Search** tile and a non-AI lookup route in normal AI Chat.
- The public search manifest `data/go-index.json` intentionally contains `[]`: **no real GO documents have been imported yet**.
- The user is uploading a separate, approximately 6 GB `GO ACT ETC.zip` from another Google Drive account. Do not confuse it with the previously reviewed 2.64 MB `AI TRAINING.zip` of letter samples.
- Do not present documents as indexed, downloadable, or available until the final storage objects have passed verification.

## Safe, resumable processing workflow
1. Get the exact accessible Drive link after the 6 GB upload completes. Download using a resumable/streamed transfer onto a processing machine with enough disk for ZIP + expanded files + working output and backups. Record original SHA-256 and ZIP size. Do **not** route 6 GB through the live browser or the GitHub Pages repository.
2. Inventory the archive before extraction (filenames, extension, compressed/uncompressed size, CRC, paths). Block ZIP slip paths (`..`, absolute paths), symlinks, hidden executables, decompression bombs, password-protected entries and corrupt files. Keep source unchanged.
3. Create three review sets: **Official candidate**, **Unrelated / exam material** (UPPCS, UPSC, PET, coaching notes, question papers etc.), and **Needs manual review**. Classify using filename, document text and cover/header, not filename alone. Do not drop unclear PDFs automatically.
4. For each candidate, validate PDF signature and readability; extract first-page header, department, GO/order number, date, title and page count. If image-only, run OCR once at ingest and flag OCR confidence for verification. Do not ask an AI model to invent missing metadata or legal authority.
5. Compute SHA-256 over binary bytes to remove exact duplicates from the upload set, keeping an audit record of duplicate source paths. Separately compare normalized extracted text to flag near-duplicates and scans. **Do not merge amendments, rescissions, different dates, translations, annexures or legally different versions** just because they look similar.
6. Check potentially sensitive records before publication: private HR/service books, personal details, financial accounts, signatures and internal files are quarantined or redacted based on publication rights. Publish only verified official public documents.
7. Generate an audit report with source path, reason included/excluded, checksum, page count, metadata and review status; stage the selected originals without changing or deleting the master ZIP.
8. Upload in resumable batches to a **dedicated object-storage bucket/prefix**, e.g. Cloudflare R2 or Firebase Storage specifically configured for Panchayat AI GO documents. Use immutable unique object keys and verify remote SHA-256/size and spot-check full PDF opening. Do not overwrite other apps' Firebase Storage rules, buckets or data. The static app on GitHub Pages is **not** the 6 GB file server.
9. Publish searchable metadata only after remote verification. The current UI supports curated `data/go-index.json` entries with `id`, `title`, `officialNumber`, `department`, `date`, `keywords`, `aliases`, and a safe `https://...` `url` to the real PDF. Add Hindi and Roman Hindi aliases for key terms.
10. Verify search and download using real examples; test full PDF, failed/missing object handling, duplicate exclusions and AI-outage behavior. Preserve the originals and an independent backup until validation is signed off. Delete the Drive staging ZIP only after all steps and an independent backup are complete.

## Preview and relevant-page PDF
The first release can provide PDF preview / the **whole verified original PDF** via the link. To provide only the relevant pages, prepare page-level text and page references at ingest, then create excerpt PDFs server-side from original pages with cited source name, document ID and page numbers. Do not suggest excerpt downloads are already implemented.

## Search manifest format
```json
[
  {
    "id": "sha256-or-verified-id",
    "title": "सत्यापित मूल शीर्षक",
    "officialNumber": "सत्यापित GO संख्या",
    "department": "विभाग",
    "date": "YYYY-MM-DD",
    "keywords": ["पंचायत सहायक", "नियुक्ति"],
    "aliases": ["panchayt sahayak niyukti", "panchayat sahayak appointment"],
    "url": "https://configured-storage-host.example/verified-original.pdf"
  }
]
```
This is **a schema example, not a real government order**.

Search uses plain JavaScript without an AI connection. A real, maintained index and document storage are still required.
