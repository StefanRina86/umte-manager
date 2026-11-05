/* Scrittura verificata e aggiornamento per ID sull’archivio corrente. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEVerbaliStore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function read(storage,key){const raw=storage.getItem(key);if(raw==null)return[];const rows=JSON.parse(raw);if(!Array.isArray(rows))throw new Error('Archivio verbali non leggibile: esporta una copia prima di riprovare.');return rows;}
  function upsert(storage,key,record,expected){const rows=read(storage,key),old=rows.find(r=>String(r.id)===String(record.id));if(expected!==undefined&&old&&(old.updatedAt||'')!==expected)throw new Error('Questo verbale è stato modificato in un’altra scheda. La compilazione è conservata come bozza: riapri la versione aggiornata prima di sostituirla.');const next=[...rows.filter(r=>String(r.id)!==String(record.id)),record],encoded=JSON.stringify(next);storage.setItem(key,encoded);if(storage.getItem(key)!==encoded)throw new Error('Impossibile verificare il salvataggio. La scheda resta aperta.');return next;}
  function inPeriod(d,from,to){const periods=(d.verbaleActivities||[]).flatMap(a=>[...(a.periods||[]),...(a.interruptions||[])]).filter(p=>p.fromDate||p.toDate);if(periods.length)return periods.some(p=>(p.fromDate||p.toDate)<=to&&(p.toDate||p.fromDate)>=from);const a=d.activitySnapshot||{},start=d.overallPeriod?.fromDate||a.date||d.workDate||'',end=d.overallPeriod?.toDate||start;return!start||start<=to&&end>=from;}
  return{read,upsert,inPeriod};
});
