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
    if (!elements.has(id)) elements.set(id, { hidden: false, disabled: false, textContent: '', showModal() {}, close() {} });
    return elements.get(id);
  } };
  globalThis.localStorage = { getItem: key => metadata.get(key) ?? null, setItem: (key, value) => metadata.set(key, value) };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  let callback, currentUser, blocked = false, conflict = false, owner = 'current';
  const rpcCalls = [], cloud = new Map([
    ['A', { workspace: workspace('Account A'), revision: 4 }],
    ['B', { workspace: workspace('Account B'), revision: 7 }]
  ]);
  const client = {
    auth: {
      onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
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
  }, { client, readWorkspace: async (key = 'current') => structuredClone(caches.get(key) || null) });
  const wait = async predicate => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
    assert.fail('Profile transition did not finish');
  };
  const login = async id => { currentUser = id; callback('SIGNED_IN', { user: { id, email: id + '@example.com' } }); await wait(() => owner === 'profile:' + id && !profile.pending()); };
  try {
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
