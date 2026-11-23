/* Inserimento operativo congedo C nelle variazioni, disponibile agli addetti autorizzati.
 * Non approva richieste di ferie né sostituisce l'autorizzazione aziendale.
 */
(()=>{
'use strict';
const api=window.UMTELeave,shared=window.UMTE_SHARED;
if(!api||!['owner','specialist','administrative','chief'].includes(shared?.user?.role)||!api.can('variation'))return;
const state=api.state,people=(api.people()||[]).filter(p=>p.active!==false);
const me=people.find(p=>String(p.id)===String(shared.user.personId));
const scope=shared.user.role==='chief'?people.filter(p=>p.nucleus===me?.nucleus):people;
const toolbar=document.querySelector('#shifts .toolbar')||document.querySelector('#shifts .heading-actions')||document.querySelector('#shifts .page-heading');
if(!toolbar)return;
const btn=document.createElement('button');btn.type='button';btn.className='button secondary';btn.textContent='Registra congedo (C)';
const dialog=document.createElement('dialog');dialog.id='umteDirectLeaveDialog';dialog.style.cssText='border:1px solid #cbdce3;border-radius:14px;padding:22px;max-width:min(560px,92vw);width:100%;box-shadow:0 12px 40px #0003';
const label=(text,field)=>{const l=document.createElement('label');l.style.cssText='display:grid;gap:5px;margin:12px 0;font-weight:650';l.append(text,field);return l;};
const title=document.createElement('h3');title.textContent='Congedo ordinario · registrazione del turno C';
const sub=document.createElement('p');sub.style.color='#526b79';sub.textContent='Seleziona il dipendente, la giornata e il riferimento autorizzativo. Il codice C sostituirà il turno effettivo; non equivale all’approvazione di una nuova richiesta ferie.';
const person=document.createElement('select');person.required=true;person.style.width='100%';
person.add(new Option('Seleziona dipendente',''));
for(const p of scope.slice().sort((a,b)=>a.displayName.localeCompare(b.displayName,'it')))person.add(new Option(p.displayName+' · '+p.nucleus+' · CID '+p.id,p.id));
const date=document.createElement('input');date.type='date';date.required=true;date.style.width='100%';
const reason=document.createElement('input');reason.type='text';reason.required=true;reason.placeholder='Autorizzazione / riferimento';reason.style.width='100%';
const note=document.createElement('p');note.setAttribute('role','status');note.style.color='#8b3030';
const save=document.createElement('button');save.type='submit';save.className='button primary';save.textContent='Registra C';
const close=document.createElement('button');close.type='button';close.className='button secondary';close.textContent='Annulla';close.onclick=()=>dialog.close();
const form=document.createElement('form');form.method='dialog';form.append(title,sub,label('Dipendente',person),label('Data',date),label('Riferimento',reason),note,save,close);dialog.append(form);
btn.style.cssText='position:static;align-self:center;margin:6px';
const variationButton=[...toolbar.querySelectorAll('button')].find(b=>/variazione/i.test(b.textContent||''));
if(variationButton)variationButton.insertAdjacentElement('afterend',btn);else toolbar.append(btn);
document.body.append(dialog);
btn.onclick=()=>{date.value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());note.textContent='';dialog.showModal();};
form.addEventListener('submit',e=>{
 e.preventDefault();
 const p=scope.find(x=>String(x.id)===String(person.value)),d=date.value,ref=reason.value.trim();
 if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!ref){note.textContent='Completa dipendente, data e autorizzazione.';return;}
 if(shared.user.role==='chief'&&p.nucleus!==me?.nucleus){note.textContent='Dipendente fuori nucleo.';return;}
 if((state.medicalAppointments||[]).some(x=>String(x.personId)===String(p.id)&&x.date===d)){note.textContent='Visita già programmata: risolvi la sovrapposizione prima del congedo.';return;}
 if((state.trainingEvents||[]).some(x=>(x.personIds||[]).some(id=>String(id)===String(p.id))&&x.startDate<=d&&x.endDate>=d)){note.textContent='Corso già programmato: rimuovi la sovrapposizione prima del congedo.';return;}
 const existing=(state.variations||[]).find(x=>String(x.personId)===String(p.id)&&x.date===d);
 if(existing?.sourceEventId||existing?.sourceLeaveId){note.textContent='La giornata è gestita da un evento o da una richiesta ferie: usa la relativa scheda.';return;}
 if(!window.confirm('Confermi la registrazione di C per '+p.displayName+' il '+d+'?'))return;
 const at=new Date().toISOString(),record={...existing,personId:p.id,personName:p.displayName,date:d,shift:'C',reason:ref,detail:'Congedo autorizzato · '+ref,level:'green',createdAt:existing?.createdAt||at,createdBy:existing?.createdBy||shared.user.name,updatedAt:at,updatedBy:shared.user.name};
 state.variations=(state.variations||[]).filter(x=>!(String(x.personId)===String(p.id)&&x.date===d));
 state.variations.push(record);
 api.persist();api.renderAll?.();
 dialog.close();
 api.toast?.('Congedo registrato localmente: verifica la conferma di salvataggio online');
});
})();
