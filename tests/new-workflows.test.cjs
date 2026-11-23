const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const script=name=>path.join(root,name);
async function page(html,state,role='owner',personId='OP1'){
 const browser=await chromium.launch({headless:true});
 const p=await browser.newPage({viewport:{width:390,height:860}});
 p.setDefaultTimeout(6000);
 await p.setContent(html);
 await p.evaluate(({state,role,personId})=>{
  const people=state.peopleRecords||[];
  window.UMTE_SHARED={user:{name:'Utente test',id:'TEST-USER',role,personId,
   permissions:['schedulePeopleEvents','variation','competenceCreate','diaryEdit']},data:state};
  window.__count=0;
  window.UMTELeave={state,can:()=>true,user:()=>window.UMTE_SHARED.user,people:()=>people,
    record:(pid,date)=>({planned:pid==='OP1'?'RGLS':'M',effective:pid==='OP1'?'MF':'C'}),
    persist:()=>window.__count++,renderAll:()=>{},toast:()=>{}};
 },{state,role,personId});
 return {browser,p};
}
const people=[
 {id:'OP1',displayName:'Operatore Uno',name:'Uno',surname:'Operatore',nucleus:'Arona',team:'1',active:true},
 {id:'OP2',displayName:'Operatore Due',name:'Due',surname:'Operatore',nucleus:'Arona',team:'1',active:true},
 {id:'OP3',displayName:'Operatore Tre',name:'Tre',surname:'Operatore',nucleus:'Gallarate',team:'2',active:true}
];
test('Selettore corsi esclude congedo e malattia e conserva disponibilita RGLS',async()=>{
 const html='<div id="courseDialog"><input id="courseStartDate" type="date" value="2026-11-27"><input id="courseEndDate" type="date" value="2026-11-27"><input id="courseNucleus"><input id="coursePersonSearch"><div id="coursePeoplePicker"><label><input type="checkbox" value="OP1">Uno</label><label><input type="checkbox" value="OP2">Due</label><label><input type="checkbox" value="OP3">Tre</label></div></div>';
 const state={peopleRecords:people,leaveRequests:[{personId:'OP2',from:'2026-11-27',to:'2026-11-27',status:'approved'}],
  variations:[{personId:'OP3',date:'2026-11-27',shift:'MM'}],trainingEvents:[],medicalAppointments:[]};
 const {browser,p}=await page(html,state);
 try{
  await p.addScriptTag({path:script('course-availability-ui.js')});
  await p.waitForFunction(()=>document.querySelectorAll('#coursePeoplePicker input:disabled').length===2);
  assert.equal(await p.locator('input[value="OP1"]').isDisabled(),false);
  assert.equal(await p.locator('input[value="OP2"]').isDisabled(),true);
  assert.equal(await p.locator('input[value="OP3"]').isDisabled(),true);
  assert.match(await p.locator('#coursePeoplePicker').innerText(),/Non disponibile/);
 }finally{await browser.close();}
});
test('RGLS 08:00-16:36 contabilizza 7h36 dopo pausa e non altera turno',async()=>{
 const html='<form id="competenceForm"><select id="competencePerson"><option value="OP1">Uno</option></select><input id="competenceDate" value="2026-11-27"><input id="overtimeStart"><input id="overtimeEnd"><input id="overtimeReason"><label><input type="checkbox" data-allowance="overtime">Straordinario</label></form>';
 const {browser,p}=await page(html,{peopleRecords:people,variations:[],trainingEvents:[{startDate:'2026-11-27',endDate:'2026-11-27',start:'08:00',end:'16:36',personIds:['OP1']}],activities:[]});
 try{
  await p.addScriptTag({path:script('rgls-overtime-ui.js')});
  const calc=await p.evaluate(()=>window.UMTERGLSOvertime.calculate('08:00','16:36'));
  assert.deepEqual({gross:calc.grossMinutes,pause:calc.breakMinutes,net:calc.netMinutes}, {gross:516,pause:60,net:456});
  await p.locator('#competenceForm').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(await p.locator('[data-allowance="overtime"]').isChecked(),true);
  assert.equal(await p.locator('#overtimeStart').inputValue(),'08:00');
  assert.equal(await p.locator('#overtimeEnd').inputValue(),'16:36');
  assert.match(await p.locator('#overtimeReason').inputValue(),/7h36/);
 }finally{await browser.close();}
});
test('Amministrativo registra congedo C autorizzato nella giornata scelta',async()=>{
 const html='<section id="shifts"><div class="page-heading">Turni e presenze</div></section>';
 const {browser,p}=await page(html,{peopleRecords:people,variations:[],medicalAppointments:[],trainingEvents:[]},'administrative','OP1');
 try{
  await p.addScriptTag({path:script('congedo-operativo-ui.js')});
  await p.getByRole('button',{name:'Registra congedo (C)'}).click();
  const modal=p.locator('#umteDirectLeaveDialog');
  await modal.locator('select').selectOption('OP2');
  await modal.locator('input[type=date]').fill('2026-11-27');
  await modal.locator('input[type=text]').fill('Autorizzazione prova');
  p.on('dialog',dialog=>dialog.accept());
  await modal.getByRole('button',{name:'Registra C'}).click();
  const data=await p.evaluate(()=>({variations:window.UMTELeave.state.variations,saves:window.__count}));
  assert.equal(data.variations.length,1);
  assert.equal(data.variations[0].shift,'C');
  assert.equal(data.variations[0].personId,'OP2');
  assert.equal(data.saves,1);
 }finally{await browser.close();}
});
test('Preposto crea riferimento non programmato per TE-D del proprio nucleo',async()=>{
 const html='<section id="reports"><div class="page-heading">Rapportini</div></section><div id="activityBoard"></div>';
 const {browser,p}=await page(html,{peopleRecords:people,activities:[],activityDiary:[]},'preposto','OP1');
 try{
  await p.evaluate(()=>{window.__opened=[];document.querySelector('#activityBoard').addEventListener('click',e=>{if(e.target.dataset.openDiary)window.__opened.push(e.target.dataset.openDiary)})});
  await p.addScriptTag({path:script('rapportino-non-programmato-ui.js')});
  await p.getByRole('button',{name:'Nuovo TE-D senza attività'}).click();
  const modal=p.locator('dialog');
  await modal.locator('input[type=date]').fill('2026-11-23');
  await modal.locator('input[type=text]').nth(0).fill('Intervento non previsto');
  await modal.locator('input[type=text]').nth(1).fill('Arona');
  await modal.getByRole('button',{name:'Crea e apri TE-D'}).click();
  const data=await p.evaluate(()=>({activities:window.UMTELeave.state.activities,saves:window.__count,opened:window.__opened}));
  assert.equal(data.activities.length,1);
  assert.equal(data.activities[0].unplanned,true);
  assert.equal(data.activities[0].people.includes('OP1'),true);
  assert.equal(data.saves,1);
  assert.deepEqual(data.opened,[data.activities[0].id]);
 }finally{await browser.close();}
});
test('Mansione superiore mantiene la voce nelle competenze e il sostituto',async()=>{
 const html='<section id="competencies"><div class="page-heading">Competenze</div></section>';
 const state={peopleRecords:people,variations:[{personId:'OP2',date:'2026-11-27',shift:'C'}],leaveRequests:[],competencies:[]};
 const {browser,p}=await page(html,state);
 try{
  await p.addScriptTag({path:script('mansioni-superiori-ui.js')});
  await p.getByRole('button',{name:'Mansioni superiori'}).click();
  const form=p.locator('#umteSuperiorDialog form');
  await form.locator('select').nth(0).selectOption('OP1');
  await form.locator('select').nth(1).selectOption('OP2');
  await form.locator('input[type=date]').fill('2026-11-27');
  await form.locator('input').nth(1).fill('Capo Tecnico');
  await form.locator('input').nth(2).fill('Capo Tecnico');
  await form.locator('select').nth(2).selectOption('FERIE');
  await form.getByRole('button',{name:'Registra giornata'}).click();
  const d=await p.evaluate(()=>({records:window.UMTELeave.state.competencies,saves:window.__count}));
  assert.equal(d.records.length,1);
  assert.equal(d.records[0].allowances.superior,true);
  assert.equal(d.records[0].manualContribution.allowances.superior,true);
  assert.equal(d.records[0].superiorReplacement.replacementCid,'OP2');
  assert.equal(d.saves,1);
 }finally{await browser.close();}
});
