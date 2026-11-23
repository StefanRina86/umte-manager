const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const JSZip=require('jszip');
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
test('RGLS notturno 22:00-05:36 senza pausa pranzo',async()=>{
 const {browser,p}=await page('<div></div>',{peopleRecords:people,variations:[],activities:[]});
 try{
  await p.addScriptTag({path:script('rgls-overtime-ui.js')});
  const c=await p.evaluate(()=>window.UMTERGLSOvertime.calculate('22:00','05:36'));
  assert.equal(c.grossMinutes,456);
  assert.equal(c.breakMinutes,0);
  assert.equal(c.netMinutes,456);
 }finally{await browser.close();}
});
test('Cambio turno da RGLS a presenza M registra straordinario completo senza doppio inserimento',async()=>{
 const html='<form id="variationForm"><select id="variationPerson"><option value="OP1">Uno</option></select><input id="variationDate" value="2026-11-27"><select id="variationShift"><option value="M">M</option></select><input id="variationActualStart" value="08:00"><input id="variationActualEnd" value="16:36"></form>';
 const {browser,p}=await page(html,{peopleRecords:people,variations:[],competencies:[],trainingEvents:[]});
 try{
  await p.evaluate(()=>{
   document.getElementById('variationForm').addEventListener('submit',e=>{
    e.preventDefault();
    window.UMTELeave.state.variations=[{personId:'OP1',date:'2026-11-27',shift:'M',actualStart:'08:00',actualEnd:'16:36'}];
    window.UMTELeave.persist();
   });
  });
  await p.addScriptTag({path:script('rgls-overtime-ui.js')});
  await p.locator('#variationForm').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await p.waitForFunction(()=>window.UMTELeave.state.competencies?.length===1);
  const d=await p.evaluate(()=>({competencies:window.UMTELeave.state.competencies,saveCount:window.__count}));
  assert.equal(d.competencies[0].allowances.overtime,true);
  assert.equal(d.competencies[0].overtimeNetMinutes,456);
  assert.equal(d.competencies[0].overtimeBreakMinutes,60);
  assert.match(d.competencies[0].overtimeReason,/7h36/);
  assert.equal(d.saveCount,2);
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
  await p.context().setDefaultTimeout(7000);
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
  await p.addScriptTag({path:require.resolve('jszip/dist/jszip.min.js')});
  const panel=p.locator('#umteSuperiorDialog');
  await panel.locator('input[type=month]').fill('2026-11');
  await panel.locator('select').last().selectOption('Arona');
  const request=p.waitForEvent('download');
  await panel.getByRole('button',{name:'Esporta riepilogo XLSX'}).click();
  const download=await request;
  assert.match(download.suggestedFilename(),/MANSIONI_SUPERIORI_Arona_2026-11.xlsx/);
  const zipped=await JSZip.loadAsync(fs.readFileSync(await download.path()));
  const xml=await zipped.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(xml,/RIEPILOGO UTILIZZAZIONE IN MANSIONI DI LIVELLO SUPERIORE/);
  assert.match(xml,/Capo Tecnico/);
  assert.match(xml,/FERIE/);
 }finally{await browser.close();}
});
