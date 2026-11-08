/* Mobile weekly schedule: grouped by nucleus/squad, compact 7-day cards, native table toggle.
   Read-only presentation of the existing DOM; day taps reuse the existing cell action. */
(()=>{
 'use strict';
 const tbody=document.getElementById('shiftBody'),section=document.getElementById('shifts');
 if(!tbody||!section)return;
 const scroll=tbody.closest('.table-scroll');if(!scroll)return;
 scroll.classList.add('umte-original-week-table');
 const host=document.createElement('section');host.className='umte-mobile-week';
 host.setAttribute('aria-label','Turni settimanali per squadra');
 const controls=document.createElement('div');controls.className='umte-mobile-week-tools';
 const selection=document.createElement('label');selection.textContent='Squadra da visualizzare';
 const select=document.createElement('select');select.setAttribute('aria-label','Scegli nucleo e squadra');selection.append(select);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='umte-mobile-view-toggle';toggle.textContent='Visualizza tabella completa';
 const description=document.createElement('p');description.className='umte-week-description';
 description.textContent='Tocca il turno di una giornata per aprire il dettaglio. Le modifiche individuali sono evidenziate.';
 const cards=document.createElement('div');cards.className='umte-mobile-week-cards';
 controls.append(selection,toggle);host.append(controls,description,cards);
 scroll.insertAdjacentElement('beforebegin',host);
 section.dataset.mobileTable='no';
 toggle.addEventListener('click',()=>{
  const table=section.dataset.mobileTable==='yes';
  section.dataset.mobileTable=table?'no':'yes';
  toggle.textContent=table?'Visualizza tabella completa':'Torna alle schede della squadra';
  toggle.setAttribute('aria-expanded',String(!table));
 });
 let chosen='',scheduled=false;
 const text=(tag,value,className)=>{
  const e=document.createElement(tag);e.textContent=value||'';
  if(className)e.className=className;
  return e;
 };
 const weekday=(date)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return 'Giorno';
  const d=new Date(date+'T12:00:00');
  return Number.isNaN(d.getTime())?'Giorno':new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'2-digit',month:'2-digit'}).format(d);
 };
 function records(){
  const groups=[],counts=new Map();
  let nucleus='Nucleo',team='Squadra',teamRow=null,group=null,groupNo=0;
  for(const row of tbody.querySelectorAll('tr')){
   if(row.classList.contains('nucleus-row')){
    nucleus=row.querySelector('strong')?.textContent?.trim()||row.textContent.trim()||'Nucleo';
    teamRow=null;group=null;continue;
   }
   if(row.classList.contains('team-row')){
    teamRow=row;
    team=row.querySelector('strong')?.textContent?.trim()||row.querySelector('.team-name')?.textContent?.trim()||row.children[0]?.textContent?.trim()||'Squadra';
    const id=nucleus+'|'+team+'|'+(++groupNo);
    group={id,nucleus,team,teamRow,people:[]};groups.push(group);continue;
   }
   const person=row.querySelector('.person-cell strong');
   if(!person)continue;
   const cells=[...row.querySelectorAll('td[data-day-person]')];
   if(!cells.length)continue;
   if(!group){
    const id=nucleus+'|Altri|'+(++groupNo);
    group={id,nucleus,team:'Altri',teamRow:null,people:[]};groups.push(group);
   }
   group.people.push({row,name:person.textContent.trim(),cells});
   counts.set(group.id,(counts.get(group.id)||0)+1);
  }
  return groups.filter(g=>g.people.length);
 }
 function render(){
  const groups=records(),ids=new Set(groups.map(g=>g.id));
  const prior=chosen;
  if(!ids.has(chosen))chosen=groups[0]?.id||'';
  if(prior!==chosen||select.options.length!==groups.length){
   select.replaceChildren();
   groups.forEach(g=>select.add(new Option(g.nucleus+' · '+g.team+' ('+g.people.length+')',g.id)));
  }
  select.value=chosen;
  cards.replaceChildren();
  const group=groups.find(g=>g.id===chosen);
  if(!group){cards.append(text('p','Nessun turno per i filtri selezionati.'));return;}
  cards.append(text('h3',group.nucleus+' · '+group.team));
  cards.append(text('p',group.people.length+' componenti · settimana visualizzata','umte-week-count'));
  for(const {row,name,cells} of group.people){
   const card=document.createElement('article');card.className='umte-mobile-shift-card';
   const head=document.createElement('header');
   head.append(text('strong',name),text('small',row.children[1]?.textContent?.trim()||''));
   card.append(head);
   const days=document.createElement('div');days.className='umte-mobile-days';
   cells.forEach((cell,i)=>{
    const date=cell.dataset.dayDate||'';
    const day=document.createElement('button');day.type='button';day.className='umte-mobile-day';
    const codeNode=cell.querySelector('.shift-code');
    const same=!!cell.querySelector('.same-team');
    let code=codeNode?.textContent?.trim()||'';
    if(!code&&same){
     const teamCell=group.teamRow?.children[i+2];
     code=teamCell?.querySelector('.team-shift')?.textContent?.trim()||
       teamCell?.querySelector('.shift-code')?.textContent?.trim()||'—';
    }
    if(!code)code='—';
    const changed=!!codeNode||!!cell.querySelector('.exception-note');
    if(changed&&!same)day.classList.add('changed');
    const status=cell.querySelector('.exception-note')?.textContent?.trim()||
      (same?'Come squadra':changed?'Variazione':'');
    day.append(text('span',weekday(date)),text('strong',code),text('small',status));
    day.setAttribute('aria-label',name+', '+weekday(date)+': '+code+(changed?' variazione':''));
    day.addEventListener('click',()=>cell.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
    days.append(day);
   });
   card.append(days);cards.append(card);
  }
 }
 select.addEventListener('change',()=>{chosen=select.value;render();});
 const observer=new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;render();});
 });
 observer.observe(tbody,{childList:true,subtree:false});
 render();
})();