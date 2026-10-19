import test from 'node:test';
import assert from 'node:assert/strict';
import { newCourse } from '../src/storage.js';
import { keepBothWorkspaces } from '../src/profile-merge.js';
import { initializeProfile } from '../src/profile.js';

const workspace = (name, id = name) => ({ version: 1, activeId: id, courses: [newCourse(name, id)] });
test('conflicting courses preserve both complete learning records without modifying the inputs', () => {
  const cloud = workspace('Math', 'same'), local = structuredClone(cloud);
  cloud.courses[0].notes = 'cloud notes';
  local.courses[0].notes = 'offline notes';
  local.courses[0].mistakes.q = { answer: 'my answer', resolved: false };
  local.courses[0].earnedMedals.a = ['bronze'];
  const merged = keepBothWorkspaces(cloud, local, () => 'copy');
  assert.equal(merged.courses.length, 2);
  assert.equal(merged.courses[0].notes, 'cloud notes');
  assert.equal(merged.courses[1].notes, 'offline notes');
  assert.deepEqual(merged.courses[1].mistakes, local.courses[0].mistakes);
  assert.deepEqual(merged.courses[1].earnedMedals, local.courses[0].earnedMedals);
  assert.equal(local.courses[0].id, 'same');
});
test('identical courses are not duplicated; new local courses are included', () => {
  const cloud = workspace('Math'), local = structuredClone(cloud);
  local.courses.push(newCourse('English', 'English'));
  assert.deepEqual(keepBothWorkspaces(cloud, local).courses.map(c => c.name), ['Math', 'English']);
});

