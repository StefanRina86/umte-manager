const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const roles=['owner','specialist','administrative','chief','preposto','viewer'];
for(const role of roles)for(const width of [390,1440]){
 test('role guide '+role+' '+width+'px',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent('<!doctype html><html><body><main><h1>Ambiente sintetico</h1></main></body></html>');
   await page.evaluate(role=>{window.UMTE_SHARED={user:{role}}},role);
   await page.addStyleTag({path:path.join(root,'guida-rapida.css')});
   await page.addScriptTag({path:path.join(root,'guida-rapida.js')});
   const trigger=page.locator('#umteGuideLaunch');
   await trigger.click();
   assert.equal(await page.locator('#umteGuidePanel').isVisible(),true);
   assert.match(await page.locator('#umteGuidePanel').innerText(),/Come usare UMTE Manager/);
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Overflow for '+role+' '+width);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#umteGuidePanel').isVisible(),false);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
for(const width of [390,1440]){
 test('guided login '+width+'px: first use, visibility, recovery',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:820}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent('<html><body><main id="access"><h1>UMTE Manager</h1><form id="login"><input id="email" type="email"><input id="password" type="password"></form><p id="status"></p></main></body></html>');
   await page.evaluate(()=>{window.UMTE_CLOUD_CONFIG={url:'https://example.invalid',key:'test-public-key'};window.__resets=[];window.supabase={createClient:()=>({auth:{resetPasswordForEmail:async(email,opts)=>{window.__resets.push({email,opts});return {error:null};}}})}});
   await page.addStyleTag({path:path.join(root,'accesso-guidato.css')});
   await page.addScriptTag({path:path.join(root,'accesso-guidato.js')});
   await page.locator('#password').fill('placeholder-password');
   await page.getByRole('button',{name:'Mostra password'}).click();
   assert.equal(await page.locator('#password').getAttribute('type'),'text');
   await page.getByRole('button',{name:'Primo accesso?'}).click();
   assert.match(await page.locator('#umte-login-help').innerText(),/Apri la mail di invito/);
   await page.getByRole('button',{name:'Password dimenticata?'}).click();
   await page.locator('.umte-login-help input').fill('synthetic@example.invalid');
   await page.getByRole('button',{name:'Invia link per reimpostare'}).click();
   await page.waitForFunction(()=>window.__resets.length===1);
   assert.equal((await page.evaluate(()=>window.__resets))[0].email,'synthetic@example.invalid');
   assert.equal(await page.locator('#umte-login-help').isVisible(),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
