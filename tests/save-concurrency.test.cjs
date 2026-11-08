const test=require('node:test');
const assert=require('node:assert/strict');
require('../cloud-save-conflict.js');
const {saveWithSafeRetry,rebasePatch}=globalThis.UMTEConflict;
const clone=o=>JSON.parse(JSON.stringify(o));
function backend(data={}){
 let revision=1,current=clone(data);
 return {
  snapshot:()=>({revision,data:clone(current)}),
  save:async ({revision:expected,patch})=>{
   await Promise.resolve();
   if(expected!==revision)return {ok:false,status:409,error:'Conflitto'};
   Object.assign(current,clone(patch));revision++;
   return {ok:true,data:{revision}};
  },
  load:async ()=>({revision,data:clone(current)})
 };
}
const run=(s,initial,patch,maxAttempts=16)=>saveWithSafeRetry({
 save:s.save,load:s.load,revision:initial.revision,baseline:initial.data,patch,maxAttempts
});
test('ten concurrent inserts of independent rapportini preserve all',async()=>{
 const s=backend({activityDiary:[]}),base=s.snapshot();
 await Promise.all(Array.from({length:10},(_,i)=>run(s,base,{
  activityDiary:[{id:'TE-D-'+i,createdByUserId:'SYNTH-'+i}]
 })));
 assert.equal(s.snapshot().data.activityDiary.length,10);
 assert.equal(new Set(s.snapshot().data.activityDiary.map(x=>x.id)).size,10);
});
test('ten changes to unrelated top-level sections preserve all',async()=>{
 const s=backend(),base=s.snapshot();
 await Promise.all(Array.from({length:10},(_,i)=>run(s,base,{['other'+i]:{v:i}})));
 assert.equal(Object.keys(s.snapshot().data).length,10);
});
test('two changes to same rapportino cannot overwrite',async()=>{
 const s=backend({activityDiary:[{id:'A',text:'old'}]}),base=s.snapshot();
 const results=await Promise.allSettled(['one','two'].map(text=>run(s,base,{activityDiary:[{id:'A',text}]})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
test('different rapportini in one section can merge',async()=>{
 const s=backend({activityDiary:[{id:'A',text:'old'},{id:'B',text:'old'}]}),base=s.snapshot();
 await Promise.all([
  run(s,base,{activityDiary:[{id:'A',text:'new'},{id:'B',text:'old'}]}),
  run(s,base,{activityDiary:[{id:'A',text:'old'},{id:'B',text:'new'}]})
 ]);
 assert.deepEqual(s.snapshot().data.activityDiary.map(x=>x.text),['new','new']);
});
test('peopleRecords changes on stale state are blocked, even for different workers',async()=>{
 const s=backend({peopleRecords:[{id:'A',team:1},{id:'B',team:1}]}),base=s.snapshot();
 const results=await Promise.allSettled([
  run(s,base,{peopleRecords:[{id:'A',team:2},{id:'B',team:1}]}),
  run(s,base,{peopleRecords:[{id:'A',team:1},{id:'B',team:2}]})
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected').length,1);
});
test('unkeyed shifts and variations never merge concurrently',()=>{
 const baseline={variations:[{date:'2026-11-08',shift:'M'}]};
 const remote={variations:[{date:'2026-11-08',shift:'N'}]};
 const patch={variations:[{date:'2026-11-08',shift:'P'}]};
 assert.equal(rebasePatch({baseline,remote,patch}).safe,false);
});
test('duplicate report ID refuses an automatic merge',()=>{
 const baseline={activityDiary:[]};
 const remote={activityDiary:[{id:'A'}]};
 const patch={activityDiary:[{id:'A'},{id:'A'}]};
 assert.equal(rebasePatch({baseline,remote,patch}).safe,false);
});
test('concurrent edit and deletion of same report refuses merge',()=>{
 const baseline={activityDiary:[{id:'A',text:'old'}]};
 const remote={activityDiary:[{id:'A',text:'changed'}]};
 const patch={activityDiary:[]};
 assert.equal(rebasePatch({baseline,remote,patch}).safe,false);
});
test('successful merge retains records created remotely',()=>{
 const baseline={activityDiary:[{id:'A',text:'old'}]};
 const remote={activityDiary:[{id:'A',text:'old'},{id:'B',text:'remote'}]};
 const patch={activityDiary:[{id:'A',text:'local'}]};
 const result=rebasePatch({baseline,remote,patch});
 assert.equal(result.safe,true);
 assert.deepEqual(result.patch.activityDiary,[{id:'A',text:'local'},{id:'B',text:'remote'}]);
});
test('authorization failures are not retried',async()=>{
 let attempts=0;
 await assert.rejects(saveWithSafeRetry({
  revision:1,baseline:{},patch:{x:1},
  load:async()=>{throw Error('must not load')},
  save:async()=>{attempts++;return {ok:false,status:403,error:'Forbidden'}}
 }),/Forbidden/);
 assert.equal(attempts,1);
});

test('10 simultaneous distinct rapportini in the same array are all preserved',async()=>{
 const initial={activityDiary:Array.from({length:10},(_,i)=>({id:'REPORT-'+i,activityId:'ACT-'+i,notes:'original'}))};
 const s=backend();const first=s.snapshot();
 // Initialize fixture through the public save contract.
 await s.save({revision:first.revision,patch:initial});
 const base=s.snapshot();
 const changes=Array.from({length:10},(_,i)=>({activityDiary:base.data.activityDiary.map(r=>r.id==='REPORT-'+i?{...r,notes:'edited-'+i}:r)}));
 const results=await Promise.all(changes.map(patch=>saveWithSafeRetry({save:s.save,load:s.load,revision:base.revision,baseline:base.data,patch,maxAttempts:15})));
 assert.equal(results.length,10);
 assert.equal(s.snapshot().data.activityDiary.length,10);
 for(let i=0;i<10;i++)assert.equal(s.snapshot().data.activityDiary.find(r=>r.id==='REPORT-'+i).notes,'edited-'+i);
});
test('overlapping edits to one rapportino fail closed',async()=>{
 const old={activityDiary:[{id:'REPORT-1',notes:'old'}]};
 const result=globalThis.UMTEConflict.reconcile({
  baseline:old,
  remote:{activityDiary:[{id:'REPORT-1',notes:'other user'}]},
  patch:{activityDiary:[{id:'REPORT-1',notes:'our user'}]}
 });
 assert.equal(result.safe,false);
 assert.equal(result.conflicting.length,1);
});
test('a new report from another user is preserved during disjoint edit',()=>{
 const result=globalThis.UMTEConflict.reconcile({
  baseline:{activityDiary:[{id:'A',notes:'old'}]},
  remote:{activityDiary:[{id:'A',notes:'old'},{id:'B',notes:'new'}]},
  patch:{activityDiary:[{id:'A',notes:'ours'}]}
 });
 assert.equal(result.safe,true);
 assert.equal(result.patch.activityDiary.length,2);
 assert.equal(result.patch.activityDiary.find(r=>r.id==='B').notes,'new');
});
test('deletion does not remove a concurrently modified report',()=>{
 const result=globalThis.UMTEConflict.reconcile({
  baseline:{activityDiary:[{id:'A',notes:'old'}]},
  remote:{activityDiary:[{id:'A',notes:'new'}]},
  patch:{activityDiary:[]}
 });
 assert.equal(result.safe,false);
});
test('ambiguous duplicate identifiers fail closed',()=>{
 const result=globalThis.UMTEConflict.reconcile({
  baseline:{activityDiary:[{id:'A',notes:'old'}]},
  remote:{activityDiary:[{id:'A',notes:'other'}]},
  patch:{activityDiary:[{id:'A',notes:'first'},{id:'A',notes:'second'}]}
 });
 assert.equal(result.safe,false);
});
test('turn variations without stable IDs do not merge independently',()=>{
 const result=globalThis.UMTEConflict.reconcile({
  baseline:{variations:[{personId:'1',date:'2026-11-08',shift:'M'}]},
  remote:{variations:[{personId:'1',date:'2026-11-08',shift:'P'}]},
  patch:{variations:[{personId:'1',date:'2026-11-08',shift:'N'}]}
 });
 assert.equal(result.safe,false);
});
