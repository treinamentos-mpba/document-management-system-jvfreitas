const crypto = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const DocumentError = require('./documentErrors');
const documentPresenter = require('./documentPresenter');

function documentNotFound() {
  return new DocumentError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
}

async function createDocument(file, owner) {
  if (!file) {
    throw new DocumentError('INVALID_REQUEST', 'O arquivo é obrigatório.');
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype,
    storageName: file.filename,
  };

  try {
    return documentPresenter.toPublicDocument(documentRepository.create(document));
  } catch (error) {
    await localFileRepository.remove(file.filename).catch(() => {});
    throw error;
  }
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(documentPresenter.toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new DocumentError('INVALID_REQUEST', 'Identificador de documento inválido.');
  }

  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    throw documentNotFound();
  }

  if (!(await localFileRepository.exists(document.storageName))) {
    throw documentNotFound();
  }

  return {
    document: documentPresenter.toPublicDocument(document),
    filePath: localFileRepository.getPath(document.storageName),
  };
}

module.exports = {
  createDocument,
  getDocumentForDownload,
  listDocuments,
};