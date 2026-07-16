import assert from 'node:assert';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBaseline, writeBaseline, diffAgainstBaseline, mergeIntoBaseline } from './baseline';
import type { ScriptEntry } from './types';

const entry = (name: string, version: string): ScriptEntry => ({
  name,
  version,
  hook: 'postinstall',
  command: 'node install.js',
  path: `/node_modules/${name}`,
});

test('readBaseline returns an empty baseline when the file does not exist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-baseline-'));
  try {
    const baseline = await readBaseline(root);
    assert.deepEqual(baseline, { approved: [] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('writeBaseline then readBaseline round-trips and dedupes/sorts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-baseline-'));
  try {
    await writeBaseline(root, { approved: ['b@1.0.0', 'a@1.0.0', 'a@1.0.0'] });
    const baseline = await readBaseline(root);
    assert.deepEqual(baseline.approved, ['a@1.0.0', 'b@1.0.0']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('diffAgainstBaseline returns only entries not yet approved', () => {
  const entries = [entry('foo', '1.0.0'), entry('bar', '2.0.0')];
  const unapproved = diffAgainstBaseline(entries, { approved: ['foo@1.0.0'] });
  assert.equal(unapproved.length, 1);
  assert.equal(unapproved[0].name, 'bar');
});

test('a version bump re-flags a previously-approved package', () => {
  const entries = [entry('foo', '2.0.0')];
  const unapproved = diffAgainstBaseline(entries, { approved: ['foo@1.0.0'] });
  assert.equal(unapproved.length, 1);
});

test('mergeIntoBaseline adds new entries without duplicating existing ones', () => {
  const merged = mergeIntoBaseline({ approved: ['foo@1.0.0'] }, [entry('foo', '1.0.0'), entry('bar', '2.0.0')]);
  assert.deepEqual([...merged.approved].sort(), ['bar@2.0.0', 'foo@1.0.0']);
});
