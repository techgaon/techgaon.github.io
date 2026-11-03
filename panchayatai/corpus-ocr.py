"""Add OCR pages only after the public original matches the indexed SHA-256.
The original source is never rewritten. OCR remains explicitly labelled machine text.
"""
import argparse, datetime, gzip, hashlib, json, pathlib, re, urllib.parse, urllib.request
import pymupdf
ROOT=pathlib.Path(__file__).resolve().parent

def run(shard,total):
    manifest=json.loads((ROOT/'original-manifest.json').read_text())
    known=set()
    for filename in (ROOT/'corpus').glob('*.json.gz'):
        if filename.name.startswith('ocr-'):continue
        for row in json.loads(gzip.decompress(filename.read_bytes())):
            text=row['t'];bad=len(re.findall(r'[\u00c0-\u02ff]',text))
            if bad>10 and bad/max(1,len(text))>.008:continue
            known.add((row['id'],row['p']))
    dest=ROOT/'corpus'/f'ocr-{shard}.json.gz'
    previous=json.loads(gzip.decompress(dest.read_bytes())) if dest.exists() else []
    rows={(r['id'],r['p']):r for r in previous};failures=[];pending=0;done=0
    for i,d in enumerate(manifest):
        if i%total!=shard:continue
        missing=[n for n in range(1,d['pages']+1) if (d['id'],n) not in known and (d['id'],n) not in rows]
        if not missing:continue
        pending+=len(missing)
        try:
            url=urllib.parse.urlparse(d['url']);host=(url.hostname or '').lower()
            if url.scheme!='https' or not(host.endswith('.gov.in') or host.endswith('.nic.in')):raise ValueError('Non-government origin: manual review required')
            if d['bytes']>70000000:raise ValueError('Source exceeds bounded processing size')
            req=urllib.request.Request(d['url'],headers={'User-Agent':'Mozilla/5.0 (TechGaon Panchayat OCR reader)'})
            with urllib.request.urlopen(req,timeout=60) as response:
                final=urllib.parse.urlparse(response.geturl());fh=(final.hostname or '').lower()
                if final.scheme!='https' or not(fh.endswith('.gov.in') or fh.endswith('.nic.in')):raise ValueError('Unexpected source redirect')
                data=response.read(70000001)
            if len(data)>70000000 or hashlib.sha256(data).hexdigest()!=d['sha256']:raise ValueError('Source checksum differs; OCR refused')
            with pymupdf.open(stream=data,filetype='pdf') as pdf:
                if len(pdf)!=d['pages']:raise ValueError('Source page count changed')
                for n in missing:
                    page=pdf[n-1]
                    tp=page.get_textpage_ocr(language='hin+eng',dpi=150,full=True)
                    text=page.get_text(textpage=tp,sort=True).strip()
                    if len(re.sub(r'\W','',text))<20:continue
                    words=page.get_text('words',textpage=tp,sort=True)
                    boxes=[[round(w[0],2),round(w[1],2),round(w[2],2),round(w[3],2),w[4]] for w in words]
                    rows[(d['id'],n)]={'id':d['id'],'p':n,'s':d.get('section',19),'t':text[:18000],'ocr':True,'boxes':boxes,'bboxReliable':page.rotation==0 and page.cropbox.x0==0 and page.cropbox.y0==0,'height':page.rect.height}
                    done+=1
                    if done%25==0:
                        dest.write_bytes(gzip.compress(json.dumps(list(rows.values()),ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
                        print('OCR pages:',done,'source:',d['id'],'page:',n,flush=True)
            print('Read',d['id'],'missing',len(missing),flush=True)
        except Exception as e:failures.append({'id':d['id'],'pages':len(missing),'error':str(e)[:180]});print('Unresolved',d['id'],str(e)[:140],flush=True)
    dest.write_bytes(gzip.compress(json.dumps(list(rows.values()),ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
    (ROOT/'corpus'/f'ocr-status-{shard}.json').write_text(json.dumps({'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'shard':shard,'shards':total,'ocrPages':len(rows),'attemptedMissingPages':pending,'failures':failures},ensure_ascii=False),encoding='utf-8')
    print('Saved OCR pages',len(rows),'unresolved sources',len(failures))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--shard',type=int,required=True);parser.add_argument('--total',type=int,required=True);args=parser.parse_args();run(args.shard,args.total)
