#!/usr/bin/env python3
"""Import a small verified public UP Panchayati Raj GO supplement.
Never ingest, expose or modify the user's original ZIP. Fail closed on ambiguous PDFs.
The existing 445+ reference docs are preserved and deduplicated by hash and visual content.
"""
import hashlib, json, os, re, sys, urllib.request, urllib.error, http.client, time, subprocess
from pathlib import Path
import pypdfium2 as pdfium

ROOT=Path("panchayatai/go-corpus")
ASSETS=Path("go-pdfs/blocks")
OFFICIAL="https://panchayatiraj.up.nic.in/pblc_pg/DocFileForms/GOFile.ashx?download=1&id={}"
ASSET_BASE="https://raw.githubusercontent.com/techgaon/techgaon.github.io/panchayat-go-pdfs/"
LOW=4570
HIGH=4577
MAX_ADD=7
MAX_PDF=14_000_000
CANDIDATE_WORDS=("पंचायती","पंचायत","ग्राम","विकास खण्ड","विकासखंड","ग्रामीण","शासनादेश","जिला पंचायत")
PRIVATE_WORDS=("आधार संख्या","बैंक खाता संख्या","पासवर्ड","पैन नम्बर","व्यक्तिगत सेवा पुस्तिका","क्रेडिट कार्ड")
SHA=lambda b:hashlib.sha256(b).hexdigest()
WORKER=None
def ocr_page(page):
    global WORKER
    assert WORKER is not None
    w,h=page.get_size()
    scale=min(1800/w,2700/h,3)
    image=page.render(scale=scale,draw_annots=True)
    raster=image.to_pil().convert("L")
    image.close()
    filename=Path("/tmp/panchayat-official-page.raw")
    filename.write_bytes(raster.tobytes())
    WORKER.stdin.write(json.dumps({"file":str(filename),"width":raster.width,"height":raster.height})+"\n")
    WORKER.stdin.flush()
    response=json.loads(WORKER.stdout.readline())
    if response.get("error"):raise RuntimeError("OCR error: "+response["error"])
    value=response.get("text","")
    print("OCR_PAGE","length",len(value),"confidence",response.get("confidence"),flush=True)
    return value
def native_legible(value):
    if not value or len(value)<65:return False
    if sum(ord(c)<32 and c not in "\t\n\r" for c in value)>2:return False
    devanagari=sum("\u0900"<=c<="\u097f" for c in value)
    return devanagari>20 and devanagari/len(value)>.12

def normalize(value):
    return re.sub(r'\s+'," ",str(value or "")).strip().casefold()
def official_text_ok(s):
    return (len(s)>180 and sum("\u0900"<=c<="\u097f" for c in s)>45
      and any(w in s for w in CANDIDATE_WORDS)
      and not any(w in s for w in PRIVATE_WORDS))
def request_pdf(num):
    url=OFFICIAL.format(num)
    # Government PDFs occasionally terminate chunked transfer early; retry whole
    # transfer rather than publishing an incomplete or unverified original.
    for attempt in range(2):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; PanchayatAIOfficialGOCatalog/1.0)","Accept":"application/pdf"})
            with urllib.request.urlopen(req,timeout=18) as r:
                if r.status!=200:
                    print("FETCH_BAD_STATUS",num,r.status,flush=True)
                    return None
                ctype=r.headers.get("Content-Type","").lower()
                b=r.read(MAX_PDF+1)
                print("FETCH_PDF",num,"bytes",len(b),"ctype",ctype,"head",repr(b[:15]),flush=True)
                if len(b)>MAX_PDF or len(b)<1200 or not b.startswith(b"%PDF-"):
                    return None
                # The PDF magic and complete transfer are authoritative, even if
                # the government server uses a generic MIME type.
                return b
        except (urllib.error.URLError,ValueError,TimeoutError,OSError,http.client.IncompleteRead,EOFError) as ex:
            print("FETCH_RETRY",num,attempt+1,type(ex).__name__,str(ex)[:120],flush=True)
            if attempt<1:time.sleep(1)
    return None
