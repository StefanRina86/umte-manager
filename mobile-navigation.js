/* Replace old fuzzy mobile navigation with exact section routing. */
(function(){
"use strict";
function init(){
 const root=document.querySelector(".umte-mobilebar");
 if(!root||root.dataset.umteNavFixed)return;
 root.dataset.umteNavFixed="yes";
 const choices=[
  ["dashboard","Oggi"],["turni","Turni"],["attivita","Attività"],["rapportini","Rapportini"],["altro","Altro"]
 ];
 const map={dashboard:"dashboard",turni:"shifts",attivita:"activities",rapportini:"reports"};
 for(const [key,label] of choices){
  const button=root.querySelector('[data-mobile-go="'+key+'"]');
  if(!button)continue;
  const name=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
  if(name)name.textContent=label;else button.append(document.createTextNode(label));
  button.setAttribute("aria-label",label);
 }
 function authorizedButton(target){
  const nav=document.querySelector('.nav-item[data-view="'+target+'"]');
  if(!nav)return null;
  if(nav.hidden||getComputedStyle(nav).display==="none"||nav.getAttribute("aria-disabled")==="true")return null;
  return nav;
 }
 function openOther(){
  document.getElementById("umte-mobile-sheet")?.remove();
  const overlay=document.createElement("div");
  overlay.id="umte-mobile-sheet";
  overlay.style.cssText="position:fixed;inset:0;z-index:9800;background:#001d2cb3;display:flex;align-items:flex-end";
  const card=document.createElement("section");
  card.style.cssText="background:#fff;width:100%;border-radius:18px 18px 0 0;padding:16px;max-height:74dvh;overflow:auto";
  card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.setAttribute("aria-label","Altre funzioni");
  const head=document.createElement("div");head.style.cssText="display:flex;justify-content:space-between;align-items:center";
  const title=document.createElement("strong");title.textContent="Altre funzioni";
  const close=document.createElement("button");close.type="button";close.textContent="Chiudi";
  close.style.cssText="border:0;border-radius:8px;padding:9px;background:#eef2f4";
  head.append(title,close);card.append(head);
  const items=document.createElement("div");items.id="umsItems";
  items.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px";
  const targets=[["competencies","Competenze"],["people","Personale e abilitazioni"],["training","Corsi e visite"],["requests","Segnalazioni e richieste"],["administration","Amministrazione"]];
  for(const [view,label] of targets){
   const nav=authorizedButton(view);if(!nav)continue;
   const button=document.createElement("button");button.type="button";button.textContent=label;
   button.style.cssText="padding:12px;border:1px solid #cbdde4;background:#f5fafb;border-radius:9px;color:#12425a;font-weight:700;min-height:46px";
   button.onclick=()=>{overlay.remove();nav.click();window.scrollTo({top:0,behavior:"instant"});};
   items.append(button);
  }
  if(!items.children.length){const p=document.createElement("p");p.textContent="Nessuna altra funzione autorizzata.";items.append(p);}
  card.append(items);overlay.append(card);document.body.append(overlay);
  const hide=()=>overlay.remove();close.onclick=hide;
  overlay.onclick=e=>{if(e.target===overlay)hide();};
  overlay.addEventListener("keydown",e=>{if(e.key==="Escape")hide();});
  close.focus();
 }
 root.addEventListener("click",function(e){
  const button=e.target.closest("[data-mobile-go]");
  if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const key=button.dataset.mobileGo;
  if(key==="altro"){openOther();return;}
  const target=map[key],nav=authorizedButton(target);
  if(nav){document.getElementById("umte-mobile-sheet")?.remove();nav.click();window.scrollTo({top:0,behavior:"instant"});}
 },true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
