// UMTE_MANAGER_API_INIZIO_FILE_COMPLETO
// @ts-nocheck
/**
 * UMTE Manager — Supabase Edge Function mono-file.
 * Generata dai sorgenti modulari del pacchetto originale.
 * Sorgente versionato e distribuito come Edge Function.
 * Non contiene password, dati personali o baseline.
 * Nome funzione: umte-manager-api
 * Necessita secret UMTE_ALLOWED_ORIGIN = https://stefanrina86.github.io
 * Verifica JWT gateway: attiva; la funzione controlla anche la sessione con auth.getUser.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const rules=(function(root){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  function days(a,b){if(!/^\d{4}-\d{2}-\d{2}$/.test(a||'')||!/^\d{4}-\d{2}-\d{2}$/.test(b||'')||b<a)return[];const start=new Date(a+'T12:00:00Z'),end=new Date(b+'T12:00:00Z');if((end-start)/864e5>370)return[];const out=[];for(let d=start;d<=end;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out;}
  function addMonths(date,months){if(!date||!Number.isInteger(+months)||+months<1)return'';const d=new Date(date+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Number(months));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
  const activityId=(eventId,personId,date)=>`CF-${eventId}-${personId}-${date}`;
  function historyFor(state,eventId){const ids=new Set(state.activities.filter(a=>a.sourceCourseEventId===eventId).map(a=>a.id));return state.activityDiary.some(d=>ids.has(d.activityId));}
  function syncActivities(state,event,people,now,by){
    const wanted=new Set(),old=state.activities.filter(a=>a.sourceCourseEventId===event.id);let changed=false;
    for(const personId of event.personIds||[]){const p=people.find(p=>String(p.id)===String(personId));if(!p)continue;
      for(const date of days(event.startDate,event.endDate)){
        const id=activityId(event.id,String(personId),date);wanted.add(id);const existing=state.activities.find(a=>a.id===id),next={...existing,id,title:`Formazione · ${event.title} · ${p.displayName}`,type:'Formazione',date,shiftCode:(event.dayShifts||[]).find(d=>String(d.personId)===String(personId)&&d.date===date)?.shiftCode||'MF',start:event.start||'08:30',end:event.end||'17:06',nucleus:p.nucleus,team:p.team?'Squadra '+p.team:'',location:event.location||'Sede da confermare',source:'Pianificazione corsi',reference:event.title,trafficCondition:'not_applicable',workPlan:'',linkedAnomalyIds:[],odls:[],people:[String(personId)],roles:[],roleAssignments:{},documents:['TE-D formazione'],status:existing?.status||'ready',notes:event.notes||'',sourceCourseEventId:event.id,trainingPersonId:String(personId),courseCatalogId:event.catalogId||'',createdAt:existing?.createdAt||now,createdBy:existing?.createdBy||by};
        if(!existing){state.activities.push(next);changed=true;}else{const before=JSON.stringify(existing);Object.assign(existing,next);if(JSON.stringify(existing)!==before)changed=true;}
      }
    }
    for(const a of old)if(!wanted.has(a.id)&&!state.activityDiary.some(d=>d.activityId===a.id)){state.activities=state.activities.filter(x=>x.id!==a.id);changed=true;}
    return changed;
  }
  function refreshCompletions(state,event,catalog,now,by){
    const previous=state.trainingCompletions||[],result=previous.filter(c=>c.eventId!==event.id),item=catalog.find(c=>c.id===event.catalogId),dates=days(event.startDate,event.endDate);
    for(const personId of event.personIds||[]){
      const sessions=dates.map(date=>{
        const a=state.activities.find(a=>a.id===activityId(event.id,String(personId),date));if(!a)return null;
        return state.activityDiary.filter(d=>d.activityId===a.id&&d.trainingAttendance).sort((a,b)=>(b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt))[0]||null;
      });
      const complete=sessions.length>0&&sessions.every(d=>d?.completed&&d.trainingAttendance.status==='attended'&&d.trainingAttendance.confirmed&&String(d.trainingAttendance.personId)===String(personId));
      const old=previous.find(c=>c.eventId===event.id&&String(c.personId)===String(personId));
      if(!complete){if(old?.verifiedAt)throw new Error('Il corso è già convalidato: correggere prima la convalida con il responsabile.');continue;}
      const diaryIds=sessions.map(d=>d.id),fingerprint=JSON.stringify(sessions.map(d=>[d.id,d.updatedAt||d.createdAt,d.trainingAttendance]));
      if(old?.verifiedAt&&old.fingerprint!==fingerprint)throw new Error('La partecipazione è già convalidata: il TE-D non può modificarne i dati formativi.');
      const date=sessions.map(d=>d.date).sort().at(-1),hours=sessions.reduce((n,d)=>{const t=d.trainingAttendance;const gross=Math.max(0,(+t.end.slice(0,2)*60+ +t.end.slice(3))-(+t.start.slice(0,2)*60+ +t.start.slice(3)));return n+Math.max(0,gross-(gross>300?60:0))/60;},0);
      result.push({...old,id:`TC-${event.id}-${personId}`,personId:String(personId),eventId:event.id,catalogId:event.catalogId||'',title:event.title,from:dates[0],to:date,hours,outcome:old?.verifiedAt?'Svolgimento convalidato':'Partecipazione dichiarata nel TE-D',kind:'Corso',method:'TE-D',venue:event.location||'',categories:item?.categories||[],sourceFile:'TE-D collegati: '+diaryIds.join(', '),diaryIds,fingerprint,target:event.renewalTarget||'',proposedExpiry:event.renewalVerified&&event.renewalMonths?addMonths(date,+event.renewalMonths):'',createdAt:old?.createdAt||now,createdBy:old?.createdBy||by,updatedAt:now});
    }
    state.trainingCompletions=result;return result.filter(c=>c.eventId===event.id);
  }
  function validateAttendance(entry,activity,event,today){
    const t=entry.trainingAttendance;if(!t)return'Seleziona l’esito della partecipazione al corso.';
    if(!['attended','partial','absent'].includes(t.status))return'Seleziona partecipazione completa, parziale o assenza.';
    if(entry.date!==activity.date)return'Il TE-D del corso deve riferirsi alla giornata programmata.';
    if(entry.date>today)return'Non puoi confermare un corso futuro come eseguito.';
    if(String(t.personId)!==String(activity.trainingPersonId)||!(event.personIds||[]).map(String).includes(String(t.personId)))return'Il partecipante non corrisponde all’iscrizione al corso.';
    if(t.status!=='absent'&&(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.start||'')||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.end||'')||t.end<=t.start))return'Controlla gli orari di effettiva partecipazione.';
    if(t.status==='attended'&&!t.confirmed)return'Conferma espressamente la partecipazione alla giornata di corso.';
    return'';
  }
  function applyValidation(state,completion,{date,expiry,document,by,at}){
    if(!date||date<completion.from||date>completion.to)throw new Error('La data di esecuzione deve corrispondere alla partecipazione confermata.');
    if(expiry&&expiry<date)throw new Error('La scadenza non può precedere il corso.');
    const target=completion.target||'';let description='Data formativa convalidata';
    if(target){if(!expiry||!document?.trim())throw new Error('Per aggiornare una scadenza servono la nuova data e il riferimento dell’attestato o registro.');
      if(target.startsWith('safety:')){
        const type=target.slice(7);if(!['firstAid','fire','preposto','tunnel','dpi3','height','confined','equipment','electrical','workerSafety','rls'].includes(type))throw new Error('Una partecipazione non rinnova una nomina.');
        const records=state.safetyRecords.filter(r=>String(r.personId)===String(completion.personId)&&r.type===type);if(records.length>1)throw new Error('Più registrazioni di sicurezza corrispondenti: allinearle prima della convalida.');
        const old=records[0];if(old?.issued&&old.issued>date)throw new Error('Esiste già una registrazione più recente.');
        completion.previousRequirement=old?clone(old):null;
        const next={...old,id:old?.id||`TRAIN-${completion.personId}-${type}`,personId:completion.personId,type,kind:'Formazione',issued:date,expiry,noExpiry:false,document,notes:old?.notes||'',sourceTrainingCompletionId:completion.id,updatedAt:at,updatedBy:by,createdAt:old?.createdAt||at,createdBy:old?.createdBy||by};state.safetyRecords=state.safetyRecords.filter(r=>r.id!==next.id);state.safetyRecords.push(next);description='Registrazione sicurezza aggiornata';
      }else if(target.startsWith('maintenance:')){
        const code=target.slice(12),person=state.peopleRecords.find(p=>String(p.id)===String(completion.personId));
        if(code!=='ENERGIA'&&!/^MI\.EN\./i.test(code))throw new Error('Il mantenimento di questa giornata riguarda soltanto le abilitazioni del settore Energia.');
        const sector=person?.validities?.filter(v=>/^MI\.EN\./i.test(String(v.code||'')))||[];
        if(!sector.length||(code!=='ENERGIA'&&!sector.some(v=>v.code===code)))throw new Error('Qualifica Energia non presente per questa persona.');
        if(sector.some(v=>v.maintenanceTrainingDate&&v.maintenanceTrainingDate>date))throw new Error('Esiste un mantenimento Energia più recente.');
        completion.previousRequirements=sector.map(clone);
        for(const validity of sector){validity.maintenanceExpiry=expiry;validity.maintenanceOutcome='OK';validity.maintenanceTrainingDate=date;validity.maintenanceDocument=document;}
        description='Mantenimento Energia aggiornato su '+sector.length+' abilitazioni del dipendente';
      }else throw new Error('Tipo di scadenza non riconosciuto.');
    }
    completion.verifiedAt=at;completion.verifiedBy=by;completion.document=document;completion.expiry=expiry;completion.outcome='Svolgimento convalidato';return description;
  }
  const api={days,addMonths,activityId,historyFor,syncActivities,refreshCompletions,validateAttendance,applyValidation};return api;
})(typeof window!=='undefined'?window:globalThis);

const Training = rules;


const trainingCatalog = [{"id":"CAT-ba06a4a378c3fcf0","title":"\"Aggiornamento periodico per \"Preposti\" in materia di salute e sicurezza del lavoro, art.37, comma 7, D.Lgs. 81/2008\"","categories":["preposto"],"sourceCount":7},{"id":"CAT-5b2ff38c742115eb","title":"\"Antincendio - D.Lgs.626/94; DLgs 81/08 - per addetti antincendio MEDIO RISCHIO\"","categories":["fire"],"sourceCount":6},{"id":"CAT-1c69ee88c536728b","title":"#sicuressere","categories":[],"sourceCount":2},{"id":"CAT-dd2ed5d617f0e001","title":"1^ soccorso in ambito ferroviario DM 19/2011","categories":["firstAid"],"sourceCount":8},{"id":"CAT-53753759f64551a5","title":"1^ soccorso per incaricati dell'emergenza sanitaria DM 388/2003","categories":["firstAid"],"sourceCount":10},{"id":"CAT-2eb02b751412ad21","title":"1° soccorso personale incaricato dell'emergenza sanitaria","categories":["firstAid"],"sourceCount":1},{"id":"CAT-44350df8f1193c1f","title":"25 KV/ES2 - 2^ esercizio impianti a 25 KV","categories":[],"sourceCount":3},{"id":"CAT-9b456c30a516d1c1","title":"25 KV/ES3 - 3^ esercizio impianti a 25 KV","categories":[],"sourceCount":4},{"id":"CAT-279561589571917a","title":"AB1 - Modulo A (Disp.1/2004)","categories":[],"sourceCount":3},{"id":"CAT-8e820fe149eefda0","title":"AB2 - Sicurezza e igiene del lavoro e tutela ambiente","categories":[],"sourceCount":2},{"id":"CAT-e569719c4ebccfae","title":"AB3 - Comune B: Impianti. Oggett. Attrezz","categories":[],"sourceCount":2},{"id":"CAT-bd8daa34b4a6b050","title":"AB4 - Norme e regol. eserc. manut. impianti.","categories":[],"sourceCount":2},{"id":"CAT-5720154d92b8936a","title":"AB5 - Servizi di vigilanza e protezione cantieri di lavoro","categories":[],"sourceCount":4},{"id":"CAT-05159548bf577076","title":"AB6 - Guida/scorta mezzi adibiti alla manut infrastruttura","categories":[],"sourceCount":1},{"id":"CAT-e9b4da45240a0aff","title":"ABILITAZIONE ATTREZZATURE LAVORO - AGGIORNAMENTO QUINQUENNALE 81/2008) OPERATORI UTILIZZO","categories":["equipment"],"sourceCount":49},{"id":"CAT-871aea8b1a24ec5a","title":"Abilitazione MI.IE.TE/LC2 2^ Linea di Contatto_Tirocinio","categories":[],"sourceCount":3},{"id":"CAT-666f550b5a15f604","title":"Abilitazione MI_BASE Ruolo Operatore Manutenzione Infrastruttura_ADDESTRAMENTO","categories":[],"sourceCount":14},{"id":"CAT-185102cd03d3a9c9","title":"Abilitazione MI_BASE Ruolo Operatore Manutenzione Infrastruttura_Teoria","categories":[],"sourceCount":18},{"id":"CAT-87410f8bb3730e62","title":"Abilitazione MI_BASE Ruolo Operatore Manutenzione Infrastruttura_Tirocinio","categories":[],"sourceCount":3},{"id":"CAT-2dcabf4b093075fc","title":"Abilitazione MI_OPC Contesto operativo Cantiere di Lavoro_ADDESTRAMENTO","categories":[],"sourceCount":10},{"id":"CAT-a8e520023b52055d","title":"Abilitazione MI_OPC Contesto operativo Cantiere di Lavoro_Formazione teorica","categories":[],"sourceCount":10},{"id":"CAT-e827e075fe6508c9","title":"Abilitazione MI_OPC Contesto operativo Cantiere di Lavoro_Tirocinio","categories":[],"sourceCount":4},{"id":"CAT-25a8e101d766d63a","title":"ABILITAZIONE_UTILIZZO_ATTREZZATURE_LAVORO_Abilitazione degli operatori all'utilizzo delle attrezzature di lavoro (art.73","categories":["equipment"],"sourceCount":196},{"id":"CAT-ea65da7496ae8ac0","title":"Addestramento per la Qualificaz. profes. Guida e scorta mezzi d'opera in regime di interruzione della circolazione ferr","categories":[],"sourceCount":3},{"id":"CAT-b2f85b7b00ad6d29","title":"Addestramento Sicurezza Lavoro_Modulo addestrativo sicurezza lavoro","categories":[],"sourceCount":64},{"id":"CAT-3113661ad38a260e","title":"Addetti Antincendio_Liv. 2 (DM 02/09/21)","categories":["fire"],"sourceCount":9},{"id":"CAT-e345652094c6cbcf","title":"Agg. Normative e PEI / PEG Gallerie_Aggiornamenti Normative e PEI / PEG Gallerie di pertinenza","categories":["tunnel"],"sourceCount":26},{"id":"CAT-e36b164f0b3f20f4","title":"Aggiorn applicaz.Decreto ANSF 16/2010_Aggiornamento sull'applicazione del Decreto ANSF 16/2010","categories":[],"sourceCount":4},{"id":"CAT-fa1b7b1e90b01404","title":"Aggiornamenti - Procedure SIGS","categories":[],"sourceCount":68},{"id":"CAT-6041f79120ae882c","title":"Aggiornamento AB.6 Guida e Scorta mezzi d'opera di proprietà RFI","categories":[],"sourceCount":15},{"id":"CAT-f7ff68f565659c81","title":"Aggiornamento AB.6 Guida e scorta mezzi d'opera manutenzione infrastruttura","categories":[],"sourceCount":22},{"id":"CAT-928a42eb1e9ec716","title":"Aggiornamento competenze addetti Antincendio","categories":["fire"],"sourceCount":1},{"id":"CAT-e06b15d287c793b8","title":"Aggiornamento DVR","categories":[],"sourceCount":20},{"id":"CAT-a1bfaeddd4cd4415","title":"Aggiornamento Formazione D.Lgs.81/08 per RLS","categories":["rls"],"sourceCount":9},{"id":"CAT-ec16d59a7d747f94","title":"Aggiornamento gestione rifiuti/Dlgs 152/06 e s.m.i.","categories":[],"sourceCount":3},{"id":"CAT-79250fb8920e007c","title":"Aggiornamento per Istruttori Qualificati/Riconosciuti","categories":[],"sourceCount":1},{"id":"CAT-1332edeec76c4923","title":"Aggiornamento personale operativo su Rischi Elettrici Norme CEI EN 50110-1/CEI 11-27","categories":["electrical"],"sourceCount":8},{"id":"CAT-b9cc4aaa1f3bd752","title":"Aggiornamento Rischi Elettrici Norme CEI_personale operativo su Rischi Elettrici Norme CEI EN 50110-1/CEI 11-27","categories":["electrical"],"sourceCount":23},{"id":"CAT-075854d94bf7a610","title":"Aggiornamento su uso e manutenzione attrezzature di lavoro del settore specialistico di utilizzazione","categories":["equipment"],"sourceCount":4},{"id":"CAT-4f101de08e7abc2b","title":"AGGIORNAMENTO SUL REGOLAMENTO PER IL TRASPORTO DI MERCI PERICOLOSE","categories":[],"sourceCount":28},{"id":"CAT-629bff691fac788f","title":"Aggiornamento triennale 1^ soccorso in ambito ambito ferroviario DM 19/2011","categories":["firstAid"],"sourceCount":3},{"id":"CAT-bb5182f959b51a82","title":"Aggiornamento triennale 1^ soccorso per incaricati emergenza sanitaria DM 388/2003","categories":["firstAid"],"sourceCount":18},{"id":"CAT-19e69a9286e51e40","title":"Ambiente e Sicurezza del Lavoro: aggiornamento triennale per Addetti Squadre Primo Soccorso (a cura RFI Sanitario)","categories":["firstAid"],"sourceCount":3},{"id":"CAT-e7cebd27b0cecd74","title":"ATF2 - Attività tesatura frenata","categories":[],"sourceCount":7},{"id":"CAT-ad339a478acd27a1","title":"Attrezzature da Lavoro_Formazione di Legge per Attrezzature di Lavoro","categories":["equipment"],"sourceCount":12},{"id":"CAT-0662b6becabb2c62","title":"Attrezzature da lavoro_Prima formazione Piattaforme di Lavoro Elevabili (PLE) con o senza stabilizzatori","categories":["equipment"],"sourceCount":2},{"id":"CAT-54084046c98baae7","title":"BLSD_BLSD_BASIC LIFE SUPPORT DEFIBRILLATION","categories":["firstAid"],"sourceCount":3},{"id":"CAT-c6f0036119ab8091","title":"C_Licenza_Condotta_locomotori_e_treni_T_C_MC_Licenza Condotta locomotori e treni_Formazione d'aula","categories":[],"sourceCount":1},{"id":"CAT-d141f004b0f0e3f0","title":"Campagne della Sicurezza Lavoro","categories":[],"sourceCount":5},{"id":"CAT-d6fb95fb1d0dbce0","title":"Cascade Operation","categories":[],"sourceCount":16},{"id":"CAT-eec7200ab2cfd04a","title":"Certificazione Parità di Genere","categories":[],"sourceCount":7},{"id":"CAT-fb5e356274e1b1d8","title":"COMPLEMENTI AV/AC ALLA POB","categories":[],"sourceCount":2},{"id":"CAT-17eca1987d4a3868","title":"Compliance Antitrust","categories":[],"sourceCount":16},{"id":"CAT-e8b7cfcaaf067d32","title":"CooperAzione in Sicurezza_Il Preposto","categories":["preposto"],"sourceCount":3},{"id":"CAT-add9420aa9e171a3","title":"Corso 231 (RFI)","categories":[],"sourceCount":41},{"id":"CAT-f50f35a2001f4d2e","title":"Corso contratto_Uffici","categories":[],"sourceCount":1},{"id":"CAT-e467c3299dde9ab2","title":"Corso e-learning Decreto Legislativo 231/2001 e Modello Organizzativo e di Gestione di RFI","categories":[],"sourceCount":12},{"id":"CAT-ca29a8c5e9dffc83","title":"Corso introduttivo alle principali funzioni dell'area Self Service del portale WE","categories":[],"sourceCount":4},{"id":"CAT-55d28817539a1682","title":"Corso Rischi elettrici – Norma CEI 11-27 (Mod. 1 A – 2 A)","categories":["electrical"],"sourceCount":2},{"id":"CAT-31c4fd4bdc1a3696","title":"Cultura della Sicurezza","categories":[],"sourceCount":11},{"id":"CAT-862e999bccd0d42a","title":"Cultura della Sicurezza_Diffusione Safety Culture","categories":[],"sourceCount":4},{"id":"CAT-728539509dafff54","title":"Cultura della Sicurezza_Safety Led","categories":[],"sourceCount":7},{"id":"CAT-b32d49c6cde293fd","title":"Cultura della sicurezza_Train the trainer","categories":[],"sourceCount":3},{"id":"CAT-d8df3d5eee7cdc01","title":"D.Lgs 196/03 (e-learning)","categories":[],"sourceCount":2},{"id":"CAT-52f7d5da625aea05","title":"Databreach Game","categories":[],"sourceCount":3},{"id":"CAT-a18658694fc572d8","title":"Disability Management: Accomodamenti ragionevoli","categories":[],"sourceCount":4},{"id":"CAT-e3c801ce0061a472","title":"Disability Management: L'incontro con la disabilità","categories":[],"sourceCount":7},{"id":"CAT-ded230ca0ba9b280","title":"Disability Management: La Progettazione Universale","categories":[],"sourceCount":5},{"id":"CAT-ea404874fd34cf6b","title":"Dispositivi di protezione individuali","categories":[],"sourceCount":8},{"id":"CAT-5716a28d3bfe285a","title":"Esercitaz periodiche reali o simulate","categories":[],"sourceCount":26},{"id":"CAT-1d1d6163b60f6ae0","title":"Esercizio e lavori sugli impianti di energia e TE_In supporto all'entrata in vigore della RFI DTC P SL 03","categories":[],"sourceCount":17},{"id":"CAT-1c2e114c0e9d74a6","title":"Faculty Digital - Copilot Chat pill","categories":[],"sourceCount":3},{"id":"CAT-178bbcf8b08805b8","title":"Faculty Onboarding - wego - welcome on board","categories":[],"sourceCount":1},{"id":"CAT-f4d0d04f76a13811","title":"FORMAZIONE / INFORMAZIONE DI IMPIANTO PEI GALLERIE NORME VIGENTI","categories":["tunnel"],"sourceCount":3},{"id":"CAT-11586359c2428b54","title":"Formazione a sostegno della cultura della sicurezza","categories":[],"sourceCount":18},{"id":"CAT-d8adddc601d87758","title":"Formazione applicativo I-MAN_Formazione sull'applicativo per la Manutenzione I-MAN","categories":[],"sourceCount":5},{"id":"CAT-1d01a0ba90b1f277","title":"Formazione AV/AC - Fase 1 - Formazione tecnica e metodologie didattiche","categories":[],"sourceCount":1},{"id":"CAT-583a219846745842","title":"Formazione AV/AC - Fase 2 - Settore TE - Compl. AV/AC alle AS di 2^ Catg. e Comune II^ OPC","categories":[],"sourceCount":2},{"id":"CAT-bafa69fa973395ff","title":"Formazione AV/AC - Fase 2 - Settore TE - Compl. AV/AC alle AS di 3^ Catg. e Comune III^ Catg. Mod. F","categories":[],"sourceCount":1},{"id":"CAT-008e3fd68bc3ce1b","title":"Formazione di ingresso trasversale","categories":[],"sourceCount":74},{"id":"CAT-a7d3a505bcb9796d","title":"Formazione e Informazione Sicurezza Lavoratori","categories":["workerSafety"],"sourceCount":2},{"id":"CAT-06b497e6b2ee96ff","title":"Formazione in materia ambientale","categories":[],"sourceCount":46},{"id":"CAT-6da9e0237b700b23","title":"Formazione Procedura RFI DTC P SL 03_Formazione sulla procedura RFI DTC P SL 03","categories":[],"sourceCount":23},{"id":"CAT-46c9a460da0bae3d","title":"Formazione sui Piani di Emergenza-Aggiornamento","categories":[],"sourceCount":1},{"id":"CAT-96b58510896e759b","title":"FORMAZIONE_OBBLIGATORIA_SICUREZZA_LAVORO_Lavoratori_aggiornamento quinquennale","categories":["workerSafety"],"sourceCount":31},{"id":"CAT-7d7e422b03286b53","title":"FORMAZIONE_OBBLIGATORIA_SICUREZZA_LAVORO_Lavoratori_specifica_rischio_me dio","categories":["workerSafety"],"sourceCount":7},{"id":"CAT-ec34edf1f467840b","title":"Framework Anti-Corruption del Gruppo FS","categories":[],"sourceCount":21},{"id":"CAT-f7fbdc7f4991e5f7","title":"Futuro? Andiamoci a Fondo!","categories":[],"sourceCount":12},{"id":"CAT-64c06a9ee5a9f564","title":"GEST.NE_EMERGENZA_E_1°_SOCCORSO_1°soccorso Emergenza Sanitaria (DM388/2003)","categories":["firstAid"],"sourceCount":116},{"id":"CAT-c271ba675343272c","title":"GEST.NE_EMERGENZA_E_1°_SOCCORSO_1°soccorso in ambito ferroviario (DM 19/2011)","categories":["firstAid"],"sourceCount":21},{"id":"CAT-07cb183fe20a855a","title":"Gestione dei Materiali","categories":[],"sourceCount":1},{"id":"CAT-648f9a2dc8126c2f","title":"Gestione dell'emergenza e 1° Soccorso_Antincendio rischio alto","categories":["fire","firstAid"],"sourceCount":2},{"id":"CAT-5fa93932e6c4bb83","title":"Gestione dell'emergenza e 1° Soccorso_Antincendio rischio medio","categories":["fire","firstAid"],"sourceCount":80},{"id":"CAT-d1846d5920b7f5e3","title":"Gestione dell'emergenza: Simulazione prove di evacuazione dai luoghi di lavoro","categories":[],"sourceCount":3},{"id":"CAT-96a880d9c70b86c9","title":"GESTIONE DELLE SOSTANZE PERICOLOSE_LA GESTIONE DELLE SOSTANZE PERICOLOSE IN RFI","categories":[],"sourceCount":1},{"id":"CAT-d6412b1374ad6745","title":"GESTIONE_EMERGENZA_E_1^_SOCCORSO_Aggiornamento 1^ soccorso e emergenza sanitaria - DM 388/2003","categories":["firstAid"],"sourceCount":28},{"id":"CAT-9c257471a78676f0","title":"Guido come vivo","categories":[],"sourceCount":9},{"id":"CAT-55b9278b2140221a","title":"Guido come vivo: corso e-learning di guida sicura","categories":[],"sourceCount":11},{"id":"CAT-e81ec1ce2f180bc7","title":"Il Contratto in RFI_Uffici","categories":[],"sourceCount":1},{"id":"CAT-0f9e704f02eb4e64","title":"Il corretto stazionamento","categories":[],"sourceCount":23},{"id":"CAT-b3585846a593fd9d","title":"Il Framework di Data Protection del Gruppo FS","categories":[],"sourceCount":2},{"id":"CAT-0d0b56dae46e568b","title":"Il Framework di Data Protection del Gruppo FS Italiane","categories":[],"sourceCount":44},{"id":"CAT-0fe00b245ed0a49a","title":"Il Framework di Data Protection del Gruppo FS_GDPR","categories":[],"sourceCount":1},{"id":"CAT-955f82cbb829cc4b","title":"Il Piano welfare del Gruppo FS","categories":[],"sourceCount":3},{"id":"CAT-aab515f332e2cee9","title":"Il rilevamento della temperatura corporea in ingresso in azienda per emergenza Covid19","categories":[],"sourceCount":25},{"id":"CAT-2796547427461785","title":"Il_tutor_dell'apprendistato_Il tutor dell'apprendistato","categories":[],"sourceCount":6},{"id":"CAT-2119441855af6429","title":"Imp - problematiche esercizio-analisi guasti","categories":[],"sourceCount":613},{"id":"CAT-dc2aa9f0c91304c7","title":"IMP - SIC.LAV - Simulazione PEI di impianto","categories":[],"sourceCount":20},{"id":"CAT-611e98b4681cc0fe","title":"IMP Agg Piani Emergenza","categories":[],"sourceCount":14},{"id":"CAT-131fa60e691e212b","title":"IMP Agg. Normative e PEI / PEG Gallerie","categories":["tunnel"],"sourceCount":49},{"id":"CAT-324628ed90544c2c","title":"IMP Agg.to sulla manutenzione attrezzature_IMP Aggiornamento sulla manutenzione attrezzature","categories":[],"sourceCount":97},{"id":"CAT-d455e99c01133b86","title":"IMP Aggiornamenti su aspetti amministrativi del personale","categories":[],"sourceCount":18},{"id":"CAT-f03415ea0a901dc4","title":"IMP Mantenimento competenze - SSE","categories":[],"sourceCount":2},{"id":"CAT-6f6f702f48e708ad","title":"IMP Mantenimento competenze Caratteristiche LdC in piena linea allo scoperto - TE - Linea di contatto","categories":[],"sourceCount":3},{"id":"CAT-75c9f95b07056a33","title":"IMP Mantenimento competenze Circuito di ritorno e di terra e protezione TE - Linea di Contatto","categories":[],"sourceCount":1},{"id":"CAT-fcb60df20b610e6a","title":"IMP Mantenimento competenze LFM","categories":[],"sourceCount":7},{"id":"CAT-2d7a2a2ff14b0f92","title":"IMP Mantenimento competenze Mezzi e attrezzature operative e Strumenti di misura - ARM","categories":[],"sourceCount":2},{"id":"CAT-ebb526c4806ef542","title":"IMP Mantenimento competenze Mezzi e attrezzature operative, Materiali e Strumenti di misura TE - Linea di Contatto","categories":[],"sourceCount":32},{"id":"CAT-5624b43b0a63490d","title":"IMP Mantenimento competenze Protezione Cantieri Lavoro","categories":[],"sourceCount":32},{"id":"CAT-3ecfc83c7d110ade","title":"IMP Mantenimento competenze TE - Linea di Contatto","categories":[],"sourceCount":75},{"id":"CAT-67a6c183a9f6f441","title":"IMP-AMB - Gestione rifiuti e tutela ambientale","categories":[],"sourceCount":26},{"id":"CAT-239bc5493ba3482c","title":"IMP-AMB - Manut. Materiali Cont. Amianto","categories":[],"sourceCount":4},{"id":"CAT-237227c8eaf71907","title":"IMP-SIC.LAV - Aggiornamento normativa SL","categories":[],"sourceCount":31},{"id":"CAT-6a121279d50c445b","title":"IMP-SIC.LAV - Organizzazione del lavoro e antinfortunistica","categories":["workerSafety"],"sourceCount":251},{"id":"CAT-1dd6c68681898728","title":"IMP-SIC.LAV - Utilizzo sostanze pericolose/schede di sicurezza sostanze","categories":[],"sourceCount":83},{"id":"CAT-e32deda43a8185c1","title":"IMP-SIC.LAV Aggiornamento DPI","categories":[],"sourceCount":178},{"id":"CAT-0affe5476a962b4b","title":"IMP-SIC.LAV Aggiornamento DVR","categories":[],"sourceCount":64},{"id":"CAT-541e7ee19bfed14b","title":"IMP-SIC.LAV-AGG. PE SCALI M.P._FORMAZIONE/INFORMAZIONE D'IMPIANTO PE SCALI M.P.","categories":[],"sourceCount":5},{"id":"CAT-0f6c22687f40416c","title":"IMP-SIGS - Aggiornamento/Innovazioni testi regolamentari","categories":[],"sourceCount":123},{"id":"CAT-e5769b533a938138","title":"IMP. Apprendimento sul campo - Training on the job","categories":[],"sourceCount":11},{"id":"CAT-feb0828f7b092c61","title":"IMP. Formazione Procedura RFI DTC P SL 03_Formazione d'impianto sulla Procedura RFI DTC P SL 03","categories":[],"sourceCount":100},{"id":"CAT-b46754c096d8b97b","title":"IMP_COVID-19 Dispositivi di rilevam. della temp. corporea_IMP_COVID-19 Formazione sul corretto utilizzo dei dispositivi","categories":[],"sourceCount":19},{"id":"CAT-3a824b193a77245c","title":"IMP_Form_Obblig_Sicur_Lavoro_Agg. Lavoratori","categories":[],"sourceCount":8},{"id":"CAT-de559c71bfdaa0e5","title":"IMP_Formazione applicativo I-MAN_IMP_Formazione sull'applicativo per la Manutenzione I-MAN","categories":[],"sourceCount":24},{"id":"CAT-c797e3c05311aa07","title":"IMP_Rischio sost alcoliche e psicotrope_IMP_Tutela della salute e sicurezza rispetto al consumo di sostanze alcoliche e","categories":[],"sourceCount":12},{"id":"CAT-6b42a1860e626c10","title":"IMP_SAFETY_RACCONTARE PUO' SALVARE_PROGETTO NEAR MISS","categories":[],"sourceCount":10},{"id":"CAT-af344feb569c6460","title":"IMP_SIC.LAV Rischi specifici delle Lavorazioni","categories":["workerSafety"],"sourceCount":184},{"id":"CAT-0b5527b0584d3877","title":"IMP_SIC.LAV. Gestione Emergenza","categories":[],"sourceCount":172},{"id":"CAT-8fd80b394bfb1dc9","title":"IMP_SIME","categories":[],"sourceCount":23},{"id":"CAT-64e5958bf61548e8","title":"INCONTRI, FEEDBACK, INSERIMENTO, VISITE IMPIANTI TUTOR E APPRENDISTI","categories":[],"sourceCount":9},{"id":"CAT-b920f83aed34bf1b","title":"Informazione al personale sulle procedure SIGS interessanti il proprio settore di lavoro","categories":[],"sourceCount":4},{"id":"CAT-37e359221cbd43fb","title":"Interventi a sostegno della cultura della sicurezza","categories":[],"sourceCount":13},{"id":"CAT-6e058c7944b6cd7d","title":"L'Asset Management","categories":[],"sourceCount":9},{"id":"CAT-6d72aae747aed3a8","title":"La Consigliera di Fiducia","categories":[],"sourceCount":17},{"id":"CAT-d28315e24f6f6da8","title":"La sicurezza elettrica in ambiente ferroviario","categories":[],"sourceCount":16},{"id":"CAT-bc11459e57302569","title":"La Strategia Fiscale del Gruppo FS","categories":[],"sourceCount":42},{"id":"CAT-ead18e09adc849f4","title":"LABORATORIO_ESPERIENZIALE_Capi_Tecnici_Formazione al ruolo per Capi Tecnici","categories":[],"sourceCount":1},{"id":"CAT-7ebc228f3a4b2447","title":"LAVORATORI FORMAZIONE GENERALE e SPECIFICA RISCHIO MEDIO_ Applicazione Accordi Stato Regioni 21.12.2011","categories":["workerSafety"],"sourceCount":44},{"id":"CAT-35bf75f9efac8e53","title":"LAVORATORI MODULO FORMAZIONE GENERALE - APPLICAZIONE ACCORDI STATO- REGIONI 21/12/2011","categories":["workerSafety"],"sourceCount":6},{"id":"CAT-f23142bb5fe97136","title":"Lavori in ambienti sospetti di inquinamento o confinati ai sensi del D. Lgs 81/2008 e DPR 177/11","categories":["confined"],"sourceCount":22},{"id":"CAT-88ec2161899038fc","title":"LAVORI IN SICUREZZA LONTANO DAL SUOLO","categories":["height"],"sourceCount":113},{"id":"CAT-e540d6f48d757e7f","title":"LAVORI IN SICUREZZA LONTANO DAL SUOLO e DPI 3a cat_Aggiornamenti","categories":["dpi3","height"],"sourceCount":5},{"id":"CAT-dc018597c2daea05","title":"LC3 - 3^ Linea di contatto","categories":[],"sourceCount":5},{"id":"CAT-30908d43a1dbe076","title":"Le competenze metodologiche dell'istruttore_Modulo 2_Preparare una lezione","categories":[],"sourceCount":1},{"id":"CAT-b67fc2495fb49fe3","title":"Le competenze metodologiche dell'istruttore_Modulo 3_Gestire l'aula","categories":[],"sourceCount":1},{"id":"CAT-345225bc64153903","title":"Le competenze metodologiche dell'istruttore_Modulo 4_Ritorni d'esperienza","categories":[],"sourceCount":1},{"id":"CAT-ec729551bc8fd979","title":"Le competenze metodologiche dell'istruttore_Modulo1_Progettare un intervento formativo","categories":[],"sourceCount":1},{"id":"CAT-a79ec08f7806759d","title":"Le «segnalazioni» nel Gruppo FS: il Whistleblowing","categories":[],"sourceCount":11},{"id":"CAT-9b61ab0c96c4b442","title":"LFM2 - 2^ Impianti LFM","categories":[],"sourceCount":5},{"id":"CAT-29beffa78e29b923","title":"LFM3 - 3^ Impianti LFM","categories":[],"sourceCount":2},{"id":"CAT-7a373a3084f9822d","title":"Mantenimento competenze del personale operativo su SICUREZZA GALLERIA Modulo formativo annuale","categories":["tunnel"],"sourceCount":2},{"id":"CAT-245d23b3ad94811f","title":"Mantenimento competenze dell'abilitazione MI_ARMSED1_Formazione teorica","categories":[],"sourceCount":1},{"id":"CAT-e50a4d1ab92a9247","title":"Mantenimento competenze dell'abilitazione MI_BASE_RUOLO_OPERATORE_Formazione teorica","categories":[],"sourceCount":1},{"id":"CAT-b71d54a65f3aebbc","title":"Mantenimento competenze dell'abilitazione MI_BASE_RUOLO_OPERATORE_Tirocinio","categories":[],"sourceCount":2},{"id":"CAT-ac44a5a23e198dc3","title":"Mantenimento competenze dell'abilitazione MI_OPC_Formazione teorica","categories":[],"sourceCount":27},{"id":"CAT-4a7cbe737e00db6e","title":"Mantenimento competenze della qualificazione professionale MI.IE. TE/Linea di contatto_Formazione teorica","categories":[],"sourceCount":56},{"id":"CAT-05bc11e2bcc331a1","title":"Mantenimento competenze della qualificazione professionale MI.IE. TE/Linea di contatto_Tirocinio","categories":[],"sourceCount":1},{"id":"CAT-bc650244763c2614","title":"Mantenimento competenze della qualificazione professionale MI_IE. SSE_Formazione Teorica","categories":[],"sourceCount":9},{"id":"CAT-9e244ba287c3cccd","title":"Mantenimento competenze della qualificazione professionale MI_MDO CONFINE SVIZZERO_Formazione Teorica","categories":[],"sourceCount":8},{"id":"CAT-c67ebb311d351ecc","title":"Mantenimento competenze della qualificazione professionale TLC/Impianti TLC Sicurezza in Galleria _Teoria","categories":["tunnel"],"sourceCount":1},{"id":"CAT-6d662b80fc4c3a37","title":"Manutenzione Infrastruttura - Mantenimento competenze - SSE","categories":[],"sourceCount":10},{"id":"CAT-fd43fd1416a5d5f6","title":"Manutenzione Infrastruttura - Mantenimento competenze TE - Linea di Contatto","categories":[],"sourceCount":3},{"id":"CAT-05d24aa407d64d38","title":"Meeting sulla Sicurezza Esercizio","categories":[],"sourceCount":1},{"id":"CAT-235d412c450cc22f","title":"MI.EN.OP_A_Operatore Energia - Addestramento","categories":[],"sourceCount":42},{"id":"CAT-1380d4bbbe280de3","title":"MI.EN.OP_T_Operatore Energia - Teoria","categories":[],"sourceCount":50},{"id":"CAT-a7e7f5ad5f983376","title":"MI.EN.OP_TP_Operatore Energia - Tirocinio","categories":[],"sourceCount":33},{"id":"CAT-07a2b52ebc389dba","title":"MI.EN.QP.MAN/LC_A_Manutentore Linea di Contatto - Addestramento","categories":[],"sourceCount":12},{"id":"CAT-9aa581cbe3e79e55","title":"MI.EN.QP.MAN/LC_T_Manutentore Linea di Contatto - Teoria","categories":[],"sourceCount":12},{"id":"CAT-b01b9d399dad179c","title":"MI.EN.QP.MAN/LC_TP_Manutentore Linea di Contatto - Tirocinio","categories":[],"sourceCount":10},{"id":"CAT-93efe6cd489e1c06","title":"MI.EN.QP.OP Integrazione per Conversione","categories":[],"sourceCount":20},{"id":"CAT-36e9e1405be2fe4d","title":"MI.EN.QP.OP/CONFINE_A_Operatore Energia - Contesto Confine - Addestramento","categories":[],"sourceCount":64},{"id":"CAT-8e4ffcd43b85a220","title":"MI.EN.QP.OP/CONFINE_T_Operatore Energia - Contesto Confine - Teoria","categories":[],"sourceCount":51},{"id":"CAT-250c0df598e6de47","title":"MI.EN.QP.OP/CONFINE_TP_Operatore Energia - Contesto Confine - Tirocinio","categories":[],"sourceCount":37},{"id":"CAT-315fef88dd9ae98a","title":"MI.EN.QP.OP/LC_A_Operatore Energia - Contesto Linea di Contatto - Addestramento","categories":[],"sourceCount":37},{"id":"CAT-fa8cb2ce9dae0cac","title":"MI.EN.QP.OP/LC_T_Operatore Energia - Contesto Linea di Contatto - Teoria","categories":[],"sourceCount":38},{"id":"CAT-c1e92fe829752da3","title":"MI.EN.QP.OP/LC_TP_Operatore Energia - Contesto Linea di Contatto - Tirocinio","categories":[],"sourceCount":34},{"id":"CAT-507b78374b7eed5b","title":"MI.OPC.OP/Confini_A_Operatore di Cantiere - Contesto Confini - Addestramento","categories":[],"sourceCount":10},{"id":"CAT-e4b8fcd8d4205eba","title":"MI.OPC.OP/Confini_T_Operatore di Cantiere - Contesto Confini - Teoria","categories":[],"sourceCount":10},{"id":"CAT-8a58a6d373b622e3","title":"MI.OPC.OP/Confini_TP_Operatore di Cantiere - Contesto Confini - Tirocinio","categories":[],"sourceCount":10},{"id":"CAT-326b433d04daa3ad","title":"MI.OPC.OP_A_Operatore di Cantiere - Addestramento","categories":[],"sourceCount":30},{"id":"CAT-ab0ed334d79376b1","title":"MI.OPC.OP_T_Operatore di Cantiere - Teoria","categories":[],"sourceCount":51},{"id":"CAT-25781f710bfd9a0e","title":"MI.OPC.OP_TP_Operatore di Cantiere - Tirocinio","categories":[],"sourceCount":28},{"id":"CAT-0ae48396c2c8f65a","title":"MI.OPC.QP.OP/GUIDA MDO_A_Operatore di Cantiere - Guida Mezzi d'Opera - Addestramento","categories":[],"sourceCount":17},{"id":"CAT-48a588768f41a2d0","title":"MI.OPC.QP.OP/GUIDA MDO_T_Operatore di Cantiere - Guida Mezzi d'Opera - Teoria","categories":[],"sourceCount":17},{"id":"CAT-591a60bae82f7cb5","title":"MI.OPC.QP.OP/GUIDA MDO_TP_Operatore di Cantiere - Guida Mezzi d'Opera - Tirocinio","categories":[],"sourceCount":38},{"id":"CAT-63fa9aa8764f6a6e","title":"MI.OPC.QP.OP/MDO Mantenimento Competenze per Conversione","categories":[],"sourceCount":36},{"id":"CAT-71ef8881675ee182","title":"MI.OPC.QP.OP/SCORTA MDO_A_Operatore di Cantiere - Scorta Mezzi d'Opera - Addestramento","categories":[],"sourceCount":34},{"id":"CAT-908202e8fe414356","title":"MI.OPC.QP.OP/SCORTA MDO_Confini_A_Operatore di Cantiere - Scorta Mezzi d'Opera Confini - Add","categories":[],"sourceCount":10},{"id":"CAT-b8722ca402fd2894","title":"MI.OPC.QP.OP/SCORTA MDO_Confini_T_Operatore di Cantiere - Scorta Mezzi d'Opera Confini - Teoria","categories":[],"sourceCount":10},{"id":"CAT-3f7413c489dfb481","title":"MI.OPC.QP.OP/SCORTA MDO_Confini_TP_Operatore di Cantiere - Scorta Mezzi d'Opera Confini - Tirocinio","categories":[],"sourceCount":10},{"id":"CAT-d08a040fe1470264","title":"MI.OPC.QP.OP/SCORTA MDO_T_Operatore di Cantiere - Scorta Mezzi d'Opera - Teoria","categories":[],"sourceCount":29},{"id":"CAT-e58a307435072945","title":"MI.OPC.QP.OP/SCORTA MDO_TP_Operatore di Cantiere - Scorta Mezzi d'Opera - Tirocinio","categories":[],"sourceCount":25},{"id":"CAT-447a14c6c4d363ba","title":"MI_EN_LC_Mantenimento_competenze_MC nell'ambito specialistico ENERGIA_LC","categories":[],"sourceCount":113},{"id":"CAT-420fdd0e9b34b179","title":"MI_EN_Mantenimento_competenze_Mantenimento delle competenze nell'ambito specialistico ENERGIA","categories":[],"sourceCount":89},{"id":"CAT-c93bc06b277c075a","title":"MI_IE_Man. Comp.ze TE/SSE/LP","categories":[],"sourceCount":20},{"id":"CAT-f6560c9717197810","title":"MI_MDO_Mantenimento_competenze_MC nell'ambito trasversale CANTIERI_MEZZI D'OPERA","categories":[],"sourceCount":31},{"id":"CAT-5ff0f6389d5e2005","title":"MI_OPC_Mantenimento_competenze_MC nell'ambito trasversale CANTIERI","categories":[],"sourceCount":26},{"id":"CAT-59f4a88a2b9f3ae9","title":"MOVING FORWARD_CASCADE_MOVING FORWARD_PIANO INDUSTRIALE 2017_2026_PER COSTRUIRE INSIEME IL FUTURO","categories":[],"sourceCount":15},{"id":"CAT-16fdd3b983772f57","title":"Partecipazione a Corsi da mercato, Seminari, Convegni SALUTE E SICUREZZA LAVORO","categories":[],"sourceCount":6},{"id":"CAT-2f47dac8003bcfd6","title":"Percorso di on boarding neoassunti RFI_e-learning Formazione Trasversale e Organizzazione","categories":[],"sourceCount":7},{"id":"CAT-750f7db5dab91b56","title":"Percorso di Onboarding Neoassunti RFI","categories":[],"sourceCount":1},{"id":"CAT-23c200b4cff42e54","title":"Percorso di onboarding neoassunti RFI 2023","categories":[],"sourceCount":1},{"id":"CAT-f804f1b74f7867ac","title":"Percorso gamificato di introduzione alle principali società del gruppo FS Italiane","categories":[],"sourceCount":4},{"id":"CAT-3d9c402b313f334f","title":"PERCORSO_PREPOSTO_Formazione_particolare_aggiuntiva","categories":["preposto"],"sourceCount":8},{"id":"CAT-b1b23c5e4e566fa5","title":"PERCORSO_RLS_Dlgs_81/08_PERCORSO RLS_Dlgs81/08","categories":[],"sourceCount":1},{"id":"CAT-f42fdc9d2d593a44","title":"Policy Anti-Corruption del Gruppo FS 2024","categories":[],"sourceCount":20},{"id":"CAT-bdd466420bc6e654","title":"Preposti, Corso di Aggiornamento#Sicurezza Lavoro - Settore Esercizio","categories":["preposto"],"sourceCount":4},{"id":"CAT-3482b95b1f5e484e","title":"PREPOSTO Consapevolezza del ruolo ed esercizio efficace","categories":["preposto"],"sourceCount":1},{"id":"CAT-bf3bdcad2327203b","title":"PREPOSTO FORMAZIONE PARTICOLARE AGGIUNTIVA - APPLICAZIONE ACCORDI STATO- REGIONI 21/12/2011.","categories":["preposto"],"sourceCount":4},{"id":"CAT-dda749dbaa588b56","title":"PREPOSTO FORMAZIONE PARTICOLARE AGGIUNTIVA_APPLICAZIONE ACCORDI STATO- REGIONI","categories":["preposto"],"sourceCount":37},{"id":"CAT-7b1c587a5c11e6df","title":"PREPOSTO Obblighi di legge art.37 DLgs 81/08","categories":["preposto"],"sourceCount":7},{"id":"CAT-ff824b663cc443a6","title":"PREPOSTO_AGGIORNAMENTI PERIODICI","categories":["preposto"],"sourceCount":21},{"id":"CAT-a6e8644554e79dfe","title":"PREPOSTO_AGGIORNAMENTO QUINQUENNALE (P. 9 ACCORDI STATO-REGIONI 21 12 2011)","categories":["preposto"],"sourceCount":15},{"id":"CAT-b43ea39804d83005","title":"Prevenzione dei tallonamenti","categories":[],"sourceCount":23},{"id":"CAT-ae866e42c68f994a","title":"QP Guida e scorta dei mezzi d'opera in regime di interruzione della circolazione ferroviaria_Teoria","categories":[],"sourceCount":6},{"id":"CAT-4c6332763c889028","title":"Qualificazione professionale MI.IE.TE/LC2 2^ Linea di Contatto_Addestramento","categories":[],"sourceCount":15},{"id":"CAT-e7628203c6d23b73","title":"Qualificazione professionale MI.IE.TE/LC2 2^ Linea di Contatto_Teoria","categories":[],"sourceCount":15},{"id":"CAT-3949f1d55f01581f","title":"Qualificazione professionale MI.IE.TE/LC3 3^Linea di Contatto_Addestramento","categories":[],"sourceCount":8},{"id":"CAT-f42cdabc048c30f8","title":"Qualificazione professionale MI.IE.TE/LC3 3^Linea di Contatto_Teoria","categories":[],"sourceCount":8},{"id":"CAT-ece2f5da55ddaa38","title":"Qualificazione professionale MI.IE.TE/LC3 3^Linea di Contatto_Tirocinio","categories":[],"sourceCount":2},{"id":"CAT-b439e9dd52458c08","title":"Qualificazione professionale MI_IE.TE/LC2_15KV_Addestramento","categories":[],"sourceCount":10},{"id":"CAT-b4149c862223aa3e","title":"Qualificazione professionale MI_IE.TE/LC2_15KV_Teoria","categories":[],"sourceCount":8},{"id":"CAT-7f5b1fe1dcada336","title":"Qualificazione Professionale_MDO_CONFINE SVIZZERO_Teoria","categories":[],"sourceCount":4},{"id":"CAT-ab93d0c1aeaa7c33","title":"Recupero competenze","categories":[],"sourceCount":6},{"id":"CAT-ba2a606ee9c5b359","title":"Rischi elettrici CEI 11-27_1A+2A_Rischi elettrici CEI 11-27_1A+2A (Conoscenze teoriche PAV_PES_PEI)","categories":["electrical"],"sourceCount":11},{"id":"CAT-6fad02a54964324a","title":"Rischi elettrici CEI 11-27_1B (Pratica PAV_PES)_Rischi elettrici CEI 11- 27_1B (Conoscenze e capacità per l'operatività","categories":["electrical"],"sourceCount":9},{"id":"CAT-40550a346de25292","title":"Rischi Elettrici Norme CEI EN 50110-1/CEI 11-27 - PES PAV","categories":["electrical"],"sourceCount":57},{"id":"CAT-6791f66ccb635593","title":"RISCHI SPECIFICI_Dispositivi_di_protezione_individuali","categories":[],"sourceCount":3},{"id":"CAT-bf5fcb1a5a5c183b","title":"Ritorno di esperienza congiunto DOI-DCIO","categories":[],"sourceCount":26},{"id":"CAT-3f6f150ea2a35229","title":"Ruolo Operatore di Cantiere contesto operativo Mezzi d'Opera_Addestramento","categories":[],"sourceCount":9},{"id":"CAT-88a678fa1fa7dc4e","title":"Ruolo Operatore di Cantiere contesto operativo Mezzi d'Opera_Teoria","categories":[],"sourceCount":6},{"id":"CAT-1cc9741dbb41d41a","title":"Ruolo Operatore di Cantiere contesto operativo Mezzi d'Opera_Tirocinio","categories":[],"sourceCount":5},{"id":"CAT-f5fc8bf35acfb14a","title":"Ruolo Operatore di Cantiere_Addestramento","categories":[],"sourceCount":12},{"id":"CAT-1b6881ddb5b39716","title":"Ruolo Operatore di Cantiere_Teoria","categories":[],"sourceCount":12},{"id":"CAT-7e1adbae97c29998","title":"Ruolo Operatore di Cantiere_Tirocinio","categories":[],"sourceCount":15},{"id":"CAT-ae47c24d6be0a790","title":"Ruolo Operatore Energia contesto operativo Confine_Teoria","categories":[],"sourceCount":14},{"id":"CAT-0127272a64301ce8","title":"Ruolo Operatore Energia contesto operativo Linea di contatto_Addestramento","categories":[],"sourceCount":14},{"id":"CAT-3c27e2d9c00f5ba6","title":"Ruolo Operatore Energia contesto operativo Linea di contatto_Teoria","categories":[],"sourceCount":18},{"id":"CAT-a4a3dd13df504568","title":"Ruolo Operatore Energia contesto operativo Linea di contatto_Tirocinio","categories":[],"sourceCount":14},{"id":"CAT-9cf31b7862f366e3","title":"Ruolo Operatore Energia_Addestramento","categories":[],"sourceCount":14},{"id":"CAT-e13494859570804e","title":"Ruolo Operatore Energia_Teoria","categories":[],"sourceCount":21},{"id":"CAT-0615c84604d98980","title":"Ruolo Operatore Energia_Tirocinio","categories":[],"sourceCount":9},{"id":"CAT-d2ef026dc7406fd9","title":"Safety_Attenzione Consapevole","categories":[],"sourceCount":28},{"id":"CAT-3a270267f3a76585","title":"Safety_La Rete della Sicurezza","categories":[],"sourceCount":14},{"id":"CAT-81c99efe290d34e6","title":"Segregazione dei compiti e delle responsabilità","categories":[],"sourceCount":22},{"id":"CAT-61a2862cc6d25c40","title":"SICUREZZA GALLERIA - MODULO ANNUALE","categories":["tunnel"],"sourceCount":242},{"id":"CAT-e1ae0afcda9a912a","title":"Sicurezza nelle gallerie-Modulo formativo annuale di carattere generale sulla sicurezza e la gestione dell'emergenza","categories":["tunnel"],"sourceCount":1},{"id":"CAT-f9ea6953ed67aa41","title":"SIME_Gestire_il_cambiamento_del_sistema_informativo","categories":[],"sourceCount":2},{"id":"CAT-82f41d6a431df926","title":"Sistema_Informativo_Manutenzione_Evoluta_e-learning","categories":[],"sourceCount":13},{"id":"CAT-f6c18e335be986f7","title":"Sistema_Informativo_Manutenzione_Evoluta_per_la_gestione_di_un_Ce ntro_di _Lavoro_e-learning","categories":[],"sourceCount":2},{"id":"CAT-7b22b229e4bef325","title":"TIRO Abilitazioni di base - POB","categories":[],"sourceCount":10},{"id":"CAT-a21b1a35f86e5b5d","title":"Tiro Abilitazioni TE - LFM","categories":[],"sourceCount":7},{"id":"CAT-285d37efc84c7aab","title":"TIRO ABILITAZIONI TE - Linea di contatto","categories":[],"sourceCount":28},{"id":"CAT-9f8741226eb9bf14","title":"TIRO Guida Mezzo d'Opera in dotazione (AB6)","categories":[],"sourceCount":20},{"id":"CAT-1c6a210c23180289","title":"TIRO Mantenimento competenze LFM Cabine di trasformazione MT/BT","categories":[],"sourceCount":2},{"id":"CAT-8e6e5a5a9f2a3ef9","title":"TIRO Mantenimento competenze Protezione Cantieri Lavoro","categories":[],"sourceCount":4},{"id":"CAT-64fd5f672183a7d2","title":"TIRO Mantenimento competenze TE - Linea di Contatto","categories":[],"sourceCount":5},{"id":"CAT-a9dcec96d8fc12d8","title":"TIRO Recupero competenze","categories":[],"sourceCount":1},{"id":"CAT-ea904d9dcfd642f4","title":"Travel Security","categories":[],"sourceCount":18},{"id":"CAT-430c542b78191d9f","title":"VERIFICHE_ DI_LEGGE_Verifiche_di_messa_ a_terra_Verifiche di legge_Verifiche di messa a terra","categories":[],"sourceCount":5},{"id":"CAT-d02bcca0242eaa06","title":"VERIFICHE_DI_LEGGE_AGGIORNAMENTO_Verifiche di messa a terra","categories":[],"sourceCount":4},{"id":"CAT-93cbbabdb3d735ff","title":"WORKSHOP AUTOR SICUR - APPLICAZ DECR ANSF 4/12_WORKSHOP AUTORIZZAZIONE DI SICUREZZA -","categories":[],"sourceCount":2},{"id":"CAT-02c7114f24bc2f46","title":"Workshop Ispirazionale del 12/01 “Verso una Cultura Customer Excellence partendo dal Purpose” – PARTE 1","categories":[],"sourceCount":1}];



const sid=x=>String(x||'');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const teamMembers=(data,user)=>{const own=(data.peopleRecords||[]).find(p=>sid(p.id)===sid(user.person_id));if(!own||!own.nucleus)return new Set([sid(user.person_id)]);return new Set((data.peopleRecords||[]).filter(p=>p.active!==false&&p.nucleus===own.nucleus&&(user.role==='chief'||String(p.team||'')===String(own.team||''))).map(p=>sid(p.id)).concat([sid(user.person_id)]));};
const teamCode=value=>String(value||'').replace(/^Squadra\s*/i,'').trim();
const chiefHome=(data,user)=>{const person=(data.peopleRecords||[]).find(p=>sid(p.id)===sid(user.person_id)&&p.active!==false);if(!person?.nucleus||!teamCode(person.team))throw Error('Capo Tecnico senza squadra attiva');return person;};
const chiefOwn=(activity,person)=>activity?.nucleus===person.nucleus;
const chiefPublicationKey=(week,person)=>week+'|'+person.nucleus+'|'+teamCode(person.team);
const assigned=(data,user)=>{const ids=teamMembers(data,user);return new Set((data.activities||[]).filter(a=>
 (a.people||[]).some(id=>ids.has(sid(id)))||
 Object.values(a.roleAssignments||{}).some(id=>ids.has(sid(id)))||
 (a.sourceCourseEventId&&(a.people||[]).map(String).includes(sid(user.person_id)))||
 (a.nucleus===(data.peopleRecords||[]).find(p=>sid(p.id)===sid(user.person_id))?.nucleus&&String(a.team||'').replace(/^Squadra\s*/i,'')===String((data.peopleRecords||[]).find(p=>sid(p.id)===sid(user.person_id))?.team||''))
 ).map(a=>sid(a.id)));};
