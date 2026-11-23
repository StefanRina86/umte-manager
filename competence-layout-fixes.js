/* Modulo competenze: struttura leggibile anche con più voci selezionate.
 * Interfaccia soltanto, non altera registrazioni né permessi.
 */
(()=>{
'use strict';
const style=document.createElement('style');
style.id='umteCompetenceLayout20261123';
style.textContent=`
#competenceDialog{width:min(1000px,96vw)!important;max-width:96vw!important;max-height:94dvh!important;overflow-y:auto!important}
#competenceDialog #competenceForm{display:grid;gap:13px;min-width:0}
#competenceDialog .competence-fieldset{min-width:0;padding:14px;border-radius:12px}
#competenceDialog .competence-options{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
#competenceDialog .competence-card{min-width:0!important;align-items:center;gap:8px}
#competenceDialog .competence-card label{min-width:0}
#competenceDialog .conditional-details{width:100%!important;min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px;padding:15px;border:1px solid #cbdde5;border-radius:11px;background:#f7fafc}
#competenceDialog .conditional-details.three{grid-template-columns:repeat(3,minmax(0,1fr))!important}
#competenceDialog .conditional-details[hidden]{display:none!important}
#competenceDialog .conditional-details label{min-width:0;display:grid;align-content:start;gap:5px}
#competenceDialog .conditional-details input,#competenceDialog .conditional-details select,#competenceDialog .conditional-details textarea{width:100%;min-width:0}
#competenceDialog #callDetails label.span-2{grid-column:span 2}
#competenceDialog .selection-summary{display:grid;gap:6px;padding:12px;border:1px solid #bcd5df;border-radius:10px;background:#eff7fb}
#competenceDialog .modal-actions{position:sticky;bottom:0;background:#fff;padding:14px 0;margin:0;border-top:1px solid #dce6ec;z-index:5}
#activityDialog .fieldset-help.umte-support-agreement{display:block;border-left:3px solid #277c9e;padding:10px 12px;background:#edf6fa;border-radius:6px}
@media(max-width:680px){#competenceDialog .competence-options{grid-template-columns:1fr!important}#competenceDialog .conditional-details,#competenceDialog .conditional-details.three{grid-template-columns:1fr!important}#competenceDialog #callDetails label.span-2{grid-column:auto}#competenceDialog .modal-actions{flex-wrap:wrap}}
`;
document.head.append(style);
const note=document.getElementById('activityNotes');
if(note&&!document.getElementById('umteSupportAgreementHint')){
 const info=document.createElement('p');info.id='umteSupportAgreementHint';info.className='fieldset-help umte-support-agreement';
 info.textContent='Se il CT utilizza personale di un altro nucleo, registra nelle Note operative “Supporto concordato con [nome referente]”, dopo aver verificato la disponibilità. I dati saranno tracciati nell’attività.';
 note.closest('label')?.after(info);
}
})();
