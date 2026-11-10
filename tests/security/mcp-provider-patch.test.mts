import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const script = fileURLToPath(
  new URL('../../scripts/apply-mcp-provider-patch.mts', import.meta.url),
);
const patch = fileURLToPath(
  new URL('../../patches/@better-auth+oauth-provider+1.7.19.patch', import.meta.url),
);
const files = [...readFileSync(patch, 'utf8').matchAll(/^\+\+\+ b\/(.+)$/gm)].map(
  (match) => match[1],
);
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'kiwibit-provider-patch-'));
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(resolve(file), join(root, file));
  }
  const packageFile = join(root, 'node_modules/@better-auth/oauth-provider/package.json');
  writeFileSync(packageFile, JSON.stringify({ version: '1.7.19' }));
  return {
    root,
    packageFile,
    run: () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }),
  };
}

test('native installer applies the exact patch and verifies repeated installs', () => {
  const f = fixture();
  try {
    execFileSync('git', ['apply', '--reverse', patch], { cwd: f.root });
    assert.equal(f.run().status, 0);
    for (const file of files)
      assert.deepEqual(readFileSync(join(f.root, file)), readFileSync(resolve(file)));
    assert.equal(f.run().status, 0);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});

test('native installer rejects upstream changes, partial patches and unsupported versions', () => {
  const f = fixture();
  try {
    const file = join(f.root, files[0]);
    writeFileSync(file, readFileSync(file, 'utf8') + '\n// Unexpected change\n');
    assert.notEqual(f.run().status, 0);
    copyFileSync(resolve(files[0]), file);
    execFileSync('git', ['apply', '--reverse', '--include=' + files[0], patch], { cwd: f.root });
    assert.notEqual(f.run().status, 0);
    copyFileSync(resolve(files[0]), file);
    writeFileSync(f.packageFile, JSON.stringify({ version: '1.7.20' }));
    assert.notEqual(f.run().status, 0);
  } finally {
    rmSync(f.root, { recursive: true });
  }
});