function mergeRows(original,visible,submitted,validate){if(!Array.isArray(submitted))throw Error('Elenco non valido');const ids=new Set();for(const r of submitted){if(!r.id||ids.has(String(r.id)))throw Error('Identificativi non validi');ids.add(String(r.id));const old=original.find(o=>String(o.id)===String(r.id));if(old&&!visible.some(v=>String(v.id)===String(old.id)))throw Error('Record non autorizzato');if(!same(old,r))validate(r,old);}if(visible.some(r=>!ids.has(String(r.id))))throw Error('Eliminazione non consentita');return [...original.filter(r=>!visible.some(v=>String(v.id)===String(r.id))),...submitted];}
export const managerRoles=['owner','specialist','administrative'];
export const teamScopedRoles=['chief','preposto','viewer'];
export const permissions={owner:['requestsManage','variation','competenceCreate','approve','archive','safetyManage','schedulePeopleEvents','activityEdit','activityPublish','activityApprove','diaryEdit','adminManage','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],specialist:['variation','competenceCreate','approve','archive','safetyManage','schedulePeopleEvents','activityEdit','activityPublish','activityApprove','diaryEdit','adminManage','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],administrative:['variation','competenceCreate','archive','safetyManage','schedulePeopleEvents','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports','diaryEdit'],chief:['variation','competenceCreate','activityEdit','activityPublish','diaryEdit','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],preposto:['competenceCreate','diaryEdit','viewShifts','viewActivities','viewReports'],viewer:['viewShifts','viewActivities']};
const allowed={leaveRequests:'variation',leaveCampaigns:'approve',variations:'variation',competencies:'competenceCreate',trainingCompletions:'schedulePeopleEvents',courseCatalogOverrides:'schedulePeopleEvents',trainingEvents:'schedulePeopleEvents',medicalAppointments:'schedulePeopleEvents',activities:'activityEdit',activityDiary:'diaryEdit',activityPublications:'activityPublish',safetyRecords:'safetyManage',peopleRecords:'adminManage',manualLocations:'adminManage',shiftRules:'adminManage',theoreticalRules:'adminManage',rotationJumps:'adminManage',ruleConfig:'adminManage',presenceImportVersion:'adminManage',presenceImportHistory:'adminManage',auditLog:'adminManage',activityCatalog:'activityEdit',odlCatalog:'activityEdit',locationCatalog:'activityEdit'};
export function visibleState(data,user){
 const d=structuredClone(data),role=user.role,scoped=teamScopedRoles.includes(role);
 if(!(permissions[role]||[]).includes('schedulePeopleEvents'))d.medicalAppointments=(d.medicalAppointments||[]).map(({id,personId,date,start,end,visibilityFrom})=>({id,personId,date,start,end,visibilityFrom}));
 if(role!=='owner')delete d.maintenanceHistory;
 if(role!=='owner')d.operationalRequests=(d.operationalRequests||[]).filter(r=>r.createdByUserId===user.user_id);
 if(scoped){
  const memberIds=teamMembers(data,user),ownActivityIds=assigned(data,user);
  for(const report of (data.activityDiary||[]))if(sid(report.createdByUserId)===sid(user.user_id))ownActivityIds.add(sid(report.activityId));
  d.leaveRequests=(d.leaveRequests||[]).filter(r=>sid(r.personId)===sid(user.person_id));
  // Un collega vede esclusivamente il proprio appuntamento e l'eventuale corso assegnato.
  // Non esponiamo sede, motivo o nominativi di altri partecipanti nei profili di squadra.
  d.medicalAppointments=(d.medicalAppointments||[]).filter(a=>sid(a.personId)===sid(user.person_id));
  d.activities=role==='chief'?(d.activities||[]):(d.activities||[]).filter(a=>ownActivityIds.has(sid(a.id)));
  d.activityDiary=(d.activityDiary||[]).filter(r=>ownActivityIds.has(sid(r.activityId))||sid(r.createdByUserId)===sid(user.user_id));
  d.competencies=(d.competencies||[]).filter(r=>memberIds.has(sid(r.personId)));
  d.variations=(d.variations||[]).filter(r=>memberIds.has(sid(r.personId)));
  d.peopleRecords=(d.peopleRecords||[]).filter(p=>role==='chief'||memberIds.has(sid(p.id))).map(p=>{const {id,name,surname,displayName,nucleus,team,qualification,rotation,active,validities,skills}=p;return{id,name,surname,displayName,nucleus,team,qualification,rotation,active,...(role==='chief'&&memberIds.has(sid(p.id))?{validities,skills}:{})};});
  d.trainingEvents=(d.trainingEvents||[]).filter(e=>(e.personIds||[]).some(id=>sid(id)===sid(user.person_id))).map(e=>({...e,personIds:[user.person_id]}));d.trainingCompletions=[];d.courseCatalogOverrides=[];d.safetyRecords=[];d.auditLog=[];d.presenceImportHistory=[];
  d.shiftRules=[];d.theoreticalRules=[];d.rotationJumps=[];d.manualLocations=[];
  d.energyMaintenanceHistory=[];d.ruleConfig={};d.activityPublications=role==='chief'?Object.fromEntries(Object.entries(d.activityPublications||{}).filter(([key])=>{try{const person=chiefHome(data,user);return key.endsWith('|'+person.nucleus+'|'+teamCode(person.team));}catch{return false;}})):{};d.locationCatalog={};d.odlCatalog=[];
 }
 if(scoped){const out={};for(const key of ["activities","activityDiary","activityPublications","auditLog","competencies","courseCatalogOverrides","energyMaintenanceHistory","leaveCampaigns","leaveRequests","locationCatalog","manualLocations","medicalAppointments","odlCatalog","operationalRequests","peopleRecords","presenceImportHistory","presenceImportVersion","rotationJumps","ruleConfig","safetyRecords","shiftRules","theoreticalRules","trainingCompletions","trainingEvents","variations"])if(Object.prototype.hasOwnProperty.call(d,key))out[key]=d[key];return out;}
 return d;
}
export function visibleBaseline(baseline,data,user){
 const b=structuredClone(baseline);
 if(!teamScopedRoles.includes(user.role))return b;
 if(user.role==='chief'){b.safetyRecords=[];b.trainingRecords=[];const out={};for(const key of ['meta','people','rules','safetyRecords','shiftCodes','shiftDefinitions','shiftPeople','shifts','trainingDictionaries','trainingRecords'])if(Object.prototype.hasOwnProperty.call(b,key))out[key]=b[key];return out;}
 const ids=teamMembers(data,user),index=new Map(),filtered=[];
 for(let i=0;i<(b.shiftPeople||[]).length;i++){
  const p=b.shiftPeople[i];if(ids.has(sid(p[0]))){index.set(i,filtered.length);filtered.push(p);}
 }
 b.shiftPeople=filtered;
 b.shifts=(b.shifts||[]).filter(r=>index.has(r[0])).map(r=>[index.get(r[0]),...r.slice(1)]);
 b.people=(b.people||[]).filter(p=>ids.has(sid(p.id))).map(p=>{
  const {id,name,surname,displayName,qualification,nucleus,team,rotation,active}=p;
  return{id,name,surname,displayName,qualification,nucleus,team,rotation,active};
 });
 b.safetyRecords=[];b.trainingRecords=[];
 const out={};for(const key of ["meta","people","rules","safetyRecords","shiftCodes","shiftDefinitions","shiftPeople","shifts","trainingDictionaries","trainingRecords"])if(Object.prototype.hasOwnProperty.call(b,key))out[key]=b[key];
 return out;
}
export function applyPatch(data,patch,user){const next=structuredClone(data),perms=permissions[user.role]||[];for(const [key,value] of Object.entries(patch)){if(key==='auditLog')continue;
 if(key==='peopleRecords'&&(!Array.isArray(value)||value.some(p=>!p||typeof p!=='object'||Array.isArray(p)||!p.id)||new Set(value.map(p=>String(p.id))).size!==value.length))throw Error('Anagrafica personale non valida: nessuna scheda vuota o CID duplicato consentito');
 if(key==='trainingEvents'){
  if(!perms.includes('schedulePeopleEvents'))throw Error('Pianificazione corsi non autorizzata');
  if(!Array.isArray(value))throw Error('Elenco corsi non valido');
  const closed=new Set(['approved','confirmed','accepted']),absent=new Set(['C','MM','INF','ASP','AS','CP','CS','H','PS','PM','PL','PF','RFS','AG','AR','DS']);
  const unavailable=(pid,day,event)=>{
   const leave=(data.leaveRequests||[]).find(r=>sid(r.personId)===pid&&r.from<=day&&r.to>=day&&closed.has(String(r.status||'').toLowerCase()));
   if(leave)return 'congedo confermato';
   const variation=(data.variations||[]).filter(v=>sid(v.personId)===pid&&v.date===day).at(-1);
   if(variation&&(variation.sourceLeaveId||absent.has(String(variation.shift||variation.code||'').toUpperCase())))return 'assenza prevista';
   if((data.medicalAppointments||[]).some(m=>sid(m.personId)===pid&&m.date===day&&m.start<event.end&&m.end>event.start))return 'visita sovrapposta';
   return '';
  };
  for(const event of value){
   const old=(data.trainingEvents||[]).find(e=>sid(e.id)===sid(event.id));
   if(same(old,event))continue;
   if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(event.startDate||''))||!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(event.endDate||''))||event.endDate<event.startDate)throw Error('Date corso non valide');
   const start=new Date(event.startDate+'T12:00:00Z'),end=new Date(event.endDate+'T12:00:00Z');
   if((end-start)/86400000>370)throw Error('Durata corso eccessiva');
   for(const pid of event.personIds||[]){
    if(!(data.peopleRecords||[]).some(p=>sid(p.id)===sid(pid)&&p.active!==false))throw Error('Dipendente non attivo per corso');
    for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){
     const day=d.toISOString().slice(0,10),reason=unavailable(sid(pid),day,event);
     if(reason)throw Error('Iscrizione al corso non consentita: '+pid+' '+day+' ('+reason+')');
    }
   }
  }
 }
 if(key==='leaveRequests'){
 const existing=data.leaveRequests||[],visible=managerRoles.includes(user.role)?existing:existing.filter(r=>sid(r.personId)===sid(user.person_id));
 if(!perms.includes('variation')&&!perms.includes('diaryEdit'))throw Error('Richiesta ferie non autorizzata');
 next[key]=mergeRows(existing,visible,value,(r,old)=>{if(!managerRoles.includes(user.role)&&sid(r.personId)!==sid(user.person_id))throw Error('Richiesta riservata alla propria anagrafica');if(!same(r,old)&&['approved','rejected','cancelled'].includes(old?.status)&&!perms.includes('approve'))throw Error('Richiesta già gestita');if(!perms.includes('approve')&&(r.status==='approved'||r.status==='rejected'||r.approvedAt||r.approvedBy))throw Error('Conferma ferie riservata al responsabile e agli specialisti');if(!/^\d{4}-\d{2}-\d{2}$/.test(r.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(r.to||'')||r.to<r.from)throw Error('Periodo ferie non valido');});continue;
 }
 if(key==='operationalRequests'){
 const existing=data.operationalRequests||[],visible=user.role==='owner'?existing:existing.filter(r=>r.createdByUserId===user.user_id);
 if(!Array.isArray(value))throw Error('Richieste non valide');
 const statuses=['new','progress','waiting','resolved','closed','cancelled'];
 if(user.role==='owner'){
  const ids=new Set();for(const request of value){if(!request.id||ids.has(String(request.id))||!statuses.includes(request.status))throw Error('Stato o identificativo segnalazione non valido');ids.add(String(request.id));const original=existing.find(r=>String(r.id)===String(request.id));if(original&&request.createdByUserId!==original.createdByUserId)throw Error('Autore della segnalazione non modificabile');}
  if(existing.some(r=>!ids.has(String(r.id))))throw Error('Non è consentito cancellare le segnalazioni dal registro');
  next[key]=value;continue;
 }
 for(const old of visible){const changed=value.find(r=>r.id===old.id);if(!changed||!same(changed,old))throw Error('Le segnalazioni inviate non sono modificabili dal collega');}
 const fresh=value.filter(r=>!visible.some(o=>o.id===r.id));
 if(fresh.length>5)throw Error('Massimo cinque nuove segnalazioni per salvataggio');
 if(fresh.some(r=>!r.id||existing.some(o=>String(o.id)===String(r.id))))throw Error('Identificativo segnalazione duplicato');
 if(!user.person_id||fresh.some(r=>String(r.personId)!==String(user.person_id)))throw Error('Puoi inviare segnalazioni soltanto a tuo nome');
 const now=new Date().toISOString();
 next[key]=[...existing,...fresh.map(r=>({...r,createdByUserId:user.user_id,createdBy:user.name||user.email,status:'new',assignedTo:'',due:'',createdAt:now,updatedAt:now,updatedBy:user.name||user.email,history:[{id:'CREATED-'+String(r.id),at:now,by:user.name||user.email,action:'Segnalazione registrata',text:''}]}))];continue;
}
 if(key==='activities'&&user.role==='administrative'){
  next[key]=mergeRows(data.activities||[],data.activities||[],value,(r,old)=>{
   if(!old)throw Error('Creazione attività non consentita al ruolo amministrativo');
   const after={...r},before={...old};delete after.status;delete before.status;
   if(!same(after,before)||!['ready','done','published'].includes(r.status))throw Error('Per gli amministrativi è modificabile solo lo stato collegato al rapportino');
  });continue;
 }
 if(key==='activities'&&perms.includes('schedulePeopleEvents')&&!perms.includes('activityEdit')){
 const events=patch.trainingEvents||data.trainingEvents||[],old=data.activities||[],ids=new Set((value||[]).map(a=>String(a.id)));
 for(const a of old)if(!ids.has(String(a.id))&&(!a.sourceCourseEventId||(data.activityDiary||[]).some(e=>String(e.activityId)===String(a.id))))throw Error('Eliminazione attività non consentita');
 for(const a of value||[]){const before=old.find(o=>String(o.id)===String(a.id));if(same(a,before))continue;const event=events.find(e=>String(e.id)===String(a.sourceCourseEventId));if(!event||!Array.isArray(a.people)||a.people.length!==1||!(event.personIds||[]).map(String).includes(String(a.people[0]))||a.date<event.startDate||a.date>event.endDate)throw Error('Solo attività collegate ai corsi gestiti');}
 next[key]=value;continue;
 }
 if(key==='peopleRecords'&&!perms.includes('adminManage')&&perms.includes('schedulePeopleEvents')){next[key]=mergeRows(data[key]||[],data[key]||[],value,(r,old)=>{if(!old)throw Error('Nuovo personale non autorizzato');const a={...r},b={...old};for(const f of ['phone','email','contactsSeedVersion','contactsEditedAt','updatedAt','updatedBy']){delete a[f];delete b[f];}if(!same(a,b))throw Error('Solo contatti modificabili');});continue;}
 if(!allowed[key]||!perms.includes(allowed[key])&&!(key==='activities'&&user.role==='preposto'))throw Error('Operazione non autorizzata: '+key);
 if(user.role==='chief'&&(key==='variations'||key==='competencies')){
  const memberIds=teamMembers(data,user),original=data[key]||[],visible=visibleState(data,user)[key]||[];
  next[key]=mergeRows(original,visible,value,(row,old)=>{
   if(!memberIds.has(sid(row.personId))||old&&sid(old.personId)!==sid(row.personId))throw Error('Modifica fuori dalla giurisdizione del proprio nucleo');
   if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(row.date||'')))throw Error('Data non valida');
   if(key==='variations'&&!String(row.shift||row.code||'').trim())throw Error('Turno non valido');
   if(key==='competencies'){
    for(const field of ['approvedAt','approvedBy','rejectedAt','rejectedBy'])
     if(!same(row[field],old?.[field]))throw Error('Convalida competenza riservata al responsabile');
    if(row.status==='approved'&&old?.status!=='approved')throw Error('Convalida competenza riservata al responsabile');
   }
  });
  continue;
 }
 if(user.role==='chief'&&key==='activities'){
  const person=chiefHome(data,user),original=data.activities||[],visible=visibleState(data,user).activities||[];
  if(!Array.isArray(value))throw Error('Elenco attività non valido');
  const ids=new Set(),visibleIds=new Set(visible.filter(a=>chiefOwn(a,person)).map(a=>sid(a.id))),byId=new Map(original.map(a=>[sid(a.id),a]));
  for(const activity of value){
   const id=sid(activity?.id),old=byId.get(id);
   if(!id||ids.has(id))throw Error('Identificativo attività non valido');ids.add(id);
   if(old&&!visibleIds.has(id)){if(!same(activity,old))throw Error('Attività di altro nucleo in sola lettura');continue;}
   if(old&&same(activity,old))continue;
   if(old&&!chiefOwn(old,person)||!chiefOwn(activity,person))throw Error('Attività fuori dal proprio nucleo');
   if(old?.sourceCourseEventId)throw Error('Attività corso gestita dalla pagina corsi');
   if((activity.people||[]).some(pid=>!teamMembers(data,user).has(sid(pid))&&!(old?.people||[]).map(sid).includes(sid(pid))))throw Error('Assegnazione fuori nucleo non autorizzata');
   if(Object.values(activity.roleAssignments||{}).some(pid=>pid&&!teamMembers(data,user).has(sid(pid))&&!Object.values(old?.roleAssignments||{}).map(sid).includes(sid(pid))))throw Error('Incarico fuori nucleo non autorizzato');
   if(activity.status==='published'&&old?.status!=='published'){
    const day=new Date(String(activity.date||'')+'T12:00:00Z');
    if(Number.isNaN(+day))throw Error('Data attività non valida');
    const monday=new Date(+day-((day.getUTCDay()+6)%7)*86400000).toISOString().slice(0,10);
    if(!patch.activityPublications?.[chiefPublicationKey(monday,person)])throw Error('Pubblicazione della squadra richiesta');
   }
  }
  for(const old of visible.filter(a=>chiefOwn(a,person)))if(!ids.has(sid(old.id))){
   if(old.sourceCourseEventId||(data.activityDiary||[]).some(r=>sid(r.activityId)===sid(old.id)))throw Error('Attività con corso o rapportino protetta');
  }
  next.activities=[...original.filter(a=>!visibleIds.has(sid(a.id))),...value.filter(a=>!byId.has(sid(a.id))||visibleIds.has(sid(a.id)))];continue;
 }
 if(user.role==='chief'&&key==='activityPublications'){
  const person=chiefHome(data,user),original=data.activityPublications||{},visible=visibleState(data,user).activityPublications||{};
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Pubblicazioni non valide');
  if(Object.keys(visible).some(k=>!Object.hasOwn(value,k)))throw Error('Pubblicazione esistente protetta');
  const changed=Object.entries(value).filter(([key,entry])=>!same(entry,visible[key]));
  if(changed.length!==1)throw Error('Pubblica una sola settimana della propria squadra');
  const [week,entry]=changed[0],key=chiefPublicationKey(week.slice(0,10),person),previous=original[key];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(week.slice(0,10))||week!==key||!entry||entry.revision!==(previous?.revision||0)+1)throw Error('Revisione programma non valida');
  const monday=new Date(week.slice(0,10)+'T12:00:00Z');if(Number.isNaN(+monday)||monday.getUTCDay()!==1)throw Error('Settimana programma non valida');
  const active=patch.activities||data.activities||[],weekEnd=new Date(+monday+6*86400000).toISOString().slice(0,10),items=active.filter(a=>chiefOwn(a,person)&&a.date>=week.slice(0,10)&&a.date<=weekEnd);
  if(!items.length||items.some(a=>!['published','done'].includes(a.status)))throw Error('Attività della squadra non pubblicate');
  next.activityPublications={...original,[key]:{at:new Date().toISOString(),by:user.name||user.email,revision:entry.revision}};continue;
 }
 // Frontline writes require record-level ownership. Enabled in a separate dedicated flow; never accept a whole team snapshot.
 if(!managerRoles.includes(user.role)){
 const own=assigned(data,user),visible=visibleState(data,user);
 const protectApproval=(r,old)=>{for(const field of ['status','approvedAt','approvedBy','rejectedAt','rejectedBy'])if(!same(r[field],old?.[field])&&!(field==='status'&&['draft','pending','submitted','recorded'].includes(r[field])))throw Error('Approvazione riservata al responsabile');};
 if(key==='activityDiary'){next[key]=mergeRows(data[key]||[],visible[key]||[],value,(r,old)=>{if(!old&&!own.has(sid(r.activityId)))throw Error('Attività non assegnata alla squadra');
 if(old && !(sid(old.createdByUserId)===sid(user.user_id)||(old.createdByUserId==null&&old.createdBy&&old.createdBy===user.email)))throw Error('Solo il compilatore originale o un responsabile può modificare il rapportino');
 if(old?.createdByUserId&&r.createdByUserId&&sid(r.createdByUserId)!==sid(old.createdByUserId))throw Error('Autore del rapportino non modificabile');
 if(old?.createdByUserId)r.createdByUserId=old.createdByUserId;
 if(!old){r.createdByUserId=user.user_id;r.createdBy=user.email||user.name;}
 if(old&&!old.createdByUserId)r.createdByUserId=user.user_id;if(old&&String(old.activityId)!==String(r.activityId))throw Error('Attività non modificabile');for(const f of ['signedFile','internalSignature','signatureStatus'])if(!same(r[f],old?.[f])&&!(f==='signatureStatus'&&!old&&r[f]==='external')&&r[f]!=null)throw Error('Firma non modificabile');const a=data.activities.find(a=>String(a.id)===String(r.activityId));const planned=(a.people||[]).map(String),actual=(Array.isArray(r.actualPeopleIds)?r.actualPeopleIds:planned).map(String);
 if(!actual.length||actual.length>80||new Set(actual).size!==actual.length)throw Error('Squadra effettiva non valida');
 if(actual.some(pid=>!(data.peopleRecords||[]).some(p=>String(p.id)===pid&&p.active!==false)))throw Error('Dipendente non presente in anagrafica attiva');
 if((planned.length!==actual.length||planned.some(pid=>!actual.includes(pid)))&&!String(r.crewChangeReason||'').trim())throw Error('Motivo variazione squadra obbligatorio');
 if((r.teamCompetences||[]).some(c=>!actual.includes(String(c.personId))))throw Error('Competenze riferite a personale non presente');});continue;}
 if(key==='competencies'){next[key]=mergeRows(data[key]||[],visible[key]||[],value,(r,old)=>{protectApproval(r,old);if(String(r.personId)===String(user.person_id))return;const contributions=Object.keys(r.diaryContributions||{}).filter(id=>!same(r.diaryContributions[id],old?.diaryContributions?.[id]));if(!contributions.length||contributions.some(id=>!(patch.activityDiary||data.activityDiary||[]).some(e=>String(e.id)===id&&own.has(String(e.activityId)))))throw Error('Competenze non assegnate');});continue;}
 if(key==='activities'){next[key]=mergeRows(data[key]||[],visible.activities||[],value,(r,old)=>{if(!old||!own.has(String(r.id)))throw Error('Attività non assegnata');const a={...r},b={...old};delete a.status;delete b.status;if(!same(a,b)||!['done','ready'].includes(r.status))throw Error('Solo esito rapportino modificabile');});continue;}
 throw Error('Registrazione riservata ai profili di gestione');
 }
 if(key==='competencies'&&!perms.includes('approve')){for(const r of value||[]){const old=(data.competencies||[]).find(o=>String(o.id)===String(r.id));for(const f of ['approvedAt','approvedBy'])if(!same(r[f],old?.[f]))throw Error('Approvazione riservata al responsabile');if(r.status==='approved'&&old?.status!=='approved')throw Error('Approvazione riservata al responsabile');}}

 if(key==='activities'){const ids=new Set((value||[]).map(r=>String(r.id)));const removed=new Set((data.activities||[]).filter(a=>!ids.has(String(a.id))).map(a=>String(a.id)));if((data.activityDiary||[]).some(r=>removed.has(String(r.activityId))))throw Error('Attività con rapportino protetta');}
 next[key]=value;
 }
 if(patch.activityDiary){
  const previousIds=new Map((data.activityDiary||[]).map(x=>[sid(x.id),x]));
  for(const r of next.activityDiary||[]){const old=previousIds.get(sid(r.id));
   if(!old){r.createdByUserId=user.user_id;r.createdBy=user.email||user.name;}
   else if(old.createdByUserId){r.createdByUserId=old.createdByUserId;r.createdBy=old.createdBy;}
   if(old&&same(old,r))continue;
   // Archivio A15/VRVT: le versioni precedenti provengono solo dal database e non dal client.
   const docs=Array.isArray(old?.materialDocSnapshots)?structuredClone(old.materialDocSnapshots):[];
   for(const kind of ['a15','vrvt']){
    const field=kind==='a15'?'materialsUsed':'materialsRemoved';
    const latest=docs.filter(d=>d.kind===kind).at(-1);
    const previousItems=Array.isArray(old?.[field])?old[field]:[];
    if(!latest&&previousItems.length){
     docs.push({kind,revision:1,at:old.updatedAt||old.createdAt||old.reportedAt||'',by:old.createdBy||old.reportedBy||'',items:structuredClone(previousItems),date:old.date,legacy:true});
    }
    const last=docs.filter(d=>d.kind===kind).at(-1);
    const items=Array.isArray(r[field])?r[field]:[];
    if(!items.length||last&&same(last.items,items))continue;
    const revision=(Number(last?.revision)||0)+1;
    docs.push({kind,revision,at:new Date().toISOString(),by:user.name||user.email||'',items:structuredClone(items),date:r.date});
   }
   r.materialDocSnapshots=docs;
  }
  const events=new Set();for(const entry of next.activityDiary||[]){const old=(data.activityDiary||[]).find(d=>String(d.id)===String(entry.id));if(same(old,entry))continue;const activity=next.activities.find(a=>String(a.id)===String(entry.activityId));if(!activity?.sourceCourseEventId)continue;const event=(next.trainingEvents||[]).find(e=>String(e.id)===String(activity.sourceCourseEventId));if(!event)throw Error('Corso non trovato');const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date()),error=Training.validateAttendance(entry,activity,event,today);if(error)throw Error(error);events.add(event.id);}for(const id of events){const event=next.trainingEvents.find(e=>e.id===id);Training.refreshCompletions(next,event,[...trainingCatalog,...(next.courseCatalogOverrides||[])],new Date().toISOString(),user.name||user.user_id);}}
 return next;}



