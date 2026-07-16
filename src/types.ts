export type InstallHook = 'preinstall' | 'install' | 'postinstall';

export interface ScriptEntry {
  name: string;
  version: string;
  hook: InstallHook;
  command: string;
  /** Path to the package directory, relative to the scan root. */
  path: string;
}

export interface ScanResult {
  /** Every install-type script found in node_modules. */
  entries: ScriptEntry[];
  /** Entries not present in the baseline (i.e. never approved). */
  unapproved: ScriptEntry[];
}

/** Baseline key uniquely identifying an approved package version's script set. */
export function baselineKey(entry: Pick<ScriptEntry, 'name' | 'version'>): string {
  return `${entry.name}@${entry.version}`;
}

export interface Baseline {
  /** Set of "name@version" strings whose install scripts have been reviewed and approved. */
  approved: string[];
}
