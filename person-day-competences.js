/* Dettaglio competenze nella gestione diretta del singolo turno.
   Solo lettura: utilizza i dati già autorizzati e caricati per il profilo. */
(()=>{
'use strict';
const api=()=>window.UMTELeave;
const $=(selector,root=document)=>root.querySelector(selector);
let selected=null;
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
@media(max-width:560px){.umte-person-allowance dl{grid-template-columns:1fr}}
`;
document.head.append(style);
const typeLabels={call:'Chiamata',overtime:'Straordinario',standby:'Reperibilità',travel:'Trasferta',line:'Indennità linea',night:'Cantiere notturno',tunnel:'Galleria',superior:'Mansione superiore'};
const fieldLabels={callTime:'Ora chiamata',callStart:'Inizio intervento',callEnd:'Fine intervento',callReason:'Motivo chiamata',callLocation:'Località',callPhonogram:'Fonogramma',overtimeStart:'Inizio straordinario',overtimeEnd:'Fine straordinario',overtimeReason:'Motivo straordinario',callKm:'Chilometri',callVehicle:'Mezzo',standbyType:'Tipo reperibilità',travelDetails:'Dettagli trasferta',superiorDetails:'Mansione superiore',notes:'Note'};
function data(){return api()?.state?.competencies||window.UMTE_SHARED?.data?.competencies||[];}
function host(){
 return [...document.querySelectorAll('dialog,[role="dialog"],.modal,.modal-overlay')].find(node=>{
   const t=node.textContent||'';
   return /gestione diretta/i.test(t)&&/turno e giustificativo/i.test(t)&&/competenze/i.test(t);
 });
}
function line(tag,value,cls){const n=document.createElement(tag);n.textContent=String(value??'');if(cls)n.className=cls;return n;}
function render(){
 const modal=host();if(!modal||!selected)return;
 const {personId,date}=selected;
 if(!personId||!/^\\d{4}-\\d{2}-\\d{2}$/.test(date))return;
 const summary=modal.querySelector('.umte-person-allowances')||document.createElement('section');
 summary.className='umte-person-allowances';
 const rows=data().filter(r=>String(r.personId)===String(personId)&&r.date===date);
 const signature=JSON.stringify({personId,date,rows});
 if(summary.dataset.signature===signature)return;
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
   list.append(box);
 }
 summary.replaceChildren(title,list);
 // Metti il dettaglio subito sotto le azioni del giorno e prima di "Chiudi".
 const actions=[...modal.querySelectorAll('button,[role=button]')].filter(b=>/turno e giustificativo|competenze/i.test(b.textContent||''));
 const anchor=actions.at(-1)?.closest('button,.action-card,.day-action-card')||actions.at(-1);
 if(!summary.isConnected){
   if(anchor?.parentElement)anchor.parentElement.insertAdjacentElement('afterend',summary);
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