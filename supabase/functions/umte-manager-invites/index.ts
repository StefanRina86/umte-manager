import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const origin = Deno.env.get('UMTE_ALLOWED_ORIGIN') || '';
const adminKey = (() => {
  try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; }
  catch { return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; }
})();
const service = createClient(Deno.env.get('SUPABASE_URL') || '', adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
const respond = (payload: unknown, status=200) => new Response(JSON.stringify(payload), {status, headers});
const validEmail = (s: string) => s.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const inviteRoles = new Set(['specialist','administrative','chief','preposto','viewer']);

Deno.serve(async request => {
 try {
  if (!origin || request.headers.get('Origin') !== origin) return respond({error:'Origine non autorizzata'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (request.method!=='POST') return respond({error:'Metodo non consentito'},405);
  const authorization=request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return respond({error:'Accesso richiesto'},401);
  const {data:identity,error:authError}=await service.auth.getUser(authorization.slice(7));
  if(authError || !identity.user) return respond({error:'Sessione non valida'},401);
  const ownerId=identity.user.id;
  const {data:owner,error:ownerError}=await service.from('umte_manager_members').select('role,enabled').eq('user_id',ownerId).maybeSingle();
  if(ownerError || !owner || owner.role!=='owner' || !owner.enabled) return respond({error:'Operazione riservata al responsabile'},403);
  const raw=await request.text();
  if(raw.length>4096)return respond({error:'Richiesta troppo grande'},413);
  let body: any;try{body=JSON.parse(raw)}catch{return respond({error:'Richiesta non valida'},400)}
  if(body.action==='candidates'){
    const [{data:state,error:stateError},{data:allow,error:allowError},{data:members,error:membersError}]=await Promise.all([
      service.from('umte_manager_state').select('data').eq('id',1).maybeSingle(),
      service.from('umte_allowed_users').select('email,full_name,nucleo,active').eq('active',true),
      service.from('umte_manager_members').select('person_id,email')
    ]);
    if(stateError||allowError||membersError||!state)return respond({error:'Elenco inviti non disponibile'},503);
    const normalized=(v:string)=>String(v||'').trim().toLocaleLowerCase('it-IT').replace(/\s+/g,' ');
    const byName=new Map<string,any[]>();
    for(const a of allow||[]){const n=normalized(a.full_name);if(!n)continue;byName.set(n,[...(byName.get(n)||[]),a]);}
    const taken=new Set((members||[]).filter((m:any)=>m.person_id).map((m:any)=>String(m.person_id)));
    const already=new Set((members||[]).map((m:any)=>normalized(m.email)));
    const candidates=(state.data?.peopleRecords||[]).filter((p:any)=>p.active!==false&&String(p.qualification||'').trim().toUpperCase()!=='CUM'&&!taken.has(String(p.id))).map((p:any)=>{
      const name=String(p.displayName||[p.name,p.surname].filter(Boolean).join(' '));
      const matching=byName.get(normalized([p.name,p.surname].filter(Boolean).join(' ')))||[];
      const address=matching.length===1&&matching[0].email&&!already.has(normalized(matching[0].email))?String(matching[0].email).toLowerCase():'';
      const matchingNucleus=!!address&&matching[0].nucleo===p.nucleus;
      const q=String(p.qualification||'').trim().toUpperCase();
      const role=q==='CT'?'chief':q==='SPEC. INFR.'?'specialist':q==='OSMI'?'preposto':'viewer';
      return {personId:String(p.id),displayName:name,nucleus:String(p.nucleus||''),team:String(p.team||''),qualification:String(p.qualification||''),email:address,matchingNucleus,suggestedRole:role,needsVerification:!address||!matchingNucleus};
    });
    return respond({candidates});
  }
  if(body.action!=='invite')return respond({error:'Operazione non valida'},400);
  const email=String(body.email||'').trim().toLowerCase();
  const personId=String(body.personId||'').trim();
  const role=String(body.role||'').trim();
  if(!validEmail(email) || !personId || personId.length>64 || !inviteRoles.has(role) || body.emailVerified!==true)
    return respond({error:'Email verificata, CID e ruolo autorizzato sono obbligatori'},400);
  const {data:state,error:stateError}=await service.from('umte_manager_state').select('data').eq('id',1).maybeSingle();
  if(stateError||!state)return respond({error:'Archivio non disponibile'},503);
  const person=(state.data?.peopleRecords||[]).find((p:any)=>String(p.id)===personId&&p.active!==false);
  if(!person)return respond({error:'CID inesistente o dipendente non attivo'},400);
  const [{data:byCid,error:cidError},{data:byEmail,error:emailError}]=await Promise.all([
    service.from('umte_manager_members').select('user_id').eq('person_id',personId).limit(1),
    service.from('umte_manager_members').select('user_id').eq('email',email).limit(1)
  ]);
  if(cidError||emailError)return respond({error:'Verifica duplicati non disponibile'},503);
  if(byCid?.length)return respond({error:'Esiste già un profilo associato al CID. Verifica Gestisci accessi.'},409);
  if(byEmail?.length)return respond({error:'Email già associata a un profilo UMTE Manager'},409);
  const {data:invitation,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{
    data:{ full_name:String(person.displayName||'').slice(0,120) },
    redirectTo:'https://stefanrina86.github.io/umte-manager/imposta-password.html'
  });
  if(inviteError || !invitation?.user?.id){
    const code=String(inviteError?.code||'');
    const status=Number(inviteError?.status||0);
    if(code==='email_address_not_authorized')return respond({error:'Il servizio email Supabase predefinito non consente di invitare questa email: configura un provider SMTP autorizzato per il progetto.'},422);
    if(status===429 || code==='over_email_send_rate_limit')return respond({error:'Limite inviti email raggiunto. Il servizio Supabase predefinito consente solo un numero ridotto di email; valuta SMTP dedicato.'},429);
    return respond({error:'Invito non inviato. Verifica che la email non sia già registrata in Supabase e che il redirect sia consentito nelle impostazioni Auth.'},409);
  }
  const newId=invitation.user.id;
  const {error:memberError}=await service.from('umte_manager_members')
    .upsert({user_id:newId,email,name:String(person.displayName||email),role,person_id:personId,enabled:false},{onConflict:'user_id'});
  if(memberError)return respond({error:'Invito spedito, ma profilo non sincronizzato. Verifica Gestisci accessi prima di procedere.'},503);
  return respond({ok:true,pending:true,message:'Invito inviato. Il profilo resta disabilitato finché non viene approvato.'});
 }catch(_){return respond({error:'Servizio temporaneamente non disponibile'},503);}
});
