const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const script=path.join(__dirname,'..','personal-event-reminder.js');
for(const width of [390,1440]){
 test('Visita di domani visibile oggi solo al collega destinatario, '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.setContent('<div id="dashboard"><div class="page-heading">La giornata di lavoro</div></div>');
   await page.evaluate(()=>{
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
    const d=tomorrow.toISOString().slice(0,10);
    window.UMTE_SHARED={user:{role:'chief',personId:'940713'},data:{medicalAppointments:[
     {id:'own',personId:'940713',date:d,visibilityFrom:today,start:'08:00',end:'13:00',location:'PRIVATE-PLACE'},
     {id:'other',personId:'913379',date:d,visibilityFrom:today,start:'16:00',end:'18:00',location:'SECRET-OTHER'}
    ]}};
   });
   await page.addScriptTag({path:script});
   const notice=page.locator('#umtePersonalMedicalReminder');
   await notice.waitFor();
   assert.match(await notice.innerText(),/Le tue visite sanitarie programmate/);
   assert.match(await notice.innerText(),/08:00–13:00/);
   assert.doesNotMatch(await notice.innerText(),/16:00|PRIVATE-PLACE|SECRET-OTHER/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true);
  }finally{await browser.close();}
 });
}
test('Nessuna visita di altri dipendenti esposta al profilo amministrativo',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="dashboard"><div class="page-heading"></div></div>');
  await page.evaluate(()=>{
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
   window.UMTE_SHARED={user:{role:'administrative',personId:'913379'},data:{medicalAppointments:[{id:'other',personId:'940713',date:today,visibilityFrom:today}]}};
  });
  await page.addScriptTag({path:script});
  assert.equal(await page.locator('#umtePersonalMedicalReminder').count(),0);
 }finally{await browser.close();}
});
