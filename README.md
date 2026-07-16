# postinstall-guardian

Scan `node_modules` for `preinstall`/`install`/`postinstall` scripts — the
most common npm supply-chain attack vector (a compromised or typosquatted
package runs arbitrary code the moment someone runs `npm install`) — and gate
CI on any that aren't explicitly approved.

## Why not just `npm audit`?

`npm audit` only flags packages with a *reported* CVE. A malicious install
script in a brand-new or typosquatted package has no CVE yet — that's exactly
how the recent high-profile npm supply-chain compromises worked. This tool
doesn't judge whether a script is malicious (it can't); it makes sure a human
looks at every install script before it's allowed to run unreviewed in CI.

## How it works

1. `postinstall-guardian scan` walks `node_modules` (including nested/hoisted
   copies) and lists every package with an install-type script.
2. Compare that list against a baseline file (`.postinstall-guardian.json`,
   committed to your repo) of package versions you've already reviewed and
   approved.
3. `postinstall-guardian ci` exits non-zero if anything isn't in the
   baseline — so a new or bumped dependency with a new install script fails
   the build until someone reviews and approves it.

A version bump automatically drops out of the baseline and gets re-flagged,
since a new version can ship a different script than the one you approved.

## Install

```bash
npm install --save-dev postinstall-guardian
```

## CLI

### `postinstall-guardian scan`

```bash
postinstall-guardian scan --dir . --report report.md
```

Lists every install-type script found and marks which ones aren't yet
approved. Exit code is always 0 — use `ci` for a gating exit code.

### `postinstall-guardian approve`

```bash
postinstall-guardian approve
```

Adds every currently-found install script to `.postinstall-guardian.json`.
**Review the `scan` output before running this** — approving is how you tell
the tool "I looked at this command and it's fine."

### `postinstall-guardian ci`

```bash
postinstall-guardian ci --report postinstall-guardian-report.md
```

Scans, writes a report, and exits 1 if any install script isn't in the
baseline. This is the command to run in CI.

### `postinstall-guardian init-workflow`

```bash
postinstall-guardian init-workflow
# writes .github/workflows/postinstall-guardian.yml
```

Writes a workflow that runs on every push/PR to `main` (new install scripts
arrive with dependency changes, not on a calendar) plus a daily cron as a
backstop for unpinned version ranges resolving to a new version between
deploys. It installs with `npm ci --ignore-scripts` so CI never executes the
scripts it's auditing.

## Library API

```ts
import { scan, mergeIntoBaseline, writeBaseline, readBaseline } from 'postinstall-guardian';

const result = await scan('./my-project');
if (result.unapproved.length > 0) {
  console.log(`${result.unapproved.length} unreviewed install script(s)`);
}
```

## Baseline file format

```json
{
  "approved": ["esbuild@0.21.5", "sharp@0.33.4"]
}
```

Commit `.postinstall-guardian.json` to version control — reviewing and
approving a new script is meant to happen in a PR, same as any other code
change.

## Limitations

- Only npm's `node_modules` layout is supported (pnpm's symlink layout is
  deduped via realpath, but scoped/aliased pnpm structures aren't specially
  handled).
- This tool surfaces scripts for human review — it does not analyze whether
  a script is actually malicious.
