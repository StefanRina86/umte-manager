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


test('Modelli generati: i dati reali di una chiamata RP e dello straordinario riempiono il file XLSX',async()=>{
 const fs=require('node:fs'),app=fs.readFileSync(path.join(root,'app.html'),'utf8');
 const take=(from,to)=>{const a=app.indexOf(from),b=app.indexOf(to,a);assert.ok(a>0&&b>a,from);return app.slice(a,b);};
 const helpers=take('function excelDateSerial(','function downloadGeneratedFile(')+
  take('function setXlsxCell(','function accountingShift(')+
  take('function updateAccountingWorkbookIdentity(','async function exportAccountingTemplate(');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({path:require.resolve('jszip/dist/jszip.min.js')});
  await page.addScriptTag({path:path.join(root,'accounting-template-fallback.js')});
  await page.evaluate(source=>(0,eval)(source+';window.__buildWorkbook=buildAccountingWorkbook;'),helpers);
  const response=await page.evaluate(async()=>{
   await window.UMTE_MODEL_READY;
   const rp=await window.__buildWorkbook('rp','Arona','2026-11',[{
     personId:'940702',personName:'FRANCHINI GABRIELE',date:'2026-11-15',
     nucleus:'Arona',shift:{planned:'M',effective:'M'},competence:{
       allowances:{call:true,overtime:true},callPhonogram:'CEI 399/02',
       callDutyType:'R',callTime:'05:50',callStart:'06:30',callReason:'Stresa: stazione al buio',
       overtimeStart:'06:00',overtimeEnd:'07:30'
     }
   }],1);
   const st=await window.__buildWorkbook('overtime','Arona','2026-11',[{
     personId:'940702',personName:'FRANCHINI GABRIELE',date:'2026-11-09',
     nucleus:'Arona',shift:{planned:'M',effective:'M'},competence:{
       allowances:{overtime:true},overtimeStart:'16:36',overtimeEnd:'18:36',
       overtimeReason:'Mantenimento competenze'
     }
   }],1);
   const rpZip=await JSZip.loadAsync(rp),stZip=await JSZip.loadAsync(st);
   return {
     rpXml:await rpZip.file('xl/worksheets/sheet1.xml').async('string'),
     stXml:await stZip.file('xl/worksheets/sheet1.xml').async('string')
   };
  });
  assert.match(response.rpXml,/FRANCHINI GABRIELE/);
  assert.match(response.rpXml,/CEI 399\/02/);
  assert.match(response.stXml,/Mantenimento competenze/);
  assert.match(response.stXml,/940702/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
