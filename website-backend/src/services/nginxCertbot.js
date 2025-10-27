"use strict";

const { exec } = require("child_process");

function sh(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, shell: "/bin/bash", ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(new Error(stderr || err.message), { stdout, stderr }));
      return resolve({ stdout, stderr });
    });
  });
}

function buildServerBlock({ subdomain, hostPort }) {
  const conf = [
    "server {",
    "  listen 80;",
    `  server_name ${subdomain};`,
    "  client_max_body_size 20m;",
    "",
    "  location / {",
    `    proxy_pass http://127.0.0.1:${hostPort};`,
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    "",
    "    proxy_http_version 1.1;",
    "    proxy_set_header Upgrade $http_upgrade;",
    "    proxy_set_header Connection \"upgrade\";",
    "  }",
    "}",
    "",
  ].join("\n");
  return conf;
}

async function writeNginxConf({ subdomain, hostPort }) {
  const confPath = `/etc/nginx/conf.d/apps-${subdomain}.conf`;
  const content = buildServerBlock({ subdomain, hostPort })
    .replace(/\$/g, "\\$");
  const cmd = `echo '${content}' | sudo tee ${confPath} > /dev/null`;
  await sh(cmd);
  await sh("sudo nginx -t");
  await sh("sudo systemctl reload nginx");
  return confPath;
}

async function ensureCertbot({ subdomain }) {
  try {
    await sh(`sudo certbot --nginx -d ${subdomain} --redirect --non-interactive --agree-tos`);
    await sh("sudo nginx -t");
    await sh("sudo systemctl reload nginx");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function setupSubdomainReverseProxy({ subdomain, hostPort }) {
  try {
    const confPath = await writeNginxConf({ subdomain, hostPort });
    const cert = await ensureCertbot({ subdomain });
    return { ok: true, confPath, certbot: cert };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { setupSubdomainReverseProxy };
