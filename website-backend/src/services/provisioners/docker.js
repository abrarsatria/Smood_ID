'use strict';

const { exec } = require('child_process');
const net = require('net');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function isPortFree(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}

async function findFreePort(start = 9000, end = 9999) {
  for (let p = start; p <= end; p++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(p);
    if (free) return p;
  }
  throw new Error('No free port available in the configured range');
}

function sh(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(new Error(stderr || err.message), { stdout, stderr }));
      return resolve({ stdout, stderr });
    });
  });
}

function simpleSlug(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'app';
}

// options: { installation, env, dbName }
// env: APPS_IMAGE, APPS_BASE_HOST, DOCKER_NETWORK, WEBSITE_BACKEND_URL, TENANT_DB_HOST, TENANT_DB_PORT, TENANT_DB_USER, TENANT_DB_PASSWORD
async function provisionDocker(options) {
  const { installation, env, dbName } = options;
  const image = env.APPS_IMAGE;
  if (!image) throw new Error('APPS_IMAGE is not configured');

  const containerName = `smood-app-${installation.id}`;
  const hostPort = await findFreePort();
  let backendUrl = env.WEBSITE_BACKEND_URL || `http://localhost:${env.PORT || 5055}`;
  if (backendUrl.includes('://localhost') || backendUrl.includes('://127.0.0.1')) {
    backendUrl = backendUrl
      .replace('://localhost', '://host.docker.internal')
      .replace('://127.0.0.1', '://host.docker.internal');
  }
  const baseHost = env.APPS_BASE_HOST || 'localhost';
  const baseDomain = env.BASE_DOMAIN || baseHost;
  const studioSlug = simpleSlug(installation.studioName || installation.companyName || installation.id);
  const subdomainHost = baseDomain ? `${studioSlug}.${baseDomain}` : null;
  const allowedOriginsSet = new Set([
    `http://${baseHost}:${hostPort}`,
    `http://${baseHost}:3000`,
    'http://localhost:3000',
  ]);
  if (subdomainHost) {
    allowedOriginsSet.add(`https://${subdomainHost}`);
    allowedOriginsSet.add(`http://${subdomainHost}`);
  }
  const allowedOrigins = Array.from(allowedOriginsSet).join(',');

  const envs = {
    PORT: 8000,
    WEBSITE_BACKEND_URL: backendUrl,
    INSTALLATION_REPORTING: 'true',
    JWT_SECRET: env.JWT_SECRET || 'smood_secret',
    INSTALLATION_ID: installation.id,
    REACT_APP_HOST: baseHost,
    REACT_APP_CLIENT_PORT: 3000,
    REACT_APP_PROTOCOL: 'http',
    ALLOWED_ORIGINS: allowedOrigins,
    // DB per-tenant
    DB_HOST: env.TENANT_DB_HOST || env.PG_ADMIN_HOST || '172.17.0.1',
    DB_PORT: env.TENANT_DB_PORT || env.PG_ADMIN_PORT || 5432,
    DB_USER: env.TENANT_DB_USER,
    DB_PASSWORD: env.TENANT_DB_PASSWORD,
    DB_NAME: dbName,
    COMPANY_NAME: installation.companyName || '',
    STUDIO_NAME: installation.studioName || '',
    CONTACT_NAME: installation.contactName || '',
    CONTACT_EMAIL: installation.contactEmail || '',
    APP_ENV: 'production',
    // Seed admin & master data on first boot
    DB_SEED_ON_START: String(env.DB_SEED_ON_START || 'true'),
  };

  const envArgs = Object.entries(envs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `-e ${k}=${v}`)
    .join(' ');

  const networkArg = env.DOCKER_NETWORK ? `--network ${env.DOCKER_NETWORK}` : '';

  // Remove if exists (best effort)
  await sh(`docker rm -f ${containerName}`, { timeout: 5000 }).catch(() => undefined);

  await sh(
    `docker run -d --restart unless-stopped --name ${containerName} -p ${hostPort}:8000 ${networkArg} ${envArgs} ${image}`
  );

  const endpointUrl = `http://${baseHost}:${hostPort}`;
  return { endpointUrl, hostPort, containerName };
}

function containerNameFor(installationId) {
  return `smood-app-${installationId}`;
}

async function startDockerContainer(installation) {
  const name = containerNameFor(installation.id);
  await sh(`docker start ${name}`);
  return { containerName: name };
}

async function stopDockerContainer(installation) {
  const name = containerNameFor(installation.id);
  try {
    await sh(`docker stop ${name}`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '').toLowerCase();
    if (msg.includes('no such container') || msg.includes('is not running')) {
      // Treat as already stopped
    } else {
      throw e;
    }
  }
  return { containerName: name };
}

async function removeDockerContainer(installation) {
  const name = containerNameFor(installation.id);
  try {
    await sh(`docker rm -f ${name}`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '').toLowerCase();
    if (msg.includes('no such container')) {
      // Already removed, ignore
    } else {
      throw e;
    }
  }
  return { containerName: name };
}

module.exports = { provisionDocker, startDockerContainer, stopDockerContainer, removeDockerContainer, containerNameFor };
