'use strict';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function sh(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(new Error(stderr || err.message), { stdout, stderr }));
      return resolve({ stdout, stderr });
    });
  });
}

function getDbAdminConfig() {
  const host = process.env.TENANT_DB_HOST || process.env.PG_ADMIN_HOST || 'localhost';
  const port = Number(process.env.TENANT_DB_PORT || process.env.PG_ADMIN_PORT || 5432);
  const user = process.env.TENANT_DB_USER || process.env.PG_ADMIN_USER || process.env.DB_USER;
  const password = process.env.TENANT_DB_PASSWORD || process.env.PG_ADMIN_PASSWORD || process.env.DB_PASSWORD;
  if (!user || !password) throw new Error('PG admin credential is not configured (set TENANT_DB_* or PG_ADMIN_* env)');
  return { host, port, user, password };
}

function getInstallationDbName(installation) {
  try {
    const notes = installation?.notes ? (typeof installation.notes === 'string' ? JSON.parse(installation.notes) : installation.notes) : {};
    if (!notes || !notes.dbName) return null;
    return notes.dbName;
  } catch (_) {
    return null;
  }
}

function ensureBackupDir(installationId) {
  const dir = path.join(__dirname, '..', '..', 'uploads', 'backups', String(installationId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function backupInstallationDb(installation) {
  const dbName = getInstallationDbName(installation);
  if (!dbName) throw new Error('Installation does not have dbName in notes');
  const { host, port, user, password } = getDbAdminConfig();

  const outDir = ensureBackupDir(installation.id);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${installation.id}-${dbName}-${ts}.dump`;
  const outPath = path.join(outDir, fileName);

  // Decide client: docker only if forced via env; otherwise prefer local tools when available
  const hasLocalPgDump = await hasTool('pg_dump');
  const preferDocker = String(process.env.FORCE_PG_CLIENT || '').toLowerCase() === 'docker';
  if (hasLocalPgDump && !preferDocker) {
    const env = { ...process.env, PGPASSWORD: password };
    const hostLocal = normalizeHostForLocal(host);
    const cmd = `pg_dump -h ${hostLocal} -p ${port} -U ${user} -d ${dbName} -Fc -f "${outPath}"`;
    await sh(cmd, { env });
  } else {
    const hasDocker = await hasTool('docker');
    if (!hasDocker) {
      throw new Error('pg_dump not found and Docker not available. Install PostgreSQL client or Docker.');
    }
    const image = process.env.PG_CLIENT_IMAGE || 'postgres:14';
    const networkArg = process.env.DOCKER_NETWORK ? `--network ${process.env.DOCKER_NETWORK}` : '';
    const hostForDocker = (host === 'localhost' || host === '127.0.0.1') ? 'host.docker.internal' : host;
    // Mount output dir and run pg_dump inside container
    const cmd = `docker run --rm ${networkArg} -e PGPASSWORD=${shellEscape(password)} -v "${outDir}:/out" ${image} pg_dump -h ${hostForDocker} -p ${port} -U ${user} -d ${dbName} -Fc -f /out/${fileName}`;
    await sh(cmd);
  }

  const st = fs.statSync(outPath);
  return { fileName, path: outPath, size: st.size };
}

async function listInstallationBackups(installation) {
  const dir = ensureBackupDir(installation.id);
  const items = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.dump'))
    .map((e) => {
      const p = path.join(dir, e.name);
      const st = fs.statSync(p);
      return { fileName: e.name, size: st.size, modifiedAt: st.mtime };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
  return items;
}

async function restoreInstallationDb(installation, fileName) {
  const dbName = getInstallationDbName(installation);
  if (!dbName) throw new Error('Installation does not have dbName in notes');
  const { host, port, user, password } = getDbAdminConfig();

  const dir = ensureBackupDir(installation.id);
  const inPath = path.join(dir, path.basename(fileName)); // prevent path traversal
  if (!fs.existsSync(inPath)) throw new Error('Backup file not found');

  const hasLocalPgRestore = await hasTool('pg_restore');
  const preferDocker = String(process.env.FORCE_PG_CLIENT || '').toLowerCase() === 'docker';
  if (hasLocalPgRestore && !preferDocker) {
    const env = { ...process.env, PGPASSWORD: password };
    const hostLocal = normalizeHostForLocal(host);
    const cmd = `pg_restore -h ${hostLocal} -p ${port} -U ${user} -d ${dbName} --clean --if-exists "${inPath}"`;
    await sh(cmd, { env });
  } else {
    const hasDocker = await hasTool('docker');
    if (!hasDocker) {
      throw new Error('pg_restore not found and Docker not available. Install PostgreSQL client or Docker.');
    }
    const image = process.env.PG_CLIENT_IMAGE || 'postgres:14';
    const networkArg = process.env.DOCKER_NETWORK ? `--network ${process.env.DOCKER_NETWORK}` : '';
    const hostForDocker = (host === 'localhost' || host === '127.0.0.1') ? 'host.docker.internal' : host;
    const dirAbs = dir; // already absolute
    const fileBase = path.basename(inPath);
    const cmd = `docker run --rm ${networkArg} -e PGPASSWORD=${shellEscape(password)} -v "${dirAbs}:/in" ${image} pg_restore -h ${hostForDocker} -p ${port} -U ${user} -d ${dbName} --clean --if-exists /in/${fileBase}`;
    await sh(cmd);
  }

  return { restored: true, fileName: path.basename(inPath) };
}

// Helpers
function hasTool(cmd) {
  return new Promise((resolve) => {
    exec(`${cmd} --version`, (err) => resolve(!err));
  });
}

function shellEscape(s) {
  if (s == null) return '';
  // Simple escape for env var usage; wraps in single quotes and escapes existing
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

function normalizeHostForLocal(h) {
  const v = String(h || '').toLowerCase();
  if (v === 'host.docker.internal' || v === 'docker.for.mac.localhost' || v === 'docker.for.win.localhost') {
    return '127.0.0.1';
  }
  return h;
}

// Note: we no longer auto-prefer Docker based on host, to avoid pg_hba restrictions.

module.exports = {
  backupInstallationDb,
  listInstallationBackups,
  restoreInstallationDb,
  checkPrereq: async (installation) => {
    const dbName = getInstallationDbName(installation);
    let dbConf = null; let dbErr = null;
    try { dbConf = getDbAdminConfig(); } catch (e) { dbErr = e.message; }
    const hasPgDump = await hasTool('pg_dump');
    const hasPgRestore = await hasTool('pg_restore');
    const hasDocker = await hasTool('docker');
    return {
      dbNamePresent: !!dbName,
      dbError: dbErr,
      db: dbConf ? { host: dbConf.host, port: dbConf.port, userSet: !!dbConf.user, passwordSet: !!dbConf.password } : null,
      tools: { hasPgDump, hasPgRestore, hasDocker },
    };
  },
};
