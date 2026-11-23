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
test('anagrafica rifiuta schede nulle e CID duplicati senza modificare i dati',()=>{
 const data=fixture(),u=user('owner');
 const original=JSON.stringify(data);
 assert.throws(()=>applyPatch(data,{peopleRecords:[...data.peopleRecords,null]},u),/Anagrafica personale non valida/);
 assert.throws(()=>applyPatch(data,{peopleRecords:[...data.peopleRecords,{...data.peopleRecords[0]}]},u),/Anagrafica personale non valida/);
 assert.equal(JSON.stringify(data),original);
});

for(const role of Object.keys(permissions))test('stato visibile e limiti '+role,()=>{
 const data=fixture(),u=user(role),visible=visibleState(data,u);
 assert.equal(Array.isArray(visible.activities),true);
 assert.equal(visible.activities.length,['preposto','viewer'].includes(role)?1:2);
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
 assert.throws(()=>applyPatch(data,{activities:[own,{...other,id:'A3'}]},u),/fuori dal proprio nucleo/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,nucleus:'Gallarate'}]},u),/fuori dal proprio nucleo/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,people:['OP1','OP3']}]},u),/Assegnazione fuori nucleo/);
 assert.throws(()=>applyPatch(data,{activities:[{...own,roleAssignments:{preposto:'OP3'}}]},u),/Incarico fuori nucleo/);
 assert.throws(()=>applyPatch(data,{activities:[{...other,title:'Alterata'}]},u),/sola lettura/);
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


test('Capo Tecnico vede da oggi la visita di domani assegnata al suo CID, non quella di altri',()=>{
 const data=fixture();
 data.medicalAppointments=[
  {id:'MED-ROSATI',personId:'OP1',date:'2026-11-24',start:'08:00',end:'13:00',visibilityFrom:'2026-11-23',location:'Riservato',reason:'Dati sanitari'},
  {id:'MED-ALTRO',personId:'OP2',date:'2026-11-24',start:'09:00',end:'11:00',location:'Riservato'}
 ];
 const chief=visibleState(data,user('chief'));
 assert.equal(chief.medicalAppointments.length,1);
 assert.equal(chief.medicalAppointments[0].id,'MED-ROSATI');
 assert.equal(chief.medicalAppointments[0].personId,'OP1');
 assert.equal(chief.medicalAppointments[0].date,'2026-11-24');
 assert.equal(chief.medicalAppointments[0].location,undefined);
 assert.equal(chief.medicalAppointments[0].reason,undefined);
 assert.equal(chief.medicalAppointments[0].visibilityFrom,'2026-11-23');
 assert.equal(visibleState(data,user('preposto')).medicalAppointments.length,1);
 assert.equal(visibleState(data,user('viewer','U2','OP2')).medicalAppointments[0].id,'MED-ALTRO');
 assert.equal(visibleState(data,user('administrative')).medicalAppointments.length,2);
});
test('Corso visibile a chi partecipa senza elenco di altri colleghi',()=>{
 const data=fixture();
 data.trainingEvents=[
  {id:'EV1',type:'course',title:'Formazione',startDate:'2026-11-24',endDate:'2026-11-24',personIds:['OP1','OP2']},
  {id:'EV2',type:'course',title:'Altro nucleo',startDate:'2026-11-24',endDate:'2026-11-24',personIds:['OP3']}
 ];
 const visible=visibleState(data,user('chief'));
 assert.equal(visible.trainingEvents.length,1);
 assert.equal(visible.trainingEvents[0].id,'EV1');
 assert.deepEqual(Array.from(visible.trainingEvents[0].personIds),['OP1']);
 assert.equal(visibleState(data,user('administrative')).trainingEvents.length,2);
});


test('CT consulta altri nuclei ma può variare turni e competenze solo nel proprio nucleo',()=>{
 const data=fixture(),chief=user('chief','T2','CT1');
 data.peopleRecords.push({id:'OP4',displayName:'Altro operatore Arona',nucleus:'Arona',team:'3',active:true});
 data.variations=[{id:'V1',personId:'OP1',date:'2026-11-24',shift:'M'},{id:'V2',personId:'OP3',date:'2026-11-24',shift:'P'}];
 data.competencies=[{id:'K1',personId:'OP2',date:'2026-11-24',allowances:{line:true}},{id:'K2',personId:'OP3',date:'2026-11-24',allowances:{line:true}}];
 const view=visibleState(data,chief);
 assert.equal(view.activities.length,2,'CT sees all activities');
 assert.equal(view.peopleRecords.length,5,'CT can view all nuclei');
 assert.equal(view.variations.length,1,'CT only receives editable variations of own nucleus');
 assert.equal(view.competencies.length,1,'CT only receives own nucleus competence data');
 const v=applyPatch(data,{variations:[{...view.variations[0],shift:'N'},{id:'V3',personId:'OP4',date:'2026-11-25',shift:'M'}]},chief);
 assert.equal(v.variations.find(r=>r.id==='V2').shift,'P');
 assert.equal(v.variations.find(r=>r.id==='V3').shift,'M');
 assert.throws(()=>applyPatch(data,{variations:[{...view.variations[0]},{id:'VX',personId:'OP3',date:'2026-11-25',shift:'M'}]},chief),/fuori dalla giurisdizione/);
 const c=applyPatch(data,{competencies:[...view.competencies,{id:'K3',personId:'OP4',date:'2026-11-25',status:'draft',allowances:{overtime:true}}]},chief);
 assert.equal(c.competencies.find(r=>r.id==='K2').personId,'OP3');
 assert.throws(()=>applyPatch(data,{competencies:[...view.competencies,{id:'KX',personId:'OP3',date:'2026-11-25'}]},chief),/fuori dalla giurisdizione/);
});
test('Corso non iscrive lavoratore in congedo o malattia, ma ammette RGLS per computo straordinario',()=>{
 const data=fixture(),owner=user('owner');
 const course={id:'C1',startDate:'2026-11-27',endDate:'2026-11-27',start:'08:00',end:'16:36',personIds:['OP1']};
 data.leaveRequests=[{id:'L1',personId:'OP1',from:'2026-11-27',to:'2026-11-27',status:'approved'}];
 assert.throws(()=>applyPatch(data,{trainingEvents:[course]},owner),/congedo confermato/);
 data.leaveRequests=[];
 data.variations=[{id:'V1',personId:'OP1',date:'2026-11-27',shift:'MM'}];
 assert.throws(()=>applyPatch(data,{trainingEvents:[course]},owner),/assenza prevista/);
 data.variations=[{id:'V1',personId:'OP1',date:'2026-11-27',shift:'RGLS'}];
 assert.equal(applyPatch(data,{trainingEvents:[course]},owner).trainingEvents.length,1);
});
