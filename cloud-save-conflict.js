/* UMTE Manager - conservative three-way merge under optimistic concurrency.
   No data, credentials or application state are embedded in this public file.
   Real authorization remains exclusively server-side. */
(function(root){
'use strict';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const mergeable=new Set(['activityDiary','operationalRequests','leaveRequests','activities']);
const idOf=item=>{
 if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'&&typeof item.id!=='number')return null;
 const id=String(item.id);
 return id.length&&id.length<=256?id:null;
};
function indexed(rows){
 if(!Array.isArray(rows))return null;
 const map=new Map();
 for(const row of rows){
  const id=idOf(row);
  if(!id||map.has(id))return null;
  map.set(id,row);
 }
 return map;
}
function threeWayRows(key,base,ours,theirs){
 const b=indexed(base),o=indexed(ours),t=indexed(theirs);
 if(!b||!o||!t)return {safe:false,reason:'Identificativi mancanti, duplicati o elenco non valido'};
 const changed=new Set([...b.keys(),...o.keys()].filter(id=>!same(b.get(id),o.get(id))));
 for(const id of changed){
  if(!same(b.get(id),t.get(id))&&!same(o.get(id),t.get(id)))
   return {safe:false,reason:'Il record '+id+' è stato modificato anche da un altro utente'};
 }
 const result=[];
 for(const row of theirs){
  const id=idOf(row);
  if(!changed.has(id))result.push(clone(row));
  else if(o.has(id))result.push(clone(o.get(id)));
 }
 for(const row of ours){
  const id=idOf(row);
  if(changed.has(id)&&o.has(id)&&!t.has(id))result.push(clone(row));
 }
 return {safe:true,value:result,changedRecords:changed.size};
}
function reconcile({baseline,remote,patch}){
 if(!baseline||!remote||!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Archivio o modifiche non validi');
 const merged={},conflicting=[],details=[];
 for(const [key,value] of Object.entries(patch)){
  const before=baseline[key],latest=remote[key];
  if(same(before,latest)){merged[key]=clone(value);continue;}
  if(same(value,latest)){merged[key]=clone(latest);continue;}
  if(mergeable.has(key)){
   const result=threeWayRows(key,before,value,latest);
   if(result.safe){merged[key]=result.value;details.push({section:key,records:result.changedRecords});continue;}
   conflicting.push(key+' ('+result.reason+')');continue;
  }
  conflicting.push(key+' (sezione aggiornata da un altro utente)');
 }
 return {safe:conflicting.length===0,conflicting,patch:merged,details};
}
function compareSections({baseline,remote,patch}){
 const result=reconcile({baseline,remote,patch});
 return {safe:result.safe,conflicting:result.conflicting};
}
async function saveWithSafeRetry({save,load,revision,baseline,patch,maxAttempts=12}){
 if(typeof save!=='function'||typeof load!=='function')throw Error('Servizio salvataggio non configurato');
 const attempts=Math.max(1,Math.min(Number(maxAttempts)||1,20));
 const original=clone(patch);
 let nextPatch=clone(patch),currentRevision=revision,collisions=0,latestData=null;
 for(let attempt=0;attempt<attempts;attempt++){
  const response=await save({revision:currentRevision,patch:nextPatch});
  if(response.ok)return {result:response.data,retried:collisions>0,remoteBaseline:latestData,collisions,mergedSections:Object.keys(nextPatch)};
  if(response.status!==409)throw Error(response.error||'Salvataggio non riuscito');
  if(attempt===attempts-1)throw Error('Troppi salvataggi contemporanei. Esporta le modifiche e aggiorna la pagina.');
  const current=await load();
  if(!current||!current.data||current.revision===undefined)throw Error('Impossibile rileggere la versione aggiornata dal server');
  const merged=reconcile({baseline,remote:current.data,patch:original});
  if(!merged.safe)throw Error('Conflitto su '+merged.conflicting.join('; ')+'. Nessun dato altrui sovrascritto. Esporta una copia prima di aggiornare.');
  currentRevision=current.revision;nextPatch=merged.patch;
  latestData=current.data;collisions++;
 }
 throw Error('Numero massimo di tentativi raggiunto');
}
root.UMTEConflict={compareSections,reconcile,rebasePatch:reconcile,saveWithSafeRetry};
})(typeof window==='undefined'?globalThis:window);
