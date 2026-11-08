/* Conservative revision conflict handling for UMTE Manager.
   A 409 can be retried only if EVERY modified top-level section is unchanged remotely.
   No automatic overwriting of a section concurrently edited by another user. */
(function(root){
'use strict';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function compareSections({baseline,remote,patch}){
 const conflicting=[];
 for(const name of Object.keys(patch||{})){
  if(!equal(baseline?.[name],remote?.[name]))conflicting.push(name);
 }
 return {safe:conflicting.length===0,conflicting};
}
async function saveWithSafeRetry({save,load,revision,baseline,patch,maxAttempts=4}){
 if(typeof save!=='function'||typeof load!=='function')throw Error('Servizio di salvataggio non configurato.');
 let currentRevision=revision,remoteBaseline=baseline,collisions=0;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const response=await save({revision:currentRevision,patch});
  if(response.ok){
   return {result:response.data,retried:collisions>0,remoteBaseline:collisions?remoteBaseline:null,collisions};
  }
  if(response.status!==409)throw Error(response.error||'Salvataggio non riuscito.');
  if(attempt===maxAttempts-1)throw Error('Altre modifiche contemporanee in corso. Esporta le tue modifiche e riprova dopo aver aggiornato i dati.');
  const latest=await load();
  if(!latest||!latest.data||latest.revision===undefined)throw Error('Impossibile rileggere la versione aggiornata dell’archivio. Nessun salvataggio eseguito.');
  const test=compareSections({baseline:remoteBaseline,remote:latest.data,patch});
  if(!test.safe)throw Error('Conflitto sui dati modificati ('+test.conflicting.join(', ')+'). Le modifiche degli altri utenti non sono state sovrascritte. Esporta la tua copia prima di aggiornare.');
  currentRevision=latest.revision;
  remoteBaseline=latest.data;
  collisions++;
 }
 throw Error('Numero massimo di tentativi raggiunto.');
}
root.UMTEConflict={compareSections,saveWithSafeRetry};
})(typeof window==='undefined'?globalThis:window);
