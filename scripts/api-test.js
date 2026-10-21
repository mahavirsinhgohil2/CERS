const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const port = 3217;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cers-api-'));
const dbPath = path.join(tempDir, 'test.db');
const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: path.join(__dirname, '..'),
  env: Object.assign({}, process.env, {
    PORT: String(port),
    DB_PATH: dbPath,
    TOKEN_SECRET: 'test-secret'
  }),
  stdio: 'ignore'
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://localhost:' + port + '/api/events');
      if (response.ok) return;
    } catch (error) {
      await new Promise(function (resolve) { setTimeout(resolve, 100); });
    }
  }
  throw new Error('Test server did not start');
}

async function run() {
  await waitForServer();
  const events = await fetch('http://localhost:' + port + '/api/events');
  assert.strictEqual(events.status, 200);
  const unauthorized = await fetch('http://localhost:' + port + '/api/registrations');
  assert.strictEqual(unauthorized.status, 401);
  const badLogin = await fetch('http://localhost:' + port + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'wrong', password: 'wrong' })
  });
  assert.strictEqual(badLogin.status, 401);
  const login = await fetch('http://localhost:' + port + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(login.status, 200);
  const token = (await login.json()).token;
  const registrations = await fetch('http://localhost:' + port + '/api/registrations', {
    headers: { Authorization: 'Bearer ' + token }
  });
  assert.strictEqual(registrations.status, 200);
  console.log('API tests passed.');
}

run().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
}).finally(function () {
  server.kill();
});
