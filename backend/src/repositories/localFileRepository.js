const crypto = require('node:crypto');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const multer = require('multer');

const backendRoot = path.resolve(__dirname, '../..');
const storageDirectory = path.resolve(backendRoot, process.env.STORAGE_DIR || 'storage');
const configuredLimit = Number.parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
const maxFileSize = Number.isSafeInteger(configuredLimit) && configuredLimit > 0
  ? configuredLimit
  : 10 * 1024 * 1024;

fs.mkdirSync(storageDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDirectory),
    filename: (_req, _file, callback) => callback(null, crypto.randomUUID()),
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

function getPath(storageName) {
  if (
    typeof storageName !== 'string'
    || !/^[0-9a-f-]{36}$/i.test(storageName)
    || path.basename(storageName) !== storageName
  ) {
    throw new Error('Nome de armazenamento inválido.');
  }

  return path.join(storageDirectory, storageName);
}

async function exists(storageName) {
  try {
    return (await fsPromises.stat(getPath(storageName))).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function remove(storageName) {
  try {
    await fsPromises.unlink(getPath(storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  exists,
  getPath,
  remove,
  upload,
};