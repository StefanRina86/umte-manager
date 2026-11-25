/* Indicazione esplicita delle giornate di calendario teorico generate, senza scrivere dati. */
(()=>{
'use strict';
const meta=window.UMTE_BASELINE?.meta||{};
const from=meta.forecastFrom;
if(!/^\d{4}-\d\d-\d\d$/.test(from||''))return;
function init(){
 const shifts=document.getElementById('shifts');
 if(!shifts||document.getElementById('umteForecastWarning'))return;
 const warning=document.createElement('p');
 warning.id='umteForecastWarning';warning.setAttribute('role','note');
 warning.style.cssText='display:none;margin:10px 0 16px;padding:11px 14px;border-left:3px solid #b17d22;background:#fff8eb;border-radius:7px;color:#60491e;font-size:13px;line-height:1.45';
 warning.textContent='Dal 11/01/2027 al 31/12/2028: programmazione teorica previsionale, generata dalle rotazioni di 28 giorni (personale fuori squadra: modello settimanale ordinario). Non sono presenze consuntivate. Festività, ferie, congedi e variazioni devono essere verificati e registrati separatamente.';
 const heading=shifts.querySelector('.page-heading');
 if(heading)heading.insertAdjacentElement('afterend',warning);else shifts.prepend(warning);
 function update(){
  const month=document.getElementById('monthPicker')?.value||'';
  const week=document.getElementById('weekPicker')?.value||'';
  const period=document.getElementById('shiftPeriodMode')?.value||'';
  const selected=period==='month'||period==='monthly'?month:week;
  warning.style.display=selected&&(selected.slice(0,7)>='2027-01'||selected>=from)?'block':'none';
 }
 for(const id of ['shiftPeriodMode','weekPicker','monthPicker'])document.getElementById(id)?.addEventListener('change',update);
 document.addEventListener('umte-render',update);
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();