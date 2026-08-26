const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${uniqueId}_${safeName}`);
  }
});

const allowedMimeTypes = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv'
];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only standard documents and images are allowed.'));
    }
  }
});

module.exports = {
  upload,
  UPLOADS_DIR
};