test('profile identity, offline cache and conflict resolution stay isolated across accounts', async () => {
  const elements = new Map(), metadata = new Map(), caches = new Map([['current', workspace('Guest')]]);
  globalThis.document = { getElementById: id => {
    if (!elements.has(id)) elements.set(id, { hidden: false, disabled: false, value: '', textContent: '', showModal() {}, close() {}, addEventListener() {} });
    return elements.get(id);
  } };
  globalThis.localStorage = { getItem: key => metadata.get(key) ?? null, setItem: (key, value) => metadata.set(key, value) };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.location = { origin: 'https://study-boss-eta.vercel.app' };
  let callback, currentUser, blocked = false, conflict = false, owner = 'current', autoconfirm = true, authError = null;
  const authCalls = [];
  const rpcCalls = [], cloud = new Map([
    ['A', { workspace: workspace('Account A'), revision: 4 }],
    ['B', { workspace: workspace('Account B'), revision: 7 }]
  ]);
  const client = {
    auth: {
      onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
      async signUp(credentials) { authCalls.push({ method: 'signup', ...credentials }); return { data: { session: null } }; },
      async signInWithPassword(credentials) { authCalls.push({ method: 'login', ...credentials }); return authError ? { error: authError } : { data: { session: {} } }; },
      async getUser() { return { data: { user: { id: currentUser } } }; },
      async signOut() { currentUser = null; callback('SIGNED_OUT', null); return {}; }
    },
    from() { return { select() { return { eq(_key, id) { return { async maybeSingle() {
      if (blocked) return { error: new Error('offline') };
      return { data: structuredClone(cloud.get(id)) };
    } }; } }; } }; },
    async rpc(_fn, args) {
      rpcCalls.push({ id: currentUser, ...structuredClone(args) });
      if (blocked) return { error: new Error('offline') };
      if (conflict) return { error: { code: '40001' } };
      const revision = args.expected_revision + 1;
      cloud.set(currentUser, { workspace: structuredClone(args.new_workspace), revision });
      return { data: revision };
    }
  };
  const profile = initializeProfile({
    idle: () => true, flush: async () => {}, lock() {},
    async replace(value, nextOwner) { caches.set(nextOwner, structuredClone(value)); owner = nextOwner; }
  }, {
    client, readWorkspace: async (key = 'current') => structuredClone(caches.get(key) || null),
    fetch: async () => ({ ok: true, json: async () => ({ external: { email: true }, mailer_autoconfirm: autoconfirm, disable_signup: false }) })
  });
  const wait = async predicate => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
    assert.fail('Profile transition did not finish');
  };
  const login = async id => { currentUser = id; callback('SIGNED_IN', { user: { id, email: id + '@example.com' } }); await wait(() => owner === 'profile:' + id && !profile.pending()); };
  try {
    const submit = async signup => elements.get('profile-auth-form').onsubmit({ preventDefault() {}, submitter: { id: signup ? 'profile-signup' : 'profile-login' } });
    const emailInput = document.getElementById('profile-email'), passwordInput = document.getElementById('profile-password');
    emailInput.value = ' test@example.com '; passwordInput.value = 'secret password';
    await submit(true);
    assert.equal(authCalls.length, 0, 'Signup must not create unverified accounts when confirmation is disabled');
    assert.match(elements.get('profile-status').textContent, /Mail-login med mailbekræftelse/);
    autoconfirm = false; passwordInput.value = 'short';
    await submit(true);
    assert.equal(authCalls.length, 0, 'Weak new passwords are rejected before any account is created');
    passwordInput.value = '  secret password  ';
    await submit(true);
    assert.deepEqual(authCalls.at(-1), { method: 'signup', email: 'test@example.com', password: '  secret password  ', options: { emailRedirectTo: 'https://study-boss-eta.vercel.app/' } });
    assert.match(elements.get('profile-status').textContent, /Tjek din mail/);
    assert.equal(passwordInput.value, '', 'Successful login removes the password from the form');
    passwordInput.value = 'bad password'; authError = { code: 'invalid_credentials' };
    await submit(false);
    assert.match(elements.get('profile-status').textContent, /Mail eller adgangskode er forkert/);
    assert.equal(elements.get('profile-login').disabled, false);
    authError = null;
    await submit(false);
    assert.equal(authCalls.at(-1).method, 'login');
    assert.equal(passwordInput.value, '');
    await login('A');
    assert.equal(caches.get('profile:A').courses[0].name, 'Account A');
    assert.equal(caches.get('current').courses[0].name, 'Guest');
    caches.get('profile:A').courses[0].notes = 'offline A';
    blocked = true; profile.saved('profile:A');
    await elements.get('profile-sync').onclick();
    assert.equal(profile.pending(), true);
    assert.match(elements.get('profile-status').textContent, /Kun gemt på denne enhed/);
    // A pending offline save survives switching identities and never becomes B's upload.
    await login('B');
    assert.equal(owner, 'profile:B');
    assert.equal(caches.get('profile:B'), null); // No B cache or network; A's data is never used.
    assert.equal(JSON.parse(metadata.get('studyboss-sync:A')).dirty, true);
    blocked = false;
    callback('SIGNED_OUT', null); currentUser = null;
    await wait(() => owner === 'current');
    await login('A');
    assert.equal(caches.get('profile:A').courses[0].notes, 'offline A');
    assert.equal(rpcCalls.at(-1).id, 'A');
    assert.equal(rpcCalls.at(-1).new_workspace.courses[0].name, 'Account A');
    conflict = true; profile.saved('profile:A');
    await elements.get('profile-sync').onclick();
    assert.equal(elements.get('profile-conflict').hidden, false);
    assert.equal(profile.pending(), true);
    assert.equal(caches.get('profile:A').courses[0].notes, 'offline A');
    conflict = false;
    await elements.get('profile-merge').onclick();
    assert.equal(elements.get('profile-conflict').hidden, true);
    assert.equal(profile.pending(), false);
    await elements.get('profile-logout').onclick();
    await wait(() => owner === 'current');
    assert.equal(caches.get('current').courses[0].name, 'Guest');
  } finally { profile.dispose(); }
});
