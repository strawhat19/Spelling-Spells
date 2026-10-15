import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldUseFirebaseEmulators } from '../../src/shared/firebase/config.ts';

test(`emulators are off unless explicitly requested`, () => {
  assert.equal(shouldUseFirebaseEmulators(false, `actual-project`, false), false);
  assert.equal(shouldUseFirebaseEmulators(true, `demo-spelling-spells`, false), false);
});

test(`only the exact demo project in a development build can opt into loopback emulators`, () => {
  assert.equal(shouldUseFirebaseEmulators(true, `demo-spelling-spells`, true), true);
  for (const [development, projectId] of [
    [false, `demo-spelling-spells`],
    [false, `actual-project`],
    [true, `actual-project`],
    [true, `demo-other-project`],
    [true, undefined],
  ]) assert.throws(() => shouldUseFirebaseEmulators(development, projectId, true), { code: `app/emulator-forbidden` });
});
