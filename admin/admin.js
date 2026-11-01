const key='AIzaSyCTemhSPOGUWqESTBu3ebzfQZGJv2XyMWg';
const collection='https://firestore.googleapis.com/v1/projects/petpyaar-a3ea6/databases/(default)/documents/techgaonEnquiries';
const $=id=>document.getElementById(id),statuses=['new','contacted','quoted','agreed','in_progress','completed','closed'];
let token='',expires=0,records=[],nextPage='';
const decode=doc=>({id:doc.name.split('/').pop(),...Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,v.stringValue??v.timestampValue??'']))});
function logout(){token='';expires=0;records=[];nextPage='';$('list').replaceChildren();$('pin').value='';$('login').hidden=false;$('inbox').hidden=true;}
async function request(url,options={}){
 if(!token||Date.now()>expires){logout();throw Error('Session expired. Please log in again.');}
 const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}});
 if(r.status===401){logout();throw Error('Session expired. Please log in again.');}
 if(!r.ok)throw Error('Could not access enquiries. Please retry.');return r.json();
}
function text(tag,value,parent){const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;}
function render(){
 $('list').replaceChildren();const q=$('search').value.toLowerCase().trim(),status=$('filter').value;
 const shown=records.filter(r=>(!status||r.status===status)&&(!q||[r.name,r.phone,r.email,r.message,r.id].join(' ').toLowerCase().includes(q)));
 $('count').textContent=`${shown.length} shown · ${records.length} loaded`;
 if(!shown.length)text('p','No matching enquiries.',$('list'));
 for(const r of shown){
  const card=document.createElement('article');card.className='card';$('list').append(card);
  text('h2',r.name+' · '+r.kind,card);text('p',`${new Date(r.createdAt).toLocaleString()} · Ref: ${r.id}`,card).className='muted';
  const links=document.createElement('div');links.className='row';card.append(links);
  const phone=text('a',r.phone,links);phone.href='tel:+91'+r.phone;
  const wa=text('a','WhatsApp',links);wa.href='https://wa.me/91'+r.phone;wa.target='_blank';wa.rel='noopener';
  if(r.email){const mail=text('a',r.email,links);mail.href='mailto:'+encodeURIComponent(r.email);}
  text('p',r.message,card);text('p',`Budget: ${r.budget||'Not specified'} · Timeline: ${r.timeline||'Not specified'}`,card);
  const controls=document.createElement('div');controls.className='controls';card.append(controls);
  const label=text('label','Status',controls),select=document.createElement('select');label.append(select);select.setAttribute('aria-label','Status for '+r.id);
  statuses.forEach(s=>{const o=text('option',s,select);o.value=s;});select.value=r.status;
  const notesLabel=text('label','Private notes / quotation or agreement reference',controls),notes=document.createElement('textarea');notesLabel.append(notes);notes.maxLength=4000;notes.value=r.notes||'';
  const save=text('button','Save',controls);save.addEventListener('click',async()=>{save.disabled=true;try{await request(collection+'/'+encodeURIComponent(r.id)+'?updateMask.fieldPaths=status&updateMask.fieldPaths=notes',{method:'PATCH',body:JSON.stringify({fields:{status:{stringValue:select.value},notes:{stringValue:notes.value}}})});r.status=select.value;r.notes=notes.value;$('message').textContent='Saved.';}catch(e){$('message').textContent=e.message;}finally{save.disabled=false;}});
 }
 $('more').hidden=!nextPage;
}
async function load(append=false){$('refresh').disabled=true;$('more').disabled=true;try{const page=await request(collection+'?pageSize=50&orderBy=createdAt%20desc'+(append&&nextPage?'&pageToken='+encodeURIComponent(nextPage):''));records=append?[...records,...(page.documents||[]).map(decode)]:(page.documents||[]).map(decode);nextPage=page.nextPageToken||'';render();$('message').textContent='';}catch(e){$('message').textContent=e.message;}finally{$('refresh').disabled=false;$('more').disabled=false;}}
$('login').addEventListener('submit',async e=>{e.preventDefault();if(!$('login').reportValidity())return;$('sign-in').disabled=true;$('message').textContent='Logging in…';try{
 const username=$('username').value.trim().toLowerCase();if(!['contact@techgaon.in','9129203268','+919129203268'].includes(username))throw Error('Check your login details.');
 const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'contact@techgaon.in',password:'TechGaon-Admin-PIN-'+$('pin').value,returnSecureToken:true})});
 const data=await r.json();if(!r.ok)throw Error('Login failed. Check your details or try again later.');token=data.idToken;expires=Date.now()+(Number(data.expiresIn)-30)*1000;$('pin').value='';$('login').hidden=true;$('inbox').hidden=false;await load();
 }catch(e){$('message').textContent=e.message;}finally{$('sign-in').disabled=false;}});
$('refresh').addEventListener('click',()=>load());$('more').addEventListener('click',()=>load(true));$('logout').addEventListener('click',()=>{logout();$('message').textContent='Logged out.';});$('search').addEventListener('input',render);$('filter').addEventListener('change',render);
