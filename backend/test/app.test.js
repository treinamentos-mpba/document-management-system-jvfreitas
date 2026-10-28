const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-backend-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

async function uploadFile(userId, name, contents) {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), name);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': userId },
    body: form,
  });
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('POST /upload grava um documento e rejeita arquivo ausente ou acima do limite', async () => {
  const missingFileForm = new FormData();
  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-a' },
    body: missingFileForm,
  });
  assert.strictEqual(missingFileResponse.status, 400);

  const uploadResponse = await uploadFile('usuario-a', 'teste.txt', 'conteudo de teste');
  assert.strictEqual(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'teste.txt');
  assert.strictEqual(document.owner, 'usuario-a');
  assert.strictEqual(Object.hasOwn(document, 'storageName'), false);

  const largeForm = new FormData();
  largeForm.append('file', new Blob([new Uint8Array(1025)]), 'grande.bin');
  const largeUploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-a' },
    body: largeForm,
  });
  assert.strictEqual(largeUploadResponse.status, 413);
});

test('GET /documents lista somente os documentos do usuário', async () => {
  const owner = 'usuario-listagem';
  const uploadResponse = await uploadFile(owner, 'lista.txt', 'conteudo');
  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();

  const ownerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner },
  });
  assert.strictEqual(ownerListResponse.status, 200);
  assert.deepStrictEqual(
    (await ownerListResponse.json()).documents.map((document) => document.id),
    [uploadedDocument.id],
  );

  const otherUserResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'outro-usuario' },
  });
  assert.deepStrictEqual((await otherUserResponse.json()).documents, []);

  const missingUserResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(missingUserResponse.status, 400);
});

test('GET /documents/:id/download entrega os bytes e restringe o usuário', async () => {
  const owner = 'usuario-download';
  const content = 'conteudo para download';
  const uploadResponse = await uploadFile(owner, 'download.txt', content);
  assert.strictEqual(uploadResponse.status, 201);
  const document = await uploadResponse.json();

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': owner },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/i);
  assert.strictEqual(await downloadResponse.text(), content);

  const otherUserResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'outro-usuario' },
  });
  assert.strictEqual(otherUserResponse.status, 404);

  const missingDocumentResponse = await fetch(
    `${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`,
    { headers: { 'X-User-Id': owner } },
  );
  assert.strictEqual(missingDocumentResponse.status, 404);
});
