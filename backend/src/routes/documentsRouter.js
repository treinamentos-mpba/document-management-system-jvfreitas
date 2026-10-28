const express = require('express');
const documentController = require('../controllers/documentController');
const localFileRepository = require('../repositories/localFileRepository');

const router = express.Router();

function requireUserId(req, res, next) {
  const userId = req.get('X-User-Id')?.trim();
  if (!userId || userId.length > 128 || /[\u0000-\u001f\u007f]/.test(userId)) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'O cabeçalho X-User-Id é obrigatório.' },
    });
  }

  req.userId = userId;
  return next();
}

router.post(
  '/upload',
  requireUserId,
  localFileRepository.upload.single('file'),
  documentController.upload,
);
router.get('/documents', requireUserId, documentController.list);
router.get('/documents/:id/download', requireUserId, documentController.download);

module.exports = router;