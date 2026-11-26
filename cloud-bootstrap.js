(async()=>{
'use strict';
const config=window.UMTE_CLOUD_CONFIG;
if(!window.supabase?.createClient||!config?.url||!config?.key){document.getElementById('status').textContent='Modulo di autenticazione non caricato. Aggiorna la pagina; se il problema continua, segnala il blocco della connessione.';document.getElementById('enter').disabled=true;return;}
const cloud=window.supabase.createClient(config.url,config.key,{auth:{storageKey:'umte-manager-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}),nativeFetch=window.fetch.bind(window);
const status=document.getElementById('status'),form=document.getElementById('login'),exit=document.getElementById('exit');
async function api(body){const {data,error}=await cloud.auth.getSession();if(error||!data.session)throw Error('Accedi con email e password.');return nativeFetch(config.url+'/functions/v1/umte-manager-api',{method:'POST',headers:{'Content-Type':'application/json',apikey:config.key,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body)});}
window.UMTECloudApi=api;
window.UMTECloudLogout=async()=>{await cloud.auth.signOut({scope:'local'});localStorage.removeItem('umte-manager-v01');location.href='./';};
exit.onclick=window.UMTECloudLogout;
window.fetch=async(input,options={})=>{const value=typeof input==='string'?input:input instanceof URL?input.href:input.url,url=new URL(value,location.href);if(url.origin===location.origin&&['/api/state','/api/members'].includes(url.pathname)){const body=options.body?JSON.parse(options.body):{};return api({action:url.pathname==='/api/members'?'members':options.method==='POST'?'save':'state',...(url.pathname==='/api/members'&&options.method==='POST'?{update:body}:body)});}return nativeFetch(input,options);};
function report(error,authenticated=false){status.dataset.error='true';status.textContent=error.message||String(error);exit.hidden=!authenticated;form.hidden=false;}
async function accessManager(payload){
 const main=document.querySelector('main');main.replaceChildren();main.style.maxWidth='1000px';
 const title=document.createElement('h1');title.textContent='Gestione accessi e abilitazioni';main.append(title);
 const intro=document.createElement('p');intro.textContent='Qui puoi vedere gli utenti già registrati, abilitarli o disabilitarli, cambiare ruolo e associare il CID. Gli inviti si gestiscono nella pagina separata.';main.append(intro);
 const nav=document.createElement('nav');nav.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:16px 0';
 for(const [href,txt] of [['./','Torna al gestionale'],['./accessi-colleghi.html','Invita nuovi colleghi']]){const link=document.createElement('a');link.href=href;link.textContent=txt;link.style.cssText='display:inline-block;padding:12px;background:#eaf4f7;border:1px solid #b9ccd3;border-radius:8px;color:#103548;font-weight:700';nav.append(link);}main.append(nav);
 const result=await api({action:'members'});const body=await result.json();if(!result.ok)throw Error(body.error||'Impossibile recuperare gli utenti');
 const members=Array.isArray(body.members)?body.members:[];
 const counter=document.createElement('p');counter.setAttribute('role','status');main.append(counter);
 const search=document.createElement('input');search.type='search';search.placeholder='Cerca nome, email o CID';search.setAttribute('aria-label','Cerca utenti');main.append(search);
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filtra stato');
 for(const [value,label] of [['all','Tutti gli utenti'],['enabled','Abilitati'],['disabled','Da abilitare / disabilitati']])filter.add(new Option(label,value));
 filter.style.marginTop='8px';main.append(filter);
 const list=document.createElement('div');list.style.cssText='display:grid;gap:12px;margin-top:18px';main.append(list);
 const people=Array.isArray(payload.data?.peopleRecords)?payload.data.peopleRecords.filter(p=>p.active!==false):[];
 function render(){
  list.replaceChildren();
  const q=search.value.trim().toLocaleLowerCase('it');const matching=members.filter(u=>(filter.value==='all'||(filter.value==='enabled')===!!u.enabled)&&(!q||[u.name,u.email,u.person_id].some(v=>String(v||'').toLocaleLowerCase('it').includes(q))));
  counter.textContent=members.length+' account registrati · '+members.filter(u=>u.enabled).length+' abilitati · '+members.filter(u=>!u.enabled).length+' non abilitati · '+matching.length+' visualizzati';
  if(!matching.length){const none=document.createElement('p');none.textContent='Nessun utente corrisponde ai filtri.';list.append(none);}
  for(const u of matching){
   const row=document.createElement('section');row.style.cssText='border:1px solid #d2e2e8;border-radius:12px;padding:15px;background:#f8fbfc';
   const name=document.createElement('p');name.style.fontWeight='700';name.style.overflowWrap='anywhere';name.textContent=(u.name||'Utente')+' · '+(u.email||'Email non disponibile');row.append(name);
   if(u.role==='owner'){const p=document.createElement('p');p.textContent='Responsabile · account principale';row.append(p);list.append(row);continue;}
   const roleLabel=document.createElement('label');roleLabel.textContent='Ruolo';const role=document.createElement('select');for(const [v,t]of [['pending','In attesa'],['specialist','Specialista'],['administrative','Amministrativo'],['chief','Capo Tecnico'],['preposto','Operatore / Preposto'],['viewer','Consultazione']])role.add(new Option(t,v));role.value=u.role;roleLabel.append(role);
   const personLabel=document.createElement('label');personLabel.textContent='Associazione dipendente (CID)';const person=document.createElement('select');person.add(new Option('Nessun CID associato',''));for(const p of people)person.add(new Option(p.displayName+' · '+p.id,p.id));person.value=u.person_id||'';personLabel.append(person);
   const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=!!u.enabled;enabled.style.cssText='width:20px;height:20px;min-height:20px;margin:0 8px 0 0';const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;margin:12px 0';label.append(enabled,' Accesso abilitato');
   const button=document.createElement('button'),message=document.createElement('p');button.textContent='Salva modifiche';button.type='button';message.setAttribute('role','status');message.style.marginBottom='0';
   button.onclick=async()=>{if(enabled.checked&&(!person.value||role.value==='pending')){message.textContent='Per abilitare, associa un CID e seleziona un ruolo operativo.';return;}button.disabled=true;message.textContent='Salvataggio in corso…';try{const r=await api({action:'members',update:{userId:u.user_id,role:role.value,personId:person.value,enabled:enabled.checked}}),v=await r.json();if(!r.ok)throw Error(v.error||'Errore aggiornamento');u.role=role.value;u.person_id=person.value;u.enabled=enabled.checked;reset.disabled=!u.enabled||!u.person_id;message.textContent='Profilo aggiornato correttamente';counter.textContent=members.length+' account registrati · '+members.filter(u=>u.enabled).length+' abilitati · '+members.filter(u=>!u.enabled).length+' non abilitati';}catch(e){message.textContent=e.message||'Salvataggio non riuscito';}finally{button.disabled=false;}};
   const remove=document.createElement('button');remove.type='button';remove.textContent='Elimina account da UMTE Manager';remove.style.cssText='margin-top:10px;background:#fff1f1;border:1px solid #bd5360;color:#962c39';
   remove.onclick=async()=>{const email=String(u.email||u.name||'').trim();if(!email){message.textContent='Account privo di email: rimozione non disponibile.';return;}const answer=prompt('Eliminare l’accesso di '+email+' da UMTE Manager? Le credenziali Supabase e gli altri applicativi resteranno invariati. Per confermare, scrivi ELIMINA.');if(answer!=='ELIMINA')return;remove.disabled=true;button.disabled=true;message.textContent='Rimozione in corso…';try{const r=await api({action:'members',remove:{userId:u.user_id}}),v=await r.json();if(!r.ok)throw Error(v.error||'Rimozione non riuscita');const index=members.findIndex(x=>x.user_id===u.user_id);if(index>=0)members.splice(index,1);render();}catch(e){message.textContent=e.message||'Rimozione non riuscita';remove.disabled=false;button.disabled=false;}};
   const reset=document.createElement('button');reset.type='button';reset.textContent='Reimposta password al CID';reset.style.cssText='margin-top:10px;margin-right:10px;background:#e9f2f8;border:1px solid #7caabf;color:#16435b';
   reset.disabled=!u.enabled||!u.person_id;
   reset.title=!u.person_id?'Associa prima un CID e salva il profilo':'Imposta come password il CID associato, senza inviare email';
   reset.onclick=async()=>{
    const email=String(u.email||'').trim();
    if(!email||!u.person_id){message.textContent='Associa prima un CID valido a questo account.';return;}
    const answer=prompt('Reimpostare la password di '+email+' al CID associato? Non verranno inviate email. La password precedente non funzionerà più. Per confermare, scrivi REIMPOSTA.');
    if(answer!=='REIMPOSTA')return;
    reset.disabled=true;message.textContent='Reimpostazione password in corso…';
    try{
     const {data,error}=await cloud.auth.getSession();
     if(error||!data.session)throw Error('Sessione scaduta: effettua nuovamente l’accesso.');
     const response=await nativeFetch(config.url+'/functions/v1/umte-manager-provision',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:config.key,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action:'reset_password',userId:u.user_id,confirmed:true})});
     const body=await response.json();
     if(!response.ok)throw Error(body.error||'Reimpostazione non riuscita');
     message.textContent='Password reimpostata sul CID. Nessuna email inviata. Comunica il CID soltanto al collega.';
    }catch(e){message.textContent=e.message||'Password non modificata.';}
    finally{reset.disabled=!u.enabled||!u.person_id;}
   };
   row.append(roleLabel,personLabel,label,button,reset,remove,message);list.append(row);
  }
 }
 search.addEventListener('input',render);filter.addEventListener('change',render);render();
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
 status.dataset.error='false';status.textContent='Caricamento del programma…';const r=await api({action:'state'}),payload=await r.json();
 if(!r.ok){if(payload.initialize)return initialize();throw Error(payload.error);}
 if(new URLSearchParams(location.search).has('accessi'))return accessManager(payload);
 window.UMTE_SHARED=payload;window.UMTE_BASELINE=payload.baseline;delete payload.baseline;
 const response=await nativeFetch('app.html',{cache:'no-store'});if(!response.ok)throw Error('Applicazione non disponibile.');
 let html=(await response.text()).replace('<head>','<head><script src="cloud-save-conflict.js?v=equivalent-records-20261126-1112"></script><script src="cloud-runtime.js?v=stable-variations-20261126"></script><link rel="stylesheet" href="mobile-improvements.css?v=20261108">');
 if(payload.capabilities?.energyMaintenance){
   const replace=(before,after)=>{if(!html.includes(before))throw Error('Versione applicativo incompatibile con gli aggiornamenti: '+before.slice(0,45));html=html.replace(before,after);};
   replace('<script src="formazione-regole.js"></script>','<script src="formazione-regole-energia.js"></script>');
   replace('<script src="formazione.js"></script>','<script src="formazione-energia.js"></script>');
   replace("function validityActivePrefixes(validity){return['role','fitness','exercise','maintenance'];}",
           "function validityActivePrefixes(validity){return /^MI\\.OPC\\./i.test(String(validity?.code||''))?['role','fitness','exercise']:['role','fitness','exercise','maintenance'];}");
   replace("${validityCell(v.maintenanceOutcome,v.maintenanceExpiry)}",
           "${/^MI\\.OPC\\./i.test(v.code||'')?'<span class=\"status missing\">Esercizio operativo · nessuna giornata Energia</span>':validityCell(v.maintenanceOutcome,v.maintenanceExpiry)}");
   replace('function renderDiaryHistory(activityId)',
           "function canEditDiaryRecord(entry){const u=window.UMTE_SHARED?.user||{};return ['owner','specialist','administrative'].includes(u.role)||String(entry.createdByUserId||'')===String(u.id||'')||(entry.createdByUserId==null&&entry.createdBy===u.name);}\n  function renderDiaryHistory(activityId)");
   replace("can('diaryEdit')?`<button type=\"button\" class=\"diary-edit\" data-edit-diary",
           "can('diaryEdit')&&canEditDiaryRecord(item)?`<button type=\"button\" class=\"diary-edit\" data-edit-diary");
   html=html.replaceAll("can('diaryEdit')?`<button class=\"detail-button\" data-edit-report",
                        "can('diaryEdit')&&canEditDiaryRecord(entry)?`<button class=\"detail-button\" data-edit-report");
   replace("if(!item||!activity)return;el('diaryActualStart')",
           "if(!item||!activity||!canEditDiaryRecord(item))return;el('diaryActualStart')");
   replace('<script src="essenziale-ui.js"></script>',
           '<link rel="stylesheet" href="energy-maintenance.css?v=20261108"><link rel="stylesheet" href="my-team-ui.css?v=20261108"><script src="energy-maintenance-ui.js?v=20261108"></script><script src="my-team-ui.js?v=20261108"></script><script src="essenziale-ui.js"></script>');
 }
 html=html.replace('<script src="essenziale-ui.js"></script>',
  '<link rel="stylesheet" href="mobile-shift-cards.css?v=20261108-week4"><script src="mobile-shift-cards.js?v=20261108-week4"></script><script src="essenziale-ui.js"></script>');
 const desktopMonthStyle='@media(min-width:821px){#shiftMonthlyPanel .umte-v3-month{display:none!important}#shiftMonthlyPanel .monthly-panel{display:block!important}#shiftMonthlyPanel .table-scroll{overflow-x:auto!important;max-width:100%!important}#shiftMonthlyPanel .monthly-table{display:table!important;table-layout:fixed;width:max-content!important;min-width:1600px!important;border-collapse:separate!important}#shiftMonthlyPanel .monthly-table tr{display:table-row!important}#shiftMonthlyPanel .monthly-table td,#shiftMonthlyPanel .monthly-table th{display:table-cell!important;white-space:nowrap!important;vertical-align:middle!important}#shiftMonthlyPanel .monthly-table .nucleus-row td{white-space:normal!important}#shiftMonthlyPanel .monthly-table .monthly-person{min-width:245px!important;max-width:245px!important;width:245px!important}#shiftMonthlyPanel .monthly-table .month-day{min-width:53px!important;width:53px!important;max-width:53px!important;padding:5px!important}#shiftMonthlyPanel .monthly-table .team-shift{white-space:nowrap!important}}';
 const umteV3Style="\n@media(max-width:820px){\nbody .umte-mobile-head{display:none!important}\nbody #shifts>.toolbar,body #shiftWeeklyPanel>.toolbar,body #shiftMonthlyPanel>.toolbar{\ndisplay:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-auto-rows:min-content!important;\nalign-items:start!important;align-content:start!important;gap:10px!important;\nwidth:100%!important;max-width:100%!important;min-width:0!important;\nheight:auto!important;min-height:0!important;padding:12px!important;box-sizing:border-box!important}\nbody #shifts>.toolbar>*,body #shiftWeeklyPanel>.toolbar>*,body #shiftMonthlyPanel>.toolbar>*{\nflex:none!important;flex-basis:auto!important;align-self:start!important;\nheight:auto!important;min-height:0!important;min-width:0!important;\nwidth:100%!important;max-width:100%!important;margin:0!important;box-sizing:border-box!important}\nbody #shifts>.toolbar>label,body #shiftWeeklyPanel>.toolbar>label,body #shiftMonthlyPanel>.toolbar>label{\ndisplay:grid!important;grid-template-columns:minmax(0,1fr)!important;align-content:start!important;gap:5px!important}\nbody #shifts .toolbar input:not([type=checkbox]),body #shifts .toolbar select{\nheight:43px!important;min-height:43px!important;width:100%!important;max-width:100%!important;\nbox-sizing:border-box!important;margin:0!important;padding:8px 10px!important}\nbody #shifts .toolbar input[type=checkbox]{width:18px!important;min-width:18px!important;height:18px!important;min-height:18px!important}\nbody #shiftMonthlyPanel .print-choice{display:flex!important;flex-direction:row!important;gap:8px!important;align-items:center!important}\nbody #shifts .toolbar .status-key{height:auto!important;min-height:0!important;line-height:1.4!important;padding:0!important}\nbody #shiftWeeklyPanel .week-control{display:grid!important;grid-template-columns:42px minmax(0,1fr) 42px!important;gap:8px!important;align-items:end!important}\nbody #shiftWeeklyPanel .week-control>label{min-width:0!important;display:grid!important}\nbody #shiftWeeklyPanel .week-control>button{width:42px!important;height:43px!important;min-height:43px!important}\nbody #shiftMonthlyPanel .heading-actions{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:8px!important}\nbody #shiftMonthlyPanel[data-umte-month-ready=\"yes\"]:not([data-umte-month-table=\"yes\"])>.monthly-panel{display:none!important}\nbody #shiftMonthlyPanel[data-umte-month-table=\"yes\"] .umte-v3-people{display:none!important}\nbody .umte-v3-month{margin:12px 0;display:grid;gap:9px}\nbody .umte-v3-month>button{width:100%;padding:12px;min-height:44px;background:#e4f2f5;color:#11394d;border:1px solid #b9d2d9;border-radius:9px;font-weight:750}\nbody .umte-v3-month>p{font-size:12px;color:#526e7b;margin:0}\nbody .umte-v3-people{display:grid;gap:12px}\nbody .umte-v3-group{display:grid;gap:7px}\nbody .umte-v3-group>h3{font-size:14px!important;background:#dcecf0;border-radius:8px;margin:0;padding:10px;color:#173a4d}\nbody .umte-v3-person{background:#fff;border:1px solid #d0e1e7;border-radius:11px;overflow:hidden}\nbody .umte-v3-person>summary{display:flex;align-items:center;justify-content:space-between;gap:6px;list-style:none;padding:13px;cursor:pointer}\nbody .umte-v3-person>summary::-webkit-details-marker{display:none}\nbody .umte-v3-person>summary strong{font-size:13px;color:#133747}\nbody .umte-v3-person>summary small{font-size:11px;color:#526e7a}\nbody .umte-v3-days{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:9px;border-top:1px solid #e0e9ed}\nbody .umte-v3-days>button{min-width:0;min-height:59px;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;padding:6px 2px;border:1px solid #d5e4e9;border-radius:8px;background:#eff5f7}\nbody .umte-v3-days>button span{font-size:10px;color:#506a75;font-weight:700}\nbody .umte-v3-days>button b{font-size:12px;border-radius:5px;padding:4px 7px;color:white;background:#10374b}\nbody .umte-v3-days>button.changed{background:#fff1f3;border-color:#efadb5}\nbody .umte-v3-days>button.changed b{background:#b83f52}\nbody .umte-v3-days>button:disabled{opacity:.58}\n}\n@media(max-width:360px){body .umte-v3-days{grid-template-columns:repeat(3,minmax(0,1fr))}}\n";
 const umteV3Script="\n(function(){\n\"use strict\";\nfunction start(){\nif(window.matchMedia&&window.matchMedia('(min-width:821px)').matches)return;\nconst panel=document.getElementById(\"shiftMonthlyPanel\");\nconst tbody=document.getElementById(\"monthBody\");\nconst table=panel?.querySelector(\".monthly-panel\");\nif(!panel||!tbody||!table||panel.dataset.umteMonthReady===\"yes\")return;\nconst nav=document.querySelector('.umte-mobilebar [data-mobile-go=\"turni\"]');\nif(nav){const node=Array.from(nav.childNodes).find(n=>n.nodeType===3);if(node)node.textContent=\"Turni\";}\nconst section=document.createElement(\"section\");section.className=\"umte-v3-month\";\nconst toggle=document.createElement(\"button\");toggle.type=\"button\";toggle.textContent=\"Mostra tabella mensile\";\nconst status=document.createElement(\"p\"),list=document.createElement(\"div\");list.className=\"umte-v3-people\";\nsection.append(toggle,status,list);table.insertAdjacentElement(\"beforebegin\",section);panel.dataset.umteMonthReady=\"yes\";\ntoggle.onclick=function(){const was=panel.dataset.umteMonthTable===\"yes\";panel.dataset.umteMonthTable=was?\"no\":\"yes\";toggle.textContent=was?\"Mostra tabella mensile\":\"Torna alle schede per persona\";};\nlet opened=new Set(),queue=false;\nconst append=(parent,tag,text,cls)=>{const x=document.createElement(tag);x.textContent=text||\"\";if(cls)x.className=cls;parent.append(x);return x;};\nfunction render(){\nlist.replaceChildren();let nuc=\"\",squad=\"\",team=null,group=null,count=0;\nconst month=document.getElementById(\"monthPicker\")?.value||\"\";\nfor(const row of tbody.querySelectorAll(\"tr\")){\nif(row.classList.contains(\"nucleus-row\")){nuc=row.querySelector(\"strong\")?.textContent||\"\";group=null;team=null;continue;}\nif(row.classList.contains(\"team-row\")){squad=row.querySelector(\"strong\")?.textContent||\"\";team=row;group=null;continue;}\nif(!row.classList.contains(\"member-row\"))continue;\nif(!group){group=document.createElement(\"section\");group.className=\"umte-v3-group\";append(group,\"h3\",[nuc,squad].filter(Boolean).join(\" · \"));list.append(group);}\nconst name=row.querySelector(\".person-cell strong\")?.textContent.trim()||\"Dipendente\";\nconst id=row.querySelector(\"[data-day-person]\")?.dataset.dayPerson||name;\nconst details=document.createElement(\"details\");details.className=\"umte-v3-person\";\nif(opened.has(id)||(count===0&&opened.size===0))details.open=true;\nconst summary=document.createElement(\"summary\");append(summary,\"strong\",name);append(summary,\"small\",row.children[1]?.textContent?.trim()||\"\");\ndetails.append(summary);\nconst days=document.createElement(\"div\");days.className=\"umte-v3-days\";\nArray.from(row.children).slice(2).forEach((cell,i)=>{\nconst date=cell.dataset.dayDate||(month?month+\"-\"+String(i+1).padStart(2,\"0\"):\"\");\nif(!date)return;\nconst dt=new Date(date+\"T12:00:00\");if(Number.isNaN(dt.getTime()))return;\nlet code=cell.querySelector(\".shift-code\")?.textContent.trim()||\"\";\nif(!code&&cell.querySelector(\".same-team\"))code=team?.children[i+2]?.querySelector(\".team-shift\")?.textContent?.trim()||\"—\";\nif(!code)code=\"—\";\nconst button=document.createElement(\"button\");button.type=\"button\";\nconst day=[\"dom\",\"lun\",\"mar\",\"mer\",\"gio\",\"ven\",\"sab\"][dt.getDay()];\nappend(button,\"span\",day+\" \"+dt.getDate());append(button,\"b\",code);\nif(cell.querySelector(\".shift-code.changed\"))button.className=\"changed\";\nbutton.disabled=!cell.dataset.dayPerson;\nbutton.setAttribute(\"aria-label\",name+\", \"+date+\": \"+code);\nbutton.onclick=()=>cell.dispatchEvent(new MouseEvent(\"click\",{bubbles:true}));\ndays.append(button);\n});\ndetails.append(days);details.addEventListener(\"toggle\",()=>{if(details.open)opened.add(id);else opened.delete(id)});\ngroup.append(details);count++;\n}\nstatus.textContent=count+\" dipendenti · apri il nominativo per vedere il mese\";\nif(!count)append(list,\"p\",\"Nessun turno disponibile per i filtri selezionati.\");\n}\nnew MutationObserver(()=>{if(queue)return;queue=true;requestAnimationFrame(()=>{queue=false;render();});}).observe(tbody,{childList:true});\ndocument.getElementById(\"monthPicker\")?.addEventListener(\"change\",()=>opened.clear(),true);\nrender();\n}\nif(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",start,{once:true});else start();\n})();\n";
 // I CT possono programmare le attività di tutte le squadre del proprio nucleo.
 const chiefGuard="activity?.nucleus===person.nucleus&&normalizeTeam(activity.team)===normalizeTeam(person.team)";
 if(html.includes(chiefGuard))html=html.replace(chiefGuard,"activity?.nucleus===person.nucleus");
 // Moduli RP/straordinari: il riposo originario RGLS resta tale anche dopo variazione in MF.
 const restSwitch="const rest=['RGLS','RISE','RGLSR'].includes(event.shift.effective);";
 if(html.includes(restSwitch))html=html.replace(restSwitch,"const rest=['RGLS','RISE','RGLSR'].includes(event.shift.planned)||['RGLS','RISE','RGLSR'].includes(event.shift.effective);");
 html=html.replace('<script src="segnalazioni.js"></script>','<script src="segnalazioni.js?v=final-20261117-r4"></script>');
 html=html.replace('<script src="risorse-settimana.js"></script>','<script src="risorse-settimana.js?v=allocation-20261117"></script>');
 html=html.replace('<script src="formazione-regole-energia.js"></script>','<script src="formazione-regole-energia.js?v=lunch-20261117"></script>');
 html=html.replace('<script src="formazione-regole.js"></script>','<script src="formazione-regole.js?v=lunch-20261117"></script>');
 const end=html.lastIndexOf('</body>');
 if(end<0)throw Error('HTML applicazione incompleto');
 html=html.slice(0,end)+'<style id="umte-v3-mobile">'+umteV3Style+'</style><style id="umte-desktop-month">'+desktopMonthStyle+'</style><script id="umte-v3-script">'+umteV3Script+'</script>'+html.slice(end);
 html=html.replace('<script src="essenziale-ui.js"></script>', '<link rel="stylesheet" href="mobile-polish.css?v=20261108c"><script src="mobile-navigation.js?v=hamburger-20261117"></script><script src="essenziale-ui.js"></script>');
 html=html.replace('</head>','<link rel="stylesheet" href="interfaccia-2026.css?v=20261110"><link rel="stylesheet" href="guida-rapida.css?v=20261110"></head>');
 html=html.replace('<script src="essenziale-ui.js"></script>','<script src="essenziale-ui.js?v=privacy-20261117"></script>');
 // The embedded app still contains a legacy prototype profile selector. It must never
 // become an alternative to the authenticated Supabase session when startup fails.
 const legacyLoginStart="  el('loginButton').addEventListener('click',()=>{";
 const legacyLoginEnd="  function effectiveRecord(base)";
 const legacyStartAt=html.indexOf(legacyLoginStart),legacyEndAt=html.indexOf(legacyLoginEnd,legacyStartAt);
 if(legacyStartAt<0||legacyEndAt<0)throw Error('Protezione accessi non installata: schermata di avvio obsoleta.');
 html=html.slice(0,legacyStartAt)+
  "  el('loginButton').addEventListener('click',()=>{location.replace('./?login=1');});\n"+
  html.slice(legacyEndAt);
 const legacyBootStart="  try{setupOptions();updateCompetenceSelection();const savedProfile=";
 const legacyBootEnd="\n})();\n\n</script>";
 const bootStartAt=html.indexOf(legacyBootStart),bootEndAt=html.indexOf(legacyBootEnd,bootStartAt);
 if(bootStartAt<0||bootEndAt<0)throw Error('Protezione avvio non installata: versione dell’app non supportata.');
 const protectedBoot=[
  "  try{setupOptions();updateCompetenceSelection();login('personal');}",
  "  catch(error){",
  "   console.error('Errore di inizializzazione UMTE Manager',error);",
  "   el('loginScreen').hidden=true;",
  "   document.body.classList.remove('umte-authenticated');",
  "   const shield=document.createElement('section');shield.id='umteStartupFailure';shield.setAttribute('role','alert');",
  "   shield.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:#f5f9fb;color:#102f41;text-align:center;font:16px system-ui';",
  "   const title=document.createElement('h1');title.textContent='Caricamento del gestionale non riuscito';",
  "   const detail=document.createElement('p');detail.textContent='La sessione Supabase resta associata al tuo account. Non è stato attivato alcun profilo sostitutivo. Dettaglio: '+(error?.message||'Errore sconosciuto');",
  "   const retry=document.createElement('button');retry.type='button';retry.textContent='Riprova il caricamento';retry.style.cssText='padding:12px 18px;border-radius:8px;cursor:pointer';retry.onclick=()=>location.reload();",
  "   shield.append(title,detail,retry);document.body.append(shield);",
  "  }"
 ].join('\n');
 html=html.slice(0,bootStartAt)+protectedBoot+html.slice(bootEndAt);
 // Insert at the actual document closing tag, never inside a JavaScript template containing </body>.
 const closingBody=html.toLowerCase().lastIndexOf('</body>');
 if(closingBody<0)throw Error('Chiusura HTML applicazione mancante');
 html=html.slice(0,closingBody)+'<script src="competence-layout-fixes.js?v=certified-layout-20261123" defer></script><script src="person-day-competences.js?v=20261123-repeat2" defer></script><script src="calendar-forecast-ui.js?v=20261125" defer></script><script src="accounting-template-fallback.js?v=exports-20261123" defer></script><script src="rgls-overtime-ui.js?v=20261123b" defer></script><script src="course-availability-ui.js?v=20261123a" defer></script><script src="rapportino-non-programmato-ui.js?v=20261123a" defer></script><script src="mansioni-superiori-ui.js?v=20261123a" defer></script><script src="personal-event-reminder.js?v=20261123" defer></script><script src="guida-rapida.js?v=sidebar-20261123" defer></script><script src="ted-document-archive.js?v=20261116" defer></script><script src="operational-ui-fixes.js?v=20261117" defer></script>'+html.slice(closingBody);
 // Le variazioni vanno confrontate col turno effettivo importato, NON soltanto col teorico.
 // Esempio: teorico MIR, effettivo importato '*' -> la scelta MIR deve restare come rettifica esplicita.
 const legacyShiftSave="if(selected!==planned){state.variations.push({personId:person.id,personName:person.displayName,date,shift:selected,actualStart:el('variationActualStart').value,actualEnd:el('variationActualEnd').value,reason:el('variationReason').value.trim(),level:evaluation.level,detail:evaluation.detail,createdAt:new Date().toISOString(),createdBy:currentUser.name});persist();closeModals();renderAll();toast('Variazione salvata e controlli aggiornati');}else{persist();closeModals();renderAll();toast('Turno uguale al teorico: variazione rimossa');}";
 const fixedShiftSave="if(selected!==normalizedShiftCode(base?.actual||planned)){state.variations.push({personId:person.id,personName:person.displayName,date,shift:selected,actualStart:el('variationActualStart').value,actualEnd:el('variationActualEnd').value,reason:el('variationReason').value.trim(),level:evaluation.level,detail:evaluation.detail,createdAt:new Date().toISOString(),createdBy:currentUser.name});persist();closeModals();renderAll();toast('Turno effettivo salvato: '+selected+' · verifica il salvataggio online');}else{persist();closeModals();renderAll();toast('Turno ripristinato al valore effettivo del file: '+(base?.actual||planned));}";
 if(!html.includes(legacyShiftSave))throw Error("La gestione variazioni è cambiata: correzione non applicabile in sicurezza.");
 html=html.replace(legacyShiftSave,fixedShiftSave);
 // Congedo C e altri giustificativi si registrano esclusivamente in Nuova variazione.
 // Disattiva il vecchio flusso di richieste/conferme senza cancellare alcun dato storico.
 if(!html.includes('<script src="ferie.js"></script>'))throw Error('Modulo ferie originale non trovato');
 html=html.replace('<script src="ferie.js"></script>','');
 html=html.replace('>Salva comunque</button></div>\\n    </form>\\n  </dialog>\\n\\n  <dialog id="competenceDialog"','>Salva variazione</button></div>\\n    </form>\\n  </dialog>\\n\\n  <dialog id="competenceDialog"');
 // Una competenza importata può non contenere deadline: evitare Invalid time value.
 const oldCompetenceDeadline="const deadline=parseDate(c.deadline),late=now>deadline";
 const safeCompetenceDeadline="const deadline=/^\\d{4}-\\d{2}-\\d{2}$/.test(String(c.deadline||''))?parseDate(c.deadline):(/^\\d{4}-\\d{2}-\\d{2}$/.test(String(c.date||''))?weekDeadline(c.date):null),late=deadline instanceof Date&&!Number.isNaN(deadline.getTime())&&now>deadline";
 if(!html.includes(oldCompetenceDeadline))throw Error('Impossibile trovare la formattazione originale delle scadenze competenze');
 html=html.replace(oldCompetenceDeadline,safeCompetenceDeadline);
 const oldCompetenceFormat="\u0024{fmtDate.format(deadline)}\u0024{late?";
 const safeCompetenceFormat="\u0024{deadline&&!Number.isNaN(deadline.getTime())?fmtDate.format(deadline):'—'}\u0024{late?";
 if(!html.includes(oldCompetenceFormat))throw Error('Scadenza competenze non trovata nel rendering');
 html=html.replace(oldCompetenceFormat,safeCompetenceFormat);
 // I dati 2027-2028 sono nel baseline condiviso, ma il mese era ancora limitato al 2026.
 const oldMonthlyPicker='<input id="monthPicker" type="month" min="2026-01" max="2026-12" value="2026-09">';
 const newMonthlyPicker='<input id="monthPicker" type="month" min="2026-01" max="2028-12" value="2026-09">';
 if(!html.includes(oldMonthlyPicker))throw Error('Selettore mensile originale non trovato');
 html=html.replace(oldMonthlyPicker,newMonthlyPicker);
 const accountingReady="const template=window.UMTE_TEMPLATES?.[type];";
 if(!html.includes(accountingReady))throw Error('Generatore RP/straordinari non disponibile');
 html=html.replace(accountingReady,"await (window.UMTE_MODEL_READY||Promise.resolve());const template=window.UMTE_TEMPLATES?.[type];");
  const oldUser="permissions:window.UMTE_SHARED.user.permissions}:profiles[profileKey]||profiles.viewer";
 if(!html.includes(oldUser))throw Error('Compatibilità login: identità personale non trovata');
 html=html.replace(oldUser,"permissions:window.UMTE_SHARED.user.permissions,personId:window.UMTE_SHARED.user.personId}:profiles[profileKey]||profiles.viewer");
  document.open();document.write(html);document.close();
}
form.onsubmit=async e=>{e.preventDefault();const button=document.getElementById('enter');button.disabled=true;status.dataset.error='false';status.textContent='Accesso in corso…';let authenticated=false;try{const {error}=await cloud.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});if(error)throw Error('Email o password non valide.');authenticated=true;document.getElementById('password').value='';await open();}catch(e){report(e,authenticated);}finally{button.disabled=false;}};
try{const {data}=await cloud.auth.getSession();if(data.session)await open();else status.textContent='Inserisci email e password per accedere.';}catch(e){report(e);}
})();
