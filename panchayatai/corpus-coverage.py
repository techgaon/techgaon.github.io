"""Measure unique usable source pages, including OCR replacements, without double counting."""
import datetime,gzip,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent
folder=ROOT/'corpus'
meta=json.loads((folder/'manifest.json').read_text(encoding='utf-8'))
sources=json.loads((ROOT/'original-manifest.json').read_text(encoding='utf-8'))
total=sum({d['id']:d['pages'] for d in sources}.values())
pages={};ocr=set();legacy=set()
for filename in sorted(folder.glob('*.json.gz')):
    for row in json.loads(gzip.decompress(filename.read_bytes())):
        key=(row['id'],row['p']);text=row['t'];bad=len(re.findall(r'[\u00c0-\u02ff]',text))
        if not row.get('ocr') and bad>10 and bad/max(1,len(text))>.008:
            legacy.add(key);continue
        if row.get('ocr'):ocr.add(key)
        if key not in pages or row.get('ocr'):pages[key]=row
meta.setdefault('baseIndexedPages',meta['indexedPages'])
meta['totalSourcePages']=total
meta['indexedPages']=len(pages)
meta['ocrPages']=len(ocr)
meta['needsOCRPages']=max(0,total-len(pages))
meta['legacyEncodingPagesUnresolved']=len(legacy-set(pages))
meta['ocrFiles']=[f.name for f in sorted(folder.glob('ocr-*.json.gz'))]
meta['coverageUpdatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(folder/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({k:meta[k] for k in ['totalSourcePages','indexedPages','ocrPages','needsOCRPages','legacyEncodingPagesUnresolved']}))
