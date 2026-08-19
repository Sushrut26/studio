/**
 * Start the local Postgres container, wait for it to accept connections, and
 * write .env.local if it does not exist.
 *
 * Fails loudly with a usable alternative when Docker is missing, rather than
 * dumping a raw docker error.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = resolve(root, '.env.local');
const URL = 'postgresql://tracker:tracker@127.0.0.1:55432/tracker';

function have(cmd) {
  return spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;
}

/**
 * `docker --version` only proves the CLI is installed. `docker info` is what
 * actually reaches the daemon -- the common case being Docker Desktop
 * installed but not started.
 */
function daemonRunning() {
  return spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
}

function neonFallbackMessage(reason) {
  return `
${reason}

Two ways forward:

  1. Start Docker Desktop (or your Docker daemon), then re-run: npm run setup
  2. Skip Docker entirely -- create a free Postgres at https://neon.tech,
     then put the connection string in ${ENV_FILE}:

       DATABASE_URL=postgres://...

     and run: npm run db:seed

The app creates its own tables, so there is no schema step either way.
`;
}

function composeCommand() {
  if (spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status === 0) {
    return ['docker', ['compose']];
  }
  if (have('docker-compose')) return ['docker-compose', []];
  return null;
}

if (!have('docker')) {
  console.error(neonFallbackMessage('Docker is not installed, so the local database cannot be started.'));
  process.exit(1);
}

if (!daemonRunning()) {
  console.error(
    neonFallbackMessage('Docker is installed but its daemon is not reachable, so the local database cannot be started.')
  );
  process.exit(1);
}

const compose = composeCommand();
if (!compose) {
  console.error('Docker is installed but Docker Compose is not. Install Compose, or use a Neon URL.');
  process.exit(1);
}

const [bin, baseArgs] = compose;
console.log('· starting postgres…');
try {
  execSync([bin, ...baseArgs, 'up', '-d'].join(' '), { cwd: root, stdio: 'inherit' });
} catch {
  // A stack trace here tells the user nothing useful; the alternatives do.
  console.error(neonFallbackMessage('Could not start the Postgres container.'));
  process.exit(1);
}

process.stdout.write('· waiting for it to accept connections');
let ready = false;
for (let i = 0; i < 60; i++) {
  const res = spawnSync(
    bin,
    [...baseArgs, 'exec', '-T', 'db', 'pg_isready', '-U', 'tracker', '-d', 'tracker'],
    { cwd: root, stdio: 'ignore' }
  );
  if (res.status === 0) {
    ready = true;
    break;
  }
  process.stdout.write('.');
  execSync('sleep 1');
}
process.stdout.write('\n');

if (!ready) {
  console.error('Postgres did not become ready in 60s. Check: docker compose logs db');
  process.exit(1);
}

if (!existsSync(ENV_FILE)) {
  writeFileSync(ENV_FILE, `DATABASE_URL=${URL}\n`);
  console.log(`· wrote ${ENV_FILE}`);
} else {
  console.log(`· ${ENV_FILE} already exists, leaving it alone`);
}

console.log(`· database ready at ${URL}`);
