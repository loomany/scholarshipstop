#!/usr/bin/env node
/**
 * One-time bootstrap: install local SSH public key on VPS using password from vps.txt.
 * Never logs password or env values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const VPS_FILE = path.join(ROOT, 'vps.txt');
const KEY_PRIV = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.ssh/scholarshiptop_vps'
);
const KEY_PUB = `${KEY_PRIV}.pub`;

function parseVpsFile(text) {
  const host =
    text.match(/IP-адрес сервера:\s*(\S+)/i)?.[1] ||
    text.match(/IPv4[:\s]+(\d+\.\d+\.\d+\.\d+)/i)?.[1];
  const user = text.match(/Пользователь:\s*(\S+)/i)?.[1] || 'ubuntu';
  const password = text.match(/Пароль:\s*(\S+)/i)?.[1];
  if (!host || !password) throw new Error('vps.txt missing host or password');
  return { host, user, password };
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream
        .on('close', (code) => {
          if (code === 0) resolve(stdout);
          else reject(new Error(`exit ${code}: ${stderr || stdout}`));
        })
        .on('data', (d) => {
          stdout += d.toString();
        })
        .stderr.on('data', (d) => {
          stderr += d.toString();
        });
    });
  });
}

async function main() {
  const creds = parseVpsFile(fs.readFileSync(VPS_FILE, 'utf8'));
  const pubKey = fs.readFileSync(KEY_PUB, 'utf8').trim();

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on('ready', resolve)
      .on('error', reject)
      .connect({
        host: creds.host,
        port: 22,
        username: creds.user,
        password: creds.password,
        readyTimeout: 30000,
      });
  });

  const b64 = Buffer.from(pubKey, 'utf8').toString('base64');
  const setupCmd = `
set -e
PUB_B64='${b64}'
install_key() {
  local home="$1" user="$2"
  sudo mkdir -p "$home/.ssh"
  echo "$PUB_B64" | base64 -d | sudo tee -a "$home/.ssh/authorized_keys" >/dev/null
  sudo chmod 700 "$home/.ssh"
  sudo awk '!seen[\$0]++' "$home/.ssh/authorized_keys" | sudo tee "$home/.ssh/authorized_keys.tmp" >/dev/null
  sudo mv "$home/.ssh/authorized_keys.tmp" "$home/.ssh/authorized_keys"
  sudo chmod 600 "$home/.ssh/authorized_keys"
  sudo chown -R "$user:$user" "$home/.ssh"
}
install_key /home/${creds.user} ${creds.user}
if ! id deploy >/dev/null 2>&1; then
  sudo adduser --disabled-password --gecos "" deploy
  sudo usermod -aG sudo deploy
fi
install_key /home/deploy deploy
echo BOOTSTRAP_OK
`;

  const out = await exec(conn, setupCmd);
  conn.end();

  if (!out.includes('BOOTSTRAP_OK')) {
    throw new Error('bootstrap did not complete');
  }

  console.log(
    JSON.stringify({
      ok: true,
      host: creds.host,
      users: [creds.user, 'deploy'],
      keyPath: KEY_PRIV,
    })
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
