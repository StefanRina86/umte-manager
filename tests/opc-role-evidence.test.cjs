const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const script=path.join(__dirname,'..','abilitazioni.js');
test('MI.OPC: il riepilogo richiede evidenze e non cambia autorizzazioni',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="validityDialog" data-person-id="1"><div id="validitySummary"></div></div><div id="peopleSafetyPanel"><div class="safety-summary"></div></div>');
  await page.evaluate(()=>{
   const person={id:'1',skills:[],validities:[{code:'MI.OPC.OP - OPERATORE DI CANTIERE',roleOutcome:'NON_VERIFICATO',roleExpiry:'2026-12-31'}]};
   window.UMTELeave={people:()=>[person]};
   window.UMTEQualifications={skill:x=>({code:'',label:x,kind:''}),validity:x=>x};
   window.UMTE_SHARED={data:{activityDiary:[]}};
   window.__before=JSON.stringify(person);
  });
  await page.addScriptTag({path:script});
  const t=await page.locator('#umteOpcRoleEvidence').innerText();
  assert.match(t,/Operatore di cantiere, guida e scorta/);
  assert.match(t,/Rapportini conclusi presenti nel gestionale: 0/);
  assert.match(t,/Nessun rinnovo automatico/);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.UMTELeave.people()[0])===window.__before),true);
 }finally{await browser.close();}
});
