import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './profile-config.js';
import { readWorkspace as readStoredWorkspace, normalizeWorkspace } from './storage.js';
import { keepBothWorkspaces } from './profile-merge.js';

export function initializeProfile(app, services = {}) {
  const client = services.client || createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });
  const readWorkspace = services.readWorkspace || readStoredWorkspace;
  const $ = id => document.getElementById(id);
  let user = null, timer, working = false, conflict = null, generation = 0, switching = false, desiredSession, disposed = false, resyncRequested = false;
  const cacheKey = id => 'studyboss-sync:' + id;
  const meta = () => JSON.parse(localStorage.getItem(cacheKey(user.id)) || '{"revision":0,"dirty":false}');
  const setMeta = value => localStorage.setItem(cacheKey(user.id), JSON.stringify(value));
  const status = text => { $('profile-status').textContent = text; };
  const owner = () => user ? 'profile:' + user.id : 'current';
  const fail = error => {
    status(error?.code === '23514' ? 'Profilen er for stor til synkronisering (maks. 20 MB). Dine data er stadig gemt på denne enhed.' : 'Kun gemt på denne enhed lige nu. Tjek forbindelsen, og prøv Synkroniser igen.');
  };
  async function remote() {
    const { data, error } = await client.from('studyboss_profiles').select('workspace,revision').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? { workspace: normalizeWorkspace(data.workspace), revision: data.revision } : { workspace: { version: 1, courses: [], activeId: null }, revision: 0 };
  }
  async function sync() {
    if (!user || switching || disposed) return;
    if (working) { resyncRequested = true; return; }
    working = true;
    const id = user.id, token = generation;
    try {
      const { data, error } = await client.auth.getUser();
      if (error || data.user?.id !== id) throw error || new Error('Login udløbet');
      const metadata = meta();
      if (!metadata.dirty) {
        const online = await remote();
        if (online.revision !== metadata.revision) {
          if (!app.idle() || meta().dirty) { status('Nye ændringer er klar. Tryk Synkroniser, når du er færdig med opgaven.'); return; }
          app.lock(true);
          try {
            await app.replace(online.workspace, owner());
            setMeta({ revision: online.revision, dirty: false });
          } finally { app.lock(false); }
        }
        status('Profilen er gemt online.'); return;
      }
      const workspace = await readWorkspace(owner());
      if (!workspace) return;
      const snapshot = JSON.stringify(workspace);
      const result = await client.rpc('save_studyboss_profile', { expected_revision: metadata.revision, new_workspace: workspace });
      if (result.error?.code === '40001') {
        conflict = await remote();
        $('profile-conflict').hidden = false;
        status('Der er også ændringer fra en anden enhed. Behold begge versioner for at fortsætte.');
        return;
      }
      if (result.error) throw result.error;
      if (token !== generation) return;
      const current = await readWorkspace(owner());
      const dirty = JSON.stringify(current) !== snapshot;
      setMeta({ revision: result.data, dirty });
      status(dirty ? 'Gemmer dine seneste ændringer …' : 'Profilen er gemt online.');
      if (dirty) timer = setTimeout(sync, 1000);
    } catch (error) { fail(error); }
    finally {
      working = false;
      if (resyncRequested && !conflict) { resyncRequested = false; clearTimeout(timer); timer = setTimeout(sync, 1500); }
    }
  }
  async function changeIdentity(session) {
    if (disposed || session !== desiredSession) return;
    const next = session?.user || null;
    if (next?.id === user?.id) return;
    if (switching || working || !app.idle()) { setTimeout(() => changeIdentity(session), 500); return; }
    switching = true; generation++; clearTimeout(timer);
    $('profile-login').disabled = true;
    const previousUser = user;
    try {
      await app.flush();
      app.lock(true);
      user = next;
      conflict = null; $('profile-conflict').hidden = true;
      let workspace = await readWorkspace(owner());
      if (user) {
        status('Henter din profil …');
        try {
          const saved = meta();
          const online = await remote();
          if (!saved.dirty) { workspace = online.workspace; setMeta({ revision: online.revision, dirty: false }); }
          status(saved.dirty ? 'Lokale ændringer venter på at blive gemt online.' : 'Din profil er klar.');
        } catch (error) { fail(error); }
      } else status('Du bruger StudyBoss uden login. Dine fag gemmes i denne browser.');
      await app.replace(workspace, owner());
      $('open-profile').textContent = user ? 'Min profil' : 'Log ind';
      $('profile-account').textContent = user?.email || '';
      $('profile-login').hidden = !!user;
      $('profile-online').hidden = !user;
    } catch (error) { user = previousUser; status('Profilen kunne ikke åbnes. Genindlæs siden for at prøve igen.'); }
    finally { switching = false; app.lock(false); $('profile-login').disabled = false; }
    if (user) await sync();
  }
  $('open-profile').onclick = () => $('profile-dialog').showModal();
  $('close-profile').onclick = () => $('profile-dialog').close();
  $('profile-login').onclick = async () => {
    if (!app.idle()) { status('Vent til den aktuelle opgave er færdig, før du logger ind.'); return; }
    await app.flush();
    $('profile-login').disabled = true;
    try {
      const response = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } });
      const settings = await response.json();
      if (!response.ok || !settings.external?.google) throw new Error('Google-login mangler at blive aktiveret. Du kan stadig bruge StudyBoss uden login.');
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
      if (error) throw error;
    } catch (error) { status(error.message); $('profile-login').disabled = false; }
  };
  $('profile-logout').onclick = async () => {
    if (!app.idle() || working || switching) { status('Vent til gemning eller den aktuelle opgave er færdig.'); return; }
    await app.flush(); await sync();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) status('Kunne ikke logge ud. Prøv igen.');
  };
  $('profile-sync').onclick = sync;
  $('profile-merge').onclick = async () => {
    if (!conflict || !app.idle() || working || switching) return;
    working = true;
    try {
      await app.flush(); app.lock(true);
      const local = await readWorkspace(owner());
      const merged = keepBothWorkspaces(conflict.workspace, local);
      await app.replace(merged, owner());
      setMeta({ revision: conflict.revision, dirty: true });
      conflict = null; $('profile-conflict').hidden = true;
    } catch (error) { fail(error); }
    finally { working = false; app.lock(false); }
    await sync();
  };
  $('profile-import').onclick = async () => {
    if (!user || !app.idle() || working || switching) return;
    working = true;
    try {
      await app.flush(); app.lock(true);
      const guest = await readWorkspace();
      if (!guest?.courses.length) { status('Der er ingen lokale fag at tilføje.'); return; }
      const merged = keepBothWorkspaces(await readWorkspace(owner()), guest);
      await app.replace(merged, owner());
      const metadata = meta(); setMeta({ ...metadata, dirty: true });
      status('Dine lokale fag er føjet til profilen.');
    } catch (error) { fail(error); }
    finally { working = false; app.lock(false); }
    await sync();
  };
  window.addEventListener('online', sync);
  // Supabase callbacks must return synchronously; database calls run outside the callback.
  const { data: subscription } = client.auth.onAuthStateChange((_event, session) => { desiredSession = session; setTimeout(() => changeIdentity(session), 0); });
  return {
    saved(savedOwner) {
      if (!user || savedOwner !== owner() || switching) return;
      try {
        const metadata = meta(); setMeta({ ...metadata, dirty: true });
        status('Gemmer din profil …'); clearTimeout(timer); timer = setTimeout(sync, 1500);
      } catch (error) { fail(error); }
    },
    pending() { try { return !!user && (working || meta().dirty); } catch { return true; } },
    dispose() { disposed = true; clearTimeout(timer); subscription.subscription.unsubscribe(); window.removeEventListener('online', sync); }
  };
}
