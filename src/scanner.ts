import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import type { InstallHook, ScriptEntry } from './types';

const HOOKS: InstallHook[] = ['preinstall', 'install', 'postinstall'];

interface PackageJsonShape {
  name?: string;
  version?: string;
  scripts?: Partial<Record<InstallHook, string>>;
}

/**
 * Walks every node_modules directory under `root` (including nested ones from
 * hoisting/version conflicts) and collects packages that declare a
 * preinstall/install/postinstall script. Dedupes on realpath to avoid
 * re-scanning symlinked packages (pnpm) or looping on symlink cycles.
 */
export async function scanNodeModules(root: string): Promise<ScriptEntry[]> {
  const entries: ScriptEntry[] = [];
  const visited = new Set<string>();
  await walk(join(root, 'node_modules'), entries, visited);
  return entries;
}

async function walk(dir: string, entries: ScriptEntry[], visited: Set<string>): Promise<void> {
  let real: string;
  try {
    real = await fs.realpath(dir);
  } catch {
    return;
  }
  if (visited.has(real)) return;
  visited.add(real);

  let children: string[];
  try {
    children = await fs.readdir(dir);
  } catch {
    return;
  }

  for (const child of children) {
    if (child === '.bin') continue;
    const childPath = join(dir, child);

    if (child.startsWith('@')) {
      // Scoped packages are a directory of packages, not a package itself.
      let scopedChildren: string[];
      try {
        scopedChildren = await fs.readdir(childPath);
      } catch {
        continue;
      }
      for (const scopedChild of scopedChildren) {
        await readPackage(join(childPath, scopedChild), entries);
        await descendNested(join(childPath, scopedChild), entries, visited);
      }
      continue;
    }

    await readPackage(childPath, entries);
    await descendNested(childPath, entries, visited);
  }
}

async function descendNested(packageDir: string, entries: ScriptEntry[], visited: Set<string>): Promise<void> {
  const nested = join(packageDir, 'node_modules');
  const stat = await safeStat(nested);
  if (stat?.isDirectory()) {
    await walk(nested, entries, visited);
  }
}

async function readPackage(packageDir: string, entries: ScriptEntry[]): Promise<void> {
  const pkgJsonPath = join(packageDir, 'package.json');
  const stat = await safeStat(pkgJsonPath);
  if (!stat?.isFile()) return;

  let pkg: PackageJsonShape;
  try {
    pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
  } catch {
    return;
  }
  if (!pkg.name || !pkg.version || !pkg.scripts) return;

  for (const hook of HOOKS) {
    const command = pkg.scripts[hook];
    if (command) {
      entries.push({ name: pkg.name, version: pkg.version, hook, command, path: packageDir });
    }
  }
}

async function safeStat(path: string) {
  try {
    return await fs.stat(path);
  } catch {
    return undefined;
  }
}

export function toRelative(root: string, entry: ScriptEntry): string {
  return relative(root, entry.path) || '.';
}
