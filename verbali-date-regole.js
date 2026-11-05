/* Selezione di date distinte: ogni notte termina il giorno successivo. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEVerbaliDates=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;}
  function addDay(s){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
  function monthDays(month){if(!/^\d{4}-\d{2}$/.test(month||'')||!validDate(month+'-01'))return[];const out=[];for(let d=month+'-01';d.startsWith(month);d=addDay(d))out.push(d);return out;}
  const key=p=>[p.fromDate,p.toDate,p.fromTime,p.toTime,p.kind].join('|');
  function periods(dates,start,end,kind='ordinary',existing=[]){
    const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;if(!time.test(start)||!time.test(end)||start===end)throw new Error('Indica orari validi e diversi. Per le continuative usa le righe di dettaglio.');
    if(!['ordinary','ipo'].includes(kind))throw new Error('Tipo periodo non valido');
    if(!dates.length||dates.some(d=>!validDate(d)))throw new Error('Seleziona almeno un giorno valido');
    const seen=new Set(existing.map(key));return[...new Set(dates)].sort().flatMap(d=>{const p={fromDate:d,toDate:end<start?addDay(d):d,fromTime:start,toTime:end,kind};const k=key(p);if(seen.has(k))return[];seen.add(k);return[p];});
  }
  return{validDate,monthDays,periods};
});
