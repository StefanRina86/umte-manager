(function(){
'use strict';
function init(){
 const $=id=>document.getElementById(id);
 const css=document.createElement('style');css.id='umte-final-layout-fixes';css.textContent=`
 /* Readable monthly grid on desktop; keep compact person cards on phones. */
 @media(min-width:821px){
 #shiftMonthlyPanel .umte-v3-month{display:none!important}
 #shiftMonthlyPanel .monthly-panel{display:block!important}
 #shiftMonthlyPanel .table-scroll{width:100%!important;overflow:auto!important;max-width:100%!important}
 #shiftMonthlyPanel .monthly-table{display:table!important;width:max-content!important;min-width:1600px!important;border-collapse:separate!important;table-layout:fixed!important}
 #shiftMonthlyPanel .monthly-table tr{display:table-row!important}
 #shiftMonthlyPanel .monthly-table td,#shiftMonthlyPanel .monthly-table th{display:table-cell!important;white-space:nowrap!important}
 #shiftMonthlyPanel .monthly-table td.monthly-person{white-space:normal!important}
 #shiftMonthlyPanel .monthly-table .month-day{min-width:52px!important;width:52px!important;max-width:52px!important}
 }
 #diaryCompetencePeople.rapport-competence-grid{min-width:0!important}
 #diaryCompetencePeople .rapport-competence-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px;padding:10px;border:1px solid #d6e3e8;border-radius:10px;margin-bottom:8px}
 #diaryCompetencePeople .rapport-competence-row.header{display:none!important}
 #diaryCompetencePeople .rapport-person{grid-column:1/-1;justify-content:flex-start!important;font-size:.9rem}
 #diaryCompetencePeople .rapport-flag{display:flex;justify-content:flex-start!important;min-width:0;min-height:45px!important;border:1px solid #e0ebef!important;border-radius:7px;padding:6px!important;gap:5px}
 #diaryCompetencePeople .rapport-flag:after{content:attr(title);font-size:0;display:none}
 #diaryCompetencePeople .rapport-flag input{min-width:20px;min-height:20px;flex-shrink:0}
 #diaryCompetencePeople .rapport-note{grid-column:1/-1;border:0!important}
 #diaryCompetencePeople .rapport-note input{width:100%}
 #diaryCompetencePeople .rapport-flag .umte-flag-label{font-size:11px;font-weight:650;line-height:1.2;overflow-wrap:anywhere}
 #competenceDialog .competence-options{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px}
 #competenceDialog .competence-card{min-width:0;padding:10px}
 #diaryTravelLabel textarea,#travelDetailsText{width:100%;min-height:70px}
 @media(max-width:820px){
 #shiftMonthlyPanel .umte-v3-month{display:grid!important}
 #diaryCompetencePeople .rapport-competence-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #competenceDialog .competence-options{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #competenceDialog .competence-card{align-items:flex-start;flex-wrap:wrap}
 #diaryForm details:has(#diaryUsedMaterials){max-width:100%;overflow:visible}
 #diaryForm .diary-material-row{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
 #diaryForm .diary-material-row input,#diaryForm .diary-material-row select{min-width:0;width:100%}
 }
 @media(max-width:360px){#diaryCompetencePeople .rapport-competence-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
 `;document.head.append(css);
 function relocateCrew(){
  const crew=$('diaryActualCrew')?.closest('fieldset');if(!crew)return;
  const details=crew.closest('details');if(details){details.parentElement.insertBefore(crew,details);}
  const legend=crew.querySelector('legend');if(legend)legend.textContent='Personale effettivamente presente (TE-D)';
 }
 function labelCompetences(){
  const labels={travel:'Trasferta',line:'Linea',night:'Cantiere notturno',tunnel:'Galleria',standby:'Reperibilità',call:'Chiamata',overtime:'Straordinario',superior:'Mansione superiore'};
  for(const input of document.querySelectorAll('#diaryCompetencePeople input[data-diary-allowance]')){
   const parent=input.closest('label');if(!parent||parent.querySelector('.umte-flag-label'))continue;
   const span=document.createElement('span');span.className='umte-flag-label';span.textContent=labels[input.dataset.diaryAllowance]||input.dataset.diaryAllowance;parent.append(span);
  }
 }
 function materialsHelp(){
  const used=$('diaryUsedMaterials'),removed=$('diaryRemovedMaterials'),catalog=$('diaryMaterialCatalog');if(!used||!removed||!catalog)return;
  const materialOptions=[...catalog.options].map(o=>o.value).filter(Boolean);
  if(!document.getElementById('umteMaterialSearchNote')){
   const p=document.createElement('p');p.id='umteMaterialSearchNote';p.className='fieldset-help';
   p.textContent='Ricerca per descrizione o categorico: seleziona una voce disponibile, poi verifica il codice prima di emettere A15 o VRVT.';
   used.parentElement.insertBefore(p,used);
  }
  if(!document.getElementById('umteRemovedCatalog')){
   const list=document.createElement('datalist');list.id='umteRemovedCatalog';for(const option of materialOptions){const o=document.createElement('option');o.value=option;list.append(o);}removed.parentElement.insertBefore(list,removed);
   const p=document.createElement('p');p.className='fieldset-help';p.textContent='Per il tolto d’opera puoi cercare il categorico nel catalogo materiali TE disponibile. Il codice CER e la classificazione del rifiuto devono essere verificati su un elenco aziendale autorizzato: nessun codice viene assegnato automaticamente.';removed.parentElement.insertBefore(p,removed);
  }
 }
 function wireRemovedMaterials(){
  const host=$('diaryRemovedMaterials');if(!host||host.dataset.lookupWired)return;host.dataset.lookupWired='1';
  host.addEventListener('focusin',event=>{if(event.target.matches('input[data-material="description"],input[data-material="code"]'))event.target.setAttribute('list','umteRemovedCatalog');});
  host.addEventListener('change',event=>{
   const field=event.target;if(!field.matches('input[data-material="description"],input[data-material="code"]'))return;
   const raw=field.value.trim(),option=[...($('umteRemovedCatalog')?.options||[])].find(x=>x.value===raw);if(!option)return;
   const match=raw.match(/^([^·]+)\s·\s(.+)$/);if(!match)return;
   const row=field.closest('.diary-material-row');if(!row)return;
   const code=row.querySelector('input[data-material="code"]'),description=row.querySelector('input[data-material="description"]');
   if(code)code.value=match[1].trim();if(description)description.value=match[2].trim();
  });
 }
 const body=$('diaryCompetencePeople');if(body)new MutationObserver(()=>{labelCompetences();relocateCrew();materialsHelp();}).observe(body,{childList:true});
 document.addEventListener('umte-render',()=>{relocateCrew();labelCompetences();materialsHelp();});
 relocateCrew();labelCompetences();materialsHelp();wireRemovedMaterials();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();