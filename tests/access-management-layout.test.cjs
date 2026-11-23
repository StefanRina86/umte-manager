const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const script=path.join(__dirname,'..','cloud-bootstrap.js');
for(const width of [390,1440]){
 test('access management '+width+'px: filter, role, CID, enable and remove only Manager membership',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',err=>errors.push(String(err)));
   await page.route('https://synthetic.invalid/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main><form id="login"><input id="email"><input id="password"><button id="enter"></button></form><div id="status"></div><button id="exit" hidden></button></main></body></html>'}));
   await page.goto('https://synthetic.invalid/?accessi=1');
   await page.evaluate(()=>{
    window.calls=[];
    window.UMTE_CLOUD_CONFIG={url:'https://backend.invalid',key:'synthetic-public-key'};
    window.supabase={createClient:()=>({auth:{
      getSession:async()=>({data:{session:{access_token:'synthetic-token'}}}),
      signOut:async()=>({})
    }})};
    window.fetch=async(url,opts)=>{
      const data=JSON.parse(opts.body);
      window.calls.push(data);
      if(data.action==='reset_password')return {ok:true,json:async()=>({ok:true,message:'Password reimpostata sul CID'})};
      if(data.action==='state')return {ok:true,json:async()=>({data:{peopleRecords:[{id:'CID-1',displayName:'Persona Test',active:true}]},user:{role:'owner'}})};
      if(data.action==='members'&&data.remove)return {ok:true,json:async()=>({ok:true,removed:true})};
      if(data.action==='members'&&data.update)return {ok:true,json:async()=>({ok:true})};
      return {ok:true,json:async()=>({members:[
        {user_id:'owner',name:'Responsabile',email:'owner@example.invalid',role:'owner',enabled:true},
        {user_id:'test',name:'Collaudo',email:'test@example.invalid',role:'viewer',person_id:'CID-1',enabled:false}
      ]})};
    };
   });
   await page.addScriptTag({path:script});
   await page.getByText('Gestione accessi e abilitazioni').waitFor();
   const view=page.locator('main');
   assert.match(await view.innerText(),/2 account registrati/);
   await page.getByPlaceholder('Cerca nome, email o CID').fill('Collaudo');
   assert.match(await view.innerText(),/1 visualizzati/);
   await page.getByPlaceholder('Cerca nome, email o CID').fill('');
   const selects=page.locator('main section select');
   await selects.first().selectOption('preposto');
   await page.locator('main section input[type=checkbox]').check();
   await page.getByRole('button',{name:'Salva modifiche'}).click();
   await page.getByText('Profilo aggiornato correttamente').waitFor();
   let updates=await page.evaluate(()=>window.calls.filter(x=>x.update));
   assert.equal(updates.length,1);
   assert.deepEqual(updates[0].update,{userId:'test',role:'preposto',personId:'CID-1',enabled:true});
   const reset=page.getByRole('button',{name:'Reimposta password al CID'});
   assert.equal(await reset.count(),1,'Owner user must not have a reset button');
   page.on('dialog',dialog=>dialog.accept(dialog.message().includes('Reimpostare')?'REIMPOSTA':'ELIMINA'));
   await reset.click();
   await page.getByText(/Password reimpostata sul CID/).waitFor();
   const requests=await page.evaluate(()=>window.calls.filter(c=>c.action==='reset_password'));
   assert.equal(requests.length,1);
   assert.deepEqual(requests[0],{action:'reset_password',userId:'test',confirmed:true});

   await page.getByRole('button',{name:'Elimina account da UMTE Manager'}).click();
   await page.getByText('1 account registrati').waitFor();
   const removals=await page.evaluate(()=>window.calls.filter(x=>x.remove));
   assert.equal(removals.length,1);
   assert.deepEqual(removals[0].remove,{userId:'test'});
   assert.equal(await page.getByText('Responsabile · account principale').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal overflow '+width);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}