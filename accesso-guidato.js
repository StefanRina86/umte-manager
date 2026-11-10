(function(){
'use strict';
const start=()=>{
 const form=document.getElementById('login'),email=document.getElementById('email'),password=document.getElementById('password'),main=document.getElementById('access');
 if(!form||!email||!password||!main||document.getElementById('umte-login-helpers'))return;
 const row=document.createElement('div');row.className='umte-login-helpers';row.id='umte-login-helpers';
 const show=document.createElement('button');show.type='button';show.textContent='Mostra password';show.setAttribute('aria-pressed','false');
 show.addEventListener('click',()=>{const visible=password.type==='text';password.type=visible?'password':'text';show.textContent=visible?'Mostra password':'Nascondi password';show.setAttribute('aria-pressed',String(!visible));});
 const helpBtn=document.createElement('button');helpBtn.type='button';helpBtn.textContent='Primo accesso?';helpBtn.setAttribute('aria-expanded','false');
 const resetBtn=document.createElement('button');resetBtn.type='button';resetBtn.textContent='Password dimenticata?';resetBtn.setAttribute('aria-expanded','false');
 row.append(show,helpBtn,resetBtn);form.append(row);
 const panel=document.createElement('section');panel.className='umte-login-help';panel.hidden=true;panel.id='umte-login-help';
 const showPanel=(title,content,owner)=>{panel.replaceChildren();const h=document.createElement('h2');h.textContent=title;panel.append(h,content);panel.hidden=false;for(const b of [helpBtn,resetBtn])b.setAttribute('aria-expanded',String(b===owner));};
 helpBtn.onclick=()=>{
  if(!panel.hidden&&helpBtn.getAttribute('aria-expanded')==='true'){panel.hidden=true;helpBtn.setAttribute('aria-expanded','false');return;}
  const d=document.createElement('div');const ol=document.createElement('ol');
  for(const line of ['Apri la mail di invito inviata dal responsabile.','Premi il collegamento ricevuto e imposta la password.','Accedi da qui con la tua email personale e la password scelta.','Se compare “Accesso in attesa”, chiedi al responsabile di abilitare il tuo profilo.']){const li=document.createElement('li');li.textContent=line;ol.append(li);}
  d.append(ol);showPanel('Come entrare per la prima volta',d,helpBtn);
 };
 resetBtn.onclick=()=>{
  if(!panel.hidden&&resetBtn.getAttribute('aria-expanded')==='true'){panel.hidden=true;resetBtn.setAttribute('aria-expanded','false');return;}
  const d=document.createElement('div'),p=document.createElement('p');p.textContent='Inserisci la tua email. Se esiste un account, riceverai un collegamento per scegliere una nuova password.';d.append(p);
  const field=document.createElement('input');field.type='email';field.autocomplete='email';field.placeholder='nome.cognome@rfi.it';field.value=email.value.trim();field.required=true;field.setAttribute('aria-label','Email per reimpostazione password');
  const send=document.createElement('button');send.type='button';send.textContent='Invia link per reimpostare';const result=document.createElement('p');result.className='umte-reset-feedback';result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  send.onclick=async()=>{
   if(!field.reportValidity())return;
   send.disabled=true;result.textContent='Verifica richiesta in corso…';
   try{
    const c=window.UMTE_CLOUD_CONFIG;
    if(!window.supabase?.createClient||!c?.url||!c?.key)throw Error('Connessione non disponibile');
    const client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {error}=await client.auth.resetPasswordForEmail(field.value.trim(),{redirectTo:new URL('imposta-password.html',location.href).href});
    if(error)throw error;
    result.textContent='Richiesta inviata. Controlla la tua casella email e lo spam.';
   }catch(e){result.textContent='Impossibile inviare il link. Verifica l’email e riprova oppure contatta il responsabile.';}
   finally{send.disabled=false;}
  };
  d.append(field,send,result);showPanel('Reimposta la password',d,resetBtn);field.focus();
 };
 main.insertBefore(panel,document.getElementById('status'));
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
