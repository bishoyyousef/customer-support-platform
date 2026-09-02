import express from 'express';
import { uploadAttachment, downloadAttachment } from '../controllers/attachmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.post('/tickets/:id/attachments', authenticate, uploadAttachment);
router.get('/attachments/:attachmentId', authenticate, downloadAttachment);

export default router;
