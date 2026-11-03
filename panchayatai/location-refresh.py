"""Import names and LGD GP codes from the official UP Panchayati Raj PB3 report.
No contact/personnel fields are retained. Preserve the last good district on failure.
"""
import argparse, datetime, json, pathlib, re, time
import requests
from bs4 import BeautifulSoup
URL='https://panchayatiraj.up.nic.in/pblc_pg/Reports/clsd/PB3FormReport.aspx'
ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'locations';OUT.mkdir(exist_ok=True)
DISTRICT='ctl00$ContentPlaceHolder1$ddlDistrict'

def page(session, data=None):
    response=session.post(URL,data=data,timeout=(20,150)) if data else session.get(URL,timeout=(20,90))
    response.raise_for_status()
    if len(response.content)>80000000:raise ValueError('Unexpectedly large report')
    return BeautifulSoup(response.content,'html.parser')

def districts(soup):
    select=soup.find('select',attrs={'name':DISTRICT})
    if not select:raise ValueError('Official district selector missing')
    return [{'code':o['value'],'name':o.get_text(strip=True)} for o in select.find_all('option') if o.get('value') not in ('','1',None)]

def extract(soup, district):
    table=soup.find('table',id='ContentPlaceHolder1_GridView1')
    if table is None:raise ValueError('Official district table missing')
    rows=[];seen=set();missing=0
    for tr in table.find_all('tr'):
        cells=[c.get_text(' ',strip=True) for c in tr.find_all(['td','th'],recursive=False)]
        if len(cells)!=41 or cells[1]!=district['name'] or not cells[0].isdigit():continue
        code=cells[38]
        if not re.fullmatch(r'\d{4,9}',code):missing+=1;code=None
        key=(cells[2],cells[3],code)
        if key in seen:continue
        seen.add(key);rows.append({'block':cells[2],'name':cells[3],'lgd':code,'sourceUpdatedAt':cells[39]})
    if len(rows)<5:raise ValueError('District export is empty or report schema changed')
    codes=[r['lgd'] for r in rows if r['lgd']]
    if len(codes)!=len(set(codes)):raise ValueError('Conflicting duplicate GP LGD codes')
    return {'district':district['name'],'districtCode':district['code'],'source':URL,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'coverage':'Official PB3 report snapshot; not a complete current LGD boundary certification','missingLGDCodes':missing,'panchayats':rows}

def run(shard=0,total=1):
    session=requests.Session();session.headers['User-Agent']='TechGaon Panchayat directory reader/1.0'
    soup=page(session);items=districts(soup)
    if len(items)!=75:raise ValueError('Expected 75 district options; review source before replacement')
    (OUT/'districts.json').write_text(json.dumps({'source':URL,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'districts':items},ensure_ascii=False),encoding='utf-8')
    failures=[]
    for i,d in enumerate(items):
        if i%total!=shard:continue
        try:
            soup=page(session)
            data={x['name']:x.get('value','') for x in soup.select('input[type=hidden][name]')}
            data.update({DISTRICT:d['code'],'__EVENTTARGET':DISTRICT,'__EVENTARGUMENT':''})
            result=extract(page(session,data),d)
            (OUT/(d['code']+'.json')).write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
            print(d['name'],len(result['panchayats']),flush=True)
        except Exception as e:failures.append({'district':d['name'],'error':str(e)[:160]});print('Preserved previous data:',d['name'],str(e)[:120],flush=True)
        time.sleep(1)
    (OUT/('refresh-'+str(shard)+'.json')).write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'failures':failures}),encoding='utf-8')
    if len(failures)==len(items[shard::total]):raise RuntimeError('No district could be refreshed')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--shard',type=int,default=0);parser.add_argument('--total',type=int,default=1);args=parser.parse_args();run(args.shard,args.total)
