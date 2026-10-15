const express = require('express');
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getQuotations, getQuotationById, createQuotation, updateQuotation, deleteQuotation, bulkDeleteQuotations, sendQuotationEmailRoute } = require('../controllers/quotationController');
const { verifyAdmin, checkPermission } = require('../middleware/authMiddleware');

// Ensure uploads/quotations directory exists
const uploadDir = path.join(__dirname, '../uploads/quotations');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.fieldname + path.extname(file.originalname));
  }
});

// Multer config
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, JPEG, WEBP, and SVG image files are allowed'), false);
    }
  }
});

// Middleware to handle multer file upload and catch errors
const handleUpload = (req, res, next) => {
  upload.single('qrCode')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Middleware to parse quotationData from stringified JSON if present in multipart/form-data
const processQuotationData = (req, res, next) => {
  if (req.body.quotationData) {
    try {
      req.body = JSON.parse(req.body.quotationData);
    } catch (e) {
      return res.status(400).json({ message: "Invalid quotation data format" });
    }
  }

  if (req.file) {
    if (!req.body.bankDetails) {
      req.body.bankDetails = {};
    }
    req.body.bankDetails.qrCode = `/uploads/quotations/${req.file.filename}`;
  }
  next();
};

// Apply verifyAdmin to all quotation routes
router.use(verifyAdmin);

// Routes with specific permission checks
router.get('/', getQuotations);
router.post('/bulk-delete', checkPermission('quotationDelete'), bulkDeleteQuotations);
router.get('/:id', getQuotationById);
router.post('/', checkPermission('quotationAdd'), handleUpload, processQuotationData, createQuotation);
router.put('/:id', checkPermission('quotationEdit'), handleUpload, processQuotationData, updateQuotation);
router.delete('/:id', checkPermission('quotationDelete'), deleteQuotation);
router.post('/send-email', sendQuotationEmailRoute);

module.exports = router;
