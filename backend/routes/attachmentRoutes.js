const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const { authenticate } = require('../middleware/auth');

router.post('/tickets/:id/attachments', authenticate, attachmentController.uploadAttachment);
router.get('/attachments/:attachmentId', authenticate, attachmentController.downloadAttachment);

module.exports = router;
