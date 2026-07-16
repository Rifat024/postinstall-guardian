import assert from 'node:assert';
import { test } from 'node:test';
import { workflowYaml } from './workflowTemplate';

test('workflowYaml triggers on push, pull_request, and a daily backstop', () => {
  const yaml = workflowYaml({ cron: '15 4 * * *', nodeVersion: '22' });
  assert.match(yaml, /pull_request:/);
  assert.match(yaml, /branches: \[main\]/);
  assert.match(yaml, /cron: '15 4 \* \* \*'/);
  assert.match(yaml, /node-version: '22'/);
  assert.match(yaml, /--ignore-scripts/);
  assert.match(yaml, /npx postinstall-guardian ci/);
});

test('workflowYaml has sane defaults', () => {
  const yaml = workflowYaml();
  assert.match(yaml, /cron: '0 6 \* \* \*'/);
});
