const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
for(const kind of ['rp','overtime']){
 test('Esportazione '+kind+' produce un XLSX con intestazioni e celle compilabili',async()=>{
  const browser=await chromium.launch({headless:true});
  try{
   const page=await browser.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setContent('<html><body></body></html>');
   await page.addScriptTag({path:require.resolve('jszip/dist/jszip.min.js')});
   await page.addScriptTag({path:path.join(root,'accounting-template-fallback.js')});
   const result=await page.evaluate(async kind=>{
    await window.UMTE_MODEL_READY;
    const bytes=window.UMTE_TEMPLATES[kind],zip=await JSZip.loadAsync(bytes,{base64:true});
    return {
     length:bytes.length,
     names:Object.keys(zip.files),
     xml:await zip.file('xl/worksheets/sheet1.xml').async('string'),
     book:await zip.file('xl/workbook.xml').async('string'),
    };
   },kind);
   assert.ok(result.length>1000);
   assert.ok(result.names.includes('xl/worksheets/sheet1.xml'));
   assert.match(result.xml,kind==='rp'?/MODULO RILEVAZIONE PRESENZE/:/MOTIVO DELLO STRAORDINARIO/);
   assert.match(result.xml,kind==='rp'?/r="V24"/:/r="I32"/);
   assert.match(result.book,/RIEPILOGO/);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
