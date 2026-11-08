/* Profilo personale: apertura dei turni e delle attività del proprio nucleo/squadra. La protezione dei dati è sul server. */
(()=>{
 'use strict';
 const shared=window.UMTE_SHARED;
 if(!shared?.capabilities?.teamScoped||!['chief','preposto','viewer'].includes(shared.user?.role))return;
 const me=(shared.data.peopleRecords||[]).find(p=>String(p.id)===String(shared.user.personId));
 if(!me)return;
 const banner=document.createElement('section');
 banner.className='umte-personal-summary';
 const title=document.createElement('strong');title.textContent='La tua squadra · '+me.nucleus+(me.team?' · Squadra '+me.team:' · Staff');
 const info=document.createElement('span');
 const coworkers=(shared.data.peopleRecords||[]).filter(p=>p.active!==false&&p.nucleus===me.nucleus&&String(p.team||'')===String(me.team||''));
 info.textContent=coworkers.length+' componenti · turni e attività limitati al tuo ambito';
 banner.append(title,info);
 for(const [label,view] of [['Turni','shifts'],['Attività','activities'],['Rapportini','reports']]){
  if(view==='reports'&&!shared.user.permissions.includes('viewReports'))continue;
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.addEventListener('click',()=>document.querySelector('.nav-item[data-view="'+view+'"]')?.click());
  banner.append(button);
 }
 const header=document.querySelector('.topbar');header?.insertAdjacentElement('afterend',banner);
 function filter(){
  const n=document.getElementById('shiftNucleus'),t=document.getElementById('shiftTeam'),a=document.getElementById('activityNucleus');
  if(n&&[...n.options].some(o=>o.value===me.nucleus)&&n.value!==me.nucleus){n.value=me.nucleus;n.dispatchEvent(new Event('change',{bubbles:true}));}
  if(t&&[...t.options].some(o=>o.value===String(me.team))&&t.value!==String(me.team)){t.value=String(me.team);t.dispatchEvent(new Event('change',{bubbles:true}));}
  if(a&&[...a.options].some(o=>o.value===me.nucleus)&&a.value!==me.nucleus){a.value=me.nucleus;a.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 setTimeout(filter,250);
})();
