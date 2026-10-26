import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'profile-relationship-test-secret';
const [{ app }, { User }, { Follow }, { FollowRequest }, { Block }] = await Promise.all([
  import('../src/app.js'), import('../src/models/User.js'), import('../src/models/Follow.js'),
  import('../src/models/FollowRequest.js'), import('../src/models/Block.js'),
]);

const originals = {
  userById: User.findById, userOne: User.findOne, followExists: Follow.exists, followFind: Follow.find,
  requestFind: FollowRequest.find, blockExists: Block.exists, blockFind: Block.find,
};
const oid = (digit) => digit.repeat(24);
const viewerId = oid('1');
const ownerId = oid('2');

function query(value) {
  return { select() { return this; }, sort() { return this; }, limit() { return this; }, populate() { return this; }, lean: async () => value };
}

async function withServer(t, { profile, relationships = [], blockedPairs = [], accepted = [], pending = [] }) {
  User.findById = async () => ({ _id: viewerId, id: viewerId });
  User.findOne = () => query(profile);
  Follow.exists = async ({ follower, following }) => accepted.some((row) => row.follower === follower && row.following === following);
  Follow.find = (filter) => {
    if (filter.following === ownerId) return query(relationships.filter((row) => row.following === ownerId).map((row) => ({ ...row, follower: row.person })));
    if (filter.follower === ownerId) return query(relationships.filter((row) => row.follower === ownerId).map((row) => ({ ...row, following: row.person })));
    const ids = filter.following?.$in || [];
    return query(accepted.filter((row) => row.follower === viewerId && ids.includes(row.following)).map((row) => ({ following: row.following })));
  };
  FollowRequest.find = () => query(pending.map((following) => ({ following })));
  Block.exists = async () => false;
  Block.find = () => query(blockedPairs.map(([blocker, blocked]) => ({ blocker, blocked })));
  const server = await new Promise((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ sub: viewerId }, process.env.JWT_SECRET);
  return {
    request: (path) => fetch(`${base}${path}`, { headers: { Cookie: `chatz_session=${token}` } }),
    anonymous: (path) => fetch(`${base}${path}`),
  };
}

test.after(() => {
  User.findById = originals.userById; User.findOne = originals.userOne; Follow.exists = originals.followExists;
  Follow.find = originals.followFind; FollowRequest.find = originals.requestFind;
  Block.exists = originals.blockExists; Block.find = originals.blockFind;
});

test('the mounted app matches both relationship paths and requires authentication', async (t) => {
  const { anonymous } = await withServer(t, { profile: { _id: ownerId, isPrivate: false } });
  for (const path of ['/api/users/alice/followers', '/api/users/alice/following']) {
    const response = await anonymous(path);
    assert.equal(response.status, 401, `${path} should match its route and require authentication`);
    assert.doesNotMatch((await response.text()), /Route not found/i);
  }
});

test('followers endpoint denies a private profile list until the viewer is an accepted follower', async (t) => {
  const { request } = await withServer(t, { profile: { _id: ownerId, isPrivate: true } });
  const response = await request('/api/users/alice/followers');
  assert.equal(response.status, 403);
  assert.match((await response.json()).error.message, /private/i);
});

test('public following endpoint omits private and blocked accounts and returns only UI fields', async (t) => {
  const publicPerson = { _id: oid('3'), username: 'public', displayName: 'Public Person', avatarUrl: '/avatar.png', isPrivate: false };
  const privatePerson = { _id: oid('4'), username: 'private', displayName: 'Private Person', avatarUrl: '', isPrivate: true };
  const blockedPerson = { _id: oid('5'), username: 'blocked', displayName: 'Blocked Person', avatarUrl: '', isPrivate: false };
  const { request } = await withServer(t, {
    profile: { _id: ownerId, isPrivate: false },
    relationships: [
      { follower: ownerId, person: publicPerson }, { follower: ownerId, person: privatePerson }, { follower: ownerId, person: blockedPerson },
    ],
    blockedPairs: [[viewerId, blockedPerson._id]],
  });
  const response = await request('/api/users/alice/following');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.users.map((person) => person.username), ['public']);
  assert.deepEqual(Object.keys(data.users[0]).sort(), ['_id', 'avatarUrl', 'displayName', 'hasPendingFollowRequest', 'isFollowing', 'username'].sort());
});

test('accepted followers can access a private list and invalid cursors are rejected', async (t) => {
  const person = { _id: oid('6'), username: 'friend', displayName: 'Friend', avatarUrl: '', isPrivate: false };
  const { request } = await withServer(t, {
    profile: { _id: ownerId, isPrivate: true },
    accepted: [{ follower: viewerId, following: ownerId }],
    relationships: [{ following: ownerId, person }],
  });
  const response = await request('/api/users/alice/followers');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).users[0].username, 'friend');
  const invalid = await request('/api/users/alice/followers?cursor=nope');
  assert.equal(invalid.status, 400);
});
