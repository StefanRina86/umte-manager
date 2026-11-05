(function(root){'use strict';
function matrix(ctx,people,dates,filters={}){
 const rows=new Map(),seen=new Set();
 const clock=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 for(const p of people){if(p.active===false)continue;if(filters.nucleus&&p.nucleus!==filters.nucleus||filters.team&&String(p.team||'')!==filters.team||filters.person&&String(p.id)!==filters.person)continue;
 for(const date of dates){const unique=String(p.id)+'|'+date;if(seen.has(unique))continue;seen.add(unique);const r=ctx.record(p.id,date);if(!r)continue;const code=r.effective,b=ctx.shiftBounds(date,code,r.actualStart,r.actualEnd);if(!b||filters.shift&&code!==filters.shift)continue;
 const start=clock(b.start),end=clock(b.end),previous=b.start.getDate()!==b.end.getDate()&&code==='N',key=JSON.stringify([p.nucleus,code,start,end,previous]);
 if(!rows.has(key))rows.set(key,{nucleus:p.nucleus,code,start,end,previous,cells:dates.map(date=>({date,present:0,occupied:0,free:0}))});
 const cell=rows.get(key).cells[dates.indexOf(date)];cell.present++;const available=ctx.check(p.id,{date,shiftCode:code,start,end}).available;if(available)cell.free++;else cell.occupied++;
 }}return [...rows.values()].filter(r=>!filters.availableOnly||r.cells.some(c=>c.free)).sort((a,b)=>a.nucleus.localeCompare(b.nucleus,'it')||a.start.localeCompare(b.start)||a.code.localeCompare(b.code));
}
function selection(ctx,people,slot){
 const clock=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 return [...new Set(people.filter(p=>{
 if(p.active===false||p.nucleus!==slot.nucleus||slot.team&&String(p.team||'')!==slot.team||slot.person&&String(p.id)!==slot.person)return false;
 const r=ctx.record(p.id,slot.date);if(!r||r.effective!==slot.code)return false;
 const b=ctx.shiftBounds(slot.date,r.effective,r.actualStart,r.actualEnd);
 return b&&clock(b.start)===slot.start&&clock(b.end)===slot.end&&ctx.check(p.id,{date:slot.date,shiftCode:slot.code,start:slot.start,end:slot.end}).available;
 }).map(p=>String(p.id)))];
}
const api={matrix,selection};if(typeof module==='object'&&module.exports)module.exports=api;else root.UMTEWeeklyResources=api;
})(typeof window!=='undefined'?window:globalThis);
