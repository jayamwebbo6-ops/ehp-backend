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

const { getProducts, createProduct, updateProduct, deleteProduct, importProducts, bulkDeleteProducts } = require('../controllers/productController');
const { verifyAdmin, checkPermission } = require('../middleware/authMiddleware');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/products');
const accessoriesDir = path.join(__dirname, '../uploads/accessories');
const optionalsDir = path.join(__dirname, '../uploads/optionals');

[uploadDir, accessoriesDir, optionalsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for binary file upload
    fieldSize: 25 * 1024 * 1024 // 25MB limit for text fields (e.g. accessories/optionals JSON with base64 images)
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
const processProductImage = async (req, res, next) => {
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

      req.body.image = `/uploads/products/${filename}`;
    } else {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${uniqueSuffix}${ext}`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);
      req.body.image = `/uploads/products/${filename}`;
    }
    next();
  } catch (error) {
    console.error("Image processing error:", error);
    return res.status(500).json({ message: "Failed to process uploaded image" });
  }
};

// Apply verifyAdmin middleware to all routes
router.use(verifyAdmin);

// Routes
router.get('/', getProducts);
router.post('/', checkPermission('productAdd'), upload.single('image'), processProductImage, createProduct);
router.post('/import', checkPermission('productAdd'), importProducts);
router.post('/bulk-delete', checkPermission('productDelete'), bulkDeleteProducts);
router.put('/:id', checkPermission('productEdit'), upload.single('image'), processProductImage, updateProduct);
router.delete('/:id', checkPermission('productDelete'), deleteProduct);

module.exports = router;
