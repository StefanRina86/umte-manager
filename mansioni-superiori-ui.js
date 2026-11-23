/* Registro mansioni superiori: modello del riepilogo caricato dall'utente.
 * Ogni sostituzione è riferita a una giornata e a un dipendente assente.
 */
(()=>{
 'use strict';
 const api=window.UMTELeave,shared=window.UMTE_SHARED;
 if(!api?.can('competenceCreate'))return;
 const state=api.state,me=(api.people()||[]).find(p=>String(p.id)===String(shared?.user?.personId));
 const people=(api.people()||[]).filter(p=>p.active!==false);
 const ownNucleus=shared?.user?.role==='chief'?me?.nucleus:null;
 const eligible=people.filter(p=>!ownNucleus||p.nucleus===ownNucleus);
 const heading=document.querySelector('#competencies .page-heading');
 if(!heading)return;
 const $=id=>document.getElementById(id),btn=document.createElement('button');btn.type='button';btn.className='button secondary';btn.textContent='Mansioni superiori';
 const dialog=document.createElement('dialog');dialog.id='umteSuperiorDialog';dialog.style.cssText='max-width:min(710px,94vw);width:100%;border:1px solid #bcd3dc;border-radius:12px;padding:20px';
 const section=document.createElement('section'),title=document.createElement('h3');title.textContent='Mansioni superiori · sostituzione giornaliera';
 const fields=document.createElement('form');fields.method='dialog';fields.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px';
 const label=(name,el)=>{const l=document.createElement('label');l.textContent=name;l.style.cssText='display:grid;gap:5px;font-weight:650';el.style.cssText='width:100%;min-height:38px';l.append(el);return l;};
 const select=(options)=>{const e=document.createElement('select');e.add(new Option('Seleziona',''));for(const [value,text]of options)e.add(new Option(text,value));e.required=true;return e;};
 const opts=eligible.slice().sort((a,b)=>a.displayName.localeCompare(b.displayName,'it')).map(p=>[String(p.id),p.displayName+' · '+p.nucleus]);
 const employee=select(opts),absent=select(people.filter(p=>p.id!==me?.id).map(p=>[String(p.id),p.displayName+' · '+p.nucleus]));
 const date=document.createElement('input');date.type='date';date.required=true;
 const actingRole=document.createElement('input');actingRole.required=true;actingRole.placeholder='Figura professionale svolta';
 const absentRole=document.createElement('input');absentRole.required=true;absentRole.placeholder='Figura professionale sostituita';
 const motive=select([['FERIE','Ferie'],['MALATTIA','Malattia'],['CONGEDO','Congedo'],['ALTRO','Altro assenza con conservazione posto']]);
 const reference=document.createElement('input');reference.placeholder='Riferimento autorizzazione';
 const status=document.createElement('p');status.style.cssText='grid-column:1/-1;color:#9b3e28';status.setAttribute('role','status');
 const save=document.createElement('button');save.type='submit';save.className='button primary';save.textContent='Registra giornata';
 const close=document.createElement('button');close.type='button';close.className='button secondary';close.textContent='Chiudi';close.onclick=()=>dialog.close();
 fields.append(label('Dipendente che sostituisce',employee),label('Dipendente assente',absent),label('Data svolgimento',date),label('Mansione svolta',actingRole),label('Mansione del sostituito',absentRole),label('Motivazione',motive),label('Riferimento',reference),status,save,close);
 const exportArea=document.createElement('div');exportArea.style.cssText='margin-top:20px;padding-top:15px;border-top:1px solid #ccdce3';
 const month=document.createElement('input');month.type='month';
 const nucleus=select([...new Set(people.map(p=>p.nucleus).filter(Boolean))].map(x=>[x,x]));
 if(ownNucleus)nucleus.value=ownNucleus;
 const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='button secondary';exportButton.textContent='Esporta riepilogo XLSX';
 const exportStatus=document.createElement('span');exportStatus.style.cssText='display:block;font-size:12px;color:#526b79;margin-top:6px';
 exportArea.append(label('Mese del riepilogo',month),label('Impianto/nucleo',nucleus),exportButton,exportStatus);
 section.append(title,fields,exportArea);dialog.append(section);heading.append(btn);document.body.append(dialog);
 btn.onclick=()=>{date.value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());month.value=date.value.slice(0,7);status.textContent='';dialog.showModal();};
 const split=p=>({name:String(p?.name||p?.displayName||'').trim(),surname:String(p?.surname||'').trim()});
 function validAbsence(pid,d){
  return (state.variations||[]).some(x=>String(x.personId)===pid&&x.date===d&&['C','MM','CP','CS','AS','ASP','H','INF'].includes(String(x.shift||'')))||
   (state.leaveRequests||[]).some(x=>String(x.personId)===pid&&x.from<=d&&x.to>=d&&['approved','confirmed','accepted'].includes(String(x.status||'').toLowerCase()));
 }
 fields.addEventListener('submit',e=>{
  e.preventDefault();const a=eligible.find(p=>String(p.id)===employee.value),b=people.find(p=>String(p.id)===absent.value),d=date.value;
  if(!a||!b||a.id===b.id||!d||!actingRole.value.trim()||!absentRole.value.trim()||!motive.value){status.textContent='Completa tutti i dati della sostituzione.';return;}
  if(!validAbsence(String(b.id),d)&&!window.confirm('L’assenza del dipendente sostituito non risulta documentata nel gestionale per questo giorno. Confermi di aver verificato l’atto?'))return;
  const at=new Date().toISOString(),who=shared.user.name,old=(state.competencies||[]).find(x=>String(x.personId)===String(a.id)&&x.date===d);
  const details={replacementCid:String(b.id),replacementName:b.displayName,replacementNucleus:b.nucleus,replacementRole:absentRole.value.trim(),actingRole:actingRole.value.trim(),motive:motive.value,reference:reference.value.trim()};
  const description='Mansioni superiori: '+details.actingRole+' in sostituzione di '+details.replacementName+' ('+details.motive+')';
  if(old){
   const field=old.manualOverride?'manualOverride':'manualContribution';
   old[field]={...(old[field]||{}),
    allowances:{...(old[field]?.allowances||old.allowances||{}),superior:true},
    superiorDetails:description,notes:[old[field]?.notes,description].filter(Boolean).join(' · '),
    sourceLabel:'Mansione superiore'};
   old.allowances={...(old.allowances||{}),superior:true};
   old.superiorReplacement=details;old.superiorDetails=description;old.status='updated';old.updatedAt=at;old.updatedBy=who;
   delete old.approvedAt;delete old.approvedBy;
  }else{
   state.competencies=state.competencies||[];state.competencies.push({
    id:'MS-'+a.id+'-'+d,personId:a.id,personName:a.displayName,nucleus:a.nucleus,date:d,
    allowances:{superior:true},manualContribution:{allowances:{superior:true},superiorDetails:description,notes:description},superiorReplacement:details,superiorDetails:description,status:'updated',
    source:'Mansione superiore giornaliera',createdAt:at,createdBy:who,updatedAt:at,updatedBy:who
   });
  }
  api.persist();api.renderAll?.();status.textContent='Giornata registrata: controlla la conferma del salvataggio online.';
 });
 const xml=s=>String(s??'').replace(/[<>&"'\u0000-\u001f]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]||''));
 async function xlsx(rows,scope,ym){
  if(typeof JSZip==='undefined')throw Error('Generatore Excel non caricato');
  const zip=new JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const c=(col,row,value,style=0)=>'<c r="'+col+row+'" t="inlineStr"'+(style?' s="'+style+'"':'')+'><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
  const letters='ABCDEFGHIJKLM'.split('');
  const sheetRows=[];
  const add=(r,values,style=0)=>sheetRows.push('<row r="'+r+'">'+values.map((v,i)=>v==null?'':c(letters[i],r,v,style)).join('')+'</row>');
  add(1,['Direzione: D.T.P. MILANO','','','S.O. U.T. MILANO LINEE NORD','','','','Impianto: NUCLEO T.E. '+scope,'','','','MESE DI: '+ym]);
  add(5,['RIEPILOGO UTILIZZAZIONE IN MANSIONI DI LIVELLO SUPERIORE PER SOSTITUZIONE DI LAVORATORE ASSENTE CON DIRITTO ALLA CONSERVAZIONE DEL POSTO']);
  add(7,['DIPENDENTE INDIVIDUATO PER LA SOSTITUZIONE','','','','','DIPENDENTE SOSTITUITO CON DIRITTO ALLA CONSERVAZIONE DEL POSTO']);
  add(8,['COGNOME','NOME','CID','IMPIANTO','FIGURA PROF.LE','COGNOME','NOME','CID','IMPIANTO','FIGURA PROF.LE','MOTIVAZIONE','N° GIORNATE LAVORATIVE (1)','DATA (2)'],1);
  rows.forEach((r,i)=>add(9+i,r,0));
  const sheet='<worksheet xmlns="'+ns+'"><cols>'+letters.map((x,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+([18,18,14,25,24,18,18,14,25,24,24,17,29][i])+'" customWidth="1"/>').join('')+'</cols><sheetData>'+sheetRows.join('')+'</sheetData><mergeCells count="3"><mergeCell ref="A5:M5"/><mergeCell ref="A7:E7"/><mergeCell ref="F7:M7"/></mergeCells></worksheet>';
  const notes='<worksheet xmlns="'+ns+'"><sheetData><row r="1">'+c('A',1,'NOTA PER LA COMPILAZIONE',1)+'</row><row r="3">'+c('A',3,'Il conteggio riporta le giornate effettivamente registrate per la stessa sostituzione nel mese.')+'</row><row r="4">'+c('A',4,'Verificare la documentazione dell’assenza con diritto alla conservazione del posto.')+'</row><row r="5">'+c('A',5,'Il prospetto deve essere controllato prima dell’invio ufficiale.')+'</row></sheetData></worksheet>';
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="RIEPILOGO" sheetId="1" r:id="rId1"/><sheet name="NOTA PER LA COMPILAZIONE" sheetId="2" r:id="rId2"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('xl/styles.xml','<styleSheet xmlns="'+ns+'"><fonts count="2"><font><sz val="11"/></font><font><b/><sz val="11"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>');
  zip.file('xl/worksheets/sheet1.xml',sheet);zip.file('xl/worksheets/sheet2.xml',notes);
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }
 exportButton.onclick=async()=>{
  const ym=month.value,area=nucleus.value;
  if(!ym||!area){exportStatus.textContent='Seleziona mese e nucleo.';return;}
  const groups=new Map();
  for(const r of state.competencies||[]){
   const v=r.superiorReplacement,p=people.find(p=>String(p.id)===String(r.personId));
   if(!r.allowances?.superior||!v||!r.date?.startsWith(ym)||r.nucleus!==area||!p)continue;
   const key=[r.personId,v.replacementCid,v.actingRole,v.replacementRole,v.motive].join('|');
   if(!groups.has(key))groups.set(key,{p,v,dates:new Set()});groups.get(key).dates.add(r.date);
  }
  if(!groups.size){exportStatus.textContent='Nessuna mansione superiore registrata nel periodo.';return;}
  const rows=[...groups.values()].map(({p,v,dates})=>{
   const first=split(p),repl=split(people.find(x=>String(x.id)===v.replacementCid)||{displayName:v.replacementName});
   return [first.surname,first.name,String(p.id),p.nucleus,v.actingRole,repl.surname,repl.name,String(v.replacementCid),v.replacementNucleus,v.replacementRole,v.motive,dates.size,[...dates].sort().map(d=>Number(d.slice(8))).join(', ')];
  });
  try{
   const blob=await xlsx(rows,area,ym),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='MANSIONI_SUPERIORI_'+area.replace(/[^\w-]/g,'_')+'_'+ym+'.xlsx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
   exportStatus.textContent=rows.length+' sostituzioni esportate. Verifica il prospetto prima dell’invio.';
  }catch(e){exportStatus.textContent=e.message||'Impossibile creare il riepilogo Excel';}
 };
})();
