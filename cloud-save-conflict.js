/* Conservative revision conflict handling for UMTE Manager.
   A 409 can be retried only if EVERY modified top-level section is unchanged remotely.
   No automatic overwriting of a section concurrently edited by another user. */
(function(root){
'use strict';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Records with stable IDs and independent changes can be merged after a 409.
// Keep this allow-list small: shifts, qualifications, approvals and other
// cross-record workflows require explicit review before automatic merging.
const mergeableKeys=new Set(['activityDiary','operationalRequests']);
const byId=(list)=>{
 if(!Array.isArray(list))return null;
 const out=new Map();
 for(const item of list){
  if(!item||typeof item!=='object'||typeof item.id!=='string'&&typeof item.id!=='number')return null;
  const id=String(item.id);if(!id||out.has(id))return null;
  out.set(id,item);
 }
 return out;
};
function mergeRecords(base,remote,local){
 const b=byId(base),r=byId(remote),l=byId(local);
 if(!b||!r||!l)return null;
 const localChanged=new Set(),remoteChanged=new Set();
 for(const id of new Set([...b.keys(),...l.keys()]))if(!equal(b.get(id),l.get(id)))localChanged.add(id);
 for(const id of new Set([...b.keys(),...r.keys()]))if(!equal(b.get(id),r.get(id)))remoteChanged.add(id);
 if([...localChanged].some(id=>remoteChanged.has(id)))return null;
 const merged=new Map(r);
 for(const id of localChanged){
  if(l.has(id))merged.set(id,l.get(id));
  else merged.delete(id);
 }
 return [...merged.values()];
}
function reconcileSections({baseline,remote,patch}){
 const conflicting=[],resolved={};
 for(const [name,value] of Object.entries(patch||{})){
  if(equal(baseline?.[name],remote?.[name])){resolved[name]=value;continue;}
  if(mergeableKeys.has(name)){
    const merged=mergeRecords(baseline?.[name]||[],remote?.[name]||[],value);
    if(merged){resolved[name]=merged;continue;}
  }
  conflicting.push(name);
 }
 return {safe:conflicting.length===0,conflicting,patch:resolved};
}
function compareSections(args){
 const {safe,conflicting}=reconcileSections(args);
 return {safe,conflicting};
}
async function saveWithSafeRetry({save,load,revision,baseline,patch,maxAttempts=4}){
 if(typeof save!=='function'||typeof load!=='function')throw Error('Servizio di salvataggio non configurato.');
 let currentRevision=revision,remoteBaseline=baseline,collisions=0,currentPatch=patch;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const response=await save({revision:currentRevision,patch:currentPatch});
  if(response.ok){
   return {result:response.data,retried:collisions>0,remoteBaseline:collisions?remoteBaseline:null,collisions};
  }
  if(response.status!==409)throw Error(response.error||'Salvataggio non riuscito.');
  if(attempt===maxAttempts-1)throw Error('Altre modifiche contemporanee in corso. Esporta le tue modifiche e riprova dopo aver aggiornato i dati.');
  const latest=await load();
  if(!latest||!latest.data||latest.revision===undefined)throw Error('Impossibile rileggere la versione aggiornata dell’archivio. Nessun salvataggio eseguito.');
  const test=reconcileSections({baseline:remoteBaseline,remote:latest.data,patch:currentPatch});
  if(!test.safe)throw Error('Conflitto sui dati modificati ('+test.conflicting.join(', ')+'). Le modifiche degli altri utenti non sono state sovrascritte. Esporta la tua copia prima di aggiornare.');
  currentRevision=latest.revision;
  remoteBaseline=latest.data;
  currentPatch=test.patch;
  collisions++;
 }
 throw Error('Numero massimo di tentativi raggiunto.');
}
root.UMTEConflict={compareSections,reconcileSections,saveWithSafeRetry};
})(typeof window==='undefined'?globalThis:window);
