(function(root){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  function days(a,b){if(!/^\d{4}-\d{2}-\d{2}$/.test(a||'')||!/^\d{4}-\d{2}-\d{2}$/.test(b||'')||b<a)return[];const start=new Date(a+'T12:00:00Z'),end=new Date(b+'T12:00:00Z');if((end-start)/864e5>370)return[];const out=[];for(let d=start;d<=end;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out;}
  function addMonths(date,months){if(!date||!Number.isInteger(+months)||+months<1)return'';const d=new Date(date+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Number(months));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
  const activityId=(eventId,personId,date)=>`CF-${eventId}-${personId}-${date}`;
  function historyFor(state,eventId){const ids=new Set(state.activities.filter(a=>a.sourceCourseEventId===eventId).map(a=>a.id));return state.activityDiary.some(d=>ids.has(d.activityId));}
  function syncActivities(state,event,people,now,by){
    const wanted=new Set(),old=state.activities.filter(a=>a.sourceCourseEventId===event.id);let changed=false;
    for(const personId of event.personIds||[]){const p=people.find(p=>String(p.id)===String(personId));if(!p)continue;
      for(const date of days(event.startDate,event.endDate)){
        const id=activityId(event.id,String(personId),date);wanted.add(id);const existing=state.activities.find(a=>a.id===id),next={...existing,id,title:`Formazione · ${event.title} · ${p.displayName}`,type:'Formazione',date,shiftCode:(event.dayShifts||[]).find(d=>String(d.personId)===String(personId)&&d.date===date)?.shiftCode||'MF',start:event.start||'08:30',end:event.end||'17:06',nucleus:p.nucleus,team:p.team?'Squadra '+p.team:'',location:event.location||'Sede da confermare',source:'Pianificazione corsi',reference:event.title,trafficCondition:'not_applicable',workPlan:'',linkedAnomalyIds:[],odls:[],people:[String(personId)],roles:[],roleAssignments:{},documents:['TE-D formazione'],status:existing?.status||'ready',notes:event.notes||'',sourceCourseEventId:event.id,trainingPersonId:String(personId),courseCatalogId:event.catalogId||'',createdAt:existing?.createdAt||now,createdBy:existing?.createdBy||by};
        if(!existing){state.activities.push(next);changed=true;}else{const before=JSON.stringify(existing);Object.assign(existing,next);if(JSON.stringify(existing)!==before)changed=true;}
      }
    }
    for(const a of old)if(!wanted.has(a.id)&&!state.activityDiary.some(d=>d.activityId===a.id)){state.activities=state.activities.filter(x=>x.id!==a.id);changed=true;}
    return changed;
  }
  function refreshCompletions(state,event,catalog,now,by){
    const previous=state.trainingCompletions||[],result=previous.filter(c=>c.eventId!==event.id),item=catalog.find(c=>c.id===event.catalogId),dates=days(event.startDate,event.endDate);
    for(const personId of event.personIds||[]){
      const sessions=dates.map(date=>{
        const a=state.activities.find(a=>a.id===activityId(event.id,String(personId),date));if(!a)return null;
        return state.activityDiary.filter(d=>d.activityId===a.id&&d.trainingAttendance).sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt))[0]||null;
      });
      const complete=sessions.length>0&&sessions.every(d=>d?.completed&&d.trainingAttendance.status==='attended'&&d.trainingAttendance.confirmed&&String(d.trainingAttendance.personId)===String(personId));
      const old=previous.find(c=>c.eventId===event.id&&String(c.personId)===String(personId));
      if(!complete){if(old?.verifiedAt)throw new Error('Il corso è già convalidato: correggere prima la convalida con il responsabile.');continue;}
      const diaryIds=sessions.map(d=>d.id),fingerprint=JSON.stringify(sessions.map(d=>[d.id,d.updatedAt||d.createdAt,d.trainingAttendance]));
      if(old?.verifiedAt&&old.fingerprint!==fingerprint)throw new Error('La partecipazione è già convalidata: il TE-D non può modificarne i dati formativi.');
      const date=sessions.map(d=>d.date).sort().at(-1),hours=sessions.reduce((n,d)=>{const t=d.trainingAttendance;return n+Math.max(0,((+t.end.slice(0,2)*60+ +t.end.slice(3))-(+t.start.slice(0,2)*60+ +t.start.slice(3)))/60);},0);
      result.push({...old,id:`TC-${event.id}-${personId}`,personId:String(personId),eventId:event.id,catalogId:event.catalogId||'',title:event.title,from:dates[0],to:date,hours,outcome:old?.verifiedAt?'Svolgimento convalidato':'Partecipazione dichiarata nel TE-D',kind:'Corso',method:'TE-D',venue:event.location||'',categories:item?.categories||[],sourceFile:'TE-D collegati: '+diaryIds.join(', '),diaryIds,fingerprint,target:event.renewalTarget||'',proposedExpiry:event.renewalVerified&&event.renewalMonths?addMonths(date,+event.renewalMonths):'',createdAt:old?.createdAt||now,createdBy:old?.createdBy||by,updatedAt:now});
    }
    state.trainingCompletions=result;return result.filter(c=>c.eventId===event.id);
  }
  function validateAttendance(entry,activity,event,today){
    const t=entry.trainingAttendance;if(!t)return'Seleziona l’esito della partecipazione al corso.';
    if(!['attended','partial','absent'].includes(t.status))return'Seleziona partecipazione completa, parziale o assenza.';
    if(entry.date!==activity.date)return'Il TE-D del corso deve riferirsi alla giornata programmata.';
    if(entry.date>today)return'Non puoi confermare un corso futuro come eseguito.';
    if(String(t.personId)!==String(activity.trainingPersonId)||!(event.personIds||[]).map(String).includes(String(t.personId)))return'Il partecipante non corrisponde all’iscrizione al corso.';
    if(t.status!=='absent'&&(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.start||'')||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.end||'')||t.end<=t.start))return'Controlla gli orari di effettiva partecipazione.';
    if(t.status==='attended'&&!t.confirmed)return'Conferma espressamente la partecipazione alla giornata di corso.';
    return'';
  }
  function applyValidation(state,completion,{date,expiry,document,by,at}){
    if(!date||date<completion.from||date>completion.to)throw new Error('La data di esecuzione deve corrispondere alla partecipazione confermata.');
    if(expiry&&expiry<date)throw new Error('La scadenza non può precedere il corso.');
    const target=completion.target||'';let description='Data formativa convalidata';
    if(target){if(!expiry||!document?.trim())throw new Error('Per aggiornare una scadenza servono la nuova data e il riferimento dell’attestato o registro.');
      if(target.startsWith('safety:')){
        const type=target.slice(7);if(!['firstAid','fire','preposto','tunnel','dpi3','height','confined','equipment','electrical','workerSafety','rls'].includes(type))throw new Error('Una partecipazione non rinnova una nomina.');
        const records=state.safetyRecords.filter(r=>String(r.personId)===String(completion.personId)&&r.type===type);if(records.length>1)throw new Error('Più registrazioni di sicurezza corrispondenti: allinearle prima della convalida.');
        const old=records[0];if(old?.issued&&old.issued>date)throw new Error('Esiste già una registrazione più recente.');
        completion.previousRequirement=old?clone(old):null;
        const next={...old,id:old?.id||`TRAIN-${completion.personId}-${type}`,personId:completion.personId,type,kind:'Formazione',issued:date,expiry,noExpiry:false,document,notes:old?.notes||'',sourceTrainingCompletionId:completion.id,updatedAt:at,updatedBy:by,createdAt:old?.createdAt||at,createdBy:old?.createdBy||by};state.safetyRecords=state.safetyRecords.filter(r=>r.id!==next.id);state.safetyRecords.push(next);description='Registrazione sicurezza aggiornata';
      }else if(target.startsWith('maintenance:')){
        const code=target.slice(12),person=state.peopleRecords.find(p=>String(p.id)===String(completion.personId));
        if(code!=='ENERGIA'&&!/^MI\.EN\./i.test(code))throw new Error('Il mantenimento di questa giornata riguarda soltanto le abilitazioni del settore Energia.');
        const sector=person?.validities?.filter(v=>/^MI\.EN\./i.test(String(v.code||'')))||[];
        if(!sector.length||(code!=='ENERGIA'&&!sector.some(v=>v.code===code)))throw new Error('Qualifica Energia non presente per questa persona.');
        if(sector.some(v=>v.maintenanceTrainingDate&&v.maintenanceTrainingDate>date))throw new Error('Esiste un mantenimento Energia più recente.');
        completion.previousRequirements=sector.map(clone);
        for(const validity of sector){validity.maintenanceExpiry=expiry;validity.maintenanceOutcome='OK';validity.maintenanceTrainingDate=date;validity.maintenanceDocument=document;}
        description='Mantenimento Energia aggiornato su '+sector.length+' abilitazioni del dipendente';
      }else throw new Error('Tipo di scadenza non riconosciuto.');
    }
    completion.verifiedAt=at;completion.verifiedBy=by;completion.document=document;completion.expiry=expiry;completion.outcome='Svolgimento convalidato';return description;
  }
  const api={days,addMonths,activityId,historyFor,syncActivities,refreshCompletions,validateAttendance,applyValidation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UMTETrainingRules=api;
})(typeof window!=='undefined'?window:globalThis);
