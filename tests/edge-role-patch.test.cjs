const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Exercise the deployed Edge Function's actual role rules with synthetic records.
const source=fs.readFileSync(path.join(__dirname,'..','supabase','functions','umte-manager-api','index.ts'),'utf8');
const start=source.indexOf('const sid=');
const end=source.indexOf('const expectedOrigin=',start);
assert.ok(start>=0&&end>start,'role rules found in Edge Function');
const rules=source.slice(start,end).replace(/^export /gm,'')+'\nmodule.exports={visibleState,applyPatch,permissions};';
const sandbox={module:{exports:{}},structuredClone,crypto,Intl,Date};
vm.runInNewContext(rules,sandbox,{filename:'umte-manager-api/role-rules'});
const {visibleState,applyPatch,permissions}=sandbox.module.exports;

function fixture(){return {
 peopleRecords:[
  {id:'CT1',displayName:'CT prova',nucleus:'Arona',team:'1',active:true},
  {id:'OP1',displayName:'Operatore prova',nucleus:'Arona',team:'1',active:true},
  {id:'OP2',displayName:'Operatore collega',nucleus:'Arona',team:'1',active:true},
  {id:'OP3',displayName:'Altro nucleo',nucleus:'Gallarate',team:'2',active:true}
 ],activities:[
  {id:'A1',title:'Attività squadra',nucleus:'Arona',team:'Squadra 1',people:['OP1','OP2'],status:'ready',odls:[]},
  {id:'A2',title:'Altra attività',nucleus:'Gallarate',team:'Squadra 2',people:['OP3'],status:'ready',odls:[]}
 ],activityDiary:[],leaveRequests:[],competencies:[],operationalRequests:[],medicalAppointments:[],trainingEvents:[],trainingCompletions:[],courseCatalogOverrides:[],safetyRecords:[],auditLog:[]};}
const user=(role,id='T1',person_id='OP1')=>({role,user_id:id,person_id,name:'Profilo prova',email:'prova@example.invalid'});

