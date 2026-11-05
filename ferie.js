/* Piano ferie nello stesso archivio dei turni. Nessun collegamento alla posta. */
(() => {
  'use strict';
  const api=window.UMTELeave,R=window.UMTELeaveRules,$=id=>document.getElementById(id);
  if(!api||!R)return;
  const s=api.state,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
  const uid=()=>crypto.randomUUID?.()||'FER-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-'),user=()=>api.user()?.name||'',manager=()=>api.can('approve'),writer=()=>api.can('variation')||api.can('diaryEdit');
  const status={draft:'Bozza',submitted:'Da verificare',changes:'Da correggere',approved:'Confermata',rejected:'Non accolta',cancelled:'Annullata'};
  const campaigns=()=>s.leaveCampaigns||[];
  if(s.leaveCampaigns===null){s.leaveCampaigns=[
    {id:'estate-2026',name:'Estate 2026',type:'summer',from:'2026-06-01',to:'2026-09-30',deadline:'2026-03-15',confirmBy:'2026-05-08',source:'Mail ferie estive 2026: metà marzo; conferma dell’8 maggio. Il giorno 15 traduce operativamente “metà marzo”.'},
    {id:'natale-2026',name:'Natale 2026 / 2027',type:'christmas',from:'2026-12-21',to:'2027-01-10',deadline:'2026-09-30',confirmBy:'',source:'Mail 14–15 settembre 2026: richieste ai CT entro 30 settembre; autorizzazione dopo verifica complessiva.'}
  ];}
  const style=document.createElement('style');style.textContent=`
    .leave-panel{margin:0 0 20px;border:1px solid var(--line,#cbd8df);border-radius:12px;background:#fff;padding:16px}.leave-panel>summary{font-weight:800;color:#16485b;cursor:pointer;font-size:1rem}.leave-help{font-size:.82rem;color:#526876;line-height:1.5;margin:12px 0}.leave-tools{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:16px 0}.leave-tools label{display:grid;gap:5px;font-size:.8rem;font-weight:700}.leave-tools select{padding:8px;border:1px solid #cbd8df;border-radius:7px;max-width:100%}.leave-dialog{width:min(1000px,96vw);max-height:92dvh;padding:24px;border:0;border-radius:14px;overflow:auto}.leave-dialog::backdrop{background:#062538aa}.leave-dialog label{display:grid;gap:5px;font-size:.82rem;font-weight:700}.leave-dialog input,.leave-dialog select,.leave-dialog textarea{width:100%;min-width:0;padding:9px;border:1px solid #b9ccd5;border-radius:7px;background:#fff;color:#143343;font:inherit}.leave-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}.leave-wide{grid-column:1/-1}.leave-check{display:flex!important;align-items:start;gap:8px!important;margin:12px 0}.leave-check input{width:auto;margin:2px 0}.leave-errors{padding:12px;background:#fff0ef;color:#842922;border-radius:8px}.leave-warnings{padding:12px;background:#fff7de;color:#70541b;border-radius:8px}.leave-panel td,.leave-dialog td{vertical-align:top}.leave-dialog .modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.leave-dialog [hidden]{display:none!important}.leave-status{display:inline-block;padding:4px 8px;border-radius:20px;background:#edf3f6;font-size:.75rem;font-weight:700}.leave-status.approved{background:#e0f5e9;color:#136638}.leave-status.submitted{background:#fff1cc;color:#70541b}.leave-day-badge{display:block;font-size:.64rem;color:#806019;font-weight:700}.leave-rules{margin:14px 0;background:#f4f8fa;padding:12px;border-radius:8px;font-size:.82rem;line-height:1.55}.leave-rules li{margin:5px 0}
    @media(max-width:650px){.leave-grid{grid-template-columns:1fr}.leave-dialog{padding:16px}.leave-tools{align-items:stretch}.leave-tools label{width:100%}}
  `;document.head.append(style);
  const panel=document.createElement('details');panel.id='leavePanel';panel.className='leave-panel';
  panel.innerHTML=`<summary>Ferie · richieste e conferme</summary>
    <p class="leave-help">Il dipendente comunica la richiesta; il CT può registrarla per il nucleo. La richiesta non cambia il turno. Responsabile e specialisti verificano e confermano: solo allora vengono applicate le C e gli eventuali cambi concordati di reperibilità.</p>
    <div class="leave-tools"><label>Campagna ferie<select id="leaveCampaignFilter"></select></label><label>Stato richiesta<select id="leaveStatusFilter"><option value="">Tutti</option>${Object.entries(status).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><button id="leaveNew" class="button primary" type="button">Nuova richiesta ferie</button><button id="leaveCampaignNew" class="button secondary" type="button">Nuova campagna</button><button id="leaveCampaignEdit" class="button secondary" type="button">Scadenze campagna</button></div>
    <div id="leaveCampaignInfo" class="leave-help"></div>
    <details class="leave-rules"><summary>Regole ferie e tempi concordati</summary><ul>
    <li>Squadra da 2 o 3: massimo 1 in ferie; squadra da 4: massimo 2. Restano da garantire le presenze anche in caso di altre assenze.</li>
    <li>RISE/RGLS e altri riposi restano tali: nessuna C. Il turno teorico non viene modificato.</li>
    <li>Reperibilità P/MIR/M1: evitare sovrapposizioni; quando necessarie, cambio 1 a 1 già concordato, stesse abilitazioni e copertura della squadra di provenienza. Il sostituto può essere in RISE/RGLS.</li>
    <li>Estate 2026: richieste entro metà marzo, almeno 15 giorni continuativi fra 15 giugno e 15 settembre, riposi compresi; distribuzione giugno–settembre, Ferragosto incluso. La conferma dell’8 maggio consenteva l’inserimento a sistema già da quella data.</li>
    <li>Natale 21/12/2026–10/01/2027: richieste comunicate al CT e registrate entro 30/09/2026, poi verifica complessiva e autorizzazione. Nessun termine fisso di conferma indicato nelle mail.</li>
    <li>Residui dell’anno precedente: recupero entro il 30 settembre dell’anno successivo; festività soppresse entro l’anno. La verifica dei saldi resta a cura di chi gestisce le presenze.</li>
    <li>Le scadenze sono impostabili per campagna. Il 15 marzo traduce “metà marzo”; le date delle campagne future vanno verificate. Richieste tardive e variazioni successive richiedono una motivazione e una nuova verifica.</li>
    </ul></details>
    <div class="table-scroll"><table><thead><tr><th>Persona / nucleo</th><th>Periodo</th><th>Ricezione / scadenza</th><th>Stato</th><th>Ultima operazione</th><th>Azioni</th></tr></thead><tbody id="leaveBody"></tbody></table></div>`;
  $('shifts').querySelector('.page-heading').after(panel);
  const dialog=document.createElement('dialog');dialog.id='leaveDialog';dialog.className='leave-dialog';dialog.setAttribute('aria-labelledby','leaveTitle');
  dialog.innerHTML=`<form id="leaveForm"><div class="modal-head"><div><span class="eyebrow">Pianificazione ferie</span><h2 id="leaveTitle">Nuova richiesta ferie</h2></div><button type="button" class="icon-button" id="leaveClose" aria-label="Chiudi richiesta ferie">×</button></div><input id="leaveId" type="hidden">
    <div class="leave-grid"><label>Campagna<select id="leaveCampaign" required></select></label><label>Dipendente<select id="leavePerson" required></select></label><label>Richiesta ricevuta il<input id="leaveReceived" type="date" required></label><label>Dal<input id="leaveFrom" type="date" required></label><label>Al<input id="leaveTo" type="date" required></label><label>Canale di ricezione<select id="leaveChannel"><option>Comunicata al CT</option><option>Inserimento diretto</option><option>Mail caricata / comunicazione scritta</option><option>Variazione di un piano precedente</option></select></label><label class="leave-wide">Note / motivo della richiesta o della variazione<textarea id="leaveNotes" rows="2"></textarea></label><label class="leave-wide">Motivo fuori termine (solo se necessario)<textarea id="leaveException" rows="2"></textarea></label></div>
    <label class="leave-check"><input id="leaveSummer" type="checkbox">Questo è il periodo estivo continuativo di almeno 15 giorni (riposi compresi).</label>
    <p class="leave-help">Il prospetto propone C solo sulle giornate lavorative. I riposi vengono saltati. I dati mancanti possono essere salvati in bozza; per inviare e confermare occorre risolvere i controlli.</p>
    <button id="leaveCheck" type="button" class="button secondary">Verifica giornate e sostituti</button><div id="leavePreview"></div>
    <label class="leave-check"><input id="leaveAgreed" type="checkbox">I cambi di reperibilità indicati sono già concordati tra gli interessati.</label>
    <label class="leave-check"><input id="leaveCoverage" type="checkbox">Ho verificato la copertura, anche nella squadra di provenienza di ogni sostituto e nei casi senza limite automatico definito.</label>
    <div id="leaveMessages" aria-live="polite"></div><div id="leaveHistory" class="leave-help"></div>
    <div id="leaveDecisionArea"><label>Nota di verifica / motivazione del provvedimento<textarea id="leaveDecision" rows="2"></textarea></label></div>
    <div class="modal-actions"><button id="leaveDraft" type="button" class="button secondary">Salva bozza</button><button id="leaveSubmit" type="submit" class="button primary">Invia alla verifica</button><button id="leaveApprove" type="button" class="button primary">Conferma ferie e applica C</button><button id="leaveChanges" type="button" class="button secondary">Richiedi correzione</button><button id="leaveReject" type="button" class="button secondary">Non accogliere</button><button id="leaveCancel" type="button" class="button secondary">Annulla richiesta</button><button id="leaveRevoke" type="button" class="button secondary">Revoca conferma e ripristina turni</button></div></form>`;
  document.body.append(dialog);
  const cd=document.createElement('dialog');cd.id='leaveCampaignDialog';cd.className='leave-dialog';cd.setAttribute('aria-labelledby','leaveCampaignTitle');
  cd.innerHTML=`<form id="leaveCampaignForm"><div class="modal-head"><h2 id="leaveCampaignTitle">Campagna ferie e scadenze</h2><button id="leaveCampaignClose" class="icon-button" type="button" aria-label="Chiudi campagna ferie">×</button></div><input id="lcId" type="hidden"><div class="leave-grid"><label>Nome campagna<input id="lcName" required></label><label>Tipo<select id="lcType"><option value="ordinary">Ordinaria</option><option value="summer">Estiva</option><option value="christmas">Natalizia</option></select></label><label>Anno di riferimento<input id="lcYear" type="number" min="2026" max="2100"></label><label>Periodo dal<input id="lcFrom" type="date" required></label><label>Al<input id="lcTo" type="date" required></label><label>Termine richieste<input id="lcDeadline" type="date"></label><label>Conferme entro (se stabilito)<input id="lcConfirm" type="date"></label><label class="leave-wide">Riferimento / indicazioni<textarea id="lcSource" rows="3"></textarea></label></div><p class="leave-help">Per le campagne ordinarie non è stato trovato un preavviso generale concordato: imposta qui il termine se previsto. Nessuna ferie viene confermata automaticamente alla scadenza. Modificare una campagna con richieste già presenti non modifica i turni.</p><button class="button primary" type="submit">Salva campagna</button></form>`;
  document.body.append(cd);
  let currentId='',draftReplacements={};
  const val=id=>$(id).value.trim(),personName=id=>api.people().find(p=>String(p.id)===String(id))?.displayName||String(id);
  function context(r){return{people:api.people(),campaign:campaigns().find(c=>c.id===r.campaignId),requests:s.leaveRequests,today:today(),record:api.record,evaluate:api.evaluate};}
  function model(){return{id:currentId,campaignId:val('leaveCampaign'),personId:val('leavePerson'),requestedOn:val('leaveReceived'),from:val('leaveFrom'),to:val('leaveTo'),channel:val('leaveChannel'),notes:val('leaveNotes'),exceptionReason:val('leaveException'),mainSummer:$('leaveSummer').checked,swapAgreed:$('leaveAgreed').checked,coverageVerified:$('leaveCoverage').checked,replacements:{...draftReplacements}};}
  function campaignOptions(selected){return campaigns().map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('');}
  function render(){
    const filter=$('leaveCampaignFilter'),previous=filter.value;filter.innerHTML='<option value="">Tutte le campagne</option>'+campaignOptions(previous);filter.value=previous;
    const c=campaigns().find(x=>x.id===filter.value),list=s.leaveRequests.filter(r=>(!filter.value||r.campaignId===filter.value)&&(!val('leaveStatusFilter')||r.status===val('leaveStatusFilter'))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    $('leaveNew').hidden=!writer();$('leaveCampaignNew').hidden=!manager();$('leaveCampaignEdit').hidden=!manager()||!c;
    $('leaveCampaignInfo').textContent=c?`${c.name}: ${c.from} → ${c.to} · richieste entro ${c.deadline||'termine da definire'} · conferma ${c.confirmBy?'entro '+c.confirmBy:'dopo verifica complessiva, senza data fissa'}. ${c.source||''}`:'Seleziona una campagna per vedere periodo e scadenze. Le richieste in attesa sono distinte dalle ferie già confermate.';
    $('leaveBody').innerHTML=list.map(r=>`<tr><td><strong>${esc(personName(r.personId))}</strong><small class="cell-meta">${esc(api.people().find(p=>String(p.id)===String(r.personId))?.nucleus||'')} · CID ${esc(r.personId)}</small></td><td>${esc(r.from)} → ${esc(r.to)}<small class="cell-meta">${esc(campaigns().find(c=>c.id===r.campaignId)?.name||'Campagna non disponibile')}</small></td><td>${esc(r.requestedOn)}<small class="cell-meta">Termine ${esc(campaigns().find(c=>c.id===r.campaignId)?.deadline||'non fissato')}</small></td><td><span class="leave-status ${esc(r.status)}">${esc(status[r.status]||r.status)}</span>${r.status==='approved'?`<small class="cell-meta">${r.appliedDays?.length||0} giornate C</small>`:''}</td><td>${esc(r.updatedBy)}<small class="cell-meta">${esc(new Date(r.updatedAt).toLocaleString('it-IT'))}</small></td><td><button class="button secondary compact" data-open-leave="${esc(r.id)}">${writer()||manager()?'Apri / gestisci':'Dettagli'}</button></td></tr>`).join('')||'<tr><td colspan="6">Nessuna richiesta ferie per i filtri selezionati.</td></tr>';
  }
  function messages(result){$('leaveMessages').innerHTML=(result.errors.length?`<div class="leave-errors"><strong>Da risolvere prima dell’invio/conferma</strong><ul>${result.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:'<p class="leave-help">Controlli automatici superati. Resta necessaria la verifica complessiva prima della conferma.</p>')+(result.warnings.length?`<div class="leave-warnings"><strong>Da valutare</strong><ul>${result.warnings.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:'');}
  function check(){
    const r=model(),result=R.inspect(r,context(r)),existing=s.leaveRequests.find(x=>x.id===currentId),locked=['approved','cancelled','rejected'].includes(existing?.status)||!writer();
    $('leaveSummer').closest('label').hidden=context(r).campaign?.type!=='summer';
    $('leaveAgreed').closest('label').hidden=!result.rows.some(row=>row.apply&&row.standby);
    $('leavePreview').innerHTML=`<div class="table-scroll"><table><thead><tr><th>Giorno</th><th>Teorico</th><th>Effettivo</th><th>Proposta</th><th>Sostituto reperibilità</th></tr></thead><tbody>${result.rows.map(row=>`<tr><td>${esc(row.date)}</td><td>${esc(row.planned||'—')}</td><td>${esc(row.effective||'—')}</td><td>${row.skipped?'Riposo invariato':row.apply?'C':'Da verificare'}</td><td>${row.apply&&row.standby?`<select data-leave-replacement="${row.date}" aria-label="Sostituto del ${row.date}" ${locked?'disabled':''}><option value="">Scegli sostituto</option>${api.people().filter(p=>String(p.id)!==String(r.personId)).map(p=>`<option value="${esc(p.id)}" ${String(row.replacement)===String(p.id)?'selected':''}>${esc(p.displayName)} · ${esc(p.nucleus)}${R.compatible(api.people().find(x=>String(x.id)===String(r.personId))||{},p,row.date)?' · abilitazioni coerenti':''}</option>`).join('')}</select>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;messages(result);return result;
  }
  function open(id=''){
    const r=s.leaveRequests.find(r=>r.id===id);currentId=r?.id||'';draftReplacements={...(r?.replacements||{})};$('leaveForm').reset();
    $('leaveCampaign').innerHTML=campaignOptions(r?.campaignId||val('leaveCampaignFilter')||'natale-2026');
    $('leavePerson').innerHTML=api.people().slice().sort((a,b)=>a.displayName.localeCompare(b.displayName)).map(p=>`<option value="${esc(p.id)}">${esc(p.displayName)} · ${esc(p.nucleus)} · ${esc(p.id)}</option>`).join('');
    for(const [id,key] of Object.entries({leavePerson:'personId',leaveReceived:'requestedOn',leaveFrom:'from',leaveTo:'to',leaveChannel:'channel',leaveNotes:'notes',leaveException:'exceptionReason'}))if(r?.[key])$(id).value=r[key];
    if(!r)$('leaveReceived').value=today();$('leaveReceived').max=today();
    $('leaveSummer').checked=Boolean(r?.mainSummer);$('leaveAgreed').checked=Boolean(r?.swapAgreed);$('leaveCoverage').checked=Boolean(r?.coverageVerified);
    $('leaveTitle').textContent=r?`Richiesta ferie · ${status[r.status]}`:'Nuova richiesta ferie';
    const immutable=r&&['approved','cancelled','rejected'].includes(r.status),edit=writer()&&!immutable;
    $('leaveForm').querySelectorAll('input,select,textarea').forEach(el=>el.disabled=!edit);
    $('leaveDecision').disabled=!manager();$('leaveDecisionArea').hidden=!manager()||!r;
    $('leaveDraft').hidden=!edit;$('leaveSubmit').hidden=!edit;$('leaveApprove').hidden=!(manager()&&r?.status==='submitted');
    ['leaveChanges','leaveReject'].forEach(id=>$(id).hidden=!(manager()&&r?.status==='submitted'));
    $('leaveCancel').hidden=!(writer()&&r&&['draft','submitted','changes'].includes(r.status));$('leaveRevoke').hidden=!(manager()&&r?.status==='approved');
    $('leaveHistory').innerHTML=(r?.history||[]).map(h=>`<div>${esc(new Date(h.at).toLocaleString('it-IT'))} · ${esc(h.by)} · ${esc(h.action)}${h.note?' — '+esc(h.note):''}</div>`).join('');
    if(r?.status==='approved'){
      $('leavePreview').innerHTML=`<p class="leave-help">Confermata da ${esc(r.approvedBy)} il ${esc(new Date(r.approvedAt).toLocaleString('it-IT'))}. C applicata in ${r.appliedDays?.length||0} giornate; ${r.generated?.filter(x=>x.kind==='replacement').length||0} cambi di reperibilità.</p>`;$('leaveMessages').innerHTML='';
    }else check();$('leaveCheck').hidden=Boolean(immutable);dialog.showModal();
  }
  function stamp(r,action,note=''){const now=new Date().toISOString();r.updatedAt=now;r.updatedBy=user();r.history=[...(r.history||[]),{at:now,by:user(),action,note}];api.audit('Ferie',action,`${personName(r.personId)} · ${r.from}/${r.to}${note?' · '+note:''}`);}
  function save(submit){
    if(!writer())return;const old=s.leaveRequests.find(x=>x.id===currentId);if(old&&['approved','cancelled','rejected'].includes(old.status))return;
    if(!$('leaveForm').reportValidity())return;const r=model(),result=check();if(submit&&result.errors.length){api.toast('Risolvi i controlli prima di inviare');return;}
    const now=new Date().toISOString(),record={...old,...r,id:r.id||uid(),status:submit?'submitted':'draft',createdAt:old?.createdAt||now,createdBy:old?.createdBy||user()};
    stamp(record,submit?'Richiesta inviata alla verifica':'Bozza salvata');s.leaveRequests=s.leaveRequests.filter(x=>x.id!==record.id);s.leaveRequests.push(record);api.persist();dialog.close();api.renderAll();render();api.toast(submit?'Richiesta da verificare: turni invariati':'Bozza salvata: turni invariati');
  }
  function approve(){
    if(!manager())return;const r=s.leaveRequests.find(x=>x.id===currentId);if(r?.status!=='submitted')return;
    // Le modifiche del modulo devono essere inviate nuovamente prima della conferma.
    if(JSON.stringify(model())!==JSON.stringify({id:r.id,campaignId:r.campaignId,personId:r.personId,requestedOn:r.requestedOn,from:r.from,to:r.to,channel:r.channel,notes:r.notes,exceptionReason:r.exceptionReason,mainSummer:r.mainSummer,swapAgreed:r.swapAgreed,coverageVerified:r.coverageVerified,replacements:r.replacements})){api.toast('Salva e invia le modifiche prima della conferma');return;}
    const result=R.inspect(r,context(r));messages(result);if(result.errors.length){api.toast('Conferma bloccata: risolvi le incongruenze');return;}
    const rows=result.rows.filter(x=>x.apply),note=val('leaveDecision');
    if(!confirm(`Confermare le ferie di ${personName(r.personId)}?\n\n${rows.length} giornate C; riposi e teorico invariati.\n${rows.filter(x=>x.standby).map(x=>x.date+': '+personName(x.replacement)+' → '+x.planned).join('\n')}\n${result.warnings.join('\n')}\n\nVerranno applicate solo queste variazioni.`))return;
    r.generated=[];r.replacedVariations=[];
    function apply(personId,date,shift,kind){
      const previous=s.variations.find(v=>String(v.personId)===String(personId)&&v.date===date);if(previous)r.replacedVariations.push(JSON.parse(JSON.stringify(previous)));
      s.variations=s.variations.filter(v=>!(String(v.personId)===String(personId)&&v.date===date));
      const variation={personId,personName:personName(personId),date,shift,reason:`Ferie confermate · ${campaigns().find(c=>c.id===r.campaignId)?.name||''}${kind==='replacement'?' · sostituzione di '+personName(r.personId):''}`,level:'green',detail:'Piano ferie verificato e confermato',sourceLeaveId:r.id,createdAt:new Date().toISOString(),createdBy:user()};s.variations.push(variation);r.generated.push({personId,date,kind,variation:JSON.parse(JSON.stringify(variation))});
    }
    for(const row of rows){apply(r.personId,row.date,'C','leave');if(row.standby)apply(row.replacement,row.date,row.planned,'replacement');}
    r.status='approved';r.approvedAt=new Date().toISOString();r.approvedBy=user();r.appliedDays=rows.map(x=>x.date);stamp(r,'Ferie confermate',note);api.persist();dialog.close();api.renderAll();render();api.toast('Ferie confermate e turni aggiornati');
  }
  function decision(type){
    const r=s.leaveRequests.find(x=>x.id===currentId);if(!r)return;
    if(type==='cancelled'){if(!writer()||!['draft','submitted','changes'].includes(r.status))return;}else if(!manager()||r.status!=='submitted')return;
    const note=val('leaveDecision');if(type!=='cancelled'&&!note){api.toast('Indica la motivazione della verifica');return;}
    if(!confirm(`${status[type]}: ${personName(r.personId)} · ${r.from} → ${r.to}?`))return;r.status=type;stamp(r,status[type],note);api.persist();dialog.close();api.renderAll();render();
  }
  function revoke(){
    const r=s.leaveRequests.find(x=>x.id===currentId);if(!manager()||r?.status!=='approved')return;const note=val('leaveDecision');if(!note){api.toast('Indica il motivo della revoca');return;}
    if((r.generated||[]).some(g=>JSON.stringify(s.variations.find(v=>String(v.personId)===String(g.personId)&&v.date===g.date))!==JSON.stringify(g.variation))){api.toast('Turni modificati dopo la conferma: risolvere le variazioni prima della revoca');return;}
    if(!confirm(`Revocare la conferma di ${personName(r.personId)} e ripristinare esattamente i turni precedenti?\nLa richiesta rimane nello storico.`))return;
    for(const g of r.generated||[]){s.variations=s.variations.filter(v=>!(String(v.personId)===String(g.personId)&&v.date===g.date));const before=r.replacedVariations?.find(v=>String(v.personId)===String(g.personId)&&v.date===g.date);if(before&&!before.supersededByPresenceImport)s.variations.push(before);}
    r.status='cancelled';stamp(r,'Conferma revocata e turni ripristinati',note);api.persist();dialog.close();api.renderAll();render();
  }
  function openCampaign(edit){
    if(!manager())return;const c=edit?campaigns().find(x=>x.id===val('leaveCampaignFilter')):null;$('leaveCampaignForm').reset();
    for(const [id,key] of Object.entries({lcId:'id',lcName:'name',lcType:'type',lcFrom:'from',lcTo:'to',lcDeadline:'deadline',lcConfirm:'confirmBy',lcSource:'source'}))$(id).value=c?.[key]||'';
    $('lcType').value=c?.type||'ordinary';$('lcYear').value=c?.from.slice(0,4)||String(new Date().getFullYear()+1);cd.showModal();
  }
  function campaignDefaults(){if(val('lcId'))return;const y=Number(val('lcYear'));if(y<2026||y>2100)return;const t=val('lcType');if(t==='summer'){$('lcName').value='Estate '+y;$('lcFrom').value=y+'-06-01';$('lcTo').value=y+'-09-30';$('lcDeadline').value=y+'-03-15';$('lcConfirm').value='';$('lcSource').value='Proposta basata sulla pianificazione estiva: richieste entro metà marzo (15 marzo impostabile). Conferma da stabilire per la campagna.';}else if(t==='christmas'){$('lcName').value=`Natale ${y} / ${y+1}`;$('lcFrom').value=y+'-12-21';$('lcTo').value=(y+1)+'-01-10';$('lcDeadline').value=y+'-09-30';$('lcConfirm').value='';$('lcSource').value='Proposta basata sul piano natalizio precedente: verificare periodo e scadenze per il nuovo anno.';}else{$('lcName').value='Ferie ordinarie '+y;$('lcFrom').value=y+'-01-01';$('lcTo').value=y+'-12-31';$('lcDeadline').value='';$('lcConfirm').value='';$('lcSource').value='Scadenze da impostare se previste dalle disposizioni della UM.';}}
  $('leaveCampaignForm').addEventListener('submit',e=>{e.preventDefault();if(!manager())return;const c={id:val('lcId')||uid(),name:val('lcName'),type:val('lcType'),from:val('lcFrom'),to:val('lcTo'),deadline:val('lcDeadline'),confirmBy:val('lcConfirm'),source:val('lcSource')};if(!R.days(c.from,c.to).length){api.toast('Verifica il periodo della campagna');return;}if(c.confirmBy&&c.deadline&&c.confirmBy<c.deadline){api.toast('Il termine di conferma non può precedere quello delle richieste');return;}if(s.leaveRequests.some(r=>r.campaignId===c.id&&(r.from<c.from||r.to>c.to))){api.toast('Il nuovo periodo esclude richieste già presenti');return;}c.updatedAt=new Date().toISOString();c.updatedBy=user();s.leaveCampaigns=campaigns().filter(x=>x.id!==c.id);s.leaveCampaigns.push(c);api.audit('Ferie','Campagna aggiornata',c.name);api.persist();cd.close();render();$('leaveCampaignFilter').value=c.id;render();});
  $('leaveCampaignFilter').addEventListener('change',render);$('leaveStatusFilter').addEventListener('change',render);
  $('leaveNew').addEventListener('click',()=>{if(writer())open();});$('leaveBody').addEventListener('click',e=>{const b=e.target.closest('[data-open-leave]');if(b)open(b.dataset.openLeave);});
  $('leaveClose').addEventListener('click',()=>dialog.close());$('leaveCampaignClose').addEventListener('click',()=>cd.close());
  $('leaveCampaignNew').addEventListener('click',()=>openCampaign(false));$('leaveCampaignEdit').addEventListener('click',()=>openCampaign(true));['lcType','lcYear'].forEach(id=>$(id).addEventListener('change',campaignDefaults));
  $('leaveDraft').addEventListener('click',()=>save(false));$('leaveForm').addEventListener('submit',e=>{e.preventDefault();save(true);});$('leaveCheck').addEventListener('click',check);$('leaveApprove').addEventListener('click',approve);
  $('leaveChanges').addEventListener('click',()=>decision('changes'));$('leaveReject').addEventListener('click',()=>decision('rejected'));$('leaveCancel').addEventListener('click',()=>decision('cancelled'));$('leaveRevoke').addEventListener('click',revoke);
  $('leavePreview').addEventListener('change',e=>{if(e.target.matches('[data-leave-replacement]')){draftReplacements[e.target.dataset.leaveReplacement]=e.target.value;messages(R.inspect(model(),context(model())));}});
  ['leaveAgreed','leaveCoverage','leaveSummer','leaveException'].forEach(id=>$(id).addEventListener('change',()=>messages(R.inspect(model(),context(model())))));
  ['leaveCampaign','leavePerson','leaveFrom','leaveTo'].forEach(id=>$(id).addEventListener('change',()=>{draftReplacements={};check();}));
  document.addEventListener('umte-render',render);document.addEventListener('click',e=>{if(e.target.closest('.nav-item[data-view="shifts"],#loginButton'))render();});
  window.UMTE_LEAVE_GUARD=(personId,date,selected)=>{
    const v=s.variations.find(x=>String(x.personId)===String(personId)&&x.date===date);
    if(v?.sourceLeaveId&&s.leaveRequests.some(r=>r.id===v.sourceLeaveId&&r.status==='approved')){api.toast('Questa giornata appartiene a ferie confermate: usa la revoca nel piano ferie prima di variarla');return false;}
    if(selected==='C'&&v?.shift!=='C'){api.toast('Inserisci la richiesta in Ferie: la C viene applicata dopo la conferma');panel.open=true;return false;}return true;
  };
  render();
})();
