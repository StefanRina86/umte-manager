const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const runtime=path.join(__dirname,'..','cloud-runtime.js');
async function env(page,role,fail=false){
 await page.route('https://synthetic.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><header class="topbar"></header></body></html>'}));
 await page.goto('https://synthetic.invalid/');
 await page.evaluate(({role,fail})=>{
  window.UMTE_SHARED={user:{role,id:'synthetic-user',name:'Utente sintetico'},data:{activities:[],activityDiary:[],operationalRequests:[],competencies:[]},revision:1};
  window.__saves=[];
  window.UMTEConflict={saveWithSafeRetry:async({revision,patch,save})=>{
    const v=await save({revision:revision,patch:patch});
    if(!v.ok)throw Error(v.error);
    return {result:{revision:revision+1},retried:false};
  }};
  window.fetch=async(url,options)=>{window.__saves.push({url,body:JSON.parse(options.body)});return {ok:!fail,status:fail?500:200,json:async()=>fail?{error:'Errore sintetico'}:{revision:2}};};
 },{role,fail});
 await page.addScriptTag({path:runtime});
}
for(const width of [390,1440])for(const role of ['owner','specialist','administrative','chief','preposto','viewer']){
 test('save isolation '+role+' '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await env(page,role);
   await page.evaluate(()=>{
    const data=JSON.parse(localStorage.getItem('umte-manager-v01'));
    data.competencies=[{id:'COMP-1',value:'test'}];
    data.activityDiary=[{id:'TED-1',date:'2026-11-22'}];
    localStorage.setItem('umte-manager-v01',JSON.stringify(data));
   });
   await page.waitForTimeout(100);
   const saves=await page.evaluate(()=>window.__saves);
   if(role==='viewer')assert.equal(saves.length,0,'viewer cannot write competencies or TE-D');
   else if(role==='owner')assert.ok(saves.some(s=>s.body.patch.competencies&&s.body.patch.activityDiary));
   else assert.ok(saves.every(s=>s.body.patch.competencies&&(!s.body.patch.activityDiary||['specialist','administrative','chief','preposto'].includes(role))));
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
test('online save failure retains local recovery and prevents refresh',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await env(page,'owner',true);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('umte-manager-v01'));s.activities.push({id:'TEST-1'});localStorage.setItem('umte-manager-v01',JSON.stringify(s));});
  await page.waitForFunction(()=>document.body.dataset.sharedSaveFailed==='1');
  assert.match(await page.locator('#sharedSaveStatus').innerText(),/NON SALVATO online/);
  assert.equal(await page.getByRole('button',{name:'Scarica copia delle modifiche'}).count(),1);
  assert.match(await page.evaluate(()=>localStorage.getItem('umte-manager-v01')),/TEST-1/);
 }finally{await browser.close();}
});
