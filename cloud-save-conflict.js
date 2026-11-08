/* Conservative merge-on-conflict for UMTE Manager (no real-data requests).
   On HTTP 409, replay ONLY edits to independent records by stable ID;
   abort on same-record, ambiguous IDs, missing records, or unsafe structures. */
(function(root){
'use strict';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function indexed(items){
 if(!Array.isArray(items))return null;
 const map=new Map();
 for(const item of items){
   if(!item||typeof item!=='object'||Array.isArray(item))return null;
   const id=item.id;
   if((typeof id!=='string'&&typeof id!=='number')||String(id).trim()==='')return null;
   const key=String(id);
   if(map.has(key))return null;
   map.set(key,item);
 }
 return map;
}
function rebaseSection(baseline,local,remote){
 if(equal(baseline,remote))return {safe:true,value:clone(local),recordMerged:false};
 const b=indexed(baseline),l=indexed(local),r=indexed(remote);
 if(!b||!l||!r)return {safe:false,reason:'Sezione senza identificativi univoci verificabili'};
 // Pure reorders cannot be identified as independent record edits.
 const bOrder=baseline.map(x=>String(x.id)),lOrder=local.filter(x=>b.has(String(x.id))).map(x=>String(x.id));
 const unchangedOrder=bOrder.filter(id=>l.has(id));
 if(!equal(lOrder,unchangedOrder))return {safe:false,reason:'Ordinamento modificato: verifica manuale necessaria'};
 const ids=new Set([...b.keys(),...l.keys()]), touched=[];
 for(const id of ids)if(!equal(b.get(id),l.get(id)))touched.push(id);
 if(!touched.length)return {safe:false,reason:'Modifica non riconducibile a un record identificato'};
 for(const id of touched)if(!equal(b.get(id),r.get(id)))return {safe:false,reason:'Record '+id+' modificato da un altro utente'};
 const output=remote.filter(item=>!touched.includes(String(item.id))||l.has(String(item.id))).map(item=>
  touched.includes(String(item.id))?clone(l.get(String(item.id))):clone(item)
 );
 for(const id of touched)if(!r.has(id)&&l.has(id))output.push(clone(l.get(id)));
 return {safe:true,value:output,recordMerged:true};
}
function rebasePatch({baseline,remote,patch}){
 if(!baseline||!remote||!patch||typeof patch!=='object')return {safe:false,conflicting:['Archivio non disponibile']};
 const merged={},conflicting=[];
 for(const [section,local] of Object.entries(patch)){
  if(!own(baseline,section)||!own(remote,section)){
   // New schema keys are not automatically merged across versions.
   if(equal(baseline[section],remote[section]))merged[section]=clone(local);
   else conflicting.push(section+': struttura modificata');
   continue;
  }
  const result=rebaseSection(baseline[section],local,remote[section]);
  if(!result.safe)conflicting.push(section+': '+(result.reason||'dati modificati da altri'));
  else merged[section]=result.value;
 }
 return {safe:conflicting.length===0,conflicting,patch:merged};
}
function compareSections({baseline,remote,patch}){
 const t=rebasePatch({baseline,remote,patch});
 return {safe:t.safe,conflicting:t.conflicting};
}
async function saveWithSafeRetry({save,load,revision,baseline,patch,maxAttempts=4}){
 if(typeof save!=='function'||typeof load!=='function')throw Error('Servizio di salvataggio non configurato.');
 let currentRevision=revision,priorBaseline=baseline,currentPatch=clone(patch),collisions=0;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const response=await save({revision:currentRevision,patch:currentPatch});
  if(response.ok)return {result:response.data,retried:collisions>0,collisions};
  if(response.status!==409)throw Error(response.error||'Salvataggio non riuscito.');
  if(attempt===maxAttempts-1)throw Error('Troppe modifiche contemporanee. Esporta le tue modifiche e aggiorna.');
  const latest=await load();
  if(!latest||!latest.data||latest.revision===undefined)throw Error('Impossibile rileggere i dati aggiornati. Nessun salvataggio effettuato.');
  const rebased=rebasePatch({baseline:priorBaseline,remote:latest.data,patch:currentPatch});
  if(!rebased.safe)throw Error('Conflitto: '+rebased.conflicting.join('; ')+'. Nessuna modifica altrui è stata sovrascritta. Salva una copia prima di aggiornare.');
  currentRevision=latest.revision;
  priorBaseline=latest.data;
  currentPatch=rebased.patch;
  collisions++;
 }
 throw Error('Numero massimo di tentativi raggiunto.');
}
root.UMTEConflict={compareSections,rebaseSection,rebasePatch,saveWithSafeRetry};
})(typeof window==='undefined'?globalThis:window);
