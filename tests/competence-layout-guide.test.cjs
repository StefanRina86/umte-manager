const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
for(const width of [390,1440]){
 test('Competenze multiple e Guida rapida nel menu - '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><aside class="sidebar"><nav></nav><div class="sidebar-foot"></div></aside><dialog id="competenceDialog"><form id="competenceForm"><fieldset class="competence-fieldset"><div class="competence-options"><article class="competence-card"><label><input type="checkbox" checked>Chiamata</label></article><article class="competence-card"><label><input type="checkbox" checked>Straordinario</label></article><article class="competence-card"><label><input type="checkbox" checked>Trasferta</label></article></div></fieldset><div id="callDetails" class="conditional-details three"><label>Ora chiamata<input type="time"></label><label>Inizio<input type="time"></label><label>Fine<input type="time"></label></div><div id="overtimeDetails" class="conditional-details three"><label>Dalle<input type="time"></label><label>Alle<input type="time"></label><label>Motivo<input></label></div><div id="travelDetailsPanel" class="conditional-details"><label>Dettagli<input></label></div><div class="modal-actions"><button>Salva</button></div></form></dialog><div id="toast" class="toast">Modello Excel non disponibile</div></body></html>');
   await page.evaluate(()=>{window.UMTE_SHARED={user:{role:'owner',name:'Responsabile'}}});
   await page.addScriptTag({path:path.join(root,'competence-layout-fixes.js')});
   await page.addScriptTag({path:path.join(root,'guida-rapida.js')});
   const guide=page.locator('.sidebar nav #umteGuideLaunch');
   assert.equal(await guide.count(),1);
   const dialog=page.locator('#competenceDialog');await dialog.evaluate(e=>e.showModal());
   const boxes=await page.locator('#callDetails,#overtimeDetails,#travelDetailsPanel').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
   assert.ok(boxes[0].y+boxes[0].h<=boxes[1].y+2,'Chiamata e straordinario non sovrapposti');
   assert.ok(boxes[1].y+boxes[1].h<=boxes[2].y+2,'Straordinario e trasferta non sovrapposti');
   assert.ok(boxes.every(x=>x.w>0));
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
