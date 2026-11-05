/* Disponibilità unica per programma, verbali e conteggi. N è imputata al giorno di fine. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEResourceRules=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const sid=v=>String(v??''),active=a=>!['cancelled','canceled','annullata'].includes(a.status);
  function addDay(d,n){const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
  function windowFor(a){
    if(!a.date)return null;let startDate=a.date,endDate=a.date;
    if(sid(a.shiftCode).toUpperCase()==='N'&&!a.sourceCourseEventId)startDate=addDay(a.date,-1);
    else if(a.start&&a.end&&a.end<=a.start)endDate=addDay(a.date,1);
    return{start:startDate+'T'+(a.start||'00:00'),end:endDate+'T'+(a.end||'23:59')};
  }
  const overlaps=(a,b)=>Boolean(a&&b&&a.start<b.end&&b.start<a.end);
  const member=(a,p)=>(a.people||[]).map(sid).includes(sid(p));
  function interruptionScope(w={}){
    const heading=w.interruptionType==='programmed'?'Interruzione programmata'+(w.programNumber?' · programma '+w.programNumber:'')+' · ':w.interruptionType==='ipo'?'IPO · ':'';
    const endpoint=side=>{const name=w[side+'Location']||'località da definire',mode=w[side+'Inclusion'],entities=String(w[side+'Entities']||'').trim();return name+(mode==='included'?' (inclusa'+(entities?' · enti limite: '+entities:' · enti limite da indicare')+')':mode==='excluded'?' (esclusa)':'');};
    if(!w.fromLocation&&!w.toLocation)return heading&&String(w.scope||'').startsWith(heading)?w.scope:heading+(w.scope||'');
    const tracks=[w.trackType,w.customTrack].filter(Boolean).join(' / ')||w.tracks||'';
    return heading+'Da '+endpoint('from')+' a '+endpoint('to')+(tracks?' · binario '+tracks:'');
  }
  function interruptionMissing(w={}){const missing=[];if(w.interruptionType==='programmed'&&!String(w.programNumber||'').trim())missing.push('Interruzione programmata: indicare il numero di programma');for(const side of ['from','to']){if(!w[side+'Location'])continue;const label=side==='from'?'iniziale':'finale';if(!['included','excluded'].includes(w[side+'Inclusion']))missing.push('Località '+label+': indicare inclusa o esclusa');else if(w[side+'Inclusion']==='included'&&!String(w[side+'Entities']||'').trim())missing.push('Località '+label+' inclusa: indicare gli enti limite');}return missing;}
  function verbaleWindows(d,a,aIndex=0){
    const interruptions=(a.interruptions||[]).filter(w=>w.fromDate||w.toDate),periods=(a.periods||[]).filter(w=>w.fromDate||w.toDate);
    const windows=interruptions.length?interruptions.map((w,i)=>({...w,scope:interruptionScope(w),kind:'interruption',windowIndex:i})):periods.map((w,i)=>({...w,kind:w.kind||'period',windowIndex:i}));
    if(!windows.length)return[]; // Il periodo generale non è una finestra operativa.
    return windows.flatMap(w=>{
      const rangeStart=w.fromDate||w.toDate,rangeEnd=w.toDate||w.fromDate,fromTime=w.fromTime||a.start||d.workStart||d.activitySnapshot?.start||'',toTime=w.toTime||a.end||d.workEnd||d.activitySnapshot?.end||'';
      if(!rangeStart||!rangeEnd||rangeEnd<rangeStart||!fromTime||!toTime)return[];
      const night=Boolean(fromTime&&toTime&&fromTime>toTime)||fromTime>='20:00'||Boolean(toTime&&toTime<='07:00'),span=Math.round((new Date(rangeEnd+'T12:00:00Z')-new Date(rangeStart+'T12:00:00Z'))/864e5),count=night?Math.max(1,span):span+1;
      if(!Number.isFinite(count)||count>370)return[];
      return Array.from({length:count},(_,occurrence)=>{const startDate=addDay(rangeStart,occurrence),endDate=night?addDay(startDate,1):startDate,operationalDate=night?endDate:startDate,seriesKey=`${d.id}:${aIndex}:${w.kind}:${w.windowIndex}`;return{key:`${seriesKey}:${operationalDate}`,seriesKey,occurrence,seriesCount:count,isFirst:occurrence===0,isLast:occurrence===count-1,d,a,aIndex,w,rangeStart,rangeEnd,startDate,endDate,fromTime,toTime,night,operationalDate,nucleus:d.workNucleus||d.activitySnapshot?.nucleus||'',start:`${startDate}T${fromTime||'00:00'}`,end:`${endDate}T${toTime||'23:59'}`};});
    });
  }
  function transferredId(e){return e.d.transferredOccurrenceIds?.[e.key]||e.d.transferredActivityIds?.[e.aIndex]||(e.aIndex===0?e.d.transferredActivityId:null)||'';}
  function verbaleOdls(a,existing,d){if(typeof a.odlNumbers==='string'&&(a.odlNumbers.trim()||existing?.sourceVerbaleOdlNumbers!==undefined)){const previous=[...(existing?.odls||[]),...(a.odls||[]),...(d.activitySnapshot?.odls||[])];return[...new Set(a.odlNumbers.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean))].map(number=>({type:'',strategy:'',...previous.find(o=>sid(o.number)===number),number}));}return existing?.odls||a.odls||d.activitySnapshot?.odls||[];}
  function commonVerbaleSetup(a,existing={}){const template=a.operationalSetup;if(!template)return{roleAssignments:existing.roleAssignments||{},documents:existing.documents||[],notes:existing.notes||''};const old=existing.sourceVerbaleSetup||{},roleAssignments={...(existing.roleAssignments||{})};for(const label of new Set([...Object.keys(old.roleAssignments||{}),...Object.keys(template.roleAssignments||{})])){if(!roleAssignments[label]||roleAssignments[label]===old.roleAssignments?.[label]){if(template.roleAssignments?.[label])roleAssignments[label]=sid(template.roleAssignments[label]);else delete roleAssignments[label];}}const documents=[...new Set([...(existing.documents||[]).filter(doc=>!(old.documents||[]).includes(doc)),...(template.documents||[])])];return{roleAssignments,documents,notes:[template.notes,old.notes?(existing.notes===old.notes?'':String(existing.notes||'').startsWith(old.notes+'\n')?existing.notes.slice(old.notes.length+1):existing.notes):existing.notes].filter(Boolean).join('\n'),sourceVerbaleSetup:JSON.parse(JSON.stringify(template))};}
  function planVerbaleTransfer(state,d,index,at){
    const a=d.verbaleActivities?.[index]||{},windows=verbaleWindows(d,a,index),occurrenceIds={...(d.transferredOccurrenceIds||{})},updates=[];
    if(!windows.length||windows.some(e=>!e.fromTime||!e.toTime))throw new Error('Completa date e orari delle finestre del verbale prima del trasferimento.');
    windows.forEach((e,i)=>{
      const mapped=occurrenceIds[e.key]||(i===0?(d.transferredActivityIds?.[index]||(index===0?d.transferredActivityId:null)):null),existing=(state.activities||[]).find(a=>sid(a.id)===sid(mapped)||a.sourceVerbaleWindowKey===e.key);
      const changed=existing&&(existing.date!==e.operationalDate||existing.start!==e.fromTime||existing.end!==e.toTime);
      if(changed&&(state.activityDiary||[]).some(x=>sid(x.activityId)===sid(existing.id)))throw new Error('Una finestra ha già un TE-D: conserva lo storico e crea una nuova attività per cambiare data o orario.');
      const common=commonVerbaleSetup(a,existing),id=existing?.id||`ACT-VA-${at}-${index}-${i}`,title=a.title||d.object||d.workDescription||'Attività da verbale';
      occurrenceIds[e.key]=id;
      updates.push({...existing,id,title,type:existing?.type||'cantiere',date:e.operationalDate,shiftCode:e.night?'N':existing?.shiftCode||(e.fromTime>='13:00'?'P':'MI'),start:e.fromTime,end:e.toTime,nucleus:e.nucleus,team:existing?.team||d.activitySnapshot?.team||'',location:a.location||a.line||d.location||d.line||e.w.scope||d.activitySnapshot?.location||'',interruptionScope:e.w.kind==='interruption'?interruptionScope(e.w):'',interruption:e.w.kind==='interruption'?{...e.w}:null,source:'Verbale',reference:d.protocol||d.sourcePdfName||'',odls:verbaleOdls(a,existing,d),network:a.network??existing?.network??'',sourceVerbaleOdlNumbers:a.odlNumbers??existing?.sourceVerbaleOdlNumbers,people:existing?.people||[],roles:Array.isArray(existing?.roles)?existing.roles:[],roleAssignments:common.roleAssignments,documents:[...new Set([...common.documents,...(d.documents||[])])],sourceVerbaleSetup:common.sourceVerbaleSetup,documentationContext:a.operationalSetup?.documentationContext||existing?.documentationContext||{},status:changed?'draft':existing?.status||'draft',notes:common.notes||[a.title||d.workDescription,d.autoInstructions,d.operations].filter(Boolean).join(' · '),sourceDossierId:d.id,sourceVerbaleActivityIndex:index,sourceVerbaleWindowKey:e.key,updatedAt:at});
    });
    const ids=new Set(updates.map(a=>sid(a.id)));
    const obsolete=(state.activities||[]).filter(a=>a.sourceDossierId===d.id&&a.sourceVerbaleActivityIndex===index&&!ids.has(sid(a.id)));
    return{activities:[...(state.activities||[]).filter(a=>!ids.has(sid(a.id))),...updates],updates,occurrenceIds,obsolete};
  }
  function validateRequirements(activity,req,people,labels,eligible){
    const assigned=[...new Set((activity.people||[]).map(sid))].map(id=>people.find(p=>sid(p.id)===id)).filter(p=>p&&p.active!==false),issues=[];
    if(assigned.length<req.minStaff)issues.push(`Verbale: servono almeno ${req.minStaff} persone, assegnate ${assigned.length}.`);
    for(const item of req.missing||[])issues.push('Verbale da completare: '+item+'.');
    for(const role of req.roles||[]){const label=labels[role],person=assigned.find(p=>sid(p.id)===sid(activity.roleAssignments?.[label]));if(!person)issues.push('Verbale: manca l’incaricato per '+label+'.');else if(!eligible(person,role,activity.date,req))issues.push('Verbale: requisito '+label+' da verificare per '+person.displayName+'.');}
    return issues;
  }
  function courseDay(event,personId,date){return(event.dayShifts||[]).find(d=>sid(d.personId)===sid(personId)&&d.date===date)||{shiftCode:'MF',keepShift:false};}
  function busy(state,personId,activity,options={}){
    const target=windowFor(activity),found=new Map(),ignored=new Set([activity.id,...(options.ignoreIds||[])].filter(Boolean).map(sid));
    const ownCourse=activity.sourceCourseEventId||options.ownCourseId;
    for(const c of state.trainingEvents||[]){
      if(sid(c.id)===sid(ownCourse)||!(c.personIds||[]).map(sid).includes(sid(personId)))continue;
      // MF reserves this operational day, even if the classroom session is shorter.
      if(activity.date>=c.startDate&&activity.date<=c.endDate&&(!courseDay(c,personId,activity.date).keepShift||overlaps(target,windowFor({date:activity.date,start:c.start,end:c.end}))))found.set('course:'+c.id,{kind:'course',id:c.id,label:'Corso: '+c.title});
      else for(const d of [target?.start?.slice(0,10),target?.end?.slice(0,10)])if(d>=c.startDate&&d<=c.endDate&&overlaps(target,windowFor({date:d,start:c.start,end:c.end})))found.set('course:'+c.id,{kind:'course',id:c.id,label:'Corso: '+c.title});
    }
    for(const a of state.activities||[]){
      if(!active(a)||ignored.has(sid(a.id))||!member(a,personId)||a.sourceCourseEventId&&sid(a.sourceCourseEventId)===sid(ownCourse))continue;
      if(overlaps(target,windowFor(a))){const key=a.sourceCourseEventId?'course:'+a.sourceCourseEventId:'activity:'+a.id;if(!found.has(key))found.set(key,{kind:a.sourceCourseEventId?'course':'activity',id:a.sourceCourseEventId||a.id,label:a.sourceCourseEventId?'Corso: '+a.title:'Attività: '+a.title});}
    }
    for(const v of state.medicalAppointments||[]){
      if(sid(v.personId)!==sid(personId))continue;
      if(overlaps(target,windowFor({date:v.date,start:v.start,end:v.end||'23:59'})))found.set('appointment:'+v.id,{kind:'appointment',id:v.id,label:'Altro impegno programmato'});
    }
    return [...found.values()];
  }
  function check(ctx,personId,activity,options={}){
    const record=ctx.record(personId,activity.date),code=sid(record?.effective).toUpperCase(),bounds=record&&ctx.shiftBounds(activity.date,code,record.actualStart||'',record.actualEnd||''),target=windowFor(activity);
    const conflicts=busy(ctx.state,personId,activity,options),reasons=[];
    if(!record)reasons.push('Turno non disponibile per la data');
    else if(!bounds)reasons.push('Assenza / riposo: '+(code||'—'));
    else if(code==='MF'&&!activity.sourceCourseEventId&&!options.ownCourseId)reasons.push('MF: giornata riservata alla formazione');
    if(record?.operationalUnavailable&&!activity.sourceCourseEventId&&!options.ownCourseId)reasons.push('Personale fuori impiego operativo: giornata in ufficio');
    if(record?.importIssue)reasons.push(record.importIssue);
    if(record?.fileConflict)reasons.push('Evento locale diverso dal file presenze: confronto da completare');
    if(code==='SMART'&&!activity.sourceCourseEventId&&!options.ownCourseId)reasons.push('Lavoro agile: presenza fuori sede, non disponibile per attività sul campo');
    if(bounds&&target){const start=bounds.start instanceof Date?localStamp(bounds.start):bounds.start,end=bounds.end instanceof Date?localStamp(bounds.end):bounds.end;if(target.start<start||target.end>end)reasons.push('Orario fuori dal turno effettivo '+code);}
    reasons.push(...conflicts.map(c=>c.label));
    return{available:reasons.length===0,known:Boolean(record),present:Boolean(bounds),code,conflicts,reasons:[...new Set(reasons)]};
  }
  function localStamp(d){const p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;}
  function courseImpact(state,draft,proposals=[]){
    const rows=[];for(const a of state.activities||[]){if(!active(a)||a.sourceCourseEventId)continue;for(const pid of [...new Set((a.people||[]).map(sid))]){
      const course=(draft.personIds||[]).map(sid).includes(pid)&&a.date>=draft.startDate&&a.date<=draft.endDate&&(!courseDay(draft,pid,a.date).keepShift||overlaps(windowFor(a),windowFor({date:a.date,start:draft.start,end:draft.end})));
      const adjustment=proposals.find(p=>sid(p.personId)===pid&&p.date===a.date&&p.after!==p.before);
      if(course||adjustment)rows.push({activityId:a.id,personId:pid,date:a.date,title:a.title,reason:course?(courseDay(draft,pid,a.date).keepShift?'Sovrapposizione con orario del corso':'Giornata MF'):'Adeguamento turno '+adjustment.after});
    }}return rows;
  }
  function daily(ctx,people,date){
    const out={total:0,present:0,training:0,occupied:0,free:0,absent:0,unknown:0,conflicts:0};
    for(const p of new Map(people.filter(p=>p.active!==false).map(p=>[sid(p.id),p])).values()){
      out.total++;const r=ctx.record(p.id,date),courses=(ctx.state.trainingEvents||[]).some(c=>(c.personIds||[]).map(sid).includes(sid(p.id))&&date>=c.startDate&&date<=c.endDate),formation=courses||r?.effective==='MF';
      const acts=(ctx.state.activities||[]).filter(a=>active(a)&&a.date===date&&member(a,p.id));
      if(acts.some(a=>!check(ctx,p.id,a).available))out.conflicts++;
      if(!r){out.unknown++;continue;}
      if(r.importIssue){out.unknown++;continue;}
      if(!ctx.shiftBounds(date,r.effective,r.actualStart||'',r.actualEnd||'')){out.absent++;continue;}
      out.present++;if(formation){out.training++;continue;}
      if(r.operationalUnavailable||r.effective==='SMART'||r.importIssue||r.fileConflict){out.occupied++;continue;}
      const bounds=ctx.shiftBounds(date,r.effective,r.actualStart||'',r.actualEnd||''),request={date,shiftCode:r.effective,start:localStamp(bounds.start).slice(11),end:localStamp(bounds.end).slice(11)};
      if(busy(ctx.state,p.id,request).length)out.occupied++;else out.free++;
    }return out;
  }
  return{commonVerbaleSetup,verbaleOdls,interruptionScope,interruptionMissing,courseDay,windowFor,overlaps,busy,check,courseImpact,daily,verbaleWindows,transferredId,planVerbaleTransfer,validateRequirements};
});
