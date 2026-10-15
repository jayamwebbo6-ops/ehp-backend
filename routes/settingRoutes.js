const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getSettings, updateSettings } = require('../controllers/settingController');
const { verifyAdmin, checkPermission } = require('../middleware/authMiddleware');

// Ensure uploads/company and uploads/attachments directories exist
const uploadDir = path.join(__dirname, '../uploads/company');
const attachmentsDir = path.join(__dirname, '../uploads/attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'mailAttachments' || file.fieldname === 'attachments') {
      cb(null, attachmentsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.fieldname + path.extname(file.originalname));
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  
  if (file.fieldname === 'mailAttachments' || file.fieldname === 'attachments') {
    const allowedAttachmentExts = [
      '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.svg',
      '.xls', '.xlsx', '.csv', '.doc', '.docx', '.txt', '.zip'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedAttachmentExts.includes(ext) || allowedImageTypes.includes(file.mimetype) || file.mimetype.includes('pdf') || file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('word') || file.mimetype.includes('text')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for attachment (${ext}). Supported: PDF, Images, Excel, Word, CSV, Text`), false);
    }
  } else {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, JPEG, WEBP, and SVG image files are allowed'), false);
    }
  }
};

// Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit per file
    fieldSize: 50 * 1024 * 1024 // 50MB limit for field values
  }
});

// Multer multi-field upload configuration
const uploadFields = upload.fields([
  { name: 'companyLogo', maxCount: 1 },
  { name: 'companySeal', maxCount: 1 },
  { name: 'pdfHeaderImage', maxCount: 1 },
  { name: 'pdfFooterImage', maxCount: 1 },
  { name: 'authSignatoryImage', maxCount: 1 },
  { name: 'bankQrCodeIndia', maxCount: 1 },
  { name: 'bankQrCodeEurope', maxCount: 1 },
  { name: 'mailAttachments', maxCount: 20 },
  { name: 'attachments', maxCount: 20 }
]);

// 1. GET / - Fetch settings (allows both Admin and Sub-Admin roles)
router.get('/', verifyAdmin, getSettings);

// 2. PUT / - Update settings (restricted to Admin, or Sub-Admin with settingsAccess permission)
router.put('/', verifyAdmin, checkPermission('settingsAccess'), (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, updateSettings);

module.exports = router;
