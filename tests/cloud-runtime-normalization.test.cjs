const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function environment(role='preposto'){
 class Storage{constructor(){this.data=new Map();}setItem(k,v){this.data.set(k,v);}getItem(k){return this.data.get(k)||null;}}
 const localStorage=new Storage(),elements=new Map(),fetches=[];
 const element=()=>({dataset:{},children:[],append(child){this.children.push(child);},set textContent(v){this.text=v;this.children=[];},get textContent(){return this.text||'';}});
 const body=element();
 const document={body,createElement:element,getElementById:id=>elements.get(id)||null,addEventListener(){}};
 const originalAppend=body.append.bind(body);
 body.append=child=>{if(child.id)elements.set(child.id,child);originalAppend(child);};
 const window={UMTE_SHARED:{user:{role,id:'TEST'},data:{activities:[],activityDiary:[],activityPublications:{}},revision:17},
  UMTEConflict:{saveWithSafeRetry:async({revision,patch,save})=>({result:(await save({revision,patch})).data,retried:false})},addEventListener(){}};
 const context={window,document,Storage,localStorage,structuredClone,JSON,fetch:async(url,options)=>{
  fetches.push({url,body:JSON.parse(options.body)});
  return {ok:true,status:200,json:async()=>({revision:18})};
 },location:{reload(){}},URL,Blob,setTimeout};
 const source=fs.readFileSync(path.join(__dirname,'..','cloud-runtime.js'),'utf8');
 vm.runInNewContext(source,context);
 return {localStorage,body,elements,fetches};
}
const report=notes=>JSON.stringify({activities:[],activityDiary:[{id:'TEST-REPORT',activityId:'TEST-ACT',...(notes?{notes}:{})}]});
test('a server enriched report requires refreshed state before another save',async()=>{
 const {localStorage,body,elements,fetches}=environment();
 localStorage.setItem('umte-manager-v01',report());
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.equal(body.dataset.sharedSaveNeedsReload,'1');
 assert.match(elements.get('sharedSaveStatus').textContent,/Aggiorna il gestionale/);
 assert.ok(elements.get('sharedSaveStatus').children.some(c=>c.textContent==='Aggiorna adesso'));
 localStorage.setItem('umte-manager-v01',report('seconda modifica'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.doesNotMatch(localStorage.getItem('umte-manager-v01'),/seconda modifica/);
});
test('team publication refreshes server supplied author and timestamp',async()=>{
 const {localStorage,body,fetches}=environment('chief');
 localStorage.setItem('umte-manager-v01',JSON.stringify({activities:[],activityDiary:[],activityPublications:{'2026-11-16|Arona|1':{revision:1,by:'Client'}}}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.equal(body.dataset.sharedSaveNeedsReload,'1');
});
test('a queued second change is flagged for recovery rather than silently lost',async()=>{
 const {localStorage,body,elements,fetches}=environment();
 localStorage.setItem('umte-manager-v01',report());
 localStorage.setItem('umte-manager-v01',report('seconda modifica'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.equal(body.dataset.sharedSaveFailed,'1');
 assert.match(localStorage.getItem('umte-manager-v01'),/seconda modifica/);
 assert.ok(elements.get('sharedSaveStatus').children.some(c=>c.textContent==='Scarica copia delle modifiche'));
});
