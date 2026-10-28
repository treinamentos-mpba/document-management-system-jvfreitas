const path = require('node:path');
const documentService = require('../services/documentService');
const DocumentError = require('../services/documentErrors');

async function upload(req, res) {
  const document = await documentService.createDocument(req.file, req.userId);
  res.status(201).json(document);
}

function list(req, res) {
  res.status(200).json({ documents: documentService.listDocuments(req.userId) });
}

async function download(req, res, next) {
  const { document, filePath } = await documentService.getDocumentForDownload(
    req.params.id,
    req.userId,
  );
  const downloadName = path.basename(document.originalName.replace(/\\/g, '/')) || 'document';

  res.download(filePath, downloadName, (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.code === 'ENOENT') {
      return next(new DocumentError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
    }
    return next(error);
  });
}

module.exports = {
  download,
  list,
  upload,
};