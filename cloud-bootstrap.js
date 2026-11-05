(async()=>{
'use strict';
const config=window.UMTE_CLOUD_CONFIG,cloud=window.supabase.createClient(config.url,config.key,{auth:{storageKey:'umte-manager-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}),nativeFetch=window.fetch.bind(window);
const status=document.getElementById('status'),form=document.getElementById('login'),exit=document.getElementById('exit');
async function api(body){const {data,error}=await cloud.auth.getSession();if(error||!data.session)throw Error('Accedi con email e password.');return nativeFetch(config.url+'/functions/v1/umte-manager-api',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.key,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body)});}
window.UMTECloudLogout=async()=>{await cloud.auth.signOut({scope:'local'});localStorage.removeItem('umte-manager-v01');location.href='./';};
exit.onclick=window.UMTECloudLogout;
window.fetch=async(input,options={})=>{const value=typeof input==='string'?input:input instanceof URL?input.href:input.url,url=new URL(value,location.href);if(url.origin===location.origin&&['/api/state','/api/members'].includes(url.pathname)){const body=options.body?JSON.parse(options.body):{};return api({action:url.pathname==='/api/members'?'members':options.method==='POST'?'save':'state',...(url.pathname==='/api/members'&&options.method==='POST'?{update:body}:body)});}return nativeFetch(input,options);};
function report(error){status.textContent=error.message||String(error);exit.hidden=false;form.hidden=false;}
async function accessManager(payload){
 document.querySelector('main').replaceChildren();const main=document.querySelector('main'),title=document.createElement('h1');title.textContent='Accessi personali';main.append(title);main.style.maxWidth='900px';
 const back=document.createElement('a');back.href='./';back.textContent='Torna al gestionale';main.append(back);
 const result=await api({action:'members'}),body=await result.json();if(!result.ok)throw Error(body.error);
 for(const u of body.members){const row=document.createElement('section'),name=document.createElement('p');name.textContent=u.name+' · '+u.email;row.append(name);if(u.role!=='owner'){const role=document.createElement('select');for(const [v,t]of [['pending','In attesa'],['specialist','Specialista'],['administrative','Amministrativo'],['chief','Capo Tecnico'],['preposto','Preposto'],['viewer','Consultazione']])role.add(new Option(t,v));role.value=u.role;const person=document.createElement('select');person.add(new Option('Associa CID',''));for(const p of payload.data.peopleRecords.filter(p=>p.active!==false))person.add(new Option(p.displayName+' · '+p.id,p.id));person.value=u.person_id||'';const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=!!u.enabled;const label=document.createElement('label');label.append(enabled,' Abilitato');const button=document.createElement('button'),message=document.createElement('p');button.textContent='Salva profilo';button.onclick=async()=>{try{const r=await api({action:'members',update:{userId:u.user_id,role:role.value,personId:person.value,enabled:enabled.checked}}),v=await r.json();message.textContent=r.ok?'Profilo aggiornato':v.error;}catch{message.textContent='Salvataggio non riuscito';}};row.append(role,person,label,button,message);}else{const p=document.createElement('p');p.textContent='Responsabile';row.append(p);}main.append(row);}
}
async function initialize(){
 form.hidden=true;status.textContent='Importa il backup esportato dal gestionale e il file baseline.json del pacchetto privato. L’importazione iniziale può avvenire una sola volta.';
 const main=document.querySelector('main'),data=document.createElement('input'),baseline=document.createElement('input'),a=document.createElement('label'),b=document.createElement('label'),button=document.createElement('button');
 for(const input of [data,baseline]){input.type='file';input.accept='.json';}
 a.textContent='Archivio JSON esportato';a.append(data);b.textContent='Baseline privata';b.append(baseline);button.textContent='Trasferisci archivio';
 button.onclick=async()=>{try{if(!data.files[0]||!baseline.files[0])throw Error('Seleziona entrambi i file.');button.disabled=true;const r=await api({action:'initialize',data:JSON.parse(await data.files[0].text()),baseline:JSON.parse(await baseline.files[0].text())}),v=await r.json();if(!r.ok)throw Error(v.error);location.reload();}catch(e){status.textContent=e.message;button.disabled=false;}};
 main.append(a,b,button);exit.hidden=false;
}
async function open(){
 status.textContent='Caricamento del programma…';const r=await api({action:'state'}),payload=await r.json();
 if(!r.ok){if(payload.initialize)return initialize();throw Error(payload.error);}
 if(new URLSearchParams(location.search).has('accessi'))return accessManager(payload);
 window.UMTE_SHARED=payload;window.UMTE_BASELINE=payload.baseline;delete payload.baseline;
 const response=await nativeFetch('app.html',{cache:'no-store'});if(!response.ok)throw Error('Applicazione non disponibile.');
 const html=(await response.text()).replace('<head>','<head><script src="cloud-runtime.js"></script>');
 document.open();document.write(html);document.close();
}
form.onsubmit=async e=>{e.preventDefault();const button=document.getElementById('enter');button.disabled=true;status.textContent='Accesso in corso…';try{const {error}=await cloud.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});if(error)throw Error('Email o password non valide.');document.getElementById('password').value='';await open();}catch(e){report(e);}finally{button.disabled=false;}};
try{const {data}=await cloud.auth.getSession();if(data.session)await open();}catch(e){report(e);}
})();