const expectedOrigin=Deno.env.get('UMTE_ALLOWED_ORIGIN')||'';
const adminKey = (() => { try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; } catch { return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; } })();
const service=createClient(Deno.env.get('SUPABASE_URL')!,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':expectedOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=(r:any)=>{if(r.error)throw Error('DATABASE_ERROR');return r.data;};
Deno.serve(async request=>{
 try{
 if(!expectedOrigin||request.headers.get('Origin')!==expectedOrigin)return json({error:'Origine non consentita'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'Metodo non consentito'},405);
 const authorization=request.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return json({error:'Accesso richiesto'},401);
 const {data:identity,error}=await service.auth.getUser(authorization.slice(7));
 if(error||!identity.user)return json({error:'Sessione non valida'},401);
 const authenticated=identity.user,id=authenticated.id;
 let user=fail(await service.from('umte_manager_members').select('*').eq('user_id',id).maybeSingle());
 if(!user){const removed=fail(await service.from('umte_manager_removed_members').select('user_id').eq('user_id',id).maybeSingle());if(removed)return json({error:'Accesso a UMTE Manager rimosso dal responsabile. Richiedi un nuovo invito.'},403);fail(await service.from('umte_manager_members').upsert({user_id:id,email:authenticated.email||'',name:String(authenticated.user_metadata?.full_name||authenticated.email||''),role:'pending',enabled:false},{onConflict:'user_id',ignoreDuplicates:true}));user=fail(await service.from('umte_manager_members').select('*').eq('user_id',id).single());}
 if(!user.enabled)return json({error:'Accesso in attesa: il responsabile deve associare CID e profilo.',pending:true},403);
 const raw=await request.text();if(raw.length>14_000_000)return json({error:'Richiesta troppo grande'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Dati non validi'},400);}
 const row=fail(await service.from('umte_manager_state').select('*').eq('id',1).maybeSingle());
 if(body.action==='members'){
 if(user.role!=='owner')return json({error:'Riservato al responsabile'},403);
 if(body.remove){
  const targetId=String(body.remove.userId||'');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(targetId)||targetId===id)return json({error:'Utente non valido'},400);
  const target=fail(await service.from('umte_manager_members').select('user_id,role').eq('user_id',targetId).maybeSingle());
  if(!target||target.role==='owner')return json({error:'Account principale protetto o utente non trovato'},403);
  const revocation=await service.from('umte_manager_removed_members').upsert({user_id:targetId,removed_by:id,removed_at:new Date().toISOString()},{onConflict:'user_id'});
  if(revocation.error)return json({error:'Impossibile proteggere la rimozione dell’accesso'},503);
  const deleted=await service.from('umte_manager_members').delete().eq('user_id',targetId).neq('role','owner').select('user_id');
  if(deleted.error||!deleted.data?.length)return json({error:'Rimozione non completata: verifica con il responsabile'},503);
  return json({ok:true,removed:true,notice:'Accesso rimosso soltanto da UMTE Manager. Identità Supabase conservata.'});
 }
 if(!body.update)return json({members:fail(await service.from('umte_manager_members').select('*'))});
 const u=body.update,roles=['specialist','administrative','chief','preposto','viewer','pending'];
 if(u.userId===id||!roles.includes(u.role)||u.enabled&&u.role==='pending')return json({error:'Profilo non valido'},400);
 if(u.enabled&&!row?.data.peopleRecords?.some((p:any)=>String(p.id)===String(u.personId)&&p.active!==false))return json({error:'Associa un CID attivo'},400);
 fail(await service.from('umte_manager_members').update({role:u.role,person_id:u.personId||null,enabled:!!u.enabled}).eq('user_id',u.userId).neq('role','owner'));return json({ok:true});
 }
 if(body.action==='initialize'){
 if(user.role!=='owner')return json({error:'Importazione riservata al responsabile'},403);
 if(row)return json({error:'Archivio già inizializzato'},409);
 if(!Array.isArray(body.data?.peopleRecords)||!Array.isArray(body.baseline?.shifts))return json({error:'Servono archivio esportato e baseline privata'},400);
 const saved=await service.from('umte_manager_state').insert({id:1,revision:1,data:body.data,baseline:body.baseline,updated_by:id});
 if(saved.error)return json({error:'Importazione non riuscita o archivio già inizializzato'},409);
 return json({ok:true});
 }
 if(!row)return json({error:'Archivio da importare',initialize:user.role==='owner'},503);

 if(body.action==='energyMaintenance'){
  if(!['owner','specialist'].includes(user.role))return json({error:'Mantenimenti Energia riservati a responsabile e specialisti'},403);
  if(!row)return json({error:'Archivio non inizializzato'},503);
  if(body.revision!==row.revision)return json({error:'Archivio modificato: ricarica prima di registrare il mantenimento'},409);
  const codes=(body.personIds||[]).map(String),peopleIds=[...new Set(codes)],date=String(body.date||''),expiry=String(body.expiry||''),reference=String(body.reference||'').trim(),note=String(body.notes||'').trim();
  const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
  if(!peopleIds.length||peopleIds.length>80||codes.length!==peopleIds.length||!isDate(date)||date>today||!isDate(expiry)||expiry<date||reference.length<3||reference.length>300||note.length>500)return json({error:'Verifica partecipanti, data effettiva, nuova scadenza e riferimento del verbale'},400);
  const next=structuredClone(row.data),changes=[];
  for(const id of peopleIds){
   const p=(next.peopleRecords||[]).find(x=>sid(x.id)===id&&x.active!==false);
   if(!p)return json({error:'Partecipante inesistente o non attivo'},400);
   const sector=(p.validities||[]).filter(v=>/^MI\.EN\./i.test(String(v.code||'').trim()));
   if(!sector.length)return json({error:'Uno dei partecipanti non possiede abilitazioni Energia da aggiornare'},400);
   for(const v of sector){
    if(v.maintenanceTrainingDate&&v.maintenanceTrainingDate>date)return json({error:'Esiste un mantenimento più recente per una delle abilitazioni selezionate'},409);
    v.maintenanceTrainingDate=date;v.maintenanceExpiry=expiry;v.maintenanceOutcome='OK';v.maintenanceDocument=reference;v.maintenanceUpdatedById=user.user_id;
    changes.push({personId:id,code:v.code});
   }
  }
  const entry={id:'EM-'+crypto.randomUUID(),date,expiry,reference,notes:note,personIds:peopleIds,qualificationCount:changes.length,createdByUserId:id,createdAt:new Date().toISOString()};
  (next.energyMaintenanceHistory ||= []).push(entry);
  (next.auditLog ||= []).push({id:'AUD-'+crypto.randomUUID(),at:entry.createdAt,by:user.email||user.name,entity:'Mantenimento Energia',action:'Convalida per partecipanti',detail:entry.id+' · '+peopleIds.length+' persone · '+changes.length+' abilitazioni MI.EN'});
  const write=await service.rpc('umte_manager_save',{p_revision:row.revision,p_data:next,p_user:id,p_keys:['energyMaintenanceHistory','peopleRecords','auditLog']});
  if(write.error)return json({error:'Conflitto di salvataggio. Nessun mantenimento registrato.'},409);
  return json({ok:true,revision:write.data,session:entry,changed:changes.length});
 }
 if(body.action==='state'){
 const baseline=visibleBaseline(row.baseline,row.data,user),data=visibleState(row.data,user);
 return json({revision:row.revision,data,baseline,capabilities:{energyMaintenance:true,teamScoped:true,reportAuthorEdit:true},user:{id:user.user_id,name:user.name,role:user.role,personId:user.person_id,provider:'supabase',permissions:permissions[user.role]||[]}});
 }
 if(body.action==='save'){
 if(body.revision!==row.revision)return json({error:'Archivio modificato da un altro utente. Scarica le modifiche e ricarica.'},409);
 let next;try{next=applyPatch(row.data,body.patch||{},user);}catch(e){return json({error:(e as Error).message},403);}
 const result=await service.rpc('umte_manager_save',{p_revision:body.revision,p_data:next,p_user:id,p_keys:Object.keys(body.patch||{})});
 if(result.error)return json({error:'Salvataggio non effettuato. Scarica le modifiche e ricarica.'},409);
 return json({revision:result.data});
 }
 return json({error:'Operazione non valida'},400);
 }catch{return json({error:'Servizio temporaneamente non disponibile'},503);}
});
// UMTE_MANAGER_API_FINE_FILE_COMPLETO
