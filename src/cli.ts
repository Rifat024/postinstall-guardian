#!/usr/bin/env node
import { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { scan } from './scan';
import { scanToMarkdown } from './report';
import { readBaseline, writeBaseline, mergeIntoBaseline, DEFAULT_BASELINE_FILE } from './baseline';
import { workflowYaml } from './workflowTemplate';

const program = new Command();

program
  .name('postinstall-guardian')
  .description('Scan node_modules for preinstall/install/postinstall scripts and gate CI on unapproved ones.')
  .version('0.1.0');

function writeReport(path: string | undefined, contents: string) {
  if (!path) return;
  const full = resolve(process.cwd(), path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents, 'utf8');
}

program
  .command('scan')
  .description('List install-type scripts in node_modules and flag any not in the baseline.')
  .option('-d, --dir <path>', 'project directory', '.')
  .option('-r, --report <path>', 'write a Markdown report to this path')
  .action(async (opts) => {
    const cwd = resolve(process.cwd(), opts.dir);
    const result = await scan(cwd);
    const md = scanToMarkdown(result);
    console.log(md);
    writeReport(opts.report, md);
  });

program
  .command('approve')
  .description('Add all currently-found install scripts to the baseline (review them first!).')
  .option('-d, --dir <path>', 'project directory', '.')
  .action(async (opts) => {
    const cwd = resolve(process.cwd(), opts.dir);
    const result = await scan(cwd);
    const baseline = await readBaseline(cwd);
    const updated = mergeIntoBaseline(baseline, result.entries);
    await writeBaseline(cwd, updated);
    console.log(`Approved ${result.unapproved.length} new script(s). ${DEFAULT_BASELINE_FILE} now tracks ${updated.approved.length} package version(s).`);
  });

program
  .command('ci')
  .description('Scan and exit non-zero if any install script is not in the baseline.')
  .option('-d, --dir <path>', 'project directory', '.')
  .option('-r, --report <path>', 'write a Markdown report to this path', 'postinstall-guardian-report.md')
  .action(async (opts) => {
    const cwd = resolve(process.cwd(), opts.dir);
    const result = await scan(cwd);
    const md = scanToMarkdown(result);
    console.log(md);
    writeReport(opts.report, md);

    if (result.unapproved.length > 0) {
      process.exitCode = 1;
    }
  });

program
  .command('init-workflow')
  .description('Write a GitHub Actions workflow that runs postinstall-guardian on every push/PR (plus a daily backstop).')
  .option('-o, --out <path>', 'workflow file path', '.github/workflows/postinstall-guardian.yml')
  .option('--cron <expr>', 'backstop cron schedule (UTC)', '0 6 * * *')
  .option('--node-version <version>', 'Node.js version to run under', '20')
  .action((opts) => {
    const yaml = workflowYaml({ cron: opts.cron, nodeVersion: opts.nodeVersion });
    const full = resolve(process.cwd(), opts.out);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, yaml, 'utf8');
    console.log(`Wrote ${opts.out}`);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
