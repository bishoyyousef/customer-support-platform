import path from 'path';
import fs from 'fs';
import ticketRepository from '../repositories/ticketRepository.js';
import messageRepository from '../repositories/messageRepository.js';
import { upload, UPLOADS_DIR } from '../config/multer.js';

async function uploadAttachment(req, res, next) {
  try {
    const ticket = await ticketRepository.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'customer' && ticket.customerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
    }

    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      try {
        const now = new Date().toISOString();
        const isInternal = req.query.isInternal === 'true' && req.user.role !== 'customer';
        const attachmentId = `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newMessage = {
          id: `msg_${Date.now()}`,
          ticketId: ticket.id,
          senderId: req.user.id,
          senderName: req.user.name,
          senderRole: req.user.role,
          content: `[Attachment: ${req.file.originalname}]`,
          timestamp: now,
          isInternal,
          attachment: {
            id: attachmentId,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            storagePath: req.file.filename
          }
        };

        await messageRepository.create(newMessage);

        const updateFields = { updatedAt: now };
        let timelineEvent = null;

        if (req.user.role === 'customer' && !isInternal && ticket.status !== 'requires_attention') {
          const oldStatus = ticket.status;
          updateFields.status = 'requires_attention';
          timelineEvent = {
            type: 'status_change',
            message: `Status reverted from '${oldStatus}' to 'requires_attention' automatically by system due to customer attachment`,
            timestamp: now,
            actorName: 'System'
          };
        }

        await ticketRepository.update(ticket.id, updateFields, timelineEvent);

        delete newMessage._id;
        return res.status(201).json(newMessage);
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  } catch (err) {
    next(err);
  }
}

async function downloadAttachment(req, res, next) {
  try {
    const msg = await messageRepository.findByAttachmentId(req.params.attachmentId);

    if (!msg || !msg.attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const ticket = await ticketRepository.findById(msg.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'customer') {
      if (ticket.customerId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this ticket' });
      }
      if (msg.isInternal) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this internal note attachment' });
      }
    }

    const filePath = path.join(UPLOADS_DIR, msg.attachment.storagePath);
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ message: 'Forbidden: Invalid file path' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Attachment file not found on disk' });
    }

    res.setHeader('Content-Type', msg.attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(msg.attachment.filename)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export {
  uploadAttachment,
  downloadAttachment
};