def subject_from(text):
    lines=[normalize(x).strip(" -—–:ः।") for x in text.splitlines()]
    for i,line in enumerate(lines[:90]):
        m=re.search(r"(?:^|[\s])विषय\s*[:ः\-—–]*\s*(.*)",line)
        if not m:continue
        group=[m.group(1)]
        for tail in lines[i+1:i+5]:
            if re.search(r"^(महोदय|महोदया|उपरोक्त|उपर्युक्त|सन्दर्भ|संदर्भ|प्रतिलिपि|भवदीय)",tail):
                break
            group.append(tail)
            if tail.endswith("।"):break
        sub=" ".join(x for x in group if x).strip(" .।")
        if 20<=len(sub)<=450 and sum("\u0900"<=ch<="\u097f" for ch in sub)>=18:
            return sub[:250]
    return ""
def doc_number(text):
    match=re.search(r"I[/\-]\s*\d{4,11}[/\-]20(?:2[0-9])",text[:2500],re.I)
    if match:return re.sub(r'\s+',"",match.group(0))
    return ""
def doc_date(text):
    # Only a date physically next to the document's own date label, not quoted dates.
    date=re.search(r"(?:(?:लखनऊ|दिनांक)\s*[:ः\-]*\s*)दिनांक\s*[:ः\-]*\s*(\d{1,2})[./-](\d{1,2})[./-](20\d{2})",text[:1600])
    if not date:date=re.search(r"दिनांक\s*[:ः\-]*\s*(\d{1,2})[./-](\d{1,2})[./-](20\d{2})",text[:1200])
    if date:
        dd,mm,yyyy=map(int,date.groups())
        if 1<=dd<=31 and 1<=mm<=12:return f"{yyyy:04d}-{mm:02d}-{dd:02d}"
    return ""
def num_evidence(text):
    return list(dict.fromkeys(re.findall(r"(?<!\d)\d[\d.,/\-]{1,65}(?!\d)",text)))[:60]
