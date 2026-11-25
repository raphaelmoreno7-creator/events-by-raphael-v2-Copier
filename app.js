(() => {
  "use strict";
  const cfg = window.EVENTS_CONFIG || {};
  const sb = window.supabase;
  if (!sb || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
    document.addEventListener("DOMContentLoaded", () => alert("La configuration Supabase est incomplète. Vérifie config.js."));
    return;
  }
  const db = sb.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const $ = (id) => document.getElementById(id);
  const state = { session:null, events:[], invitees:[], rsvps:[], activeEvent:null, currentTab:"events" };
  const presets = {
    christmas:{primary:"#b7353c",secondary:"#f3e8df",accent:"#c7a45b",text:"#fffaf4"},
    halloween:{primary:"#e87924",secondary:"#2b2035",accent:"#a78bfa",text:"#fffaf0"},
    spring:{primary:"#b9d8bd",secondary:"#fff0f2",accent:"#d78fa3",text:"#354b3b"},
    summer:{primary:"#42b8d5",secondary:"#fff1bd",accent:"#f0b84c",text:"#173e50"},
    autumn:{primary:"#a64e38",secondary:"#f0d6b7",accent:"#c28a43",text:"#fff8ef"},
    elegant:{primary:"#33343a",secondary:"#e9e6e0",accent:"#c4a66a",text:"#fffdf8"},
    birthday:{primary:"#9b83cb",secondary:"#f4e8f4",accent:"#e7b7ca",text:"#fffaff"}
  };
  const defaultTheme = {preset:"custom",primary:"#9fc8e8",secondary:"#e7f0f7",accent:"#c6a56a",text:"#253447"};
  const escapeHtml = (s="") => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parseTheme = (value) => { try { return {...defaultTheme,...(typeof value==="string"?JSON.parse(value):value||{})}; } catch { return {...defaultTheme}; } };
  const fmtDate = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : "Date à préciser";
  const toast = (msg) => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2800); };
  const setFeedback = (id,msg,ok=false) => { const el=$(id); if(!el)return; el.textContent=msg; el.classList.toggle("success",ok); };
  const eventUrl = (id) => `${location.origin}${location.pathname}?event=${encodeURIComponent(id)}`;
  const themeVars = (t) => `--event-primary:${t.primary};--event-secondary:${t.secondary};--event-accent:${t.accent};--event-text:${t.text}`;
  const safeStatus = (s) => ({published:"Publié",draft:"Brouillon",archived:"Archivé"}[s]||s);
  const getEvent = (id) => state.events.find(e=>e.id===id);

  function showView(name) {
    ["homeView","invitationView","adminView"].forEach(id=>$(id).classList.add("hidden"));
    $(name).classList.remove("hidden");
    $("logoutBtn").classList.toggle("hidden",!(name==="adminView"&&state.session));
  }
  async function loadInvitation(id) {
    const {data:e,error}=await db.from("events").select("*").eq("id",id).eq("status","published").maybeSingle();
    if(error||!e){showView("homeView");toast("Cette invitation n'est pas disponible.");return;}
    const t=parseTheme(e.theme);
    $("invitationCard").style.cssText=themeVars(t);
    $("invitationCover").style.cssText=`background:linear-gradient(135deg,${t.primary},${t.secondary});color:${t.text}`;
    $("inviteTitle").textContent=e.title;
    $("inviteOrganizer").textContent=e.organizer?`Une invitation de ${e.organizer}`:"";
    $("inviteDate").textContent=fmtDate(e.event_date);
    $("inviteTime").textContent=e.event_time?e.event_time.slice(0,5):"À préciser";
    $("inviteLocation").textContent=e.location_label||"Lieu communiqué individuellement";
    const exactAddress=(e.exact_address||"").trim();
$("exactAddressBlock").classList.toggle("hidden",!exactAddress);
$("inviteExactAddress").textContent=exactAddress;
$("mapAddressLink").href=exactAddress
  ? "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(exactAddress)
  : "#";
    $("inviteDescription").textContent=e.description||"";
    $("inviteExtra").textContent=e.extra_info||"";
    $("rsvpEventId").value=e.id;
    $("rsvpFeedback").textContent="";
    $("partySize").value=1;
    showView("invitationView");
  }
  async function handleRsvp(ev) {
    ev.preventDefault();
    const id=$("rsvpEventId").value;
    const attendance=$("attendance").value;
    const party=Math.max(1,Math.min(20,Number($("partySize").value)||1));
    const payload={event_id:id,guest_name:$("guestName").value.trim(),attendance,party_size:attendance==="present"?party:0,message:$("guestMessage").value.trim()||null};
    if(!payload.guest_name){setFeedback("rsvpFeedback","Indique ton prénom et ton nom.");return;}
    $("rsvpSubmit").disabled=true; $("rsvpSubmit").textContent="Envoi…";
    const {error}=await db.from("rsvps").insert(payload);
    $("rsvpSubmit").disabled=false; $("rsvpSubmit").textContent="Envoyer ma réponse";
    if(error){setFeedback("rsvpFeedback","Ta réponse n'a pas pu être enregistrée. Vérifie les informations et réessaie.");return;}
    setFeedback("rsvpFeedback","Merci ! Ta réponse a bien été enregistrée.",true);
    $("rsvpForm").reset(); $("partySize").value=1;
  }
  async function refreshAdmin() {
    const [ev,gu,rs]=await Promise.all([
      db.from("events").select("*").order("created_at",{ascending:false}),
      db.from("invitees").select("*").order("created_at",{ascending:false}),
      db.from("rsvps").select("*").order("created_at",{ascending:false})
    ]);
    if(ev.error||gu.error||rs.error){toast("Erreur de chargement des données administrateur.");return;}
    state.events=ev.data||[];state.invitees=gu.data||[];state.rsvps=rs.data||[];
    renderDashboard();
  }
  function renderDashboard(){
    $("statEvents").textContent=state.events.length;
$("statInvitees").textContent=state.invitees.length;
$("statResponses").textContent=state.rsvps.length;

$("statPresent").textContent=state.rsvps.filter(r=>r.attendance==="present").length;
$("statAbsent").textContent=state.rsvps.filter(r=>r.attendance==="absent").length;

$("statAttendees").textContent=state.rsvps
  .filter(r=>r.attendance==="present")
  .reduce((n,r)=>n+(Number(r.party_size)||1),0);
    renderEvents(); fillEventFilters(); renderGuests(); renderResponses();
  }
  function renderEvents(){
    const q=$("eventSearch").value.toLowerCase();
    const items=state.events.filter(e=>e.title.toLowerCase().includes(q));
    $("adminEvents").innerHTML=items.length?items.map(e=>{
      const t=parseTheme(e.theme);
      return `<article class="admin-event"><div class="event-swatch" style="--sw1:${t.primary};--sw2:${t.secondary}"></div><div class="admin-event-info"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(fmtDate(e.event_date))} · ${escapeHtml(e.location_label||"Lieu non précisé")}</small><span class="status-pill ${e.status}">${safeStatus(e.status)}</span></div><div class="event-actions">${e.status==="published"?`<button class="mini-btn" data-action="copy" data-id="${e.id}">Copier le lien</button><button class="mini-btn" data-action="open" data-id="${e.id}">Ouvrir</button>`:""}<button class="mini-btn" data-action="edit" data-id="${e.id}">Modifier</button><button class="mini-btn" data-action="status" data-id="${e.id}">${e.status==="published"?"Archiver":"Publier"}</button><button class="mini-btn danger" data-action="delete" data-id="${e.id}">Supprimer</button></div></article>`;
    }).join(""):'<div class="empty-state">Aucun événement trouvé. Crée ton premier événement.</div>';
  }
  function fillEventFilters(){
    const options='<option value="all">Tous les événements</option>'+state.events.map(e=>`<option value="${e.id}">${escapeHtml(e.title)}</option>`).join("");
    $("guestEventFilter").innerHTML=options;$("responseEventFilter").innerHTML=options;
  }
  function renderGuests(){
  const id=$("guestEventFilter").value;
  const rows=state.invitees.filter(g=>id==="all"||g.event_id===id);

  $("adminGuests").innerHTML=rows.length
    ? `<table>
        <thead>
          <tr>
            <th>Invité</th>
            <th>Événement</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(g=>`
            <tr>
              <td>${escapeHtml(g.name)}</td>
              <td>${escapeHtml(getEvent(g.event_id)?.title||"Événement supprimé")}</td>
              <td>${escapeHtml(g.status||"invité")}</td>
              <td>
                <button class="mini-btn" data-action="editGuest" data-id="${g.id}">Modifier</button>
                <button class="mini-btn danger" data-action="deleteGuest" data-id="${g.id}">Supprimer</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`
    : '<div class="empty-state">Aucun invité dans cette liste.</div>';
}
  function renderResponses(){
    const eid=$("responseEventFilter").value, status=$("responseStatusFilter").value, q=$("responseSearch").value.toLowerCase();
    const rows=state.rsvps.filter(r=>(eid==="all"||r.event_id===eid)&&(status==="all"||r.attendance===status)&&r.guest_name.toLowerCase().includes(q));
    $("adminResponses").innerHTML=rows.length?`<table><thead><tr><th>Nom</th><th>Événement</th><th>Réponse</th><th>Personnes</th><th>Message</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.guest_name)}</td><td>${escapeHtml(getEvent(r.event_id)?.title||"Événement supprimé")}</td><td><span class="status-pill ${r.attendance==="present"?"published":""}">${r.attendance==="present"?"Présent":"Absent"}</span></td><td>${Number(r.party_size)||0}</td><td>${escapeHtml(r.message||"—")}</td><td><button class="mini-btn" data-action="editRsvp" data-id="${r.id}">Modifier</button> <button class="mini-btn danger" data-action="deleteRsvp" data-id="${r.id}">Supprimer</button></td></tr>`).join("")}</tbody></table>`:'<div class="empty-state">Aucune réponse ne correspond à ces filtres.</div>';
  }
  function switchTab(tab){
    state.currentTab=tab;
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    ["events","guests","responses"].forEach(t=>$("tab-"+t).classList.toggle("hidden",t!==tab));
  }
  function openEventDialog(event=null){
    $("eventForm").reset();$("eventFeedback").textContent="";
    $("editEventId").value=event?.id||"";
    $("eventDialogTitle").textContent=event?"Modifier l'événement":"Créer un événement";
    $("eventTitle").value=event?.title||"";
    $("eventOrganizer").value=event?.organizer||"";
    $("eventDate").value=event?.event_date||"";
    $("eventTime").value=event?.event_time?.slice(0,5)||"";
    $("eventLocation").value=event?.location_label||"";
    $("eventExactAddress").value=event?.exact_address||"";
    $("eventDescription").value=event?.description||"";
    $("eventExtra").value=event?.extra_info||"";
    $("eventStatus").value=event?.status||"draft";
    const t=parseTheme(event?.theme);
    $("themePreset").value=t.preset||"custom";
    $("themePrimary").value=t.primary;$("themeSecondary").value=t.secondary;$("themeAccent").value=t.accent;$("themeText").value=t.text;
    $("previewTitle").textContent=event?.title||"Votre événement";
    updateThemePreview();$("eventDialog").showModal();
  }
  function updateThemePreview(){
    const t={primary:$("themePrimary").value,secondary:$("themeSecondary").value,text:$("themeText").value};
    $("themePreview").style.cssText=`--preview-primary:${t.primary};--preview-secondary:${t.secondary};--preview-text:${t.text}`;
    $("previewTitle").textContent=$("eventTitle").value||"Votre événement";
  }
  async function saveEvent(ev){
    ev.preventDefault();
    const id=$("editEventId").value;
    const theme={preset:$("themePreset").value,primary:$("themePrimary").value,secondary:$("themeSecondary").value,accent:$("themeAccent").value,text:$("themeText").value};
   const payload={
  title:$("eventTitle").value.trim(),
  organizer:$("eventOrganizer").value.trim()||"Raphaël",
  event_date:$("eventDate").value,
  event_time:$("eventTime").value||null,
  location_label:$("eventLocation").value.trim()||null,
  exact_address:$("eventExactAddress").value.trim()||null,
  description:$("eventDescription").value.trim()||null,
  extra_info:$("eventExtra").value.trim()||null,
  theme:JSON.stringify(theme),
  status:$("eventStatus").value,
  updated_at:new Date().toISOString()
};
    const result=id?await db.from("events").update(payload).eq("id",id):await db.from("events").insert(payload);
    if(result.error){setFeedback("eventFeedback","Enregistrement impossible : "+result.error.message);return;}
    $("eventDialog").close();await refreshAdmin();toast("Événement enregistré.");
  }
  async function handleEventAction(action,id){
    const e=getEvent(id);if(!e)return;
    if(action==="copy"){await navigator.clipboard.writeText(eventUrl(id));toast("Lien copié.");}
    if(action==="open")window.open(eventUrl(id),"_blank","noopener");
    if(action==="edit")openEventDialog(e);
    if(action==="status"){
      const next=e.status==="published"?"archived":"published";
      const {error}=await db.from("events").update({status:next,updated_at:new Date().toISOString()}).eq("id",id);
      if(error){toast("Modification impossible.");return;}await refreshAdmin();toast("Statut mis à jour.");
    }
    if(action==="delete"){
      if(!confirm(`Supprimer « ${e.title} » et toutes ses données associées ? Cette action est définitive.`))return;
      // Suppression explicite dans l'ordre enfant -> parent pour fonctionner même sans ON DELETE CASCADE.
      const a=await db.from("rsvps").delete().eq("event_id",id);if(a.error){toast("Suppression des réponses impossible : "+a.error.message);return;}
      const b=await db.from("invitees").delete().eq("event_id",id);if(b.error){toast("Suppression des invités impossible : "+b.error.message);return;}
      const c=await db.from("events").delete().eq("id",id);if(c.error){toast("Suppression de l'événement impossible : "+c.error.message);return;}
      await refreshAdmin();toast("Événement supprimé.");
    }
  }
  async function addGuest(ev){
    ev.preventDefault();const eventId=$("guestEventFilter").value;
    if(eventId==="all"||!eventId){toast("Choisis d'abord un événement précis.");return;}
    const {error}=await db.from("invitees").insert({event_id:eventId,name:$("newGuestName").value.trim(),status:"pending"});
    if(error){toast("Ajout impossible : "+error.message);return;}
    $("newGuestName").value="";await refreshAdmin();toast("Invité ajouté.");
  }
  async function handleTableAction(action,id){
    if(action==="editGuest"){
  const guest=state.invitees.find(g=>g.id===id);
  if(!guest)return;

  const name=prompt("Nom de l'invité :",guest.name);
  if(name===null)return;
  if(!name.trim()){
    toast("Le nom ne peut pas être vide.");
    return;
  }

  const status=prompt(
    "Statut : pending, invited, confirmed ou declined",
    guest.status||"pending"
  );
  if(status===null)return;

  const allowed=["pending","invited","confirmed","declined"];
  if(!allowed.includes(status.trim().toLowerCase())){
    toast("Statut invalide.");
    return;
  }

  const {error}=await db.from("invitees")
    .update({
      name:name.trim(),
      status:status.trim().toLowerCase()
    })
    .eq("id",id);

  if(error){
    toast("Modification impossible : "+error.message);
    return;
  }

  await refreshAdmin();
  toast("Invité modifié.");
  return;
}
    if(action==="deleteGuest"){
      if(!confirm("Supprimer cet invité de la liste ?"))return;
      const {error}=await db.from("invitees").delete().eq("id",id);if(error){toast("Suppression impossible.");return;}await refreshAdmin();
    }
    if(action==="deleteRsvp"){
      if(!confirm("Supprimer cette réponse ?"))return;
      const {error}=await db.from("rsvps").delete().eq("id",id);if(error){toast("Suppression impossible.");return;}await refreshAdmin();
    }
    if(action==="editRsvp"){
      const r=state.rsvps.find(x=>x.id===id);if(!r)return;
      const name=prompt("Nom de l'invité :",r.guest_name);if(name===null)return;
      const attendance=prompt("Réponse : saisir present ou absent",r.attendance);if(!["present","absent"].includes(attendance)){toast("Réponse invalide.");return;}
      const party=attendance==="present"?Math.max(1,Math.min(20,Number(prompt("Nombre de personnes :",r.party_size)||1))):0;
      const message=prompt("Message :",r.message||"");if(message===null)return;
      const {error}=await db.from("rsvps").update({guest_name:name.trim(),attendance,party_size:party,message:message.trim()||null,updated_at:new Date().toISOString()}).eq("id",id);
      if(error){toast("Modification impossible : "+error.message);return;}await refreshAdmin();toast("Réponse modifiée.");
    }
  }
  async function login(ev){
    ev.preventDefault();setFeedback("loginFeedback","Connexion…");
    const {data,error}=await db.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});
    if(error){setFeedback("loginFeedback","Connexion impossible. Vérifie ton adresse e-mail et ton mot de passe.");return;}
    state.session=data.session;await enterAdmin();
  }
  async function enterAdmin(){
    showView("adminView");$("loginPanel").classList.add("hidden");$("adminDashboard").classList.remove("hidden");
    await refreshAdmin();
  }
  async function logout(){
    await db.auth.signOut();state.session=null;state.events=[];state.invitees=[];state.rsvps=[];
    $("loginPanel").classList.remove("hidden");$("adminDashboard").classList.add("hidden");showView("homeView");toast("Déconnexion effectuée.");
  }
  async function updatePassword(ev){
    ev.preventDefault();
    const password=$("newPassword").value;
    if(password.length<8){setFeedback("newPasswordFeedback","Le mot de passe doit contenir au moins 8 caractères.");return;}
    const {error}=await db.auth.updateUser({password});
    if(error){setFeedback("newPasswordFeedback","Modification impossible : "+error.message);return;}
    $("newPasswordDialog").close();
    $("newPasswordForm").reset();
    toast("Mot de passe modifié. Tu peux te reconnecter.");
    await db.auth.signOut();
    state.session=null;
    $("loginPanel").classList.remove("hidden");
    $("adminDashboard").classList.add("hidden");
    showView("adminView");
  }
  async function resetPassword(ev){
    ev.preventDefault();const email=$("resetEmail").value.trim();
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error){setFeedback("resetFeedback","Envoi impossible : "+error.message);return;}
    setFeedback("resetFeedback","E-mail envoyé. Consulte ta boîte de réception.",true);
  }
  function bind(){
    document.querySelectorAll('a[href="#admin"]').forEach(link=>{
  link.addEventListener("click",async ev=>{
    ev.preventDefault();
    history.pushState({}, "", "#admin");
    showView("adminView");
    if(state.session){
      await enterAdmin();
    } else {
      $("loginPanel").classList.remove("hidden");
      $("adminDashboard").classList.add("hidden");
    }
  });
});
    $("rsvpForm").addEventListener("submit",handleRsvp);
    $("backHomeBtn").onclick=()=>{history.pushState({}, "",location.pathname);showView("homeView");};
    $("attendance").onchange=()=>{$("partySizeWrap").classList.toggle("hidden",$("attendance").value==="absent");};
    $("loginForm").addEventListener("submit",login);
    $("logoutBtn").onclick=logout;
    $("forgotPasswordBtn").onclick=()=>{$("resetEmail").value=$("loginEmail").value;$("resetDialog").showModal();};
   $("resetForm").addEventListener("submit",resetPassword);
$("newPasswordForm").addEventListener("submit",updatePassword);
    $("closeResetDialog").onclick=()=>$("resetDialog").close();
    $("newEventBtn").onclick=()=>openEventDialog();
    $("eventForm").addEventListener("submit",saveEvent);
    $("closeEventDialog").onclick=()=>$("eventDialog").close();
    $("cancelEventBtn").onclick=()=>$("eventDialog").close();
    $("eventTitle").oninput=updateThemePreview;
    ["themePrimary","themeSecondary","themeText"].forEach(id=>$(id).oninput=updateThemePreview);
    $("themePreset").onchange=()=>{const p=presets[$("themePreset").value];if(!p)return;$("themePrimary").value=p.primary;$("themeSecondary").value=p.secondary;$("themeAccent").value=p.accent;$("themeText").value=p.text;updateThemePreview();};
    document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
    $("eventSearch").oninput=renderEvents;
    $("guestEventFilter").onchange=renderGuests;
    $("responseEventFilter").onchange=renderResponses;
    $("responseStatusFilter").onchange=renderResponses;
    $("responseSearch").oninput=renderResponses;
    $("addGuestForm").addEventListener("submit",addGuest);
    $("adminEvents").addEventListener("click",ev=>{const b=ev.target.closest("[data-action]");if(b)handleEventAction(b.dataset.action,b.dataset.id);});
    $("adminGuests").addEventListener("click",ev=>{const b=ev.target.closest("[data-action]");if(b)handleTableAction(b.dataset.action,b.dataset.id);});
    $("adminResponses").addEventListener("click",ev=>{const b=ev.target.closest("[data-action]");if(b)handleTableAction(b.dataset.action,b.dataset.id);});
  }
  async function init(){
    bind();
    const {data}=await db.auth.getSession();state.session=data.session;
    const params=new URLSearchParams(location.search);
    if(params.get("event")){await loadInvitation(params.get("event"));return;}
    if(location.hash==="#admin"){
      showView("adminView");
      if(state.session)await enterAdmin();
      else showView("adminView");
    } else {showView("homeView");}
    db.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session&&location.hash==="#admin")enterAdmin();});
    if(location.hash==="#admin"&&!state.session){$("loginPanel").classList.remove("hidden");$("adminDashboard").classList.add("hidden");}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
