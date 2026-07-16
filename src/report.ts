import type { ScanResult, ScriptEntry } from './types';

function line(entry: ScriptEntry): string {
  const cmd = entry.command.length > 100 ? entry.command.slice(0, 97) + '...' : entry.command;
  return `- **${entry.name}@${entry.version}** \`${entry.hook}\`: \`${cmd}\``;
}

export function scanToMarkdown(result: ScanResult): string {
  const lines = [
    '# postinstall-guardian scan report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total install-type scripts found: ${result.entries.length}`,
    `Unapproved: ${result.unapproved.length}`,
    '',
  ];

  if (result.unapproved.length === 0) {
    lines.push('All install-type scripts are approved in the baseline.');
    return lines.join('\n');
  }

  lines.push(
    '## Unapproved scripts',
    '',
    'These packages run a script during `npm install` and are not yet in your baseline.',
    'Review each command below. If it is expected (native module builds, binary',
    'downloads, etc.), run `postinstall-guardian approve` to add it to the baseline.',
    '',
    ...result.unapproved.map(line),
  );

  return lines.join('\n');
}
