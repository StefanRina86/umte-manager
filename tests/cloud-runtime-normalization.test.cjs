const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('a server enriched report requires refreshed state before another save',async()=>{
 class Storage{constructor(){this.data=new Map();}setItem(k,v){this.data.set(k,v);}getItem(k){return this.data.get(k)||null;}}
 const localStorage=new Storage(),elements=new Map(),fetches=[];
 const element=()=>({dataset:{},children:[],append(child){this.children.push(child);},set textContent(v){this.text=v;this.children=[];},get textContent(){return this.text||'';}});
 const body=element();
 const document={body,createElement:element,getElementById:id=>elements.get(id)||null,addEventListener(){}};
 const originalAppend=body.append.bind(body);
 body.append=child=>{if(child.id)elements.set(child.id,child);originalAppend(child);};
 const window={UMTE_SHARED:{user:{role:'preposto',id:'TEST'},data:{activities:[],activityDiary:[]},revision:17},
  UMTEConflict:{saveWithSafeRetry:async({revision,patch,save})=>({result:(await save({revision,patch})).data,retried:false})},addEventListener(){}};
 const context={window,document,Storage,localStorage,structuredClone,JSON,fetch:async(url,options)=>{
  fetches.push({url,body:JSON.parse(options.body)});
  return {ok:true,status:200,json:async()=>({revision:18})};
 },location:{reload(){}},URL,Blob,setTimeout};
 const source=fs.readFileSync(path.join(__dirname,'..','cloud-runtime.js'),'utf8');
 vm.runInNewContext(source,context);
 localStorage.setItem('umte-manager-v01',JSON.stringify({activities:[],activityDiary:[{id:'TEST-REPORT',activityId:'TEST-ACT'}]}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.equal(body.dataset.sharedSaveNeedsReload,'1');
 assert.match(elements.get('sharedSaveStatus').textContent,/Aggiorna il gestionale/);
 assert.ok(elements.get('sharedSaveStatus').children.some(c=>c.textContent==='Aggiorna adesso'));
 localStorage.setItem('umte-manager-v01',JSON.stringify({activities:[],activityDiary:[{id:'TEST-REPORT',activityId:'TEST-ACT',notes:'seconda modifica'}]}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches.length,1);
 assert.doesNotMatch(localStorage.getItem('umte-manager-v01'),/seconda modifica/);
});
