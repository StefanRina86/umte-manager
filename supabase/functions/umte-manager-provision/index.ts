import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const origin=Deno.env.get('UMTE_ALLOWED_ORIGIN')||'';
const adminKey=(()=>{try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';}})();
const service=createClient(Deno.env.get('SUPABASE_URL')||'',adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Vary':'Origin','Cache-Control':'no-store'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const normalize=(s:unknown)=>String(s||'').trim().toLocaleLowerCase('it-IT').replace(/\s+/g,' ');
const emailValid=(s:string)=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const roles=new Set(['chief','preposto','viewer','specialist','administrative']);
Deno.serve(async(req)=>{
 try {
  if(!origin||req.headers.get('Origin')!==origin)return response({error:'Origine non autorizzata'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response({error:'Metodo non consentito'},405);
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return response({error:'Accedi prima al gestionale'},401);
  const {data:identity,error:identityError}=await service.auth.getUser(auth.slice(7));
  if(identityError||!identity.user)return response({error:'Sessione non valida'},401);
  const {data:owner,error:ownerError}=await service.from('umte_manager_members').select('role,enabled').eq('user_id',identity.user.id).maybeSingle();
  if(ownerError||owner?.role!=='owner'||owner.enabled!==true)return response({error:'Operazione riservata al responsabile'},403);
  const raw=await req.text();if(raw.length>4096)return response({error:'Richiesta troppo grande'},413);
  let body:any;try{body=JSON.parse(raw);}catch{return response({error:'Richiesta non valida'},400);}
  if(body.action==='reset_password'){
    const targetId=String(body.userId||'').trim();
    if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(targetId)||targetId===identity.user.id||body.confirmed!==true)return response({error:'Richiesta non valida'},400);
    const {data:member,error:memberError}=await service.from('umte_manager_members').select('user_id,email,role,person_id,enabled').eq('user_id',targetId).maybeSingle();
    if(memberError)return response({error:'Verifica del profilo non disponibile'},503);
    if(!member||member.role==='owner'||member.enabled!==true)return response({error:'Il profilo non è abilitato o non può essere modificato'},403);
    const cid=String(member.person_id||'').trim();
    if(!/^\d{6,12}$/.test(cid))return response({error:'CID mancante o non valido: associa prima il dipendente al profilo'},400);
    const {data:stateRecord,error:stateError}=await service.from('umte_manager_state').select('data').eq('id',1).single();
    if(stateError||!stateRecord)return response({error:'Anagrafica non disponibile'},503);
    const activePerson=(stateRecord.data?.peopleRecords||[]).some((p:any)=>String(p.id)===cid&&p.active!==false);
    if(!activePerson)return response({error:'CID non associato a un dipendente attivo'},409);
    const {data:authRecord,error:authError}=await service.auth.admin.getUserById(targetId);
    if(authError||!authRecord?.user||normalize(authRecord.user.email)!==normalize(member.email))return response({error:'Email dell’account non corrispondente: reimpostazione bloccata'},409);
    const {error:resetError}=await service.auth.admin.updateUserById(targetId,{password:cid});
    if(resetError)return response({error:'Password non aggiornata. Verifica le regole password di Supabase e riprova.'},422);
    return response({ok:true,message:'Password reimpostata sul CID del dipendente. Nessuna email inviata.'});
  }
  const [{data:state,error:stateError},{data:allow,error:allowError},{data:members,error:membersError}]=await Promise.all([
   service.from('umte_manager_state').select('data').eq('id',1).single(),
   service.from('umte_allowed_users').select('email,full_name,nucleo,active').eq('active',true),
   service.from('umte_manager_members').select('person_id,email,user_id')
  ]);
  if(stateError||allowError||membersError)return response({error:'Anagrafica non disponibile'},503);
  const taken=new Set((members||[]).map((m:any)=>String(m.person_id||'')));
  const emailTaken=new Set((members||[]).map((m:any)=>normalize(m.email)));
  const people=(state?.data?.peopleRecords||[]).filter((p:any)=>p.active!==false&&normalize(p.qualification)!=='cum'&&!taken.has(String(p.id)));
  const candidates=people.map((p:any)=>{
    const name=String(p.displayName||[p.surname,p.name].join(' '));
    const entries=(allow||[]).filter((a:any)=>normalize(a.full_name)===normalize([p.name,p.surname].join(' '))&&normalize(a.nucleo)===normalize(p.nucleus));
    const address=entries.length===1&&!emailTaken.has(normalize(entries[0].email))?normalize(entries[0].email):'';
    const q=String(p.qualification||'').toUpperCase();
    const suggestedRole=q==='CT'?'chief':q==='SPEC. INFR.'?'specialist':q==='STA'?'administrative':q==='OSMI'?'preposto':'viewer';
    return{personId:String(p.id),displayName:name,nucleus:String(p.nucleus||''),qualification:q,email:address,role:suggestedRole,matched:!!address};
  });
  if(body.action==='candidates')return response({candidates});
  if(body.action!=='provision')return response({error:'Azione sconosciuta'},400);
  const personId=String(body.personId||'').trim(),email=normalize(body.email),role=String(body.role||'');
  if(!emailValid(email)||!roles.has(role)||body.confirmed!==true)return response({error:'Conferma email, ruolo e autorizzazione'},400);
  const person=candidates.find((p:any)=>p.personId===personId);
  if(!person)return response({error:'Utente già presente o non autorizzato'},409);
  if(person.matched&&email!==person.email)return response({error:'Email differente da quella verificata in rubrica: controlla prima i dati'},400);
  if(!person.matched&&body.emailManuallyChecked!==true)return response({error:'Conferma esplicitamente la corrispondenza dell’email non presente in rubrica'},400);
  if(emailTaken.has(email))return response({error:'Email già assegnata a un profilo'},409);
  const password=personId;
  if(!/^\d{6,12}$/.test(password))return response({error:'CID non valido come password: verificare anagrafica e impostazioni password di Supabase'},400);
  const {data:created,error:createError}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:person.displayName}});
  if(createError||!created?.user?.id)return response({error:'Creazione non riuscita: email forse già registrata in Supabase. Nessuna password è stata salvata.',code:createError?.code||'create_failed'},409);
  const {error:memberError}=await service.from('umte_manager_members').insert({user_id:created.user.id,email,name:person.displayName,role,person_id:personId,enabled:true});
  if(memberError){
   await service.auth.admin.deleteUser(created.user.id);
   return response({error:'Impossibile assegnare i permessi: account appena creato annullato'},503);
  }
  return response({ok:true,name:person.displayName,email,role,password,message:'Password iniziale corrispondente al CID. Il collega può cambiarla dall’account.'});
 }catch(_){return response({error:'Errore temporaneo del servizio'},503);}
});
