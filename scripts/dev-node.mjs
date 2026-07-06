#!/usr/bin/env node
/**
 * Canopy dev node — runs a local Radicle stack with real network data.
 *
 * Starts radicle-node + radicle-httpd with an isolated RAD_HOME under
 * .dev/rad (short path: the node's Unix control socket must stay under
 * ~100 chars), creates a dev identity on first run, connects to a
 * working public peer, and seeds a couple of real repos so the app has
 * genuine trees/issues/patches to render.
 *
 * Everything is served from YOUR node at http://127.0.0.1:8788 — canopy
 * never reads from hosted gateways.
 *
 * Usage:  npm run dev:node          (then `npm run dev` in another shell)
 * Stop:   Ctrl-C (kills node + httpd)
 *
 * Env:
 *   RADICLE_BIN  dir with rad/radicle-node/radicle-httpd binaries
 *                (default: the freedom-browser checkout's radicle-bin)
 *   CANOPY_HTTPD_PORT  httpd listen port (default 8788)
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const RAD_HOME = join(ROOT, '.dev', 'rad');
const PORT = process.env.CANOPY_HTTPD_PORT ?? '8788';

const platformDir = `${os.platform() === 'darwin' ? 'mac' : 'linux'}-${
  os.arch() === 'arm64' ? 'arm64' : 'x64'
}`;
const BIN =
  process.env.RADICLE_BIN ??
  resolve(ROOT, '..', 'freedom-browser', 'radicle-bin', platformDir);

// The default preferred seeds (iris/rosa.radicle.network) reset
// connections as of July 2026; seed.radicle.xyz peers reliably.
const WORKING_PEER =
  'z6MksmpU5b1dS7oaqF2bHXhQi1DWy2hB7Mh9CuN7y1DN6QSz@seed.radicle.xyz:8776';

// Real repos used as fixtures: heartwood and radicle-explorer.
const FIXTURE_RIDS = [
  'rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5',
  'rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5',
];

const env = { ...process.env, RAD_HOME, RAD_PASSPHRASE: '' };
const rad = (args, opts = {}) =>
  execFileSync(join(BIN, 'rad'), args, { env, encoding: 'utf8', ...opts });

if (!existsSync(join(BIN, 'radicle-node'))) {
  console.error(`radicle binaries not found in ${BIN}
Set RADICLE_BIN or run \`npm run radicle:download\` in freedom-browser.`);
  process.exit(1);
}

mkdirSync(join(ROOT, '.dev'), { recursive: true });

if (!existsSync(join(RAD_HOME, 'keys', 'radicle'))) {
  console.log('Creating dev identity…');
  rad(['auth', '--alias', 'canopy-dev']);
}

console.log(`Starting radicle-node (RAD_HOME=${RAD_HOME})…`);
const node = spawn(join(BIN, 'radicle-node'), [], { env, stdio: 'inherit' });

const socket = join(RAD_HOME, 'node', 'control.sock');
for (let i = 0; i < 30 && !existsSync(socket); i++) {
  await new Promise((r) => setTimeout(r, 1000));
}
if (!existsSync(socket)) {
  console.error('radicle-node control socket never appeared');
  process.exit(1);
}

try {
  rad(['node', 'connect', WORKING_PEER, '--timeout', '20sec']);
} catch {
  console.warn('Could not connect to public peer — offline mode, seeded repos still work.');
}

for (const rid of FIXTURE_RIDS) {
  try {
    console.log(`Seeding ${rid}…`);
    rad(['seed', rid], { stdio: 'inherit' });
  } catch {
    console.warn(`Seeding ${rid} failed (offline?) — continuing.`);
  }
}

console.log(`Starting radicle-httpd on 127.0.0.1:${PORT}…`);
const httpd = spawn(join(BIN, 'radicle-httpd'), ['--listen', `127.0.0.1:${PORT}`], {
  env,
  stdio: 'inherit',
});

const shutdown = () => {
  httpd.kill('SIGTERM');
  setTimeout(() => node.kill('SIGTERM'), 500);
  setTimeout(() => process.exit(0), 1500);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`
Canopy dev node ready:
  httpd   http://127.0.0.1:${PORT}/api/v1
  repos   ${FIXTURE_RIDS.join(', ')}
Run \`npm run dev\` and open http://localhost:5173
`);
