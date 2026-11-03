"""Mirror bounded, checksum-verified public sources for same-origin excerpt export."""
import concurrent.futures,hashlib,json,pathlib,urllib.parse,urllib.request
ROOT=pathlib.Path(__file__).resolve().parent; OUT=ROOT/'originals';OUT.mkdir(exist_ok=True)
rows=json.loads((ROOT/'original-manifest.json').read_text(encoding='utf-8'))
def official(url):
 try:
  p=urllib.parse.urlparse(url);h=(p.hostname or '').lower()
  return p.scheme=='https' and (h.endswith('.gov.in') or h.endswith('.nic.in'))
 except:return False
selected=[];size=0
for r in sorted(rows,key=lambda x:(x.get('section',19)not in [1,3,4,5,6,15],x.get('bytes',99999999))):
 if not official(r.get('url','')) or r.get('bytes',0)>2000000:continue
 if len(selected)>=250 or size+r.get('bytes',0)>80000000:continue
 selected.append(r);size+=r.get('bytes',0)
def run(r):
 dest=OUT/(r['id']+'.pdf')
 try:
  if not dest.exists() or hashlib.sha256(dest.read_bytes()).hexdigest()!=r['sha256']:
   req=urllib.request.Request(r['url'],headers={'User-Agent':'Mozilla/5.0 (TechGaon Panchayat Reference Reader)'})
   with urllib.request.urlopen(req,timeout=12)as response:
    if not official(response.geturl()):return None
    data=response.read(2000001)
   if len(data)>2000000 or not data.startswith(b'%PDF') or hashlib.sha256(data).hexdigest()!=r['sha256']:return None
   dest.write_bytes(data)
  return (r['id'],{'path':'originals/'+dest.name,'sha256':r['sha256'],'pages':r.get('pages')})
 except:return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: pairs=list(pool.map(run,selected))
result=dict(x for x in pairs if x)
(ROOT/'mirrors.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
print('Verified available reference files:',len(result),'of',len(selected),'candidates; originals are not exposed as download buttons')
