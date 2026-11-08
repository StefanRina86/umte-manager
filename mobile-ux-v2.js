/* UMTE mobile v2: vista mensile compatta, scorciatoie corrette, nessun dato riscritto. */
(()=>{
'use strict';
const monthly=document.getElementById('shiftMonthlyPanel');
const tbody=document.getElementById('monthBody');
const thead=document.getElementById('monthHead');
const panel=monthly?.querySelector('.monthly-panel');
if(!monthly||!tbody||!thead||!panel)return;
const bar=document.querySelector('.umte-mobilebar [data-mobile-go="turni"]');
if(bar){
  const text=[...bar.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
  if(text)text.textContent='Turni';
  bar.setAttribute('aria-label','Turni e presenze');
}
const area=document.createElement('div');
area.className='umte-month-cards';
area.setAttribute('aria-label','Turni mensili per dipendente');
const heading=document.createElement('div');
heading.className='umte-month-cards-head';
const title=document.createElement('strong');title.textContent='Turni del mese · per persona';
const guide=document.createElement('span');guide.textContent='Scegli il dipendente e tocca un giorno per aprirlo.';
heading.append(title,guide);
const toggle=document.createElement('button');
toggle.className='umte-month-table-toggle';
toggle.type='button';
toggle.textContent='Mostra la tabella completa';
toggle.setAttribute('aria-expanded','false');
toggle.addEventListener('click',()=>{
 const open=monthly.dataset.monthlyTable==='yes';
 monthly.dataset.monthlyTable=open?'no':'yes';
 toggle.textContent=open?'Mostra la tabella completa':'Torna alle schede per persona';
 toggle.setAttribute('aria-expanded',String(!open));
});
const list=document.createElement('div');list.className='umte-month-cards-list';
area.append(heading,toggle,list);
panel.insertAdjacentElement('beforebegin',area);
const weekdays=['dom','lun','mar','mer','gio','ven','sab'];
const opened=new Set();
let firstLoad=true;
function makeText(tag,value,className){
 const n=document.createElement(tag);
 if(className)n.className=className;
 n.textContent=value||'';
 return n;
}
function renderMonthPerson(record){
 const {row,team,monthDays}=record;
 const card=document.createElement('details');
 card.className='umte-month-person';
 const id=row.querySelector('[data-day-person]')?.dataset.dayPerson||row.querySelector('.monthly-person strong')?.textContent||'';
 if(opened.has(id)||(firstLoad&&opened.size===0&&list.querySelectorAll('details').length===0))card.open=true;
 const label=row.querySelector('.monthly-person strong')?.textContent?.trim()||'Dipendente';
 const quali=row.children[1]?.textContent?.trim()||'';
 const changed=[...row.querySelectorAll('td.editable-day .shift-code.changed')].length;
 const summary=document.createElement('summary');
 summary.append(makeText('strong',label),makeText('small',[quali,changed?changed+' variazioni':''].filter(Boolean).join(' · ')));
 const days=document.createElement('div');
 days.className='umte-month-days';
 const cells=[...row.children].slice(2);
 cells.forEach((cell,index)=>{
  const date=cell.dataset.dayDate||monthDays[index]?.date||'';
  if(!date)return;
  const btn=document.createElement('button');
  btn.type='button';btn.className='umte-month-day';
  const dayNum=Number(date.slice(-2));
  const dow=weekdays[new Date(date+'T12:00:00').getDay()];
  const changed=!!cell.querySelector('.shift-code.changed');
  let value=cell.querySelector('.shift-code')?.textContent?.trim()||'';
  if(!value&&cell.querySelector('.same-team'))value=team?.children[index+2]?.querySelector('.team-shift')?.textContent?.trim()||'—';
  if(!value)value='—';
  btn.append(makeText('span',dow+' '+dayNum),makeText('b',value));
  const note=cell.querySelector('.exception-note')?.textContent?.trim()||'';
  if(note)btn.append(makeText('small',note));
  if(changed)btn.classList.add('changed');
  if(index===0&&firstLoad)btn.setAttribute('data-first-day','yes');
  if([0,6].includes(new Date(date+'T12:00:00').getDay()))btn.classList.add('weekend');
  btn.setAttribute('aria-label',label+', '+dow+' '+dayNum+': '+value+(changed?' (variazione)':''));
  btn.addEventListener('click',()=>cell.click());
  days.append(btn);
 });
 card.append(summary,days);
 card.addEventListener('toggle',()=>{if(card.open)opened.add(id);else opened.delete(id);});
 return card;
}
function render(){
 list.replaceChildren();
 let nucleus='',team='',teamRow=null,group=null,count=0;
 const monthDays=[...thead.querySelectorAll('.month-day')].map(th=>({
  date:document.getElementById('monthPicker')?.value+'-'+String(th.querySelector('strong')?.textContent||'').padStart(2,'0')
 }));
 for(const row of tbody.querySelectorAll('tr')){
  if(row.classList.contains('nucleus-row')){
   nucleus=row.querySelector('strong')?.textContent?.trim()||'Nucleo';
   team='';teamRow=null;group=null;continue;
  }
  if(row.classList.contains('team-row')){
   team=row.querySelector('.monthly-person strong')?.textContent?.trim()||'Squadra';
   teamRow=row;group=null;continue;
  }
  if(!row.classList.contains('member-row'))continue;
  if(!group){
   group=document.createElement('section');group.className='umte-month-group';
   group.append(makeText('h3',[nucleus,team].filter(Boolean).join(' · ')));
   list.append(group);
  }
  group.append(renderMonthPerson({row,team:teamRow,monthDays}));
  count++;
 }
 if(!count)list.append(makeText('p','Nessun turno per i filtri impostati.','umte-month-empty'));
 heading.querySelector('span').textContent=count+' persone · seleziona un nominativo per vedere tutto il mese';
 firstLoad=false;
}
let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;render();});
});
observer.observe(tbody,{childList:true});
const monthPicker=document.getElementById('monthPicker');
monthPicker?.addEventListener('change',()=>{opened.clear();firstLoad=true;},true);
render();
})();