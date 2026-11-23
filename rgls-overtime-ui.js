/* Calcolo integrale dello straordinario per presenza su teorico RGLS.
 * Per prestazioni >5 ore detrae 60 minuti di pausa, es. 08:00-16:36 -> 7h36.
 */
(function(root){
'use strict';
const minutes=t=>/^\d{2}:\d{2}$/.test(String(t||''))?Number(t.slice(0,2))*60+Number(t.slice(3,5)):NaN;
function calculate(start,end){
 let gross=minutes(end)-minutes(start);if(!Number.isFinite(gross))return null;
 if(gross<0)gross+=1440;
 if(!gross)return null;
 const startMinutes=minutes(start),pause=gross>300&&startMinutes<=780&&startMinutes+gross>=840?60:0,net=gross-pause;
 return {grossMinutes:gross,breakMinutes:pause,netMinutes:net,label:Math.floor(net/60)+'h'+String(net%60).padStart(2,'0')};
}
root.UMTERGLSOvertime={calculate};
const api=root.UMTELeave;if(!api)return;
const $=id=>document.getElementById(id);
function fromCourse(pid,date){
 return (api.state.trainingEvents||[]).find(e=>(e.personIds||[]).some(id=>String(id)===pid)&&e.startDate<=date&&e.endDate>=date);
}
function expectedTimes(pid,date,defaults){
 const v=(api.state.variations||[]).find(x=>String(x.personId)===pid&&x.date===date);
 const course=fromCourse(pid,date);
 return [v?.actualStart||course?.start||defaults?.[0]||'',v?.actualEnd||course?.end||defaults?.[1]||''];
}
function applyCompetence(){
 const pid=String($('competencePerson')?.value||''),date=$('competenceDate')?.value;
 if(!pid||!date||String(api.record?.(pid,date)?.planned||'')!=='RGLS')return true;
 const actual=String(api.record?.(pid,date)?.effective||'');
 if(!actual||['RGLS','RISE','RGLSR'].includes(actual))return true;
 const [proposedFrom,proposedTo]=expectedTimes(pid,date,[$('overtimeStart')?.value,$('overtimeEnd')?.value]);
 if(!$('overtimeStart').value)$('overtimeStart').value=proposedFrom;
 if(!$('overtimeEnd').value)$('overtimeEnd').value=proposedTo;
 const result=calculate($('overtimeStart').value,$('overtimeEnd').value);
 if(!result){window.alert('Presenza su RGLS: indica l’orario effettivo completo per conteggiare lo straordinario.');return false;}
 const flag=document.querySelector('[data-allowance="overtime"]');
 if(flag&&!flag.checked){flag.checked=true;flag.dispatchEvent(new Event('change',{bubbles:true}));}
 const note='Intera prestazione su RGLS · '+result.label+' nette (pausa '+result.breakMinutes+' minuti)';
 if(!$('overtimeReason').value.includes('RGLS'))$('overtimeReason').value=note;
 return true;
}
function applyDiary(){
 const date=$('diaryDate')?.value,entry=$('diaryActivityId')?.value,
       activity=(api.state.activities||[]).find(a=>String(a.id)===String(entry));
 if(!date||!activity)return true;
 let count=0;
 for(const row of document.querySelectorAll('#diaryCompetencePeople [data-diary-person]')){
  const pid=String(row.dataset.diaryPerson),record=api.record?.(pid,date);
  if(String(record?.planned||'')!=='RGLS'||['RGLS','RISE','RGLSR'].includes(String(record?.effective||'')))continue;
  const flag=row.querySelector('[data-diary-allowance="overtime"]');
  if(flag){flag.checked=true;count++;}
 }
 if(!count)return true;
 if(!$('diaryOvertimeStart').value)$('diaryOvertimeStart').value=$('diaryActualStart')?.value||activity.start||'';
 if(!$('diaryOvertimeEnd').value)$('diaryOvertimeEnd').value=$('diaryActualEnd')?.value||activity.end||'';
 const calc=calculate($('diaryOvertimeStart').value,$('diaryOvertimeEnd').value);
 if(!calc){window.alert('Rapportino su RGLS: indica inizio e fine prestazione per lo straordinario.');return false;}
 const note='Intera prestazione su RGLS · '+calc.label+' nette (pausa '+calc.breakMinutes+' minuti)';
 if(!$('diaryOvertimeReason').value.includes('RGLS'))$('diaryOvertimeReason').value=note;
 return true;
}
function registerVariationOvertime(){
 const form=$('variationForm');if(!form)return;
 form.addEventListener('submit',e=>{
  const pid=String($('variationPerson')?.value||''),date=$('variationDate')?.value,
    shift=String($('variationShift')?.value||'').toUpperCase();
  if(!pid||!date||String(api.record?.(pid,date)?.planned||'').toUpperCase()!=='RGLS')return;
  const absence=new Set(['RGLS','RISE','RGLSR','FE','C','MM','MF0','AS','ASP','CP','CS','H','PF','PS','PL','RFS']);
  if(absence.has(shift))return;
  const start=$('variationActualStart')?.value,end=$('variationActualEnd')?.value,calc=calculate(start,end);
  if(!calc){e.preventDefault();e.stopImmediatePropagation();alert('Turno lavorato su RGLS: indica ingresso e uscita effettivi. Tutte le ore nette sono straordinario.');return;}
  queueMicrotask(()=>{
   const variation=(api.state.variations||[]).find(v=>String(v.personId)===pid&&v.date===date&&String(v.shift).toUpperCase()===shift);
   if(!variation||variation.actualStart!==start||variation.actualEnd!==end)return;
   const person=(api.people()||[]).find(p=>String(p.id)===pid);if(!person)return;
   api.state.competencies=api.state.competencies||[];
   const note='Presenza su RGLS: '+calc.label+' nette (pausa '+calc.breakMinutes+' minuti)';
   let record=api.state.competencies.find(c=>String(c.personId)===pid&&c.date===date);
   if(!record){
    record={id:'RGLS-DIRECT-'+pid+'-'+date,personId:pid,personName:person.displayName,nucleus:person.nucleus,date,
      status:'updated',allowances:{},manualContribution:null,diaryContributions:{},createdAt:new Date().toISOString(),createdBy:root.UMTE_SHARED?.user?.name||''};
    api.state.competencies.push(record);
   }
   const contribution=record.manualOverride?'manualOverride':'manualContribution',before=record[contribution]||{};
   const next={...before,allowances:{...(before.allowances||record.allowances||{}),overtime:true},
      overtimeStart:start,overtimeEnd:end,overtimeReason:note,sourceLabel:'Presenza su riposo RGLS'};
   record[contribution]=next;
   record.allowances={...(record.allowances||{}),overtime:true};
   record.overtimeStart=start;record.overtimeEnd=end;record.overtimeReason=note;
   record.overtimeGrossMinutes=calc.grossMinutes;record.overtimeBreakMinutes=calc.breakMinutes;record.overtimeNetMinutes=calc.netMinutes;
   record.autoRglsVariationKey=pid+'|'+date;record.status='updated';
   delete record.approvedAt;delete record.approvedBy;
   record.updatedAt=new Date().toISOString();record.updatedBy=root.UMTE_SHARED?.user?.name||'';
   api.persist();api.renderAll?.();
  });
 },true);
}
registerVariationOvertime();
document.addEventListener('submit',e=>{
 if(e.target?.id==='competenceForm'&&!applyCompetence()){e.preventDefault();e.stopImmediatePropagation();}
 if(e.target?.id==='diaryForm'&&!applyDiary()){e.preventDefault();e.stopImmediatePropagation();}
},true);
})(window);
