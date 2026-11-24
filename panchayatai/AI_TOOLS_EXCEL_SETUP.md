# Panchayat AI — AI Tools Excel conversions

Implemented 24 November 2026 in `tools-excel.js`; mounted by `tools.js` and loaded before it in `index.html`.

## UI

The AI Tools grid includes **10 conversions** in total. Four new options:

- **PDF to Excel** — one XLSX Sheet per extracted PDF page, using PDF text placement to infer table columns. Scanned pages fall back to Hindi/English OCR, generally with one text line per row.
- **Word to Excel** — HTML tables extracted from DOCX using Mammoth, each as its own Excel Sheet; non-table paragraphs in a separate `Word Text` Sheet.
- **Excel to PDF** — XLSX/XLS visible cell values printed in landscape-oriented PDF tables, one section per worksheet.
- **Excel to Word** — XLSX/XLS visible cell values in DOCX tables, separated by worksheet.

All conversions take place in the user's browser. Input document bytes are not uploaded to a service by the conversion module. Dependencies load as JavaScript libraries (and may require internet): SheetJS Community Edition 0.20.3 from its official CDN, existing Mammoth, pdf.js, Tesseract.js, docx and html2pdf.js. No remote AI model analyzes the document.

## Important limitations

- **These are best-effort content/table conversions, not precise layout replicas.** PDF geometry, DOCX merged tables, Excel charts, rich cell formatting, Excel formulas, and complex diagrams may not survive.
- Excel formulas are not re-evaluated. Display values saved in the workbook are converted where present.
- PDFs with nonstandard tables can produce imperfect columns; scanned PDFs may produce a single-column text sheet after OCR.
- Original uploads must be `.pdf`, `.docx`, `.xls`, or `.xlsx` as appropriate. Input upload limit is 50 MB (existing AI Tools limit).
- Per conversion browser-memory guardrails: up to 25 sheets/pages, 2500 rows/sheet, 45 cols, and 35,000 cells; Excel→PDF is limited to 400 rows and 22 cols per sheet; Excel→Word is limited to 800 rows and 14 cols per sheet. Users should split huge documents rather than receive silent truncation.
- For legally significant or accounting documents, compare generated output against the original before use.
- **Verification status:** JavaScript parser and four conversion branches smoke-tested with browser library mocks, and regression tests saved in `tools-excel.test.cjs`. End-to-end real-format file and Android camera/PWA tests are still required; do not advertise exact preservation.

## Browser dependency source

- SheetJS official standalone script: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
- Official documentation: https://docs.sheetjs.com/docs/getting-started/installation/standalone/

## Home screen icon

The GST Calculator tile uses `gst-calculator-icon.svg` — deep navy / aqua orbit, a calculator panel and a rupee accent, matching existing AI Help branding. A copy is also shown on the **Calculate** selection inside the GST tool. The app's own typography, palette, roles and routing remain unchanged.
