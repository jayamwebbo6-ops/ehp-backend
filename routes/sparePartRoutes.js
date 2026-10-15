const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.warn("Sharp is not installed or failed to load. Falling back to saving image in original format.");
}

const {
  getSpareParts,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart,
  bulkDeleteSpareParts
} = require('../controllers/sparePartController');
const { verifyAdmin, checkPermission } = require('../middleware/authMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/spare-parts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for binary file upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed'), false);
    }
  }
});

// Middleware to process image file upload & WebP conversion
const processSparePartImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    if (sharp) {
      const filename = `${uniqueSuffix}.webp`;
      const filepath = path.join(uploadDir, filename);

      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(filepath);

      req.body.image = `/uploads/spare-parts/${filename}`;
    } else {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${uniqueSuffix}${ext}`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);
      req.body.image = `/uploads/spare-parts/${filename}`;
    }
    next();
  } catch (error) {
    console.error("Spare Part Image processing error:", error);
    return res.status(500).json({ message: "Failed to process uploaded spare part image" });
  }
};

// Apply verifyAdmin middleware to all routes
router.use(verifyAdmin);

// Routes
router.get('/', getSpareParts);
router.get('/:id', getSparePartById);
router.post('/', checkPermission('sparePartsAdd'), upload.single('image'), processSparePartImage, createSparePart);
router.post('/bulk-delete', checkPermission('sparePartsDelete'), bulkDeleteSpareParts);
router.put('/:id', checkPermission('sparePartsEdit'), upload.single('image'), processSparePartImage, updateSparePart);
router.delete('/:id', checkPermission('sparePartsDelete'), deleteSparePart);

module.exports = router;
