const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const runtime=path.join(__dirname,'..','cloud-runtime.js');
const ui=path.join(__dirname,'..','energy-maintenance-ui.js');
const initial=()=>({
 peopleRecords:[
  {id:'CID-001',active:true,displayName:'Dipendente Sintetico',nucleus:'Arona',team:'1',validities:[
   {code:'MI.EN.OP - OPERATORE ENERGIA',role:'OPERATORE ENERGIA',roleExpiry:'2026-12-31',maintenanceExpiry:'2026-12-31'},
   {code:'MI.EN.QP.OP/LC - OPERATORE LC',role:'OPERATORE ENERGIA',roleExpiry:'2026-12-31',maintenanceExpiry:'2026-12-31'},
   {code:'MI.OPC.OP - OPERATORE DI CANTIERE',role:'OPERATORE CANTIERE',roleExpiry:'2026-12-31',maintenanceExpiry:'2026-12-31'}]},
  {id:'CID-002',active:true,displayName:'Secondo Dipendente',nucleus:'Arona',team:'2',validities:[
   {code:'MI.EN.OP - OPERATORE ENERGIA',role:'OPERATORE ENERGIA',roleExpiry:'2026-12-31',maintenanceExpiry:'2026-12-31'}]}
 ],energyMaintenanceHistory:[],activities:[],auditLog:[]
});
for(const width of [390,1440]){
 test('Mantenimento Energia '+width+'px: aggiorna ruoli Energia e resta autenticato senza reload',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',error=>errors.push(String(error)));
   await page.route('https://synthetic.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><header class="topbar"></header><section id="people"><div class="page-heading">Personale</div></section></body></html>'}));
   await page.goto('https://synthetic.invalid/');
   await page.evaluate(data=>{
    window.UMTE_SHARED={data,user:{role:'owner',id:'SYNTH-OWNER',name:'Responsabile prova'},revision:1,capabilities:{energyMaintenance:true}};
    window.UMTEConflict={saveWithSafeRetry:async()=>({result:{revision:3}})};
    window.__calls=[];
    window.UMTECloudApi=async body=>{
     window.__calls.push(body);
     const updatedValidities=body.personIds.flatMap(id=>window.UMTE_SHARED.data.peopleRecords.find(p=>p.id===id).validities.filter(v=>/^MI\.EN\./.test(v.code)).map(v=>({
       personId:id,code:v.code,maintenanceTrainingDate:body.date,maintenanceExpiry:body.expiry,
       maintenanceOutcome:'OK',maintenanceDocument:body.reference,
       maintenanceUpdatedById:'SYNTH-OWNER',roleExpiry:body.expiry,roleOutcome:'OK'
     })));
     return {ok:true,json:async()=>({ok:true,revision:body.revision+1,changed:updatedValidities.length,
       updatedValidities,session:{id:'EM-'+(body.revision+1),date:body.date,expiry:body.expiry,personIds:body.personIds}})};
    };
   },initial());
   await page.addScriptTag({path:runtime});
   await page.addScriptTag({path:ui});
   await page.locator('.umte-energy-maintenance summary').click();
   const form=page.locator('.umte-energy-form');
   await form.locator('input[type="date"]').first().fill('2026-11-09');
   await form.locator('input[type="date"]').nth(1).fill('2027-12-31');
   await form.locator('input[type="text"]').fill('VERBALE-DEMO');
   await form.locator('input[type="checkbox"]').first().check();
   page.on('dialog',d=>d.accept());
   await form.getByRole('button',{name:'Registra mantenimento'}).click();
   await form.getByRole('status').getByText(/Mantenimento salvato correttamente/).waitFor();
   const data=await page.evaluate(()=>({
    revision:window.UMTE_SHARED.revision,
    calls:window.__calls,
    stored:JSON.parse(localStorage.getItem('umte-manager-v01')),
    href:location.href,
    isStillUsable:window.UMTECloudCanRunEnergyMaintenance()
   }));
   assert.equal(data.href,'https://synthetic.invalid/');
   assert.equal(data.isStillUsable,true);
   assert.equal(data.revision,2);
   assert.equal(data.calls.length,1);
   assert.equal(data.stored.peopleRecords[0].validities[0].roleExpiry,'2027-12-31');
   assert.equal(data.stored.peopleRecords[0].validities[1].maintenanceExpiry,'2027-12-31');
   assert.equal(data.stored.peopleRecords[0].validities[2].roleExpiry,'2026-12-31','Safety role must stay unchanged');
   assert.equal(data.stored.energyMaintenanceHistory.length,1);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
