(()=>{const shared=window.UMTE_SHARED,key='umte-manager-v01',rawSet=Storage.prototype.setItem;rawSet.call(localStorage,key,JSON.stringify(shared.data));let baseline=structuredClone(shared.data),revision=shared.revision,queue=Promise.resolve(),failed=false,requiresReload=false,pending=0;const box=()=>{let b=document.getElementById('sharedSaveStatus');if(!b){b=document.createElement('div');b.id='sharedSaveStatus';b.style='position:fixed;bottom:8px;left:8px;z-index:999999;padding:10px;background:#fff4d0;border:1px solid #bf9b47;max-width:90vw';document.body.append(b);}return b;};Storage.prototype.setItem=function(k,v){if(this===localStorage&&k===key&&requiresReload){box().textContent='Prima di effettuare altre modifiche aggiorna i dati del gestionale. Il salvataggio precedente è riuscito.';return;}rawSet.call(this,k,v);if(this!==localStorage||k!==key)return;const target=JSON.parse(v);const writable={owner:null,specialist:['leaveRequests','leaveCampaigns','variations','competencies','trainingCompletions','courseCatalogOverrides','trainingEvents','medicalAppointments','activities','activityDiary','activityPublications','safetyRecords','peopleRecords','manualLocations','shiftRules','theoreticalRules','rotationJumps','ruleConfig','presenceImportVersion','presenceImportHistory','auditLog','activityCatalog','odlCatalog','locationCatalog','operationalRequests'],administrative:['leaveRequests','activities','activityDiary','variations','competencies','trainingCompletions','courseCatalogOverrides','trainingEvents','medicalAppointments','safetyRecords','peopleRecords','auditLog','operationalRequests'],chief:['leaveRequests','variations','competencies','activities','activityDiary','activityPublications','activityCatalog','odlCatalog','locationCatalog','auditLog','operationalRequests'],preposto:['leaveRequests','competencies','activityDiary','activities','operationalRequests'],viewer:['operationalRequests']}[shared.user.role]||[];if(shared.user.role!=='owner')for(const r of target.operationalRequests||[])if(!r.createdByUserId){r.createdByUserId=shared.user.id;r.status='new';}pending++;queue=queue.then(async()=>{
 if(failed){pending--;return;}
 const patch={};
 for(const k of Object.keys(target))if((shared.user.role==='owner'||writable.includes(k))&&JSON.stringify(target[k])!==JSON.stringify(baseline[k]))patch[k]=target[k];
 if(!Object.keys(patch).length){pending--;return;}
 box().textContent='Salvataggio condiviso in corso…';
 try{
   const outcome=await window.UMTEConflict.saveWithSafeRetry({
    revision,baseline,patch,
    save:async ({revision:attemptRevision,patch:attemptPatch})=>{
      const r=await fetch('/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:attemptRevision,patch:attemptPatch})});
      let data={};try{data=await r.json();}catch{}
      return {ok:r.ok,status:r.status,data,error:data.error||'Salvataggio non riuscito'};
    },
    load:async ()=>{
      const r=await fetch('/api/state');
      if(!r.ok)throw Error('Impossibile caricare la revisione corrente (HTTP '+r.status+').');
      return r.json();
    }
   });
   revision=outcome.result.revision;
   baseline=structuredClone(target);
   if(outcome.retried){
     requiresReload=true;
     box().textContent='Salvataggio riuscito dopo un conflitto. Prima di altre modifiche aggiorna il gestionale per vedere i dati salvati dagli altri utenti. ';
     const reload=document.createElement('button');reload.type='button';reload.textContent='Aggiorna adesso';
     reload.onclick=()=>location.reload();
     box().append(reload);
     document.body.dataset.sharedSaveNeedsReload='1';
   }else box().textContent='Salvato nell’archivio condiviso';
 }catch(e){
   failed=true;
   const b=box();b.textContent='NON SALVATO online: '+e.message+' ';
   const button=document.createElement('button');button.type='button';button.textContent='Scarica copia delle modifiche';
   button.onclick=()=>{
     const a=document.createElement('a');const u=URL.createObjectURL(new Blob([localStorage.getItem(key)],{type:'application/json'}));
     a.href=u;a.download='UMTE-modifiche-non-salvate.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);
   };
   b.append(button);document.body.dataset.sharedSaveFailed='1';
 }finally{pending--;}
});};window.addEventListener('beforeunload',e=>{if(failed||pending||requiresReload){e.preventDefault();e.returnValue='Aggiorna o conserva le modifiche prima di chiudere';}});document.addEventListener('submit',e=>{if(failed||requiresReload){e.preventDefault();e.stopImmediatePropagation();alert(requiresReload?'Aggiorna i dati prima di effettuare nuove modifiche.':'Salvataggio online bloccato. Scarica le modifiche dal messaggio in basso e ricarica.');}},true);document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('umteCloudBar'))return;const b=document.createElement('div');b.id='umteCloudBar';b.className='umte-cloud-toolbar';const caption=document.createElement('span');caption.className='umte-cloud-caption';caption.textContent='Archivio condiviso · '+shared.user.name+' · '+shared.user.role;b.append(caption);const refresh=document.createElement('button');refresh.textContent='Aggiorna dati';refresh.onclick=()=>{if(!failed)queue.then(()=>location.reload());};b.append(refresh);if(shared.user.role==='owner'){const a=document.createElement('a');a.href='./?accessi=1';a.textContent='Gestisci accessi';b.append(a);}const m=shared.data.maintenanceHistory?.at(-1);if(m&&shared.user.role==='owner'){const notice=document.createElement('p');notice.textContent='Aggiornamento completato: '+m.changedPresenceDays+' giornate aggiornate dal file presenze · '+m.holidayDays+' giornate ferie richieste, da verificare. Pulizia test: '+Object.entries(m.removed).filter(([k,n])=>n).map(([k,n])=>({activities:'attività',diaries:'rapportini',competencies:'competenze',variations:'variazioni presenze',events:'corsi/visite',requests:'richieste di prova',contributions:'voci competenza'}[k]||k)+' '+n).join(', ')+(m.holidayWarnings.length?' · '+m.holidayWarnings.length+' richieste su riposo da controllare.':'');b.append(notice);}const anchor=document.querySelector('.topbar');if(anchor)anchor.insertAdjacentElement('afterend',b);else document.body.prepend(b);});})();