def main():
    ASSETS.mkdir(parents=True,exist_ok=True)
    catalog=json.loads((ROOT/"catalog.json").read_text())
    assert catalog.get("schema")==1 and catalog["documentCount"]>=445
    index_bytes=(ROOT/catalog["index"]).read_bytes()
    assert SHA(index_bytes)==catalog["indexSha256"]
    index=json.loads(index_bytes)
    assert len(index["docs"])==catalog["documentCount"]
    assert len(index["pages"])==catalog["pageCount"]
    assert index.get("schema")==1
    index.pop("terms",None)
    global WORKER
    WORKER=subprocess.Popen(["node",".github/scripts/panchayat-additions-ocr.cjs"],stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding="utf-8")
    ready=json.loads(WORKER.stdout.readline())
    assert ready.get("ready"),"Hindi OCR worker failed to initialize"
    ids={x["id"] for x in index["docs"]}
    origins={x.get("sourceSha256") for x in index["docs"]}
    numbers={(normalize(x.get("officialNumber")),x.get("date")) for x in index["docs"] if x.get("officialNumber") and x.get("date")}
    visual={p.get("visualHash") for p in index["pages"] if p.get("visualHash")}
    added=[];skipped={}
    for num in range(HIGH,LOW-1,-1):
        if len(added)>=MAX_ADD:break
        data=request_pdf(num)
        if not data:
            skipped[str(num)]="unavailable or not a bounded PDF";print("SKIP_UNAVAILABLE",num,flush=True);continue
        source_sha=SHA(data);docid=source_sha[:24]
        if docid in ids or source_sha in origins:
            skipped[str(num)]="exact duplicate";continue
        try:
            pdf=pdfium.PdfDocument(data)
            pages=len(pdf)
            if pages<1 or pages>18:
                skipped[str(num)]="page count out of bounds";pdf.close();continue
            first_page=pdf[0]
            first_text=first_page.get_textpage().get_text_range()
            if not official_text_ok(first_text) or not subject_from(first_text) or not native_legible(first_text):
                first_text=ocr_page(first_page)
            first_page.close()
            if not official_text_ok(first_text):
                skipped[str(num)]="unreadable or not a verified public governance order";print("SKIP_TEXT",num,len(first_text),repr(first_text[:170]),flush=True);pdf.close();continue
            title=subject_from(first_text)
            # Original document verified title; use only when source OCR also confirms its topic.
            if num==4582 and "तालाब" in first_text and ("निधि" in first_text or "पट्ट" in first_text):
                title="तालाब/अन्य स्रोतों के पट्टों/नीलामी से गाँव निधि में प्राप्त होने वाली आय के अनुश्रवण के सम्बन्ध में।"
            if not title:
                skipped[str(num)]="subject cannot be verified from original";print("SKIP_SUBJECT",num,repr(first_text[:350]),flush=True);pdf.close();continue
            number=doc_number(first_text)
            date=doc_date(first_text)
            if number and date and (normalize(number),date) in numbers:
                skipped[str(num)]="same official number and date already indexed";pdf.close();continue
            rows=[];visuals=[]
            for k in range(pages):
                page=pdf[k]
                tp=page.get_textpage()
                try: page_text=tp.get_text_range()
                finally: tp.close()
                # Download the entire original even if a later page is an image.
                if k==0:
                    page_text=first_text
                    quality="ocr; original PDF authoritative" if not native_legible(tp.get_text_range() if False else "") else "extracted"
                elif not native_legible(page_text):
                    page_text=ocr_page(page)
                    quality="ocr; original PDF authoritative"
                else:quality="extracted"
                if not page_text.strip():
                    page_text=""
                    quality="image-only; refer to original PDF"
                if len(page_text)>16000:page_text=page_text[:16000]
                bmp=page.render(scale=1.5,draw_annots=True)
                picture=bmp.to_pil().convert("RGB")
                vhash=SHA(str(picture.size).encode()+picture.tobytes())
                bmp.close();page.close()
                visuals.append(vhash)
                rows.append({"doc":len(index["docs"]),"page":k+1,"text":page_text,
                     "quality":quality,"nativeNumberEvidence":num_evidence(page_text) if quality=="extracted" else [],
                     "visualHash":vhash})
            pdf.close()
            if all(v in visual for v in visuals):
                skipped[str(num)]="visual duplicate";continue
            # A source containing private data should never be released.
            if any(any(word in row["text"] for word in PRIVATE_WORDS) for row in rows):
                skipped[str(num)]="private data review";continue
            block_file=f"blocks/{docid}-1.pdf"
            staged=ASSETS/f"{docid}-1.pdf"
            if staged.exists():
                assert SHA(staged.read_bytes())==source_sha,"Staged source PDF hash mismatch"
            else:staged.write_bytes(data)
            doc={
                "id":docid,"title":title,"officialNumber":number,"date":date,
                "jurisdiction":"उत्तर प्रदेश","documentType":"go",
                "pageCount":pages,"availablePages":list(range(1,pages+1)),
                "sourceSha256":source_sha,"sourceUrl":OFFICIAL.format(num),
                "assetBase":ASSET_BASE,
                "blocks":[{"file":block_file,"first":1,"last":pages,"sha256":source_sha,"bytes":len(data)}]
            }
            index["docs"].append(doc);index["pages"].extend(rows)
            ids.add(docid);origins.add(source_sha);visual.update(visuals)
            if number and date:numbers.add((normalize(number),date))
            added.append({"id":docid,"sourceId":num,"pages":pages,"size":len(data),"title":title,"sha256":source_sha})
            print("VERIFIED_NEW",num,docid,pages,title[:80],flush=True)
        except Exception as ex:
            # Do not leave unverified partial file behind.
            (ASSETS/f"{docid}-1.pdf").unlink(missing_ok=True)
            skipped[str(num)]="PDF validation failed: "+type(ex).__name__
            print("SKIP_PDF",num,type(ex).__name__,str(ex)[:100],flush=True)
    report={"source":"public panchayatiraj.up.nic.in official GOFile.ashx",
       "baseVersion":catalog["version"],"baseDocumentCount":catalog["documentCount"],"basePageCount":catalog["pageCount"],
       "verifiedNew":added,"skipped":skipped,"newDocumentCount":len(index["docs"]),
       "newPageCount":len(index["pages"]),"originalZipAccessed":False}
    Path("/tmp/panchayat-official-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print("OFFICIAL_BATCH_RESULT",json.dumps({k:v for k,v in report.items() if k not in ("skipped","verifiedNew")}),flush=True)
    if not added:
        raise RuntimeError("No new public official GO passed all duplication and evidence gates; nothing is published")
    (ROOT/"index-uncompiled-official.json").write_text(json.dumps(index,ensure_ascii=False),encoding="utf-8")
    WORKER.stdin.close()
    WORKER.wait(timeout=30)
    Path("/tmp/panchayat-official-existing-version.txt").write_text(catalog["version"])
if __name__=="__main__":main()
