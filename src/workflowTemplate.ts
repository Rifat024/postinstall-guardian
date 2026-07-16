export interface WorkflowOptions {
  /** Daily cron in UTC, as a backstop for drift outside of PRs (e.g. floating ranges resolving differently). */
  cron?: string;
  nodeVersion?: string;
}

/**
 * Unlike vuln-guardian's daily-only schedule, new install scripts arrive
 * whenever dependencies change — so this runs on every push/PR (the moment
 * that matters) plus a daily cron as a backstop for drift from unpinned
 * version ranges resolving to a new version between deploys.
 */
export function workflowYaml(options: WorkflowOptions = {}): string {
  const cron = options.cron ?? '0 6 * * *';
  const nodeVersion = options.nodeVersion ?? '20';

  return `name: postinstall-guardian

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '${cron}'
  workflow_dispatch: {}

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'

      # --ignore-scripts: don't execute the very scripts we're about to audit.
      - run: npm ci --ignore-scripts

      - name: Scan for unapproved install scripts
        run: npx postinstall-guardian ci
`;
}
