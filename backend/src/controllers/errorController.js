const multer = require('multer');
const DocumentError = require('../services/documentErrors');

const documentErrorStatuses = {
  INVALID_REQUEST: 400,
  DOCUMENT_NOT_FOUND: 404,
};

function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    const status = isFileTooLarge ? 413 : 400;
    const code = isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_REQUEST';
    const message = isFileTooLarge ? 'Arquivo excede o limite permitido.' : 'Arquivo inválido.';
    return res.status(status).json({ error: { code, message } });
  }

  if (error instanceof DocumentError) {
    const status = documentErrorStatuses[error.code] || 500;
    return res.status(status).json({
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : error.code,
        message: status === 500 ? 'Erro interno do servidor.' : error.message,
      },
    });
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
}

module.exports = errorHandler;