/* Le chiavi storiche e i codici certificati restano stabili: cambia la denominazione esposta. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./normativa-programmi.js'):root.UMTE_NORMATIVE);if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEQualifications=api;})(typeof window!=='undefined'?window:globalThis,function(N){
  'use strict';
  const entries=[
    {key:'Base',code:'MI.EN.OP',label:'Operatore Energia',kind:'Abilitazione SAMAC'},
    {key:'2ª TE',code:'MI.EN.QP.OP/LC',label:'Operatore linea di contatto',kind:'Qualificazione professionale SAMAC'},
    {key:'3ª TE (MAN)',code:'MI.EN.QP.MAN/LC',label:'Manutentore linea di contatto',kind:'Qualificazione professionale SAMAC'},
    {key:'OPC',code:'MI.OPC.OP',label:'Operatore di cantiere',kind:'Abilitazione SAMAC'},
    {key:'Guida MdO',code:'MI.OPC.QP.OP/GUIDA MDO',label:'Guida mezzi d’opera',kind:'Qualificazione professionale SAMAC'},
    {key:'Scorta MdO',code:'MI.OPC.QP.OP/SCORTA MDO',label:'Scorta mezzi d’opera',kind:'Qualificazione professionale SAMAC'},
    {key:'2ª TE 15 kV confine',code:'MI.EN.QP.OP/CONFINE',label:'Operatore Energia: contesto di confine 15 kV',kind:'Qualificazione professionale SAMAC'},
    {key:'OPC confine',code:'MI.OPC.OP/OPC_CONFINI',label:'Operatore di cantiere: contesto confini',kind:'Contesto SAMAC'},
    {key:'LFM-MT-GAL',code:'MI.EN.QP.OP/LFM-MT-GAL',label:'Operatore Energia: contesto LFM-MT-GAL',kind:'Qualificazione professionale SAMAC'},
    {key:'PES',code:'',label:'PES — Persona esperta',kind:'Attribuzione del datore di lavoro'},
    {key:'MdO confine',code:'',label:'Competenze MdO ai confini: contesto da verificare sul certificato',kind:'Dichiarazione nell’elenco'},
    ...['SAEM S45','FIPEM','COMETI CMT180','SVI Gemini','TESMEC OCPD','MERMEC'].map(key=>({key,code:'',label:'Contesto mezzo '+key,kind:'Mezzo / tipo da riscontrare nella Lista MdO'}))
  ];
  for(const entry of entries){const program=entry.code&&N?.find(entry.code);if(program){entry.label=program.label;entry.normativeCode=program.code;entry.prerequisitesText=program.prerequisitesText;entry.source=N.source(program);}}
  for(const program of N?.programs||[])if(!entries.some(e=>e.code&&N.normalize(e.code)===N.normalize(program.code)||e.normativeCode===program.code))entries.push({key:program.code,code:program.code,label:program.label,kind:program.kind+' SAMAC',normativeCode:program.code,prerequisitesText:program.prerequisitesText,source:N.source(program)});
  const normalize=v=>String(v||'').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,' '),codeOf=v=>normalize(v).split(' - ')[0];
  function skill(key){const program=N?.find(key);return entries.find(e=>normalize(e.key)===normalize(key))||(program&&entries.find(e=>e.normativeCode===program.code))||{key,code:'',label:key,kind:'Denominazione da verificare'};}
  function validity(v){const code=codeOf(v.code),program=N?.find(v.code),entry=entries.find(e=>e.code&&normalize(e.code)===code)||program&&entries.find(e=>e.normativeCode===program.code);return entry?{...entry,code}: {code,label:code.includes('QP.OP/AV-AC')?'Operatore Energia: contesto AV/AC':code.includes('QP.OP/LC 25KV')?'Operatore linea di contatto: contesto 25 kV':String(v.code||'').split(' - ')[1]||v.role||v.code,kind:code.includes('.QP.')?'Qualificazione professionale SAMAC':'Abilitazione / contesto SAMAC'};}
  function label(key){const e=skill(key);return e.label+(e.code?' · '+e.code:'');}
  function roleLabel(label){return label==='Preposto dell’attività'?'Preposto dell’attività · D.Lgs. 81/2008':label==='Preposto ai lavori (PL)'?'Preposto ai lavori (PL) · funzione RFI':label;}
  function matches(code,pattern){const a=N?.find(code),b=N?.find(pattern);return a&&b?a.id===b.id:codeOf(code)===codeOf(String(pattern).replace(/\s+-$/,''));}
  return{entries,skill,validity,label,roleLabel,matches};
});
