import { readBaseline, diffAgainstBaseline, DEFAULT_BASELINE_FILE } from './baseline';
import { scanNodeModules } from './scanner';
import type { ScanResult } from './types';

export async function scan(root: string, baselineFile = DEFAULT_BASELINE_FILE): Promise<ScanResult> {
  const [entries, baseline] = await Promise.all([scanNodeModules(root), readBaseline(root, baselineFile)]);
  return { entries, unapproved: diffAgainstBaseline(entries, baseline) };
}
