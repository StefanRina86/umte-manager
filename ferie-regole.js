/* Controlli operativi ricavati dalle disposizioni ferie della UM, senza riferimenti normativi aggiunti. */
(function(root){
  'use strict';
  const rest=new Set(['RISE','RGLS','RGLSR','R','RIP','RS','RF','FEST']);
  const duty=new Set(['P','MIR','M1']);
  const absent=new Set(['C','F','FER','MM','MF','MA','ASP','AP','CS','CP']);
  const code=v=>String(v||'').trim().toUpperCase();
  function days(from,to){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||to<from)return[];
    const a=new Date(from+'T12:00:00Z'),b=new Date(to+'T12:00:00Z');
    if(isNaN(+a)||isNaN(+b)||(+b-+a)/864e5>370)return[];
    const out=[];for(let d=a;d<=b;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out;
  }
  function validCodes(p,date){return (p.validities||[]).filter(v=>v.code&&['roleExpiry','fitnessExpiry','exerciseExpiry','maintenanceExpiry'].every(k=>!v[k]||v[k]>=date)&&['roleOutcome','fitnessOutcome','exerciseOutcome','maintenanceOutcome'].every(k=>!v[k]||!/non |negativ|scadut|sospes|revocat/i.test(v[k]))).map(v=>code(v.code));}
  function compatible(a,b,date){const wanted=validCodes(a,date),available=new Set(validCodes(b,date));return wanted.length>0&&wanted.every(v=>available.has(v));}
  function inspect(request,ctx){
    const errors=[],warnings=[],rows=[],dates=days(request.from,request.to),person=ctx.people.find(p=>String(p.id)===String(request.personId)),campaign=ctx.campaign;
    if(!person)errors.push('Seleziona una persona attiva.');
    if(!dates.length)errors.push('Indica un periodo valido, non superiore a un anno.');
    if(!campaign)errors.push('Seleziona una campagna ferie.');
    if(!person||!campaign||!dates.length)return{errors,warnings,rows};
    if(request.from<campaign.from||request.to>campaign.to)errors.push('Il periodo richiesto è esterno alla campagna selezionata.');
    const received=request.requestedOn||ctx.today;
    if(received>ctx.today)errors.push('La data di ricezione non può essere futura.');
    if(campaign.deadline&&received>campaign.deadline){warnings.push('Richiesta ricevuta dopo il termine della campagna.');if(!request.exceptionReason?.trim())errors.push('Indica il motivo della richiesta fuori termine.');}
    if(campaign.confirmBy&&ctx.today>campaign.confirmBy)warnings.push('È trascorso il termine impostato per la conferma.');
    if(campaign.type==='summer'){
      if(request.mainSummer&&(dates.length<15||request.from<request.from.slice(0,4)+'-06-15'||request.to>request.from.slice(0,4)+'-09-15'))errors.push('Il periodo estivo continuativo deve essere di almeno 15 giorni tra il 15 giugno e il 15 settembre, riposi compresi.');
      if(!request.mainSummer)warnings.push('Verificare nel piano complessivo almeno 15 giorni continuativi tra il 15 giugno e il 15 settembre e la distribuzione giugno–settembre.');
    }
    const requests=ctx.requests.filter(r=>r.id!==request.id&&!['cancelled','rejected'].includes(r.status));
    const pendingAt=(id,date)=>requests.some(r=>r.status==='submitted'&&String(r.personId)===String(id)&&r.from<=date&&r.to>=date);
    const memberIds=new Set(ctx.people.filter(p=>p.nucleus===person.nucleus&&String(p.team||'')===String(person.team||'')).map(p=>String(p.id)));
    const size=memberIds.size,limit=size===2||size===3?1:size===4?2:null;
    if(!person.team||limit===null){warnings.push('Squadra fuori dai casi 2/3/4 persone: verifica manuale della copertura richiesta.');if(!request.coverageVerified)errors.push('Conferma la verifica della copertura per questa squadra.');}
    const borrowed=new Set();
    for(const date of dates){
      const r=ctx.record(person.id,date),planned=code(r?.planned),effective=code(r?.effective);
      const row={date,planned,effective,apply:false,standby:duty.has(planned),replacement:request.replacements?.[date]||'',issues:[]};rows.push(row);
      const err=m=>{row.issues.push(m);errors.push(date+': '+m);};
      if(!r||!planned){err('Turno teorico assente: caricare o configurare il turno prima della conferma.');continue;}
      if(rest.has(planned)||rest.has(effective)){row.skipped=true;continue;}
      if(effective==='C'&&r.sourceLeaveId!==request.id){err('Congedo già presente: la giornata non viene sovrascritta.');continue;}
      if(absent.has(effective)&&!(effective==='C'&&r.sourceLeaveId===request.id)){err('Presente un’altra assenza o un corso ('+effective+').');continue;}
      row.apply=true;
      if(requests.some(x=>String(x.personId)===String(person.id)&&x.from<=date&&x.to>=date&&['submitted','approved'].includes(x.status)))err('Esiste già una richiesta attiva per questa persona.');
      const members=ctx.people.filter(p=>memberIds.has(String(p.id)));
      const holidayCount=members.filter(p=>String(p.id)!==String(person.id)&&code(ctx.record(p.id,date)?.effective)==='C').length+1;
      if(limit!==null&&holidayCount>limit)err(`Superato il limite di ${limit} in ferie nella squadra da ${size}.`);
      const pending=members.filter(p=>String(p.id)!==String(person.id)&&pendingAt(p.id,date)).length;
      if(pending&&limit!==null&&holidayCount+pending>limit)warnings.push(date+': sovrapposizione con altre richieste ancora da confermare.');
      const unavailable=members.filter(p=>String(p.id)!==String(person.id)&&absent.has(code(ctx.record(p.id,date)?.effective))).length+1;
      if(limit!==null&&unavailable>limit)err('Copertura insufficiente considerando anche le altre assenze/formazioni.');
      if(row.standby){
        const substitute=ctx.people.find(p=>String(p.id)===String(row.replacement));
        if(!substitute||String(substitute.id)===String(person.id)){err('Indicare un sostituto di reperibilità 1 a 1.');continue;}
        const sr=ctx.record(substitute.id,date),sc=code(sr?.effective);
        if(!sr||!sc){err('Turno del sostituto non disponibile.');continue;}
        if(absent.has(sc)||duty.has(sc)){err('Sostituto assente, in formazione o già in reperibilità.');continue;}
        if(!compatible(person,substitute,date))err('Abilitazioni del sostituto da verificare: non risultano tutte le stesse abilitazioni valide.');
        if(pendingAt(substitute.id,date)||requests.some(x=>x.status==='approved'&&String(x.personId)===String(substitute.id)&&x.from<=date&&x.to>=date))err('Il sostituto ha una richiesta ferie attiva nella giornata.');
        if(requests.some(x=>['submitted','approved'].includes(x.status)&&String(x.replacements?.[date]||'')===String(substitute.id)))err('Il sostituto è già indicato in un altro cambio nella giornata.');
        const token=date+'|'+substitute.id;if(borrowed.has(token))err('Sostituzione duplicata.');borrowed.add(token);
        if(!request.swapAgreed)err('Confermare che il cambio è già concordato fra gli interessati.');
        if(!request.coverageVerified)err('Confermare anche la presenza nella squadra di provenienza del sostituto.');
        const evaluation=ctx.evaluate?.(substitute.id,date,planned);
        if(evaluation?.level==='red')err('Cambio non compatibile con i turni del sostituto: '+evaluation.detail);
        row.replacementBefore=sc;
      }
    }
    if(!rows.some(r=>r.apply))errors.push('Il periodo non contiene giornate lavorative su cui applicare C.');
    if(request.mainSummer&&rows.some(r=>!r.apply&&!r.skipped))errors.push('Il periodo continuativo contiene giornate da risolvere.');
    return{errors:[...new Set(errors)],warnings:[...new Set(warnings)],rows};
  }
  const api={days,inspect,compatible,rest,duty};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UMTELeaveRules=api;
})(typeof window!=='undefined'?window:globalThis);
