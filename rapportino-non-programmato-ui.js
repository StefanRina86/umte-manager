/* Apertura TE-D anche in assenza di attività programmata.
 * Registra prima un'attività minimale, tracciata come intervento non programmato.
 */
(()=>{
'use strict';
const api=window.UMTELeave,shared=window.UMTE_SHARED;
if(!api?.can('diaryEdit'))return;
const state=api.state,staff=(api.people()||[]).filter(p=>p.active!==false);
const role=shared.user.role,me=staff.find(p=>String(p.id)===String(shared.user.personId));
const nucleusList=[...new Set(staff.map(p=>p.nucleus).filter(Boolean))];
const editable=role==='chief'||role==='preposto'?nucleusList.filter(n=>n===me?.nucleus):nucleusList;
const heading=document.querySelector('#reports .page-heading');
if(!heading)return;
const trigger=document.createElement('button');trigger.type='button';trigger.className='button secondary';trigger.textContent='Nuovo TE-D senza attività';
const dialog=document.createElement('dialog');dialog.style.cssText='max-width:min(640px,94vw);width:100%;border:1px solid #b4cbd6;border-radius:12px;padding:22px';
const form=document.createElement('form');form.method='dialog';form.style.cssText='display:grid;gap:12px';
const item=(txt,field)=>{const l=document.createElement('label');l.style.cssText='display:grid;gap:5px;font-weight:650';l.textContent=txt;field.style.width='100%';field.style.minHeight='38px';l.append(field);return l};
const title=document.createElement('h3');title.textContent='TE-D per attività non programmata';
const help=document.createElement('p');help.textContent='Crea un riferimento tracciabile per un intervento realmente eseguito; successivamente compila il rapportino completo.';
const date=document.createElement('input');date.type='date';date.required=true;
const nucleus=document.createElement('select');for(const n of editable)nucleus.add(new Option(n,n));
const name=document.createElement('input');name.type='text';name.required=true;name.placeholder='Tipo di intervento / oggetto';
const location=document.createElement('input');location.type='text';location.required=true;location.placeholder='Stazione, tratta o sito';
const start=document.createElement('input');start.type='time';start.required=true;start.value='07:30';
const end=document.createElement('input');end.type='time';end.required=true;end.value='15:06';
const people=document.createElement('select');people.multiple=true;people.size=5;people.style.minHeight='135px';
const status=document.createElement('p');status.setAttribute('role','status');status.style.color='#8d392b';
const submit=document.createElement('button');submit.type='submit';submit.className='button primary';submit.textContent='Crea e apri TE-D';
const cancel=document.createElement('button');cancel.type='button';cancel.className='button secondary';cancel.textContent='Annulla';cancel.onclick=()=>dialog.close();
form.append(title,help,item('Data intervento',date),item('Nucleo',nucleus),item('Descrizione attività',name),item('Località',location),item('Inizio',start),item('Fine',end),item('Presenti (Ctrl per selezione multipla)',people),status,submit,cancel);
dialog.append(form);heading.append(trigger);document.body.append(dialog);
function refresh(){
 const current=new Set([...people.selectedOptions].map(x=>x.value));people.replaceChildren();
 for(const p of staff.filter(p=>p.nucleus===nucleus.value&&(role!=='preposto'||String(p.team||'')===String(me?.team||'')))){
  const o=new Option(p.displayName+' · Squadra '+(p.team||'staff'),p.id);o.selected=current.has(String(p.id))||!current.size&&String(p.id)===String(me?.id);people.add(o);
 }
 if(!people.selectedOptions.length&&people.options.length)people.options[0].selected=true;
}
nucleus.addEventListener('change',refresh);
trigger.onclick=()=>{date.value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());if(me&&editable.includes(me.nucleus))nucleus.value=me.nucleus;refresh();status.textContent='';dialog.showModal();};
form.addEventListener('submit',e=>{
 e.preventDefault();
 const d=date.value,ns=nucleus.value,selected=[...people.selectedOptions].map(x=>x.value),description=name.value.trim(),site=location.value.trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!description||!site||!selected.length){status.textContent='Compila data, attività, località e partecipanti.';return;}
 if((role==='chief'||role==='preposto')&&(ns!==me?.nucleus||role==='preposto'&&!selected.includes(String(me.id)))){status.textContent='Intervento non consentito fuori dalla giurisdizione.';return;}
 const id='UNPL-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),at=new Date().toISOString();
 const entry={id,title:description,type:'Intervento non programmato',date:d,start:start.value,end:end.value,nucleus:ns,
  team:role==='chief'||role==='preposto'?'Squadra '+String(me.team||''): '',location:site,source:'TE-D non programmato',unplanned:true,
  people:selected,roles:[],roleAssignments:{},odls:[],documents:[],status:'ready',
  notes:'Attività non programmata: riferimento creato per rapportino.',createdAt:at,createdBy:shared.user.name,createdByUserId:shared.user.id};
 state.activities=state.activities||[];state.activities.push(entry);api.persist();api.renderAll?.();dialog.close();
 const host=document.getElementById('activityBoard');if(!host){api.toast?.('Attività di riferimento creata. Apri il programma per compilare il TE-D.');return;}
 const button=document.createElement('button');button.type='button';button.dataset.openDiary=id;button.hidden=true;host.append(button);button.click();button.remove();
});
})();
