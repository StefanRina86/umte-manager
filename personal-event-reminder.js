/* Avviso personale: mostra le visite al solo destinatario dal giorno precedente.
 * Nessuna modifica a scadenze, presenze, autorizzazioni o dati sanitari.
 */
(()=>{
 'use strict';
 const shared=window.UMTE_SHARED;
 const userId=String(shared?.user?.personId||'');
 if(!userId||!Array.isArray(shared?.data?.medicalAppointments))return;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const fmt=date=>{const [y,m,d]=date.split('-');return d+'/'+m+'/'+y;};
 const own=shared.data.medicalAppointments.filter(a=>{
  if(String(a.personId)!==userId||!/^\d{4}-\d{2}-\d{2}$/.test(String(a.date||'')))return false;
  const visible=String(a.visibilityFrom||(()=>{const dt=new Date(a.date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-1);return dt.toISOString().slice(0,10);})());
  return visible<=today&&today<=a.date;
 }).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start||'').localeCompare(String(b.start||'')));
 if(!own.length)return;
 const alert=document.createElement('aside');
 alert.id='umtePersonalMedicalReminder';
 alert.setAttribute('role','status');
 alert.setAttribute('aria-live','polite');
 alert.style.cssText='background:#eef6fa;border:1px solid #a7ccd9;border-left:4px solid #216786;border-radius:10px;margin:12px 0 18px;padding:13px 16px;color:#143b4d;line-height:1.5;';
 const heading=document.createElement('strong');heading.textContent='Le tue visite sanitarie programmate';
 alert.append(heading);
 for(const a of own){
  const p=document.createElement('p');p.style.margin='6px 0 0';
  p.textContent=fmt(a.date)+' · '+String(a.start||'—')+'–'+String(a.end||'—')+' · Consulta anche il turno del giorno.';
  alert.append(p);
 }
 const mount=()=>{
  const dashboard=document.getElementById('dashboard');
  if(!dashboard||alert.isConnected)return;
  const heading=dashboard.querySelector('.page-heading');
  if(heading)heading.insertAdjacentElement('afterend',alert);
  else dashboard.prepend(alert);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
