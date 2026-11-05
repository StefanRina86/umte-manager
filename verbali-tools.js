/* Strumenti della compilazione ordinaria dei verbali. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),api=window.UMTEVerbali;
  if(!api)return;
  function enhanceRows() {
    document.querySelectorAll('#verbaleActivityRows .norm-activity').forEach(row=>{
      if(!row.querySelector('.quick-row-actions')){
        const tools=document.createElement('div');tools.className='quick-row-actions';
        const copy=document.createElement('button');copy.type='button';copy.textContent='Duplica attività';
        copy.addEventListener('click',()=>{
          const rows=[...$('verbaleActivityRows').children].filter(r=>r.querySelector('[data-norm="title"]')?.value.trim()||[...r.querySelectorAll('[data-period="fromDate"],[data-period="toDate"],[data-int="fromDate"],[data-int="toDate"],[data-int="scope"]')].some(x=>x.value)), index=rows.indexOf(row), data=api.activities()[index];
          if(!data)return;
          // La copia richiede nuove date esplicite e non copia interruzioni o autorizzazioni.
          api.addActivity({...data,periods:[{fromDate:'',toDate:'',fromTime:data.periods[0]?.fromTime||'',toTime:data.periods[0]?.toTime||'',kind:data.periods[0]?.kind||'ordinary'}],interruptions:[]});
          $('verbaleActivityRows').lastElementChild?.scrollIntoView({block:'nearest'});
        });
        tools.append(copy);row.querySelector('.norm-activity-head')?.after(tools);
      }
      addDatePicker(row);
    });
  }
  const dateStyle=document.createElement('style');dateStyle.textContent='.bulk-dates{padding:12px;background:#eff6f9;border:1px solid #c8dce6;border-radius:10px;margin:10px 0}.bulk-dates>summary{cursor:pointer;font-weight:800;color:#15536a}.bulk-date-fields{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.bulk-date-fields label{flex:1 1 130px}.bulk-date-fields input,.bulk-date-fields select{width:100%;padding:8px;border:1px solid #b9ced8;border-radius:6px}.bulk-calendar{display:grid;grid-template-columns:repeat(7,minmax(32px,1fr));gap:5px;max-width:480px;margin:12px 0}.bulk-calendar label{position:relative;display:flex;align-items:center;justify-content:center;min-height:36px;border:1px solid #b9ced8;border-radius:6px;cursor:pointer;background:white}.bulk-calendar label:has(input:checked){background:#cdece4;border-color:#288375}.bulk-calendar input{width:auto;margin-right:5px}.bulk-calendar .weekday{text-align:center;font-size:.75rem;font-weight:bold}.bulk-date-actions{display:flex;gap:8px;flex-wrap:wrap}.bulk-date-actions button{padding:8px 12px;border:1px solid #b9ced8;border-radius:6px;background:white;cursor:pointer;color:#15536a}.bulk-date-actions button[data-date-apply]{background:#0b526d;color:white}.bulk-date-result{font-size:.8rem;line-height:1.5;margin:10px 0 0;color:#15536a}.quick-row-actions button{padding:7px 10px;border:1px solid #b9ced8;border-radius:6px;cursor:pointer}';document.head.append(dateStyle);
  function addDatePicker(row){
    const host=row.querySelector('.norm-periods');if(!host||row.querySelector('.bulk-dates'))return;
    const panel=document.createElement('details');panel.className='bulk-dates';panel.innerHTML='<summary>Aggiungi più date con gli stessi orari</summary><div class="bulk-date-fields"><label>Mese<input data-date-month type="month"></label><label>Inizio<input data-date-start type="time"></label><label>Fine<input data-date-end type="time"></label><label>Tipo<select data-date-kind><option value="ordinary">Giornata / notte</option><option value="ipo">IPO</option></select></label></div><p>Spunta i giorni di inizio. Se l’orario supera mezzanotte, la fine viene impostata al giorno successivo.</p><div class="bulk-date-actions"><button type="button" data-date-weekdays>Lun–ven</button><button type="button" data-date-all>Tutto il mese</button><button type="button" data-date-none>Deseleziona</button></div><div class="bulk-calendar"></div><div class="bulk-date-actions"><button type="button" data-date-apply>Aggiungi date selezionate</button></div><p class="bulk-date-result" aria-live="polite"></p>';
    host.before(panel);const get=k=>panel.querySelector('[data-date-'+k+']'),calendar=panel.querySelector('.bulk-calendar'),result=panel.querySelector('.bulk-date-result'),selected=new Set();
    const first=host.querySelector('.norm-subrow'),read=k=>first?.querySelector('[data-period="'+k+'"]')?.value||'';
    get('month').value=(read('fromDate')||$('dossierOverallFromDate')?.value||new Date().toLocaleDateString('sv-SE')).slice(0,7);get('start').value=read('fromTime');get('end').value=read('toTime');get('kind').value=read('kind')==='ipo'?'ipo':'ordinary';
    const count=()=>{result.textContent=selected.size+' giorni selezionati';get('apply').disabled=!selected.size;};
    const renderCalendar=()=>{const days=window.UMTEVerbaliDates.monthDays(get('month').value);calendar.replaceChildren();['L','M','M','G','V','S','D'].forEach(t=>{const el=document.createElement('span');el.className='weekday';el.textContent=t;calendar.append(el);});if(days.length){const offset=(new Date(days[0]+'T12:00:00Z').getUTCDay()+6)%7;for(let i=0;i<offset;i++)calendar.append(document.createElement('span'));}for(const d of days){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=d;input.checked=selected.has(d);input.setAttribute('aria-label',d.split('-').reverse().join('/'));input.onchange=()=>{if(input.checked)selected.add(d);else selected.delete(d);count();};label.append(input,document.createTextNode(String(Number(d.slice(-2)))));calendar.append(label);}count();};
    get('month').onchange=renderCalendar;get('all').onclick=()=>{window.UMTEVerbaliDates.monthDays(get('month').value).forEach(d=>selected.add(d));renderCalendar();};get('weekdays').onclick=()=>{window.UMTEVerbaliDates.monthDays(get('month').value).filter(d=>![0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())).forEach(d=>selected.add(d));renderCalendar();};get('none').onclick=()=>{selected.clear();renderCalendar();};
    get('apply').onclick=()=>{if(!api.canEdit())return;try{const existing=[...host.querySelectorAll('.norm-subrow')].map(r=>Object.fromEntries([...r.querySelectorAll('[data-period]')].map(i=>[i.dataset.period,i.value]))),periods=window.UMTEVerbaliDates.periods([...selected],get('start').value,get('end').value,get('kind').value,existing);if(periods.length){for(const empty of [...host.querySelectorAll('.norm-subrow')])if([...empty.querySelectorAll('[data-period]')].filter(i=>i.dataset.period!=='kind').every(i=>!i.value))empty.remove();periods.forEach(p=>api.addPeriod(host,p));$('dossierForm').dispatchEvent(new Event('input',{bubbles:true}));}result.textContent=periods.length+' periodi aggiunti; '+(selected.size-periods.length)+' già presenti. Le date già inserite sono conservate.';}catch(e){result.textContent=e.message;}};
    renderCalendar();
  }
  const observer=new MutationObserver(enhanceRows);observer.observe($('verbaleActivityRows'),{childList:true,subtree:true});
  enhanceRows();
})();
