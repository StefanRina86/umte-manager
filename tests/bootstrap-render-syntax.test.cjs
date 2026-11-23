const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('authenticated bootstrap produces complete, syntactically valid application',async()=>{
 const root=path.join(__dirname,'..');
 const app=fs.readFileSync(path.join(root,'app.html'),'utf8');
 const bootstrap=fs.readFileSync(path.join(root,'cloud-bootstrap.js'),'utf8');
 const element=()=>({dataset:{},hidden:false,disabled:false,textContent:''});
 const elements={status:element(),login:element(),exit:element(),enter:element()};
 let rendered='';
 const document={getElementById:id=>elements[id]||(elements[id]=element()),open(){},write(value){rendered=value;},close(){}};
 const cloud={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}};
 const window={UMTE_CLOUD_CONFIG:{url:'https://synthetic.invalid',key:'synthetic'},supabase:{createClient:()=>cloud},fetch:async url=>url==='app.html'?{ok:true,text:async()=>app}:{ok:true,json:async()=>({revision:17,data:{},baseline:{},capabilities:{energyMaintenance:true},user:{role:'owner',name:'Test',permissions:[]}})}};
 const context={window,document,location:{href:'https://synthetic.invalid/',origin:'https://synthetic.invalid',search:''},URL,URLSearchParams,localStorage:{removeItem(){}}};
 await vm.runInNewContext(bootstrap,context,{filename:'cloud-bootstrap.js'});
 assert.ok(rendered.length>app.length,'application was written after authentication: '+elements.status.textContent);
 assert.ok(rendered.includes('function visibleActivities()'),'weekly activities remain present');
 assert.ok(!rendered.includes('Warning: truncated output'),'tool output must never become source code');
 let count=0;
 for(const match of rendered.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){
  if(!match[1].trim())continue;
  new vm.Script(match[1],{filename:`rendered inline script ${++count}`});
 }
 assert.ok(count>=20,'all application scripts were checked');
});
