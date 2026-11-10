import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Exact upstream and patched bytes prevent fuzzy, partial or incompatible installs.
const files = [
  [
    'authorize-CLcUWfZo.mjs',
    '3b7b46f11232996dee73f3db9279908082e891d90c38d144ec54e953113f84f2',
    '9290ef43521406a134b2a7c859c139d621218d984d0715ac9c413da7423885cc',
  ],
  [
    'oauth-DJZT3ri_.d.mts',
    'af1e5cc636cc0d24bc18da7ef53a1e4d17cc71292bef71b2866d39f40f550591',
    '3f4074980646026750e855ce5aec6e55d7ac71418f8316a4ae15d7a0cba85821',
  ],
  [
    'oauth-DmDbSdqz.d.mts',
    '798570cbb00918988a3745b03b03ee4ecee9d7fdadb5c2e22003d8daf9f6efdb',
    '677899476b82d03c5152457eb8dd6021fd27e0597068f5aa85fc697bb8989202',
  ],
] as const;
const root = process.cwd();
const packagePath = resolve(root, 'node_modules/@better-auth/oauth-provider');
const patch = fileURLToPath(
  new URL('../patches/@better-auth+oauth-provider+1.7.19.patch', import.meta.url),
);
const digest = (file: string) =>
  createHash('sha256')
    .update(readFileSync(resolve(packagePath, 'dist', file)))
    .digest('hex');

try {
  const installed: unknown = JSON.parse(readFileSync(resolve(packagePath, 'package.json'), 'utf8'));
  if (
    !installed ||
    typeof installed !== 'object' ||
    !('version' in installed) ||
    installed.version !== '1.7.19'
  )
    throw new Error('Unsupported provider version');
  if (files.every(([file, , after]) => digest(file) === after)) {
    console.info('MCP provider patch already verified.');
  } else {
    if (!files.every(([file, before]) => digest(file) === before))
      throw new Error('Provider integrity mismatch');
    execFileSync('git', ['apply', '--check', patch], { cwd: root, stdio: 'pipe' });
    execFileSync('git', ['apply', patch], { cwd: root, stdio: 'pipe' });
    if (!files.every(([file, , after]) => digest(file) === after))
      throw new Error('Patched provider integrity mismatch');
    console.info('MCP provider patch applied and verified.');
  }
} catch {
  console.error(
    'MCP provider patch failed. Installation aborted. Git and the pinned, unmodified provider are required.',
  );
  process.exitCode = 1;
}
