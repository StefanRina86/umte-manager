/* UX-only role-specific help, never grants access or modifies operational records. */
(function(){
'use strict';
function init(){
 if(document.getElementById('umteGuideLaunch'))return;
 const shared=window.UMTE_SHARED||{},role=shared.user?.role||'viewer';
 const label={owner:'Responsabile UM',specialist:'Specialista',administrative:'Amministrativo',chief:'Capo Tecnico',preposto:'Operatore / Preposto',viewer:'Consultazione'}[role]||'Utente';
 const common=['Apri la sezione desiderata dal menu. Su smartphone trovi la navigazione nella parte inferiore.','Seleziona nucleo, squadra e periodo prima di consultare o inserire i dati.','Controlla sempre il messaggio di salvataggio: “Salvato nell’archivio condiviso” conferma la registrazione.'];
 const roles={
 owner:['Controlla le richieste e approva le variazioni soltanto dopo aver verificato gli effetti sui turni.','Per abilitare i colleghi, usa Gestisci accessi: associa sempre il CID corretto prima di attivare il profilo.','Verifica le anomalie di riposo, le scadenze e le abilitazioni prima della pubblicazione.'],
 specialist:['Prepara le attività e pubblica il programma verificando squadra e condizioni operative.','Valida richieste e rapportini solo dopo aver controllato i dati.','Per modifiche ai turni verifica prima i riposi minimi e le reperibilità.'],
 administrative:['Gestisci gli inserimenti autorizzati e controlla la correttezza dei riferimenti.','Verifica lo stato di attività e rapportini senza modificare le approvazioni riservate ai responsabili.'],
 chief:['Controlla il programma e i turni della tua squadra.','Compila il rapportino dell’attività assegnata, verifica la data e salva.','Se un dato non è di tua competenza, chiedi allo specialista o al responsabile.'],
 preposto:['Consulta le attività assegnate alla tua squadra.','Compila il rapportino dove previsto, controllando giornata, orari e personale.','Non condividere la password e non inserire dati per attività non assegnate.'],
 viewer:['Consulta i turni e le attività disponibili per il tuo profilo.','Se devi segnalare una correzione, contatta il Capo Tecnico o il responsabile.']
 };
 const open=document.createElement('button');open.type='button';open.className='umte-guide-launch';open.id='umteGuideLaunch';open.textContent='?  Guida rapida';open.setAttribute('aria-controls','umteGuidePanel');open.setAttribute('aria-expanded','false');
 const box=document.createElement('aside');box.className='umte-guide-panel';box.id='umteGuidePanel';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Guida rapida del gestionale');
 const head=document.createElement('div');head.className='umte-guide-top';const h=document.createElement('h2');h.textContent='Come usare UMTE Manager';const close=document.createElement('button');close.type='button';close.className='umte-guide-close';close.textContent='×';close.setAttribute('aria-label','Chiudi la guida');head.append(h,close);box.append(head);
 const intro=document.createElement('p');intro.textContent='Profilo: '+label+'. Ti mostriamo soltanto le operazioni previste dal tuo ruolo.';box.append(intro);
 for(const [title,items] of [['Le prime 3 cose da sapere',common],['Cosa puoi fare',roles[role]||roles.viewer]]){
  const h3=document.createElement('h3');h3.textContent=title;box.append(h3);
  const ol=document.createElement('ol');for(const line of items){const li=document.createElement('li');li.textContent=line;ol.append(li);}box.append(ol);
 }
 const warning=document.createElement('p');warning.className='umte-guide-hint';warning.textContent='Se leggi “Conflitto di salvataggio” non sovrascrivere i colleghi: esporta la copia proposta, aggiorna la pagina e contatta il responsabile.';box.append(warning);
 const show=(v)=>{box.hidden=!v;open.setAttribute('aria-expanded',String(v));if(v)close.focus();else open.focus();};
 open.onclick=()=>show(box.hidden);close.onclick=()=>show(false);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.hidden)show(false);});
 document.body.append(open,box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
