const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {chromium}=require('playwright');const url='file://'+path.join(__dirname,'fixtures','mobile-shifts.html');
for(const width of [375,390,430,768]){
 test('mobile schedule '+width+'px: cards readable and click days',async()=>{
  const browser=await chromium.launch({headless:true});try{
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   await page.goto(url);
   assert.equal(await page.locator('.umte-mobile-week').isVisible(),true);
   assert.equal(await page.locator('.umte-original-week-table').isVisible(),false);
   assert.equal(await page.locator('.umte-mobile-week select option').count(),2);
   assert.equal(await page.locator('.umte-mobile-week-cards .umte-mobile-day').count(),7);
   await page.locator('.umte-mobile-week-cards .umte-mobile-day').first().click();
   assert.deepEqual(await page.evaluate(()=>window.__dayClicks),['T1:2026-11-09']);
   await page.locator('.umte-mobile-week select').selectOption({index:1});
   assert.match(await page.locator('.umte-mobile-week-cards').innerText(),/Persona Test Due/);
   assert.equal(await page.locator('.umte-mobile-week-cards .umte-mobile-day').count(),7);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'Horizontal overflow '+overflow+'px');
   await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','umte-mobile-'+width+'.png'),fullPage:true});
  }finally{await browser.close();}
 });
}
test('desktop 1440px: original table stays visible, mobile cards hidden',async()=>{
 const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(url);
  assert.equal(await page.locator('.umte-original-week-table').isVisible(),true);
  assert.equal(await page.locator('.umte-mobile-week').isVisible(),false);
  await page.screenshot({path:path.join(process.env.RUNNER_TEMP||'/tmp','umte-desktop-1440.png'),fullPage:true});
 }finally{await browser.close();}
});
