/* Modelli Excel operativi generati in memoria, senza dati personali nel repository.
 * I campi riprendono le intestazioni RP / STR degli allegati 2026.
 * Non si dichiarano riproduzioni grafiche autentiche delle stampe aziendali.
 */
(()=>{
'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function template(type){
 const rp=type==='rp',last=rp?24:32,width=rp?22:9;
 const labels=rp?{
  A9:'CID (2)',B9:'Cognome e nome (2)',C9:'Data (2)',D9:'Turno teorico (3a)',E9:'Turno effettivo (3b)',
  F9:'Chiamato da (4a)',G9:'Rep/Disp (4b)',H9:'Ora chiamata (4c)',I9:'Ora inizio intervento (4c)',J9:'Motivo intervento',
  K9:'Ora rientro (4c)',L9:'Tipo auto (4d)',M9:'KM (4d)',N9:'Straordinario dalle (5bis)',O9:'Alle (5bis)',
  P9:'Trasf. / Ind. linea (6)',Q9:'Inizio prestazione (7)',R9:'Pausa (7)',T9:'Termine (7)',U9:'Motivo (7a)',V9:'Note',
  F2:'MODULO RILEVAZIONE PRESENZE',A5:'Direzione: D.T.P. MILANO',D5:'S.O.: U.T. MILANO LINEE NORD',
  G5:'Reparto: UM TE1 Gallarate',M5:'Impianto',C6:'MESE / ANNO'
 }:{
  A6:'G/M',B6:'CID',C6:'COGNOME / NOME',D6:'ORARIO INIZIO',E6:'ORARIO FINE',F6:'TOTALE h/m',
  G6:'RGLS / RISE',H6:'Prolungamento orario',I6:'MOTIVO DELLO STRAORDINARIO'
 };
 function rowXml(r){
  let cells='';
  for(let i=0;i<width;i++){
   const letter=letters[i],id=letter+r,value=labels[id];
   const style=rp?(r===9?3:r===2||r===5||r===6?4:0):(r===6?3:r>=9&&letter==='A'?1:r>=9&&'DEF'.includes(letter)?2:0);
   const attr=' r="'+id+'"'+(style?' s="'+style+'"':'');
   if(value)cells+='<c'+attr+' t="inlineStr"><is><t>'+escape(value)+'</t></is></c>';
   else if(!rp&&r>=9&&r<=31&&letter==='F')cells+='<c'+attr+'><f>MOD(E'+r+'-D'+r+',1)</f><v>0</v></c>';
   else cells+='<c'+attr+'/>';
  }
  return '<row r="'+r+'"'+((rp&&r===9)||(!rp&&r===6)?' ht="42" customHeight="1"':'')+'>'+cells+'</row>';
 }
 const cols=Array.from({length:width},(_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(rp?[15,24,14,18,18,20,13,15,19,38,15,17,12,16,16,17,18,17,16,17,20,35][i]:[14,16,26,19,19,14,18,21,50][i])+'" customWidth="1"/>').join('');
 const sheet='<worksheet xmlns="'+ns+'"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>'+cols+'</cols><sheetData>'+Array.from({length:last},(_,i)=>rowXml(i+1)).join('')+'</sheetData><pageMargins left="0.2" right="0.2" top="0.35" bottom="0.35" header="0.1" footer="0.1"/></worksheet>';
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="RIEPILOGO" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 zip.file('xl/styles.xml','<styleSheet xmlns="'+ns+'"><numFmts count="1"><numFmt numFmtId="164" formatCode="hh:mm"/></numFmts><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123D59"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1" alignment="wrapText"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>');
 zip.file('xl/worksheets/sheet1.xml',sheet);
 return zip.generateAsync({type:'base64',compression:'DEFLATE'});
}
if(!window.JSZip)return;
window.UMTE_TEMPLATES=window.UMTE_TEMPLATES||{};
window.UMTE_MODEL_READY=Promise.all(['rp','overtime'].map(async type=>{
 if(window.UMTE_TEMPLATES[type])return;
 window.UMTE_TEMPLATES[type]=await template(type);
}));
})();