for(const role of Object.keys(permissions))test('stato visibile e limiti '+role,()=>{
 const data=fixture(),u=user(role),visible=visibleState(data,u);
 assert.equal(Array.isArray(visible.activities),true);
 assert.equal(visible.activities.length,['chief','preposto','viewer'].includes(role)?1:2);
 assert.equal(visible.operationalRequests.length,0);
 assert.throws(()=>applyPatch(data,{__forbidden_test__:true},u),/non autorizzata/);
});
test('preposto compila rapportino assegnato e non quello di altro nucleo',()=>{
 const data=fixture(),u=user('preposto');
 const entry={id:'D1',activityId:'A1',date:'2026-11-22',actualPeopleIds:['OP1','OP2'],materialsUsed:[],materialsRemoved:[]};
 const next=applyPatch(data,{activityDiary:[entry]},u);
 assert.equal(next.activityDiary.length,1);
 assert.equal(next.activityDiary[0].createdByUserId,u.user_id);
 assert.throws(()=>applyPatch(data,{activityDiary:[{...entry,activityId:'A2',id:'D2'}]},u),/non assegnata/);
});
for(const role of ['preposto','chief'])test(role+' aggiorna lo stato della propria attività senza rimuovere altre squadre',()=>{
 const data=fixture(),u=user(role,'T2',role==='chief'?'CT1':'OP1');
 const next=applyPatch(data,{activities:[{...data.activities[0],status:'done'}]},u);
 assert.equal(next.activities.length,2);
 assert.equal(next.activities.find(a=>a.id==='A2').status,'ready');
 if(role==='preposto')assert.throws(()=>applyPatch(data,{activities:[{...data.activities[0],title:'Alterata'}]},u),/Solo esito/);
 else assert.equal(applyPatch(data,{activities:[{...data.activities[0],title:'Alterata'}]},u).activities.find(a=>a.id==='A1').title,'Alterata');
});
test('amministrativo non può approvare ferie e specialista sì',()=>{
 const data=fixture(),r={id:'F1',personId:'OP1',from:'2026-12-01',to:'2026-12-02',status:'approved',approvedBy:'T3'};
 assert.throws(()=>applyPatch(data,{leaveRequests:[r]},user('administrative')),/riservata/);
 assert.equal(applyPatch(data,{leaveRequests:[r]},user('specialist')).leaveRequests.length,1);
});
test('viewer invia solo segnalazioni proprie e non può alterarle',()=>{
 const data=fixture(),u=user('viewer'),r={id:'R1',personId:'OP1',title:'Prova',status:'resolved',createdByUserId:'OTHER'};
 const next=applyPatch(data,{operationalRequests:[r]},u);
 assert.equal(next.operationalRequests[0].createdByUserId,u.user_id);
 assert.equal(next.operationalRequests[0].status,'new');
 assert.throws(()=>applyPatch(next,{operationalRequests:[{...next.operationalRequests[0],title:'Alterata'}]},u),/non sono modificabili/);
});
test('capo tecnico non può sovrascrivere pubblicazioni e cataloghi fuori squadra',()=>{
 const data=fixture(),u=user('chief','T2','CT1');
 data.activityPublications={'2026-11-16':{revision:2,by:'Responsabile'}};
 data.activityCatalog=[{key:'manutenzione|altro|gallarate',title:'Altro nucleo'}];
 data.odlCatalog=[{id:'ODL-1',name:'Altro nucleo'}];
 assert.equal(Object.keys(visibleState(data,u).activityPublications).length,0);
 assert.equal(Object.hasOwn(visibleState(data,u),'activityCatalog'),false);
 assert.throws(()=>applyPatch(data,{activityPublications:{'2026-11-16':{revision:1}}},u),/Revisione programma non valida/);
 assert.throws(()=>applyPatch(data,{activityCatalog:[]},u),/riservata/);
 assert.equal(data.activityPublications['2026-11-16'].revision,2);
});
test('capo tecnico crea, modifica ed elimina attività della propria squadra',()=>{
 const data=fixture(),u=user('chief','T2','CT1'),own=data.activities[0];
 const created={...own,id:'A3',title:'Nuova attività',date:'2026-11-17'};
 const next=applyPatch(data,{activities:[own,created]},u);
 assert.equal(next.activities.length,3);
 assert.equal(next.activities.find(a=>a.id==='A2').title,'Altra attività');
 const changed=applyPatch(next,{activities:[{...own,title:'Attività modificata'},created]},u);
 assert.equal(changed.activities.find(a=>a.id==='A1').title,'Attività modificata');
 const removed=applyPatch(changed,{activities:[changed.activities.find(a=>a.id==='A1')]},u);
 assert.equal(removed.activities.length,2);
 assert.equal(removed.activities.find(a=>a.id==='A2').title,'Altra attività');
});
test('capo tecnico non può creare o spostare attività fuori squadra',()=>{
 const data=fixture(),u=user('chief','T2','CT1'),own=data.activities[0],other=data.activities[1];
 assert.throws(()=>applyPatch(data,{activities:[own,{...other,id:'A3'}]},u),/fuori dalla propria squadra/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,nucleus:'Gallarate'}]},u),/fuori dalla propria squadra/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,people:['OP1','OP3']}]},u),/Assegnazione fuori squadra/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,roleAssignments:{preposto:'OP3'}}]},u),/Incarico fuori squadra/);
 assert.throws(()=>applyPatch(data,{activities:[{...other,title:'Alterata'}]},u),/non autorizzata/);
});
test('capo tecnico pubblica solo la propria settimana e conserva le pubblicazioni generali',()=>{
 const data=fixture(),u=user('chief','T2','CT1'),week='2026-11-16',key=week+'|Arona|1';
 data.activities[0].date='2026-11-16';data.activities[1].date='2026-11-16';
 data.activityPublications={[week]:{revision:4,by:'Responsabile'},'2026-11-09|Gallarate|2':{revision:2,by:'Altro CT'}};
 const activities=[{...data.activities[0],status:'published'}];
 const patch={activities,activityPublications:{[key]:{at:'2026-11-22T12:00:00Z',by:'Falso',revision:1}}};
 const next=applyPatch(data,patch,u);
 assert.equal(next.activities.find(a=>a.id==='A1').status,'published');
 assert.equal(next.activities.find(a=>a.id==='A2').status,'ready');
 assert.equal(next.activityPublications[week].revision,4);
 assert.equal(next.activityPublications['2026-11-09|Gallarate|2'].revision,2);
 assert.equal(next.activityPublications[key].by,u.name);
 assert.equal(visibleState(next,u).activityPublications[key].revision,1);
 assert.equal(Object.keys(visibleState(next,u).activityPublications).length,1);
 assert.throws(()=>applyPatch(data,{activities},u),/Pubblicazione della squadra richiesta/);
 assert.throws(()=>applyPatch(next,{activityPublications:{[key]:{revision:3}}},u),/Revisione programma non valida/);
 assert.throws(()=>applyPatch(data,{activityPublications:{'2026-11-16|Gallarate|2':{revision:1}}},u),/Revisione programma non valida/);
});
test('capo tecnico non elimina attività con un rapportino',()=>{
 const data=fixture(),u=user('chief','T2','CT1');data.activityDiary=[{id:'D1',activityId:'A1',createdByUserId:'OTHER'}];
 assert.throws(()=>applyPatch(data,{activities:[]},u),/rapportino protetta/);
});
