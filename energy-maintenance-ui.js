/* Mantenimento collettivo per le sole abilitazioni Energia MI.EN. */
(()=>{
'use strict';
const shared=window.UMTE_SHARED;
if(!shared?.capabilities?.energyMaintenance||!['owner','specialist'].includes(shared.user?.role))return;
const parent=document.querySelector('#people .page-heading'),api=window.UMTECloudApi;
if(!parent||!api)return;
const people=(shared.data.peopleRecords||[]).filter(p=>p.active!==false&&(p.validities||[]).some(v=>/^MI\.EN\./i.test(v.code||''))).sort((a,b)=>String(a.nucleus).localeCompare(String(b.nucleus))||String(a.displayName).localeCompare(String(b.displayName)));
const element=(tag,txt)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;return e;};
const section=element('section');section.className='umte-energy-maintenance panel';
const detail=element('details'),title=element('summary','Mantenimento competenze Energia · registrazione per più partecipanti');detail.append(title);
detail.append(element('p','Una sessione per tutte le abilitazioni MI.EN. possedute dai partecipanti selezionati. Non modifica MI.OPC (OPC, guida/scorta), nomina, idoneità o esercizio. Registrare solo attività realmente eseguite.'));
const form=element('form');form.className='umte-energy-form';form.autocomplete='off';
const fields=element('div');fields.className='umte-energy-fields';
const addInput=(txt,type)=>{const label=element('label',txt),i=element('input');i.type=type;i.required=true;label.append(i);fields.append(label);return i;};
const date=addInput('Data effettiva del mantenimento','date');date.max=new Date().toLocaleDateString('sv-SE');
const expiry=addInput('Nuova scadenza documentata','date');
const reference=addInput('Registro / verbale di riferimento','text');reference.maxLength=300;
form.append(fields);
const toolbar=element('div');toolbar.className='umte-energy-fields';
const nucleusLabel=element('label','Nucleo'),nucleus=element('select');nucleus.add(new Option('Tutti i nuclei',''));
for(const x of [...new Set(people.map(p=>p.nucleus))].filter(Boolean))nucleus.add(new Option(x,x));
nucleusLabel.append(nucleus);
const searchLabel=element('label','Cerca partecipante'),search=element('input');search.type='search';search.placeholder='Nome, cognome o CID';searchLabel.append(search);
toolbar.append(nucleusLabel,searchLabel);form.append(toolbar);
const list=element('div');list.className='umte-energy-roster';
const selected=new Set(),count=element('p');
const matches=()=>people.filter(p=>(!nucleus.value||p.nucleus===nucleus.value)&&(!search.value||String(p.displayName+' '+p.id).toLowerCase().includes(search.value.trim().toLowerCase())));
function refresh(){
 list.replaceChildren();
 for(const p of matches()){
  const label=element('label'),input=element('input');input.type='checkbox';input.checked=selected.has(String(p.id));
  input.onchange=()=>{if(input.checked)selected.add(String(p.id));else selected.delete(String(p.id));updateCount();};
  label.append(input,element('span',p.displayName+' · '+p.nucleus+' · '+(p.team?'Squadra '+p.team:'Staff')));list.append(label);
 }
 if(!list.children.length)list.append(element('p','Nessun partecipante trovato'));
 updateCount();
}
function updateCount(){const participants=people.filter(p=>selected.has(String(p.id)));const n=participants.reduce((sum,p)=>sum+(p.validities||[]).filter(v=>/^MI\.EN\./i.test(v.code||'')).length,0);count.textContent=participants.length+' partecipanti, '+n+' abilitazioni Energia interessate; nessuna MI.OPC.';}
nucleus.onchange=refresh;search.oninput=refresh;
const actions=element('div');actions.className='umte-energy-actions';
const all=element('button','Seleziona i risultati');all.type='button';all.onclick=()=>{for(const p of matches())selected.add(String(p.id));refresh();};
const clear=element('button','Deseleziona tutti');clear.type='button';clear.onclick=()=>{selected.clear();refresh();};
actions.append(all,clear);
const label=element('label','Note (facoltative)'),notes=element('textarea');notes.rows=2;notes.maxLength=500;label.append(notes);
const submit=element('button','Registra mantenimento');submit.type='submit';submit.className='button primary';
const status=element('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
form.append(actions,list,count,label,submit,status);
form.onsubmit=async e=>{
 e.preventDefault();const ids=[...selected];
 if(!ids.length){status.textContent='Seleziona i partecipanti effettivi.';return;}
 if(!date.value||!expiry.value||expiry.value<date.value||!reference.value.trim()){status.textContent='Data, scadenza e verbale sono obbligatori.';return;}
 if(!confirm('Confermi il mantenimento svolto il '+date.value+' per '+ids.length+' partecipanti? Verranno aggiornate tutte le loro abilitazioni MI.EN.'))return;
 submit.disabled=true;status.textContent='Registrazione in corso…';
 try{
  const response=await api({action:'energyMaintenance',revision:shared.revision,personIds:ids,date:date.value,expiry:expiry.value,reference:reference.value.trim(),notes:notes.value.trim()});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Operazione non riuscita');
  status.textContent='Aggiornate '+result.changed+' abilitazioni. Ricaricamento…';location.reload();
 }catch(error){status.textContent=error.message;submit.disabled=false;}
};
detail.append(form);section.append(detail);parent.insertAdjacentElement('afterend',section);refresh();
})();