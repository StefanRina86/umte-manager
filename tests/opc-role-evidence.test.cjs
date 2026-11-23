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
  assert.match(t,/Rapportini conclusi presenti: 0/);
  assert.match(t,/Nessuna attestazione di validità per presunzione/);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.UMTELeave.people()[0])===window.__before),true);
 }finally{await browser.close();}
});


test('baseline 2026 visibile, rapportini 2027 candidati e validita formale invariata',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="validityDialog" data-person-id="1"><div id="validitySummary"></div></div><div id="peopleSafetyPanel"><div class="safety-summary"></div></div>');
  await page.evaluate(()=>{
   const person={id:'1',skills:[],validities:[{code:'MI.OPC.OP - OPERATORE DI CANTIERE',roleOutcome:'NON_VERIFICATO',roleExpiry:'2026-12-31'}]};
   window.UMTELeave={people:()=>[person]};
   window.UMTEQualifications={skill:x=>({code:'',label:x,kind:''}),validity:x=>x};
   window.UMTE_SHARED={data:{
    opcExerciseBaseline:{year:2026,type:'gestionale_non_abilitante',items:[{personId:'1',code:'MI.OPC.OP - OPERATORE DI CANTIERE',planningStatus:'OK - baseline gestionale',evidenceStatus:'non verificata'}]},
    activityDiary:[
     {id:'R1',date:'2027-03-12',actualPeopleIds:['1'],status:'submitted'},
     {id:'R2',date:'2027-03-15',actualPeopleIds:['1'],status:'draft'},
     {id:'R3',date:'2027-03-16',actualPeopleIds:['2'],status:'submitted'},
     {id:'R4',date:'2026-11-02',actualPeopleIds:['1'],status:'submitted'}
    ]}};
   window.__before=JSON.stringify(person);
  });
  await page.addScriptTag({path:script});
  const text=await page.locator('#umteOpcRoleEvidence').innerText();
  assert.match(text,/2026: OK gestionale dichiarato/);
  assert.match(text,/2027: 1 rapportini conclusi/);
  assert.match(text,/Nessuna abilitazione convalidata automaticamente/);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.UMTELeave.people()[0])===window.__before),true);
 }finally{await browser.close();}
});
