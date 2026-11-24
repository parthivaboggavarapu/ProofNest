const multer = require('multer');

const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 10 * 1024 * 1024; // 10MB default
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error(`Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPEG, PNG, WebP.`);
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  },
  fileFilter
});

const validateFileSignature = (buffer, mimeType) => {
  if (!buffer || buffer.length < 4) return false;

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // PNG signature: 0x89 0x50 0x4E 0x47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }

  // JPEG signature: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WebP signature: RIFF....WEBP
  if (mimeType === 'image/webp') {
    return (
      buffer.toString('utf8', 0, 4) === 'RIFF' &&
      buffer.toString('utf8', 8, 12) === 'WEBP'
    );
  }

  return true;
};

module.exports = {
  upload,
  validateFileSignature
};
