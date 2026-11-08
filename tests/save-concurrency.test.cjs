const test=require('node:test');
const assert=require('node:assert/strict');
require('../cloud-save-conflict.js');
const {saveWithSafeRetry,compareSections}=globalThis.UMTEConflict;
const clone=x=>JSON.parse(JSON.stringify(x));
function backend(){
 let revision=1,data={};
 return {
  snapshot:()=>({revision,data:clone(data)}),
  save:async ({revision:expected,patch})=>{
   await Promise.resolve();
   if(expected!==revision)return {ok:false,status:409,error:'Conflitto'};
   Object.assign(data,clone(patch));revision++;
   return {ok:true,data:{revision}};
  },
  load:async ()=>({revision,data:clone(data)})
 };
}
test('10 simultaneous non-overlapping sections are preserved',async()=>{
 const s=backend(),initial=s.snapshot();
 const ops=Array.from({length:10},(_,i)=>saveWithSafeRetry({
   save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,
   patch:{['section'+i]:{id:i}},maxAttempts:15
 }));
 const results=await Promise.all(ops);
 assert.equal(results.length,10);
 assert.equal(Object.keys(s.snapshot().data).length,10);
 assert.equal(s.snapshot().revision,11);
});
test('same section simultaneous edits never silently overwrite',async()=>{
 const s=backend(),initial=s.snapshot();
 const results=await Promise.allSettled([
   saveWithSafeRetry({save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,patch:{turns:{id:1}}}),
   saveWithSafeRetry({save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,patch:{turns:{id:2}}})
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
test('conflicts are limited to actual modified sections',()=>{
 assert.deepEqual(compareSections({baseline:{a:1,b:1},remote:{a:1,b:2},patch:{a:3}}),{safe:true,conflicting:[]});
 assert.deepEqual(compareSections({baseline:{a:1,b:1},remote:{a:2,b:1},patch:{a:3}}),{safe:false,conflicting:['a']});
});
test('non-409 errors do not retry writes',async()=>{
 let calls=0;
 await assert.rejects(saveWithSafeRetry({
  revision:1,baseline:{},patch:{a:1},load:async()=>{throw Error('Unexpected refresh');},
  save:async()=>{calls++;return {ok:false,status:403,error:'Not authorized'};}
 }),/Not authorized/);
 assert.equal(calls,1);
});

test('10 different rapportini merge without losing entries',async()=>{
 const s=backend(),initial=s.snapshot();
 const base={...initial.data,activityDiary:[]};
 const ops=Array.from({length:10},(_,i)=>saveWithSafeRetry({
  save:s.save,load:s.load,revision:initial.revision,baseline:base,
  patch:{activityDiary:[{id:'R-'+i,createdByUserId:'TEST-'+i}]},maxAttempts:15
 }));
 await Promise.all(ops);
 assert.equal(s.snapshot().data.activityDiary.length,10);
 assert.equal(new Set(s.snapshot().data.activityDiary.map(r=>r.id)).size,10);
});
test('two concurrent edits to identical rapportino are blocked',async()=>{
 const s=backend(),initial=s.snapshot();
 const ops=['A','B'].map(v=>saveWithSafeRetry({
  save:s.save,load:s.load,revision:initial.revision,
  baseline:{...initial.data,activityDiary:[]},
  patch:{activityDiary:[{id:'SAME',note:v}]}
 }));
 const results=await Promise.allSettled(ops);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
 assert.equal(s.snapshot().data.activityDiary.length,1);
});
test('unkeyed variations do not merge automatically',()=>{
 assert.equal(compareSections({
  baseline:{variations:[{date:'2026-11-08',shift:'M'}]},
  remote:{variations:[{date:'2026-11-08',shift:'N'}]},
  patch:{variations:[{date:'2026-11-08',shift:'P'}]}
 }).safe,false);
});
test('invalid or duplicate record identifiers never auto-merge',()=>{
 const {reconcileSections}=globalThis.UMTEConflict;
 assert.equal(reconcileSections({
  baseline:{activityDiary:[]},remote:{activityDiary:[{id:'A'}]},
  patch:{activityDiary:[{id:'A'},{id:'A'}]}
 }).safe,false);
});

test('10 users edit different records within the SAME section without losing data',async()=>{
 const people=Array.from({length:10},(_,i)=>({id:'p'+i,n:i,value:0}));
 const s=backend(),seed=s.snapshot();
 await s.save({revision:seed.revision,patch:{peopleRecords:people}});
 const initial=s.snapshot();
 const promises=people.map((_,index)=>saveWithSafeRetry({
  save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,
  patch:{peopleRecords:people.map((p,i)=>({...p,value:i===index?index+1:0}))},
  maxAttempts:15
 }));
 await Promise.all(promises);
 assert.deepEqual(s.snapshot().data.peopleRecords.map(p=>p.value),[1,2,3,4,5,6,7,8,9,10]);
});
test('simultaneous edits to same identified record are blocked',async()=>{
 const s=backend();
 await s.save({revision:1,patch:{peopleRecords:[{id:'a',shift:'M'},{id:'b',shift:'N'}]}});
 const initial=s.snapshot();
 const results=await Promise.allSettled(['P','MIR'].map(shift=>saveWithSafeRetry({
  save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,
  patch:{peopleRecords:[{id:'a',shift},{id:'b',shift:'N'}]}
 })));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
test('records lacking stable unique id never merge automatically',()=>{
 const old={variations:[{personId:'a',date:'2026-11-08',shift:'M'}]};
 const current={variations:[{personId:'a',date:'2026-11-08',shift:'N'}]};
 const local={variations:[{personId:'a',date:'2026-11-08',shift:'P'}]};
 const {rebasePatch}=globalThis.UMTEConflict;
 assert.equal(rebasePatch({baseline:old,remote:current,patch:local}).safe,false);
});
test('deleted record conflicts with concurrent update',()=>{
 const {rebasePatch}=globalThis.UMTEConflict;
 const initial={activityDiary:[{id:'1',text:'a'},{id:'2',text:'b'}]};
 const remote={activityDiary:[{id:'1',text:'updated'},{id:'2',text:'b'}]};
 const local={activityDiary:[{id:'2',text:'b'}]};
 assert.equal(rebasePatch({baseline:initial,remote,patch:local}).safe,false);
});
test('different record updates retain server additions',()=>{
 const {rebasePatch}=globalThis.UMTEConflict;
 const baseline={activityDiary:[{id:'A',text:'a'}]};
 const remote={activityDiary:[{id:'A',text:'a'},{id:'B',text:'b'}]};
 const local={activityDiary:[{id:'A',text:'updated'}]};
 const m=rebasePatch({baseline,remote,patch:local});
 assert.equal(m.safe,true);
 assert.deepEqual(m.patch.activityDiary,[{id:'A',text:'updated'},{id:'B',text:'b'}]);
});
