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
