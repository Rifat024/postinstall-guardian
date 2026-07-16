import assert from 'node:assert';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanNodeModules } from './scanner';

async function makePackage(nodeModulesDir: string, name: string, version: string, scripts?: Record<string, string>) {
  const dir = join(nodeModulesDir, ...name.split('/'));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version, scripts }), 'utf8');
  return dir;
}

test('scanNodeModules finds preinstall/install/postinstall scripts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-'));
  try {
    const nm = join(root, 'node_modules');
    await makePackage(nm, 'clean-pkg', '1.0.0', { build: 'tsc' });
    await makePackage(nm, 'hooked-pkg', '2.0.0', { postinstall: 'node install.js' });
    await makePackage(nm, '@scope/hooked', '3.1.0', { preinstall: 'echo hi' });

    const entries = await scanNodeModules(root);
    const names = entries.map((e) => `${e.name}@${e.version}:${e.hook}`).sort();

    assert.deepEqual(names, ['@scope/hooked@3.1.0:preinstall', 'hooked-pkg@2.0.0:postinstall']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scanNodeModules descends into nested node_modules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-'));
  try {
    const nm = join(root, 'node_modules');
    const outerDir = await makePackage(nm, 'outer', '1.0.0');
    await makePackage(join(outerDir, 'node_modules'), 'inner', '9.9.9', { install: 'node build.js' });

    const entries = await scanNodeModules(root);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, 'inner');
    assert.equal(entries[0].hook, 'install');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scanNodeModules ignores .bin and packages without scripts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-'));
  try {
    const nm = join(root, 'node_modules');
    await mkdir(join(nm, '.bin'), { recursive: true });
    await writeFile(join(nm, '.bin', 'something'), '#!/bin/sh\n', 'utf8');
    await makePackage(nm, 'no-scripts', '1.0.0');

    const entries = await scanNodeModules(root);
    assert.deepEqual(entries, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scanNodeModules returns empty list when node_modules is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pig-'));
  try {
    const entries = await scanNodeModules(root);
    assert.deepEqual(entries, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
