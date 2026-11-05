/* Importazione versionata: il file aggiorna la base; gli eventi locali restano tracciati. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEPresenceRules=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v)),code=v=>String(v||'').trim().toUpperCase(),key=r=>`${r.personId}|${r.date}`;
  function confirmedOfficeRecord(base){
    if(String(base.personId)==='913374'&&base.date>='2025-12-08'&&base.date<='2027-12-07')return{...base,actual:'CS',importIssue:'',absenceReason:'Congedo straordinario · periodo comunicato: 08/12/2025–07/12/2027'};
    if(String(base.personId)!=='911646')return base;
    return{...base,importIssue:base.sourceSheet==='PRESENZA UM E INIDONEI'&&base.planned==='G'?'':base.importIssue,operationalUnavailable:true};
  }
  function baseRecord(base,planned,variation){
    const actual=code(variation?.shift||base.actual||planned),changed=code(planned)!==actual;
    return{...base,planned:code(planned),actual,effective:actual,changed,reason:variation?.reason||base.absenceReason||(base.actual?'Variazione individuale dal file presenze':''),level:variation?.level||'green',actualStart:variation?.actualStart||'',actualEnd:variation?.actualEnd||'',sourceLeaveId:variation?.sourceLeaveId||'',sourceEventId:variation?.sourceEventId||'',importIssue:variation?'':base.importIssue||''};
  }
  function apply(state,source,meta,at){
    if(!meta||state.presenceImportVersion===meta.version)return false;
    const rows=source.loadShifts(),byDay=new Map(rows.map(r=>[key(r),r])),beforePeople=[],removed=[],conflicts=[];
    for(const update of meta.peopleUpdates){const person=state.peopleRecords.find(p=>String(p.id)===String(update.id));if(!person)continue;const before={id:person.id};for(const field of Object.keys(update)){if(field==='id')continue;before[field]=person[field]??null;person[field]=clone(update[field]);}beforePeople.push(before);}
    state.variations=state.variations.filter(v=>{
      const base=byDay.get(key(v));if(!base)return true;
      if(v.sourceEventId||v.sourceLeaveId){if(code(v.shift)!==code(base.actual||base.planned))conflicts.push({personId:v.personId,date:v.date,file:code(base.actual||base.planned),local:code(v.shift),eventId:v.sourceEventId||'',eventType:v.sourceEventType||'',leaveId:v.sourceLeaveId||''});return true;}
      removed.push(clone(v));return false;
    });
    // Removing an event later must reveal the new file, not resurrect a superseded local snapshot.
    for(const event of [...(state.trainingEvents||[]),...(state.medicalAppointments||[]),...(state.leaveRequests||[])])for(const v of event.replacedVariations||[])if(byDay.has(key(v))&&!v.sourceEventId&&!v.sourceLeaveId)v.supersededByPresenceImport=meta.version;
    const previousRules=clone(state.theoreticalRules||[]),previousJumps=clone(state.rotationJumps||[]);
    state.shiftRules=Array.isArray(state.shiftRules)?state.shiftRules:[];
    if(!state.shiftRules.some(r=>r.code==='SMART'))state.shiftRules.push({id:'IMPORT-SMART',code:'SMART',label:'Lavoro agile · orario ufficio',start:'08:00',end:'16:36',effectiveFrom:'1900-01-01',active:true});
    for(const rule of state.theoreticalRules||[])if(rule.active!==false&&(rule.effectiveFrom||'1900-01-01')<=(meta.to||'9999-12-31')&&(!rule.effectiveTo||rule.effectiveTo>=(meta.from||'1900-01-01'))){rule.active=false;rule.supersededByImport=meta.version;}
    for(const jump of state.rotationJumps||[])if(jump.active!==false&&(jump.effectiveFrom||'1900-01-01')<=(meta.to||'9999-12-31')){jump.active=false;jump.supersededByImport=meta.version;}
    // A historical course without an expiry is not evidence of unlimited validity.
    let uncertainSafety=0;for(const r of state.safetyRecords||[]){if(r.sourceTrainingId&&!r.updatedAt&&!r.sourceTrainingCompletionId&&r.noExpiry&&!r.expiry){r.noExpiry=false;r.expiryUnknown=true;r.notes=(r.notes||'')+' Scadenza non documentata: da verificare sul registro o attestato applicabile.';uncertainSafety++;}}
    state.presenceImportHistory=Array.isArray(state.presenceImportHistory)?state.presenceImportHistory:[];
    state.presenceImportHistory.push({version:meta.version,at,sourceFile:meta.sourceFile,previousPeople:beforePeople,previousVariations:removed,previousTheoreticalRules:previousRules,previousRotationJumps:previousJumps,conflicts,uncertainSafety});
    state.presenceImportVersion=meta.version;
    state.auditLog=Array.isArray(state.auditLog)?state.auditLog:[];state.auditLog.unshift({id:'IMPORT-'+meta.version,at,by:'Aggiornamento autorizzato da Stefano',entity:'Presenze',action:'Importazione file',detail:`${meta.records} giornate · ${removed.length} variazioni locali archiviate · ${conflicts.length} eventi da confrontare · ${meta.sourceFile}`});
    return true;
  }
  return{apply,baseRecord,confirmedOfficeRecord};
});
