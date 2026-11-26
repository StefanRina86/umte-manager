/* UMTE Manager: festività 2026-2028, evidenza in rosso e concessione FE dal mensile.
   Nessun dato personale incorporato nel repository. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const iso=(y,m,d)=>String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
const addDays=(date,delta)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;return iso(year,Math.floor(n/31),n%31+1);}
const holidaysForYear=year=>{
 const rules=[
 [1,1,'Capodanno'],[1,6,'Epifania'],[4,25,'Liberazione'],
 [5,1,'Festa dei lavoratori'],[6,2,'Festa della Repubblica'],
 [6,29,'SS. Pietro e Paolo · festività aziendale'],
 [8,15,'Ferragosto'],[10,4,'San Francesco d’Assisi'],
 [11,1,'Ognissanti'],[12,8,'Immacolata'],[12,25,'Natale'],[12,26,'Santo Stefano']];
 const map=new Map(rules.map(([m,d,title])=>[iso(year,m,d),title]));
 const sunday=easter(year);
 map.set(sunday,'Pasqua');map.set(addDays(sunday,1),'Lunedì dell’Angelo');
 return map;
};
const dates=new Map([2026,2027,2028].flatMap(year=>[...holidaysForYear(year)]));
const api=()=>window.UMTELeave;
const canManage=()=>api()?.user?.()?.role==='owner'&&api()?.can?.('variation');
const selectedDate=()=>String($('monthPicker')?.value||'');
const monthHolidays=()=>[...dates.entries()].filter(([d])=>d.startsWith(selectedDate())).sort((a,b)=>a[0].localeCompare(b[0]));
const activePeople=()=>api()?.people?.()?.filter(p=>p.active!==false)||[];
const esc=text=>String(text??'');
const css=document.createElement('style');
css.textContent=`
#monthHead th.umte-festivo,#shiftHead th.umte-festivo{background:#fff0f0!important;color:#b42330!important;box-shadow:inset 0 -2px 0 #dc3949}
#monthHead th.umte-festivo strong,#shiftHead th.umte-festivo{color:#b42330!important}
#umte-holiday-planner{margin:12px 0;padding:12px 14px;border:1px solid #d7e3e8;border-radius:10px;background:var(--surface,#fff);font-size:13px}
#umte-holiday-planner h3{font-size:14px;margin:0 0 5px;color:#143d50}
#umte-holiday-planner p{margin:5px 0 9px;line-height:1.45;color:#52717c}
#umte-holiday-planner .umte-holiday-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin-bottom:10px}
#umte-holiday-planner .umte-holiday-row label{display:grid;gap:4px;font-size:12px;color:#405969;min-width:165px}
#umte-holiday-planner select,#umte-holiday-planner button{font:inherit;border:1px solid #b6cfd9;border-radius:7px;padding:8px;background:#fff;color:#173e53}
#umte-holiday-planner button{font-weight:650;cursor:pointer}
#umte-holiday-planner .umte-holiday-primary{background:#113e53;color:#fff;border-color:#113e53}
#umte-holiday-planner .umte-holiday-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:5px;max-height:190px;overflow:auto;padding:8px;border:1px solid #e0e9ee;border-radius:7px}
#umte-holiday-planner .umte-holiday-people label{display:flex;align-items:center;gap:7px;padding:4px;font-size:12px;cursor:pointer}
#umte-holiday-planner .umte-holiday-people input{width:15px;height:15px;flex-shrink:0}
#umte-holiday-planner .umte-holiday-status{font-weight:600;color:#315f70}
`;
document.head.append(css);
function markHeaders(){
 const month=selectedDate(),head=$('monthHead');
 if(head&&/^20\d\d-\d\d$/.test(month)){
  [...head.querySelectorAll('tr:first-child th')].slice(2).forEach((th,i)=>{
    const day=iso(+month.slice(0,4),+month.slice(5),i+1),title=dates.get(day);
    th.classList.toggle('umte-festivo',!!title);
    if(title)th.title=day+' · '+title;else th.removeAttribute('title');
  });
 }
 const sh=$('shiftHead'),week=$('weekPicker')?.value||'';
 if(sh&&/^20\d\d-\d\d-\d\d$/.test(week)){
  const monday=new Date(week+'T12:00:00Z'),weekday=(monday.getUTCDay()+6)%7;
  monday.setUTCDate(monday.getUTCDate()-weekday);
  [...sh.querySelectorAll('tr:first-child th')].slice(2).forEach((th,i)=>{
    const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),title=dates.get(date);
    th.classList.toggle('umte-festivo',!!title);
    if(title)th.title=date+' · '+title;else th.removeAttribute('title');
  });
 }
}
function create(tag,txt){const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;return el;}
let root,dateControl,nucleusControl,peopleBox,message,go,chosen=new Set(),presentMonth='';
function redrawPeople(){
 const people=activePeople().filter(p=>(!nucleusControl.value||p.nucleus===nucleusControl.value)&&api()?.record?.(p.id,dateControl.value));
 peopleBox.replaceChildren();
 const date=dateControl.value;const current=api()?.state?.variations||[];
 for(const p of people){
  const label=create('label');const cb=create('input');cb.type='checkbox';cb.value=String(p.id);
  cb.checked=chosen.has(String(p.id));cb.addEventListener('change',()=>{if(cb.checked)chosen.add(cb.value);else chosen.delete(cb.value);updateCount();});
  const prior=current.find(v=>String(v.personId)===String(p.id)&&v.date===date);
  const details=prior?.shift==='FE'?' · FE già assegnato':prior?.shift?' · attuale '+prior.shift:'';
  label.append(cb,create('span',(p.displayName||p.id)+details));peopleBox.append(label);
 }
 updateCount();
}
function updateCount(){go.disabled=!dateControl.value||!chosen.size||!canManage()||document.body.dataset.sharedSaveFailed==='1'||document.body.dataset.sharedSaveNeedsReload==='1';message.textContent=chosen.size+' risorse selezionate · il teorico rimane invariato';}
function sync(){
 markHeaders();if(!root||!canManage())return;
 const month=selectedDate();if(presentMonth!==month){
  presentMonth=month;chosen.clear();
  const entries=monthHolidays();
  dateControl.replaceChildren();
  for(const [date,name] of entries){const option=create('option',date.split('-').reverse().join('/')+' · '+name);option.value=date;dateControl.append(option);}
  dateControl.disabled=!entries.length;
  root.hidden=!entries.length;
  if(entries.length)redrawPeople();
 }
}
function apply(){
 const apiObj=api();if(!canManage()||!apiObj?.state||!chosen.size)return;
 if(document.body.dataset.sharedSaveFailed==='1'||document.body.dataset.sharedSaveNeedsReload==='1'){message.textContent='Aggiorna i dati prima di un nuovo salvataggio';return;}
 const date=dateControl.value,title=dates.get(date);if(!title)return;
 const ids=new Set(chosen),people=activePeople().filter(p=>ids.has(String(p.id))&&apiObj.record?.(p.id,date));
 const current=apiObj.state.variations||[];
 const changed=people.filter(p=>current.find(v=>String(v.personId)===String(p.id)&&v.date===date)?.shift!=='FE');
 const prior=changed.filter(p=>current.some(v=>String(v.personId)===String(p.id)&&v.date===date));
 if(!changed.length){message.textContent='FE già assegnato a tutte le risorse selezionate';return;}
 const prompt='Applicare FE del '+date.split('-').reverse().join('/')+' ('+title+') a '+changed.length+' dipendenti?'+(prior.length?' Saranno sostituite '+prior.length+' variazioni già presenti (conservate nello storico dei salvataggi).':'')+' Il turno teorico non cambia.';
 if(!window.confirm(prompt))return;
 const stamp=new Date().toISOString(),actor=apiObj.user()?.name||'Responsabile';
 const remove=new Set(changed.map(p=>String(p.id)));
 const incoming=changed.map(p=>({id:'VAR-'+p.id+'-'+date,personId:String(p.id),personName:p.displayName,date,shift:'FE',reason:'Festività riconosciuta · '+title,detail:'FE assegnato nella programmazione mensile. Teorico invariato.',source:'FESTIVO-MENSILE-CUM',level:'green',createdAt:stamp,createdBy:actor,updatedAt:stamp,updatedBy:actor}));
 const previous=apiObj.state.variations;
 apiObj.state.variations=previous.filter(v=>!(v.date===date&&remove.has(String(v.personId)))).concat(incoming);
 try{
  apiObj.audit?.('Turni','Riconoscimento FE',date+' · '+title+' · '+changed.length+' dipendenti');
  apiObj.persist();apiObj.renderAll();message.textContent='Registrati '+changed.length+' FE. Verifica la conferma di salvataggio condiviso.';
  apiObj.toast?.(changed.length+' FE registrati');
 }catch(err){apiObj.state.variations=previous;message.textContent='Errore: '+String(err?.message||err);}
 redrawPeople();
}
function init(){
 const panel=$('shiftMonthlyPanel');if(!panel)return;
 root=$('umte-holiday-planner')||create('section');root.id='umte-holiday-planner';
 root.hidden=true;
 root.append(create('h3','Festivi del mese · riconoscimento FE'));
 root.append(create('p','I numeri rossi indicano le festività. Il FE non è automatico: seleziona data e personale quando prepari il mensile. Il 29 giugno è incluso come festività aziendale.'));
 const controls=create('div');controls.className='umte-holiday-row';
 const dateLabel=create('label','Festività');dateControl=create('select');dateLabel.append(dateControl);controls.append(dateLabel);
 const nucleusLabel=create('label','Nucleo');nucleusControl=create('select');
 nucleusControl.append(new Option('Tutti i nuclei',''));
 for(const n of [...new Set(activePeople().map(p=>p.nucleus).filter(Boolean))].sort())nucleusControl.append(new Option(n,n));
 nucleusLabel.append(nucleusControl);controls.append(nucleusLabel);
 const all=create('button','Seleziona tutti');all.type='button';all.onclick=()=>{for(const p of activePeople().filter(p=>(!nucleusControl.value||p.nucleus===nucleusControl.value)&&api()?.record?.(p.id,dateControl.value)))chosen.add(String(p.id));redrawPeople();};
 const none=create('button','Deseleziona');none.type='button';none.onclick=()=>{chosen.clear();redrawPeople();};
 controls.append(all,none);root.append(controls);
 peopleBox=create('div');peopleBox.className='umte-holiday-people';root.append(peopleBox);
 const bottom=create('div');bottom.className='umte-holiday-row';bottom.style.marginTop='10px';
 go=create('button','Applica FE ai selezionati');go.type='button';go.className='umte-holiday-primary';go.onclick=apply;bottom.append(go);
 message=create('span');message.className='umte-holiday-status';bottom.append(message);root.append(bottom);
 dateControl.addEventListener('change',redrawPeople);nucleusControl.addEventListener('change',redrawPeople);
 const toolbar=panel.querySelector('.toolbar');if(toolbar)toolbar.insertAdjacentElement('afterend',root);else panel.prepend(root);
 $('monthPicker')?.addEventListener('change',sync);$('weekPicker')?.addEventListener('change',markHeaders);
 const mo=new MutationObserver(()=>{if(window.requestAnimationFrame)requestAnimationFrame(markHeaders);else markHeaders();});
 for(const head of [$('monthHead'),$('shiftHead')])if(head)mo.observe(head,{childList:true});
 document.addEventListener('umte-render',sync);sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
