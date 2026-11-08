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
