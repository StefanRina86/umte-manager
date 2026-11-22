(function(){
'use strict';
function init(){
 const reports=document.getElementById('reports'),history=document.getElementById('reportHistoryBody'),diary=document.getElementById('diaryHistory');
 if(!reports||!history||!diary||document.getElementById('tedDocumentsArchive'))return;
 const root=document.createElement('section');root.id='tedDocumentsArchive';root.className='panel';root.style.cssText='margin:20px 0;padding:18px;min-width:0';
 const heading=document.createElement('h2');heading.textContent='Archivio A15 e VRVT';root.append(heading);
 const intro=document.createElement('p');intro.textContent='A15 e VRVT ricavati dai rapportini salvati. Per correggere un modulo, modifica prima il rapportino.';root.append(intro);
 const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin:12px 0';
 const search=document.createElement('input');search.type='search';search.placeholder='Cerca attività, ODL o materiale';search.setAttribute('aria-label','Cerca documenti A15 e VRVT');search.style.cssText='flex:1 1 230px;min-height:44px';
 const kind=document.createElement('select');kind.setAttribute('aria-label','Tipo di documento');for(const [v,t]of [['all','A15 e VRVT'],['a15','Solo A15'],['vrvt','Solo VRVT']])kind.add(new Option(t,v));kind.style.minHeight='44px';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='button secondary';refresh.textContent='Aggiorna';controls.append(search,kind,refresh);root.append(controls);
 const summary=document.createElement('p');summary.setAttribute('role','status');root.append(summary);
 const list=document.createElement('div');list.style.cssText='display:grid;gap:10px';root.append(list);
 reports.querySelector('.page-heading')?.insertAdjacentElement('afterend',root);
 const read=()=>{try{return JSON.parse(localStorage.getItem('umte-manager-v01')||'{}')}catch{return window.UMTE_SHARED?.data||{}}};
 const canEdit=()=>['owner','specialist','administrative','chief','preposto'].includes(window.UMTE_SHARED?.user?.role);
 function nativeAction(target,attr,id,extra){
   const hidden=document.createElement('button');hidden.type='button';hidden.style.display='none';hidden.dataset[attr]=extra||id;
   if(extra)hidden.dataset.materialEntry=String(id);
   target.append(hidden);hidden.click();hidden.remove();
 }
 function render(){
  const state=read(),entries=Array.isArray(state.activityDiary)?state.activityDiary:[],activities=Array.isArray(state.activities)?state.activities:[],byId=new Map(activities.map(a=>[String(a.id),a]));
  const docs=[];
  for(const entry of entries){
   const activity=byId.get(String(entry.activityId));if(!activity)continue;
   for(const [type,items]of [['a15',entry.materialsUsed],['vrvt',entry.materialsRemoved]]){
    if(!Array.isArray(items)||!items.length)continue;
    docs.push({type,entry,activity,items,receivedAt:entry.receivedAt||entry.submittedAt||entry.completedAt||''});
   }
  }
  docs.sort((a,b)=>String(b.receivedAt||b.entry.updatedAt||b.entry.date||'').localeCompare(String(a.receivedAt||a.entry.updatedAt||a.entry.date||'')));
  const q=search.value.trim().toLocaleLowerCase('it');
  const filtered=docs.filter(d=>(kind.value==='all'||d.type===kind.value)&&(!q||[d.entry.date,d.activity.title,d.activity.nucleus,d.activity.location,(d.activity.odls||[]).map(o=>o.number).join(' '),...d.items.flatMap(x=>[x.code,x.description,x.cer])].some(v=>String(v||'').toLocaleLowerCase('it').includes(q))));
  summary.textContent=docs.filter(d=>d.type==='a15').length+' A15 · '+docs.filter(d=>d.type==='vrvt').length+' VRVT';
  list.replaceChildren();
  if(!filtered.length){const msg=document.createElement('p');msg.textContent='Nessun modulo disponibile per i filtri selezionati.';list.append(msg);return;}
  for(const d of filtered){
   const card=document.createElement('article');card.style.cssText='border:1px solid #d8e5ea;border-radius:10px;padding:14px;overflow-wrap:anywhere';
   const title=document.createElement('strong');title.textContent=(d.type==='a15'?'A15 · Materiale impiegato':'VRVT · Tolto d’opera')+' — '+(d.activity.title||'Attività');card.append(title);
   const meta=document.createElement('p');meta.style.margin='8px 0';meta.textContent=[d.entry.date,d.activity.nucleus,d.activity.location,(d.activity.odls||[]).map(o=>o.number).filter(Boolean).join(', '),d.receivedAt?'Ricevuto: '+new Date(d.receivedAt).toLocaleString('it-IT'):''].filter(Boolean).join(' · ');card.append(meta);
   const detail=document.createElement('p');detail.style.cssText='margin:8px 0;color:#536b79';detail.textContent=d.items.map(i=>[i.code,i.description,i.qty,i.unit].filter(v=>v!==undefined&&v!==null&&v!=='').join(' · ')).join(' | ');card.append(detail);
   const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
   if(canEdit()){const edit=document.createElement('button');edit.type='button';edit.className='button secondary';edit.textContent='Apri rapportino';edit.onclick=()=>nativeAction(history,'editReport',String(d.entry.id));actions.append(edit);}
   const pdf=document.createElement('button');pdf.type='button';pdf.className='button primary';pdf.textContent=d.type==='a15'?'Genera A15':'Genera VRVT';pdf.onclick=()=>nativeAction(diary,'printMaterial',String(d.entry.id),d.type);actions.append(pdf);card.append(actions);list.append(card);
  }
 }
 let pending=false;function queue(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;render()})}
 search.addEventListener('input',queue);kind.addEventListener('change',queue);refresh.addEventListener('click',render);
 document.addEventListener('umte-render',queue);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();