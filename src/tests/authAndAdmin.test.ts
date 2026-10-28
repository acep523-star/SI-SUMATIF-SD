import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.ts';
import { hashPassword, comparePassword } from '../server/auth.ts';
import { User } from '../types/index.ts';

test('Unregistered users cannot authenticate', () => {
  const nonExistent = db.findUserByNipNik('999999999999999999');
  assert.equal(nonExistent, undefined);
});

test('Admin account with username "admin" and password "admin" is present and valid', () => {
  const admin = db.findUserByNipNik('admin');
  assert.notEqual(admin, undefined);
  assert.equal(admin?.role, 'admin');
  assert.equal(comparePassword('admin', admin?.passwordHash || ''), true);
});

test('Admin can change registered user username, password, and delete account', () => {
  // 1. Create a test user
  const testUser: User = {
    id: 'test-user-admin-flow',
    nipNik: '199512312022011005',
    fullName: 'Guru Uji Coba',
    schoolName: 'SD Negeri Percobaan',
    role: 'guru',
    isActive: true,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword('passwordLama123'),
  };
  db.createUser(testUser);

  // 2. Verify initial credentials
  const found = db.findUserById(testUser.id);
  assert.notEqual(found, undefined);
  assert.equal(comparePassword('passwordLama123', found?.passwordHash || ''), true);

  // 3. Admin changes username (NIP/NIK)
  db.updateUser(testUser.id, { nipNik: '199512312022011999' });
  const updatedUsername = db.findUserById(testUser.id);
  assert.equal(updatedUsername?.nipNik, '199512312022011999');

  // 4. Admin changes password
  const newHash = hashPassword('sandiBaru987');
  db.updateUser(testUser.id, { passwordHash: newHash });
  const updatedPass = db.findUserById(testUser.id);
  assert.equal(comparePassword('sandiBaru987', updatedPass?.passwordHash || ''), true);
  assert.equal(comparePassword('passwordLama123', updatedPass?.passwordHash || ''), false);

  // 5. Admin deletes user
  const deleted = db.deleteUser(testUser.id);
  assert.equal(deleted, true);
  assert.equal(db.findUserById(testUser.id), undefined);
});
