const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const source=path.join(__dirname,'..','segnalazioni.js');
const roles=['owner','specialist','administrative','chief','preposto','viewer'];
const makeRequest=(id,author)=>({id,reference:'SEG-'+id,title:id==='own'?'La mia segnalazione':'Segnalazione di un collega',personId:id==='own'?'TEST-CID':'OTHER-CID',personName:id==='own'?'Persona Test':'Altro collega',nucleus:'Gallarate',description:'Richiesta sintetica',category:'equipment',priority:'normal',status:'progress',createdAt:'2026-11-16T09:00:00.000Z',updatedAt:'2026-11-16T11:00:00.000Z',updatedBy:'Responsabile',createdBy:'Persona Test',createdByUserId:author,assignedTo:'Responsabile',history:[{id:'h1',by:'Responsabile',at:'2026-11-16T11:00:00.000Z',action:'Aggiornamento / risposta',text:'La richiesta è in lavorazione'}]});
for(const role of roles)for(const width of [390,1440]){
 test('segnalazioni '+role+' '+width+'px: ownership, response, read permissions and responsive layout',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent('<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font:16px Arial"><nav><button class="nav-item" data-view="requests">Segnalazioni</button></nav><section id="dashboard"><div class="page-heading">Home</div></section><section id="requests"></section><span id="requestNavCount"></span></body></html>');
   await page.evaluate(({role})=>{
    window.UMTE_SHARED={user:{id:role==='owner'?'boss':'u-test',role,personId:'TEST-CID',name:'Persona Test'}};
    window.__logs=[];
    const requests=[{
      id:'own',reference:'SEG-own',title:'La mia segnalazione',personId:'TEST-CID',personName:'Persona Test',nucleus:'Gallarate',description:'Richiesta sintetica',category:'equipment',priority:'normal',status:'progress',createdAt:'2026-11-16T09:00:00.000Z',updatedAt:'2026-11-16T11:00:00.000Z',updatedBy:'Responsabile',createdBy:'Persona Test',createdByUserId:'u-test',assignedTo:'Responsabile',history:[{id:'h1',by:'Responsabile',at:'2026-11-16T11:00:00.000Z',action:'Aggiornamento / risposta',text:'La richiesta è in lavorazione'}]
     },{
      id:'other',reference:'SEG-other',title:'Segnalazione di un collega',personId:'OTHER-CID',personName:'Altro collega',nucleus:'Arona',description:'Altro sintetico',category:'equipment',priority:'normal',status:'new',createdAt:'2026-11-16T09:00:00.000Z',updatedAt:'2026-11-16T10:00:00.000Z',updatedBy:'Altro',createdBy:'Altro collega',createdByUserId:'u-other',history:[]
     }];
    const state={operationalRequests:requests,activities:[],manualLocations:[]};
    localStorage.setItem('umte-manager-v01',JSON.stringify(state));
    window.UMTELeave={
      state,can:(permission)=> permission==='requestsManage'?role==='owner':permission==='viewDashboard',
      user:()=>({name:role==='owner'?'Responsabile':'Persona Test'}),
      people:()=>[{id:'TEST-CID',displayName:'Persona Test',nucleus:'Gallarate',qualification:'OP'},{id:'OTHER-CID',displayName:'Altro collega',nucleus:'Arona',qualification:'OP'}],
      audit:(...args)=>window.__logs.push(args),persist:()=>localStorage.setItem('umte-manager-v01',JSON.stringify(state)),
      renderAll:()=>{},toast:()=>{}
    };
   },{role});
   await page.addScriptTag({path:source});
   const text=await page.locator('#requestBody').innerText();
   if(role==='owner'){assert.match(text,/La mia segnalazione/);assert.match(text,/Segnalazione di un collega/);}
   else{assert.match(text,/La mia segnalazione/);assert.doesNotMatch(text,/Segnalazione di un collega/);}
   await page.locator('[data-request-open="own"]').click();
   assert.equal(await page.locator('#requestDetail').isVisible(),true);
   assert.match(await page.locator('#requestMessages').innerText(),/La richiesta è in lavorazione/);
   assert.equal(await page.locator('#requestManagement').isVisible(),role==='owner');
   assert.equal(await page.locator('#requestReplyForm').isVisible(),role==='owner');
   await page.getByRole('button',{name:'Chiudi dettaglio segnalazione'}).click();
   await page.locator('#requestNew').click();
   assert.equal(await page.locator('#requestEditor').isVisible(),true);
   if(role!=='owner'){assert.equal(await page.locator('#rqPerson').inputValue(),'TEST-CID');assert.equal(await page.locator('#rqPerson').isDisabled(),true);}
   await page.getByRole('button',{name:'Annulla'}).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow on '+width+'px '+role);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','umte-requests-'+role+'-'+width+'.png'),fullPage:true});
  }finally{await browser.close();}
 });
}