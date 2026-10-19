import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BrowserSessionManager } from '../src/automation/BrowserSessionManager';
import { globalProfileManager } from '../src/automation/ProfileManager';

const sourceProfile = globalProfileManager.getProfile('prof-ephemeral-mobile-03');
if (!sourceProfile) throw new Error('Seed profile not found');

const secondProfile = {
  ...sourceProfile,
  id: 'integration-ephemeral-two',
  name: 'Integration Ephemeral Two',
  proxy: { ...sourceProfile.proxy, enabled: false, host: '', username: undefined, password: undefined },
};
const profileRoot = path.resolve(process.env.PROFILE_ROOT || path.join(process.cwd(), 'profiles_data'));
const manager = new BrowserSessionManager(profileRoot);

const firstSession = await manager.start(sourceProfile, 'https://example.com');
const secondSession = await manager.start(secondProfile, 'https://example.com');

try {
  assert.notEqual(firstSession.sessionId, secondSession.sessionId);
  assert.equal(firstSession.telemetry?.webdriver, null);
  assert.equal(secondSession.telemetry?.webdriver, null);
  assert.ok(fs.existsSync(path.join(profileRoot, sourceProfile.id, 'user_data')));
  assert.ok(fs.existsSync(path.join(profileRoot, secondProfile.id, 'user_data')));
  console.log('Concurrent browser session isolation passed.');
} finally {
  await manager.stopAll();
}

assert.equal(fs.existsSync(path.join(profileRoot, sourceProfile.id)), false);
assert.equal(fs.existsSync(path.join(profileRoot, secondProfile.id)), false);
console.log('Ephemeral cleanup passed.');