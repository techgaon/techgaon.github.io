"""Merge only the explicitly reviewed public supplement; never read the raw ZIP."""
import hashlib,json,re,subprocess,sys,tempfile,zipfile
from pathlib import Path
import pypdfium2 as pdfium

ROOT=Path('panchayatai/go-corpus')
def digest(data):return hashlib.sha256(data).hexdigest()
def readable(t):
    if len(t.strip())<50:return False
    if len(re.findall(r'[\u0100-\u024f\ufffd\x00-\x08\x0e-\x1f]',t))>max(2,len(t)*.008):return False
    return len(re.findall(r'[\u0900-\u097f]',t))>len(t)*.35 or len(re.findall(r'\b(?:the|of|and|shall|under|rule|government|dated)\b',t,re.I))>=4

def main():
    archive=Path(sys.argv[1]);expected=sys.argv[2]
    assert digest(archive.read_bytes())==expected,'Supplement checksum mismatch'
    base=json.loads((ROOT/'catalog.json').read_text())
    assert base['version']=='bd40167ca6eb3382','Corpus changed; review/rebase supplement first'
    original_bytes=(ROOT/base['index']).read_bytes()
    assert digest(original_bytes)==base['indexSha256']
    index=json.loads(original_bytes);original_ids={d['id'] for d in index['docs']}
    with zipfile.ZipFile(archive) as z:
        supplement=json.loads(z.read('additions.json'))
        assert len(supplement['docs'])==19 and len(supplement['pages'])==99
        assert supplement['baseVersion']==base['version']
        expected_files={'additions.json'}|{b['file'] for d in supplement['docs'] for b in d['blocks']}
        assert set(z.namelist())==expected_files,'Unexpected archive entries'
        assert len(z.namelist())==len(expected_files)
        with tempfile.TemporaryDirectory() as temp:
            worker=subprocess.Popen(['node','.github/scripts/panchayat-additions-ocr.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8')
            assert json.loads(worker.stdout.readline())['ready']
            old_visual={p.get('visualHash') for p in index['pages'] if p.get('visualHash')}
            added=[];duplicates=[]
            try:
                for i,doc in enumerate(supplement['docs']):
                    assert re.fullmatch('[a-f0-9]{24}',doc['id']) and doc['id'] not in original_ids
                    assert doc['documentType'] in base['scope']
                    assert len(doc['blocks'])==1 and doc['availablePages']==list(range(1,doc['pageCount']+1))
                    b=doc['blocks'][0]
                    assert b['file']==f"blocks/{doc['id']}-1.pdf"
                    data=z.read(b['file']);assert len(data)==b['bytes'] and digest(data)==b['sha256'] and len(data)<25*1024*1024
                    pdf=pdfium.PdfDocument(data);assert len(pdf)==doc['pageCount']
                    rows=[]
                    for page_no in doc['availablePages']:
                        page=pdf[page_no-1]
                        tp=page.get_textpage()
                        try:native=tp.get_text_range()
                        finally:tp.close()
                        bitmap=page.render(scale=1.5,draw_annots=True)
                        picture=bitmap.to_pil().convert('RGB')
                        visual=digest(str(picture.size).encode()+picture.tobytes())
                        bitmap.close()
                        if readable(native):text=native;quality='extracted'
                        else:
                            w,h=page.get_size();scale=min(1800/w,2700/h,3)
                            bmp=page.render(scale=scale,draw_annots=True);image=bmp.to_pil().convert('L');bmp.close()
                            raw=Path(temp)/'page.raw';raw.write_bytes(image.tobytes())
                            worker.stdin.write(json.dumps({'file':str(raw),'width':image.width,'height':image.height})+'\n');worker.stdin.flush()
                            answer=json.loads(worker.stdout.readline());assert 'error' not in answer,answer
                            text=answer['text'];quality='ocr; original PDF is authoritative'
                        page.close()
                        if re.search(r'(?:password|passcode)\s*[:=]\s*\S+|Electronic Reservation Slip|Credit Card Statement|DETAILED APPLICATION FORM|Unique Identification Authority',text,re.I):raise ValueError('Private document gate: '+doc['id'])
                        numbers=list(dict.fromkeys(re.findall(r'(?<!\d)\d[\d.,/\-]{1,65}(?!\d)',native)))[:60] if quality=='extracted' else []
                        rows.append({'doc':len(index['docs']),'page':page_no,'text':text,'quality':quality,'nativeNumberEvidence':numbers,'visualHash':visual})
                    pdf.close()
                    if all(p['visualHash'] in old_visual for p in rows):
                        duplicates.append(doc['id']);continue
                    (ROOT/b['file']).write_bytes(data)
                    index['docs'].append(doc);index['pages'].extend(rows);original_ids.add(doc['id'])
                    old_visual.update(p['visualHash'] for p in rows);added.append(doc['id'])
                    print('Reviewed public source:',doc['id'],len(rows),'pages',flush=True)
            finally:
                worker.stdin.close();worker.wait(timeout=30)
    index.pop('terms',None)
    (ROOT/'index-uncompiled.json').write_text(json.dumps(index,ensure_ascii=False),encoding='utf-8')
    (ROOT/'additions-build-result.json').write_text(json.dumps({'baseVersion':base['version'],'addedDocuments':len(added),'visualDuplicateDocumentsSkipped':duplicates,'addedPages':len(index['pages'])-base['pageCount'],'documentCount':len(index['docs']),'pageCount':len(index['pages']),'incompleteArchive':True,'reviewedOn':'2026-11-23'}),encoding='utf-8')
    print('Public supplement merged:',len(added),'sources. Whole archive remains under review.',flush=True)

if __name__=='__main__':main()
