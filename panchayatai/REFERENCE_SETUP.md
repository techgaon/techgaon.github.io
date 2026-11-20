# Future original PDF references

No documents are connected initially.

When the owner supplies a new, verified original PDF, place the unmodified file in `panchayatai/reference-pdfs/` and register it in `panchayatai/data/verified-pdfs.json`:

```json
[
  {
    "id": "unique-source-id",
    "title": "Full exact official document title",
    "file": "official-document.pdf",
    "officialNumber": "",
    "exactPhrases": ["Full official document title"]
  }
]
```

Only filenames present in this verified list can be offered. The app verifies a matching question and that the actual original PDF exists before showing a download. There is no fuzzy ranking, no automatic GO import, and no attached sources until explicitly supplied.
