const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const roles={
owner:['requestsManage','variation','competenceCreate','approve','archive','safetyManage','schedulePeopleEvents','activityEdit','activityPublish','activityApprove','diaryEdit','adminManage','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],
specialist:['variation','competenceCreate','approve','archive','safetyManage','schedulePeopleEvents','activityEdit','activityPublish','activityApprove','diaryEdit','adminManage','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],
administrative:['variation','competenceCreate','archive','safetyManage','schedulePeopleEvents','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports','diaryEdit'],
chief:['variation','competenceCreate','activityEdit','activityPublish','diaryEdit','viewDashboard','viewShifts','viewCompetencies','viewPeople','viewActivities','viewReports'],
preposto:['competenceCreate','diaryEdit','viewShifts','viewActivities','viewReports'],
viewer:['viewShifts','viewActivities']
};
const navs=[['dashboard','viewDashboard'],['shifts','viewShifts'],['activities','viewActivities'],['competencies','viewCompetencies'],['reports','viewReports'],['requests','viewShifts'],['administration','adminManage']];
for(const [role,perms] of Object.entries(roles))for(const width of [390,1440]){
 test('role navigation '+role+' '+width+'px, restricted sections and mobile requests',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   const html='<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font:16px Arial}.topbar{padding:6px}.nav-item[hidden]{display:none} .umte-mobilebar{display:flex;justify-content:space-around;gap:5px;padding:8px;position:fixed;bottom:0;background:white;width:100%}.umte-mobilebar button{min-width:0;flex:1;border:1px solid #ccc;padding:7px 2px;font-size:12px}#dashboard{padding:12px}#requests{padding:12px}</style></head><body><header class="topbar">UMTE</header><nav id="nav">'+
    [["dashboard","viewDashboard"],["shifts","viewShifts"],["activities","viewActivities"],["competencies","viewCompetencies"],["reports","viewReports"],["requests","viewShifts"],["administration","adminManage"]].map(([view,perm])=>'<button class="nav-item" data-view="'+view+'" data-permission="'+perm+'">'+view+'</button>').join('')+
    '</nav><section id="dashboard"><div class="page-heading">Home</div></section><section id="shifts"></section><section id="activities"><div class="activity-rule"></div></section><section id="competencies"></section><section id="people"></section><section id="personnelEvents"></section><section id="reports"></section><section id="requests"></section><section id="administration"><select id="adminArea"><option value="odl">ODL</option></select></section><div class="umte-mobilebar"><button data-mobile-go="dashboard">Oggi</button><button data-mobile-go="turni">Turni</button><button data-mobile-go="attivita">Attività</button><button data-mobile-go="rapportini">Rapportini</button><button data-mobile-go="altro">Altro</button></div></body></html>';
   await page.setContent(html);
   await page.evaluate(({role,perms})=>{
    window.UMTE_SHARED={user:{role,permissions:perms,id:'test-user'}};
    window.UMTE_ESSENTIAL=true;
    window.UMTEEssential={activeViews:['dashboard','shifts','activities','competencies','people','personnelEvents','reports','requests','administration'],blockedPermission:()=>false};
    window.UMTELeave={state:{},can:p=>perms.includes(p),user:()=>({name:'Sintetico'}),people:()=>[],toast:()=>{}};
    for(const n of document.querySelectorAll('[data-permission]'))n.hidden=!perms.includes(n.dataset.permission);
    document.querySelectorAll('.nav-item').forEach(n=>n.onclick=()=>{document.body.dataset.currentView=n.dataset.view;});
   },{role,perms});
   await page.addScriptTag({path:path.join(root,'essenziale-ui.js')});
   await page.addScriptTag({path:path.join(root,'mobile-navigation.js')});
   const expected=perms.includes('viewDashboard');
   if(expected)assert.equal(await page.getByRole('button',{name:'Apri presenze'}).count(),1);
   else assert.equal(await page.getByRole('button',{name:'Apri presenze'}).count(),1);
   assert.equal(await page.locator('.nav-item[data-view="administration"]').isVisible(),perms.includes('adminManage'));
   assert.equal(await page.locator('.nav-item[data-view="requests"]').isVisible(),true);
   await page.locator('[data-mobile-go="altro"]').click();
   const sheet=page.locator('#umte-mobile-sheet');
   assert.equal(await sheet.isVisible(),true);
   assert.equal(await sheet.getByRole('button',{name:'Segnalazioni e richieste'}).count(),1);
   assert.equal(await sheet.getByRole('button',{name:'Amministrazione'}).count(),perms.includes('adminManage')?1:0);
   await sheet.getByRole('button',{name:'Segnalazioni e richieste'}).click();
   assert.equal(await page.evaluate(()=>document.body.dataset.currentView),'requests');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow on '+role+' '+width);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','umte-role-nav-'+role+'-'+width+'.png'),fullPage:true});
  }finally{await browser.close();}
 });
}