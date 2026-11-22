const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const archive=path.join(__dirname,'..','ted-document-archive.js');
const roles=['owner','specialist','administrative','chief','preposto','viewer'];
const state={
 activities:[{id:'A-1',title:'Verifica linea',nucleus:'Arona',location:'Arona',odls:[{number:'100001'}]}],
 activityDiary:[{
  id:'R-1',activityId:'A-1',date:'2026-11-20',createdByUserId:'origin-user',
  materialsUsed:[{code:'MAT-1',description:'Corda',qty:'12',unit:'m'}],
  materialsRemoved:[
   {code:'MAT-2',description:'Morsetto servibile',qty:'2',unit:'pz',condition:'Servibile'},
   {code:'MAT-3',description:'Da verificare',qty:'1',unit:'pz',condition:'Da verificare'},
   {code:'RIF-1',description:'Rifiuto da smaltire',qty:'3',unit:'kg',condition:'Rifiuto',cer:'17 04 02'}
  ]
 }]
};
for(const role of roles)for(const width of [390,1440]){
 test('Archivio A15/VRVT: '+role+' '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];
   page.on('pageerror',err=>errors.push(String(err)));
   await page.setContent('<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font:16px Arial;margin:0;padding:12px}.panel{max-width:100%}button,input,select{font:inherit;max-width:100%}</style></head><body><section id="reports"><div class="page-heading"><h1>Rapportini</h1></div><div id="reportHistoryBody"></div><div id="diaryHistory"></div></section></body></html>');
   await page.evaluate(({role,state})=>{
     window.UMTE_SHARED={user:{role,id:'current-user',permissions:role==='viewer'?[]:['diaryEdit']},data:state};
     Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:key=>key==='umte-manager-v01'?JSON.stringify(state):null}});
     window.__print=[];
     document.getElementById('diaryHistory').addEventListener('click',e=>{
       if(e.target.dataset.printMaterial)window.__print.push({type:e.target.dataset.printMaterial,id:e.target.dataset.materialEntry});
     });
   },{role,state});
   await page.addScriptTag({path:archive});
   await page.waitForSelector('#tedDocumentsArchive article');
   const panel=page.locator('#tedDocumentsArchive');
   assert.match(await panel.innerText(),/1 A15 · 1 VRVT/);
   assert.equal(await panel.locator('article').count(),2);
   assert.equal(await panel.getByText('Morsetto servibile').count(),0);
   assert.equal(await panel.getByText('Da verificare').count(),0);
   assert.equal(await panel.getByRole('button',{name:'Apri rapportino'}).count(),['owner','specialist','administrative'].includes(role)?2:0);
   await panel.getByRole('button',{name:'Genera VRVT'}).click();
   assert.deepEqual(await page.evaluate(()=>window.__print),[{type:'vrvt',id:'R-1'}]);
   await panel.locator('input[type="search"]').fill('MAT-1');
   await page.waitForFunction(()=>document.querySelectorAll('#tedDocumentsArchive article').length===1);
   assert.equal(await panel.locator('article').count(),1);
   assert.match(await panel.innerText(),/1 A15 · 1 VRVT/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow '+role+' '+width);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
test('VRVT non presente quando il tolto d’opera non è un rifiuto',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const clean=structuredClone(state);
  clean.activityDiary[0].materialsRemoved=clean.activityDiary[0].materialsRemoved.filter(m=>m.condition!=='Rifiuto');
  await page.setContent('<section id="reports"><div class="page-heading"></div><div id="reportHistoryBody"></div><div id="diaryHistory"></div></section>');
  await page.evaluate(state=>{
    window.UMTE_SHARED={user:{role:'owner',id:'x'},data:state};
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(state)}});
  },clean);
  await page.addScriptTag({path:archive});
  assert.match(await page.locator('#tedDocumentsArchive').innerText(),/1 A15 · 0 VRVT/);
  assert.equal(await page.getByRole('button',{name:'Genera VRVT'}).count(),0);
 }finally{await browser.close();}
});
