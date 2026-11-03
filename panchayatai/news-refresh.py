"""Public RSS headlines; no invented article summaries and no paid AI calls."""
import concurrent.futures,datetime,email.utils,hashlib,html,json,pathlib,re,urllib.parse,urllib.request,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parent
districts='आगरा|अलीगढ़|अंबेडकर नगर|अमेठी|अमरोहा|औरैया|अयोध्या|आजमगढ़|बागपत|बहराइच|बलिया|बलरामपुर|बांदा|बाराबंकी|बरेली|बस्ती|भदोही|बिजनौर|बदायूं|बुलंदशहर|चंदौली|चित्रकूट|देवरिया|एटा|इटावा|फर्रुखाबाद|फतेहपुर|फिरोजाबाद|गौतम बुद्ध नगर|गाजियाबाद|गाजीपुर|गोंडा|गोरखपुर|हमीरपुर|हापुड़|हरदोई|हाथरस|जालौन|जौनपुर|झांसी|कन्नौज|कानपुर देहात|कानपुर नगर|कासगंज|कौशांबी|कुशीनगर|लखीमपुर खीरी|ललितपुर|लखनऊ|महराजगंज|महोबा|मैनपुरी|मथुरा|मऊ|मेरठ|मिर्जापुर|मुरादाबाद|मुजफ्फरनगर|पीलीभीत|प्रतापगढ़|प्रयागराज|रायबरेली|रामपुर|सहारनपुर|संभल|संत कबीर नगर|शाहजहांपुर|शामली|श्रावस्ती|सिद्धार्थनगर|सीतापुर|सोनभद्र|सुल्तानपुर|उन्नाव|वाराणसी'.split('|')
assert len(districts)==75
def fetch(region):
 q=f'{region} ("पंचायत" OR "ग्राम प्रधान" OR "पंचायत सचिव") when:14d'
 url='https://news.google.com/rss/search?'+urllib.parse.urlencode({'q':q,'hl':'hi','gl':'IN','ceid':'IN:hi'})
 req=urllib.request.Request(url,headers={'User-Agent':'TechGaon-PanchayatAI/1.0'})
 try:
  with urllib.request.urlopen(req,timeout=25) as r: xml=ET.fromstring(r.read(2500000))
  result=[]
  for item in xml.findall('./channel/item')[:8]:
   title=html.unescape(item.findtext('title','')).strip(); source=item.find('source');source_name=source.text if source is not None else ''
   if source_name and title.endswith(' - '+source_name): title=title[:-len(source_name)-3]
   link=item.findtext('link','');date=item.findtext('pubDate','')
   if not link.startswith('https://'):continue
   try:published=email.utils.parsedate_to_datetime(date).isoformat()
   except:continue
   if not any(t in title for t in ['पंचायत','प्रधान','सचिव','ग्राम सभा']):continue
   detected=[d for d in districts if d in title]
   result.append({'id':hashlib.sha256(link.encode()).hexdigest()[:20],'title':title,'source':source_name,'url':link,'publishedAt':published,'districts':detected,'searchRegion':region,'kind':'media_headline','summary':title,'verification':'Media report; not a government order'})
  return result
 except Exception as e: print('RSS unavailable:',region,type(e).__name__);return []
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: batches=list(pool.map(fetch,['उत्तर प्रदेश']+districts))
unique={}
for batch in batches:
 for item in batch:unique.setdefault(item['id'],item)
items=sorted(unique.values(),key=lambda x:x['publishedAt'],reverse=True)[:450]
if not items:raise SystemExit('No RSS items; preserving existing news file')
(ROOT/'news.json').write_text(json.dumps({'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':items},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Saved',len(items),'public source-linked headlines')
