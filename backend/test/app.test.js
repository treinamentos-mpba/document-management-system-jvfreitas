const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-backend-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam o usuário e o limite de tamanho', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(storageDirectory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const missingUserResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(missingUserResponse.status, 400);

  const form = new FormData();
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'teste.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-a' },
    body: form,
  });

  assert.strictEqual(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'teste.txt');
  assert.strictEqual(document.owner, 'usuario-a');
  assert.strictEqual(Object.hasOwn(document, 'storageName'), false);

  const ownerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-a' },
  });
  assert.deepStrictEqual((await ownerListResponse.json()).documents.map((item) => item.id), [document.id]);

  const otherUserListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-b' },
  });
  assert.deepStrictEqual((await otherUserListResponse.json()).documents, []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-a' },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/i);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');

  const forbiddenDownloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-b' },
  });
  assert.strictEqual(forbiddenDownloadResponse.status, 404);

  const largeForm = new FormData();
  largeForm.append('file', new Blob([new Uint8Array(1025)]), 'grande.bin');
  const largeUploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-a' },
    body: largeForm,
  });
  assert.strictEqual(largeUploadResponse.status, 413);
});
