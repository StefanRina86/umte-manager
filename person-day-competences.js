/* Dettaglio competenze nella gestione diretta del singolo turno.
   Solo lettura: utilizza i dati già autorizzati e caricati per il profilo. */
(()=>{
'use strict';
const api=()=>window.UMTELeave;
const $=(selector,root=document)=>root.querySelector(selector);
let selected=null;
const shared=window.UMTE_SHARED;
const mayCreate=Boolean(['owner','specialist','administrative','chief'].includes(shared?.user?.role)&&api()?.can?.('competenceCreate'));
const canUsePerson=personId=>{if(!mayCreate)return false;if(shared.user.role!=='chief')return true;const me=(shared.data?.peopleRecords||[]).find(p=>String(p.id)===String(shared.user.personId));const target=(shared.data?.peopleRecords||[]).find(p=>String(p.id)===String(personId));return !!me&&!!target&&me.nucleus===target.nucleus;};
const style=document.createElement('style');
style.textContent=`
.umte-person-allowances{margin-top:14px;padding-top:12px;border-top:1px solid #dbe7ed;min-width:0}
.umte-person-allowances h3{margin:0 0 9px;color:#123c51;font-size:15px}
.umte-person-allowances .umte-person-allowance-list{display:grid;gap:9px}
.umte-person-allowance{border:1px solid #d6e3e9;background:#f7fafc;border-radius:10px;padding:11px;min-width:0}
.umte-person-allowance header{display:flex;gap:9px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.umte-person-allowance strong{font-size:14px;color:#113c53}
.umte-person-allowance small{color:#526c79;font-size:12px}
.umte-person-allowance dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:9px 0 0}
.umte-person-allowance dl div{min-width:0}
.umte-person-allowance dt{font-size:11px;color:#627b88}
.umte-person-allowance dd{font-size:12px;margin:2px 0 0;overflow-wrap:anywhere}
.umte-person-allowances p{font-size:13px;color:#526c79;margin:5px 0}
.umte-duplicate-btn{padding:7px 10px;margin-top:10px;border:1px solid #a9c9d7;border-radius:7px;background:#fff;color:#16445c;cursor:pointer;font-size:12px;font-weight:650}
#umte-duplicate-dialog{border:1px solid #bdd3df;border-radius:14px;max-width:min(600px,94vw);width:100%;max-height:90dvh;overflow:auto;padding:22px;box-shadow:0 18px 54px #0004}
#umte-duplicate-dialog::backdrop{background:#001d2c99}
#umte-duplicate-dialog form{display:grid;gap:12px}
#umte-duplicate-dialog label{display:grid;gap:5px;font-weight:600;font-size:13px}
#umte-duplicate-dialog input,#umte-duplicate-dialog textarea{width:100%;min-width:0;padding:9px;border:1px solid #cbdce3;border-radius:7px;font:inherit}
#umte-duplicate-dialog .umte-dup-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#umte-duplicate-dialog .umte-dup-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
#umte-duplicate-dialog .umte-dup-actions button{padding:10px 15px;border-radius:8px;cursor:pointer}
@media(max-width:560px){#umte-duplicate-dialog .umte-dup-grid{grid-template-columns:1fr}}
@media(max-width:560px){.umte-person-allowance dl{grid-template-columns:1fr}}
`;
document.head.append(style);
const typeLabels={call:'Chiamata',overtime:'Straordinario',standby:'Reperibilità',travel:'Trasferta',line:'Indennità linea',night:'Cantiere notturno',tunnel:'Galleria',superior:'Mansione superiore'};
const cloneEditable=['callTime','callStart','callEnd','callReason','callLocation','callPhonogram','callVehicle','callKm','callKmDue','overtimeStart','overtimeEnd','overtimeReason','standbyType','travelDetails','notes'];
const canCloneValue=v=>v===null||['string','number','boolean'].includes(typeof v);
let duplicateDialog=null;
function duplicate(record){
 if(!canUsePerson(record.personId))return;
 if(!duplicateDialog){
  duplicateDialog=document.createElement('dialog');duplicateDialog.id='umte-duplicate-dialog';
  document.body.append(duplicateDialog);
 }
 duplicateDialog.replaceChildren();
 const form=document.createElement('form');form.noValidate=true;
 const heading=document.createElement('h2');heading.textContent='Nuova registrazione della stessa competenza';form.append(heading);
 const about=document.createElement('p');about.textContent='La registrazione originale non verrà modificata. Verifica orari e motivo: ogni nuova voce avrà un identificativo distinto.';form.append(about);
 const info=document.createElement('p');info.textContent=record.personName+' · '+record.date+' · '+Object.keys(record.allowances||{}).filter(k=>record.allowances[k]).map(k=>typeLabels[k]||k).join(', ');form.append(info);
 const grid=document.createElement('div');grid.className='umte-dup-grid';
 const inputs=new Map();
 for(const key of cloneEditable){
  if(!canCloneValue(record[key])||record[key]===undefined||record[key]===null)continue;
  const label=document.createElement('label');label.textContent=fieldLabels[key]||key;
  const input=key==='notes'||key==='callReason'||key==='overtimeReason'||key==='travelDetails'?document.createElement('textarea'):document.createElement('input');
  if(input.tagName==='INPUT')input.type=/^(callTime|callStart|callEnd|overtimeStart|overtimeEnd)$/.test(key)?'time':'text';
  input.value=String(record[key]);label.append(input);grid.append(label);inputs.set(key,input);
 }
 if(!inputs.size){const label=document.createElement('label');label.textContent='Motivo / riferimento';const field=document.createElement('textarea');label.append(field);grid.append(label);inputs.set('notes',field);}
 form.append(grid);
 const status=document.createElement('p');status.setAttribute('role','alert');form.append(status);
 const actions=document.createElement('div');actions.className='umte-dup-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annulla';cancel.onclick=()=>duplicateDialog.close();
 const save=document.createElement('button');save.type='submit';save.textContent='Salva nuova registrazione';actions.append(cancel,save);form.append(actions);
 duplicateDialog.append(form);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!canUsePerson(record.personId)){status.textContent='Registrazione non autorizzata per questo profilo.';return;}
  if(document.body.dataset.sharedSaveFailed==='1'||document.body.dataset.sharedSaveNeedsReload==='1'){status.textContent='Aggiorna o risolvi il salvataggio condiviso prima di registrare altre competenze.';return;}
  const state=api()?.state;
  if(!state||!Array.isArray(state.competencies)){status.textContent='Archivio competenze non disponibile.';return;}
  const now=new Date().toISOString(),next=structuredClone(record);
  next.id='C'+Date.now()+'-'+String(record.personId)+'-'+crypto.randomUUID();
  next.source='manual';next.status='pending';next.createdAt=now;next.updatedAt=now;
  next.createdBy=shared.user.name;next.updatedBy=shared.user.name;
  delete next.approvedAt;delete next.approvedBy;delete next.certifiedByRole;
  delete next.rejectedAt;delete next.rejectedBy;
  delete next.diaryEntryIds;delete next.diaryContributions;
  delete next.manualOverride;delete next.ctConfirmedAt;delete next.ctConfirmedBy;
  for(const [key,input] of inputs)next[key]=input.value.trim();
  if(!window.confirm('Registrare una seconda competenza per la stessa persona e giornata? La voce originale resterà invariata.'))return;
  state.competencies.push(next);
  try{api().persist();api().renderAll?.();duplicateDialog.close();render(true);api().toast?.('Nuova competenza registrata. Controlla la conferma del salvataggio online.');}
  catch(error){state.competencies=state.competencies.filter(x=>x.id!==next.id);status.textContent='Salvataggio non riuscito: '+String(error?.message||error);}
 });
 duplicateDialog.showModal();
}
const fieldLabels={callTime:'Ora chiamata',callStart:'Inizio intervento',callEnd:'Fine intervento',callReason:'Motivo chiamata',callLocation:'Località',callPhonogram:'Fonogramma',overtimeStart:'Inizio straordinario',overtimeEnd:'Fine straordinario',overtimeReason:'Motivo straordinario',callKm:'Chilometri',callVehicle:'Mezzo',standbyType:'Tipo reperibilità',travelDetails:'Dettagli trasferta',superiorDetails:'Mansione superiore',notes:'Note'};
function data(){return api()?.state?.competencies||window.UMTE_SHARED?.data?.competencies||[];}
function host(){
 return [...document.querySelectorAll('dialog,[role="dialog"],.modal,.modal-overlay')].find(node=>{
   const t=node.textContent||'';
   return /gestione diretta/i.test(t)&&/turno e giustificativo/i.test(t)&&/competenze/i.test(t);
 });
}
function line(tag,value,cls){const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n;}
function render(force=false){
 const modal=host();if(!modal||!selected)return;
 const {personId,date}=selected;
 if(!personId||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 const summary=modal.querySelector('.umte-person-allowances')||document.createElement('section');
 summary.className='umte-person-allowances';
 const rows=data().filter(r=>String(r.personId)===String(personId)&&r.date===date);
 const signature=JSON.stringify({personId,date,rows});
 if(!force&&summary.dataset.signature===signature)return;
 summary.dataset.signature=signature;
 const title=line('h3','Competenze del '+date.split('-').reverse().join('/')+' ('+rows.length+')');
 const list=document.createElement('div');list.className='umte-person-allowance-list';
 if(!rows.length)list.append(line('p','Nessuna competenza registrata per questa giornata.'));
 for(const r of rows){
   const box=document.createElement('article');box.className='umte-person-allowance';
   const types=Object.entries(r.allowances||{}).filter(([,val])=>val!==false&&val!==null&&val!==''&&val!==0).map(([key])=>typeLabels[key]||key);
   const header=document.createElement('header');
   header.append(line('strong',types.join(' · ')||'Competenza'),line('small',r.status==='approved'?'Certificata':r.status==='imported'?'Storico importato':r.status==='rejected'?'Respinta':'Registrata · '+(r.status||'da verificare')));
   box.append(header);
   const fields=document.createElement('dl');
   for(const [key,label] of Object.entries(fieldLabels)){
     const v=r[key];if(v===undefined||v===null||v===''||typeof v==='object')continue;
     const pair=document.createElement('div');pair.append(line('dt',label),line('dd',v));fields.append(pair);
   }
   if(fields.children.length)box.append(fields);
   if(canUsePerson(r.personId)){
    const again=document.createElement('button');again.type='button';again.className='umte-duplicate-btn';again.textContent='Aggiungi un’altra registrazione dello stesso tipo';
    again.addEventListener('click',()=>duplicate(r));box.append(again);
   }
   list.append(box);
 }
 summary.replaceChildren(title,list);
 // Metti il dettaglio subito sotto le azioni del giorno e prima di "Chiudi".
 const actions=[...modal.querySelectorAll('button,[role=button]')].filter(b=>/turno e giustificativo|competenze/i.test(b.textContent||''));
 const anchor=actions.at(-1)?.closest('button,.action-card,.day-action-card')||actions.at(-1);
 if(!summary.isConnected){
   if(anchor?.parentElement)anchor.insertAdjacentElement('afterend',summary);
   else modal.append(summary);
 }
}
document.addEventListener('click',e=>{
 const day=e.target.closest('[data-day-person]');
 if(day){
   const id=day.dataset.dayPerson,date=day.dataset.dayDate;
   if(id&&date){selected={personId:id,date};setTimeout(render,0);}
 }
},true);
let pending=false;
const observer=new MutationObserver(()=>{
 if(pending)return;pending=true;
 setTimeout(()=>{pending=false;render();},0);
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});
document.addEventListener('umte-render',()=>setTimeout(render,0));
})();