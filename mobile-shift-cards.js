/* Mobile: turni settimanali in schede giornaliere tappabili; mantiene la tabella originale come alternativa. */
(()=>{
'use strict';
const body=document.getElementById('shiftBody'),head=document.getElementById('shiftHead'),section=document.getElementById('shifts');
if(!body||!head||!section)return;
const scroll=body.closest('.table-scroll');if(!scroll)return;
const container=document.createElement('div');container.className='umte-mobile-shift-cards';
const toggle=document.createElement('button');toggle.className='umte-mobile-view-toggle';toggle.type='button';toggle.textContent='Passa alla vista tabella';
toggle.onclick=()=>{const table=section.dataset.mobileTable==='yes';section.dataset.mobileTable=table?'no':'yes';toggle.textContent=table?'Passa alla vista tabella':'Passa alle schede giornaliere';};
scroll.insertAdjacentElement('beforebegin',toggle);scroll.insertAdjacentElement('beforebegin',container);
const short=date=>new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(date+'T12:00:00'));
function render(){
 container.replaceChildren();
 let teamRow=null,persons=0;
 for(const row of body.querySelectorAll('tr')){
  if(row.classList.contains('team-row')){teamRow=row;continue;}
  if(row.classList.contains('nucleus-row')){teamRow=null;continue;}
  const name=row.querySelector('.person-cell strong');if(!name)continue;
  const cells=[...row.querySelectorAll('td[data-day-person]')];
  if(!cells.length)continue;
  persons++;
  const card=document.createElement('article');card.className='umte-mobile-shift-card';
  const title=document.createElement('header');
  const who=document.createElement('strong');who.textContent=name.textContent;
  const qual=document.createElement('small');qual.textContent=row.children[1]?.textContent?.trim()||'';
  title.append(who,qual);card.append(title);
  const days=document.createElement('div');days.className='umte-mobile-days';
  for(let i=0;i<cells.length;i++){
   const cell=cells[i],date=cell.dataset.dayDate,day=document.createElement('button');
   day.type='button';day.className='umte-mobile-day';day.setAttribute('aria-label','Apri turno del '+short(date)+' per '+name.textContent);
   const label=document.createElement('span');label.textContent=short(date);
   let code=cell.querySelector('.shift-code')?.textContent?.trim()||'';
   const same=!!cell.querySelector('.same-team');
   if(same&&!code&&teamRow)code=teamRow.children[i+2]?.querySelector('.team-shift')?.textContent?.trim()||'—';
   if(!code)code='—';
   const codeText=document.createElement('strong');codeText.textContent=code;
   const note=document.createElement('small');note.textContent=cell.querySelector('.exception-note')?.textContent?.trim()||(same?'Come squadra':'');
   if(cell.querySelector('.shift-code.changed'))day.classList.add('changed');
   day.append(label,codeText,note);day.onclick=()=>cell.click();days.append(day);
  }
  card.append(days);container.append(card);
 }
 if(!persons){const empty=document.createElement('p');empty.textContent='Nessun turno per i filtri impostati.';container.append(empty);}
}
const observer=new MutationObserver(()=>requestAnimationFrame(render));observer.observe(body,{childList:true});
render();
})();