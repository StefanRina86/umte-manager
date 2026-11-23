/* Impedisce selezione di dipendenti assenti durante un corso.
 * UI preventiva; il backend ripete i controlli prima del salvataggio.
 */
(()=>{
 'use strict';
 const api=window.UMTELeave,shared=window.UMTE_SHARED;
 if(!api||!shared?.user?.permissions?.includes('schedulePeopleEvents'))return;
 const state=api.state,absent=new Set(['C','MM','INF','AS','ASP','CP','CS','H','PS','PM','PL','PF','RFS','AG','AR','DS']);
 const $=id=>document.getElementById(id),host=$('coursePeoplePicker');
 if(!host)return;
 const fmt=d=>String(d||'').slice(0,10);
 function days(){
  const from=fmt($('courseStartDate')?.value),to=fmt($('courseEndDate')?.value);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<from)return[];
  const a=new Date(from+'T12:00:00Z'),b=new Date(to+'T12:00:00Z');
  if((b-a)/86400000>366)return[];
  const result=[];for(let d=new Date(a);d<=b;d.setUTCDate(d.getUTCDate()+1))result.push(d.toISOString().slice(0,10));return result;
 }
 function unavailable(pid,date){
  if((state.leaveRequests||[]).some(r=>String(r.personId)===pid&&r.from<=date&&r.to>=date&&['approved','confirmed','accepted'].includes(String(r.status||'').toLowerCase())))return 'congedo confermato';
  const variations=(state.variations||[]).filter(v=>String(v.personId)===pid&&v.date===date);
  const v=variations.at(-1);
  if(v?.sourceLeaveId||v&&absent.has(String(v.shift||v.code||'').toUpperCase()))return 'assenza già prevista';
  const effective=String(api.record?.(pid,date)?.effective||'').toUpperCase();
  if(absent.has(effective))return 'turno di assenza '+effective;
  return '';
 }
 let running=false;
 function refresh(){
  if(running)return;running=true;
  try{
   const dates=days();
   for(const input of host.querySelectorAll('input[type=checkbox]')){
    const pid=String(input.value),conflict=dates.map(date=>({date,reason:unavailable(pid,date)})).find(x=>x.reason);
    const label=input.closest('label');
    if(!label)continue;
    const marker=label.querySelector('.umte-course-unavailable');
    if(conflict){
     input.disabled=true;input.checked=false;
     label.style.opacity='.55';label.title='Non disponibile il '+conflict.date+': '+conflict.reason;
     if(!marker){const note=document.createElement('small');note.className='umte-course-unavailable';note.style.cssText='display:block;color:#a03335;font-weight:700';note.textContent='Non disponibile · '+conflict.reason+' ('+conflict.date+')';label.append(note);}
     else marker.textContent='Non disponibile · '+conflict.reason+' ('+conflict.date+')';
    }else{
     input.disabled=false;label.style.opacity='';label.title='';
     marker?.remove();
    }
   }
  }finally{running=false;}
 }
 host.addEventListener('change',e=>{if(e.target?.matches('input[type=checkbox]')&&e.target.disabled){e.preventDefault();e.stopImmediatePropagation();}},true);
 let queued=false;
 new MutationObserver(()=>{if(queued||running)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}).observe(host,{childList:true,subtree:true});
 for(const id of ['courseStartDate','courseEndDate','courseNucleus','coursePersonSearch'])$(id)?.addEventListener('change',refresh);
 document.getElementById('courseDialog')?.addEventListener('click',()=>queueMicrotask(refresh));
 refresh();
})();
