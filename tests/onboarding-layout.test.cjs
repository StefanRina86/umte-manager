const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
function pageHtml(name,mock){
 let html=fs.readFileSync(path.join(root,name),'utf8');
 html=html.replaceAll('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" defer></script>','')
          .replaceAll('<script src="config.js?v=security-20261105" defer></script>','');
 return html.replace('</head>','<script>'+mock+'</script></head>');
}
const inviteMock=`
window.calls=[];
window.UMTE_CLOUD_CONFIG={url:'https://synthetic.invalid',key:'synthetic-public-key'};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic-session'}}})}})};
window.fetch=async function(url,opts){
 const request=JSON.parse(opts.body); window.calls.push({url,request});
 let data={ok:true};
 if(request.action==='state')data={user:{role:'owner'},data:{peopleRecords:[
  {id:'TEST-1',displayName:'Person Test',nucleus:'NUCLEO TEST',team:'1',active:true},
  {id:'TEST-2',displayName:'Inactive Test',nucleus:'NUCLEO TEST',team:'1',active:false}
 ]}};
 if(request.action==='members')data={members:[]};
 if(request.action==='candidates')data={candidates:[
  {personId:'TEST-1',displayName:'Person Test',nucleus:'NUCLEO TEST',team:'1',qualification:'CT',email:'test.person@example.invalid',matchingNucleus:true,suggestedRole:'chief',needsVerification:false}
 ]};
 if(request.action==='invite')data={ok:true,message:'Invito inviato (simulazione)'};
 if(request.action==='testInvite')data={ok:true,pending:true,message:'Invito di collaudo simulato (account disabilitato)'};
 return {ok:true,status:200,json:async()=>data};
};`;
const passwordMock=`
window.updatedPasswords=[];
window.UMTE_CLOUD_CONFIG={url:'https://synthetic.invalid',key:'synthetic-public-key'};
window.supabase={createClient:()=>({auth:{
 getSession:async()=>({data:{session:{access_token:'synthetic-session'}}}),
 updateUser:async({password})=>{window.updatedPasswords.push(password);return {error:null};}
}})};`;
for(const width of [390,1440]){
 test('invite portal '+width+'px owner can request a disabled account invitation',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent(pageHtml('accessi-colleghi.html',inviteMock));
   await page.waitForSelector('#inviteForm:not([hidden])');
   assert.equal(await page.locator('#person option').count(),2);
   await page.locator('#person').selectOption('TEST-1');
   assert.equal(await page.locator('#email').inputValue(),'test.person@example.invalid');
   assert.equal(await page.locator('#role').inputValue(),'chief');
   await page.locator('#email').fill('synthetic@example.invalid');
   await page.locator('#role').selectOption('viewer');
   await page.locator('#verified').check();
   await page.locator('#send').click();
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Invito inviato'));
   const call=await page.evaluate(()=>window.calls.filter(x=>x.request.action==='invite'));
   assert.equal(call.length,1);
   assert.deepEqual(call[0].request,{action:'invite',email:'synthetic@example.invalid',personId:'TEST-1',role:'viewer',emailVerified:true});
   assert.deepEqual(errors,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Invite page has horizontal overflow at '+width+'px');
   const redirect=page.locator('code').first();
   if(width===390&&await redirect.count()){
    const geometry=await redirect.boundingBox();
    assert.ok(geometry.x+geometry.width<=width+2,'Unbroken redirect URL exceeds mobile viewport');
   }
  }finally{await browser.close();}
 });
}
test('owner can trigger isolated test invitation without a CID',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent(pageHtml('accessi-colleghi.html',inviteMock));
  await page.waitForSelector('#inviteForm:not([hidden])');
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#testInvite').click();
  await page.waitForFunction(()=>document.getElementById('testInviteStatus').textContent.includes('Invito di collaudo simulato'));
  const invited=await page.evaluate(()=>window.calls.filter(x=>x.request.action==='testInvite'));
  assert.equal(invited.length,1);
  assert.deepEqual(invited[0].request,{action:'testInvite'});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
test('first-password page requires matching passwords then updates password',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent(pageHtml('imposta-password.html',passwordMock));
  await page.waitForSelector('#form:not([hidden])');
  await page.locator('#password').fill('synthetic-long-password-1234');
  await page.locator('#confirm').fill('different-long-password-1234');
  await page.locator('#submit').click();
  assert.equal((await page.evaluate(()=>window.updatedPasswords)).length,0);
  await page.locator('#confirm').fill('synthetic-long-password-1234');
  await page.locator('#submit').click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Password impostata'));
  assert.equal((await page.evaluate(()=>window.updatedPasswords)).length,1);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
